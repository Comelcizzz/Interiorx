import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { PaymentStatus, TaskStatus } from '../domain/enums'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Invoice } from '../mongo/schemas/invoice.schema'
import { Material } from '../mongo/schemas/material.schema'
import { Payment } from '../mongo/schemas/payment.schema'
import { Project } from '../mongo/schemas/project.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { Supplier } from '../mongo/schemas/supplier.schema'
import { Task } from '../mongo/schemas/task.schema'
import { User } from '../mongo/schemas/user.schema'
import { applyDateRangeToWhere } from '../lib/list-query'

function paymentPaidAt(payment: {
	paidAt?: Date
	createdAt?: Date
}): Date {
	return payment.paidAt ?? payment.createdAt ?? new Date()
}

function monthKey(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	return `${y}-${m}`
}

function buildRevenueTimeSeries(
	payments: Array<{
		status: string
		amount: string
		paidAt?: Date
		createdAt?: Date
	}>,
	from?: string,
	to?: string
) {
	const paid = payments.filter((p) => p.status === PaymentStatus.PAID)
	const byMonth = new Map<string, { paid: number; count: number }>()
	for (const p of paid) {
		const key = monthKey(paymentPaidAt(p))
		const prev = byMonth.get(key) ?? { paid: 0, count: 0 }
		byMonth.set(key, {
			paid: prev.paid + Number(p.amount),
			count: prev.count + 1,
		})
	}
	let keys = [...byMonth.keys()].sort()
	if (keys.length === 0 && (from || to)) {
		const start = from ? new Date(from) : new Date()
		const end = to ? new Date(to) : new Date()
		if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
			const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
			const last = new Date(end.getFullYear(), end.getMonth(), 1)
			while (cursor <= last) {
				keys.push(monthKey(cursor))
				cursor.setMonth(cursor.getMonth() + 1)
			}
		}
	}
	if (keys.length === 0 && paid.length > 0) {
		keys = [...byMonth.keys()].sort()
	}
	return keys.map((period) => {
		const row = byMonth.get(period) ?? { paid: 0, count: 0 }
		return {
			period,
			paid: String(row.paid),
			paymentsCount: row.count,
		}
	})
}

@Injectable()
export class ReportsService {
	constructor(
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(Payment.name)
		private readonly paymentModel: Model<Payment>,
		@InjectModel(Invoice.name)
		private readonly invoiceModel: Model<Invoice>,
		@InjectModel(Material.name)
		private readonly materialModel: Model<Material>,
		@InjectModel(Supplier.name)
		private readonly supplierModel: Model<Supplier>,
		@InjectModel(Task.name)
		private readonly taskModel: Model<Task>,
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>
	) {}
	async overview(opts?: { from?: string; to?: string }) {
		const projectWhere: Record<string, unknown> = {}
		const paymentWhere: Record<string, unknown> = {}
		applyDateRangeToWhere(projectWhere, 'createdAt', opts?.from, opts?.to)
		applyDateRangeToWhere(paymentWhere, 'createdAt', opts?.from, opts?.to)
		const [projects, payments, invoices, materials, suppliers, tasks] =
			await Promise.all([
				this.projectModel
					.find(projectWhere)
					.sort({ dueDate: 1 })
					.lean()
					.exec(),
				this.paymentModel.find(paymentWhere).lean().exec(),
				this.invoiceModel.find().lean().exec(),
				this.materialModel.find().lean().exec(),
				this.supplierModel
					.find()
					.sort({ reliability: 1 })
					.lean()
					.exec(),
				this.taskModel
					.find()
					.select('projectId status dueDate')
					.lean()
					.exec(),
			])
		const paidPayments = payments.filter(
			(p) => p.status === PaymentStatus.PAID
		)
		const paidRevenue = paidPayments.reduce(
			(sum, p) => sum + Number(p.amount),
			0
		)
		const invoiceTotal = invoices.reduce(
			(sum, inv) => sum + Number(inv.amount),
			0
		)
		const inventoryValue = materials.reduce(
			(sum, item) =>
				sum + Number(item.stockQty) * Number(item.purchasePrice),
			0
		)
		const taskMap = new Map<
			string,
			{
				open: number
				overdue: number
			}
		>()
		for (const task of tasks) {
			const pid = task.projectId.toString()
			const prev = taskMap.get(pid) ?? { open: 0, overdue: 0 }
			const isOpen = task.status !== TaskStatus.DONE
			taskMap.set(pid, {
				open: prev.open + (isOpen ? 1 : 0),
				overdue:
					prev.overdue +
					(isOpen && task.dueDate && task.dueDate < new Date()
						? 1
						: 0),
			})
		}
		const projectById = new Map(
			projects.map((p) => [p._id.toString(), p] as const)
		)
		const revenueByProjectMap = new Map<
			string,
			{ paid: number; count: number }
		>()
		for (const payment of paidPayments) {
			const pid = payment.projectId.toString()
			const prev = revenueByProjectMap.get(pid) ?? { paid: 0, count: 0 }
			revenueByProjectMap.set(pid, {
				paid: prev.paid + Number(payment.amount),
				count: prev.count + 1,
			})
		}
		const revenueByProject = [...revenueByProjectMap.entries()]
			.sort((a, b) => b[1].paid - a[1].paid)
			.slice(0, 12)
			.map(([projectId, stats]) => {
				const project = projectById.get(projectId)
				return {
					projectId,
					code: project?.code ?? projectId.slice(-6),
					title: project?.title ?? '',
					paid: String(stats.paid),
					paymentsCount: stats.count,
				}
			})
		const revenueTimeSeries = buildRevenueTimeSeries(
			payments,
			opts?.from,
			opts?.to
		)
		const projectHealth = await Promise.all(
			projects.map(async (project) => {
				const client = await this.clientModel
					.findById(project.clientId)
					.lean()
					.exec()
				const clientUser = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				let managerName: string | null = null
				if (project.managerId) {
					const mgr = await this.staffModel
						.findById(project.managerId)
						.lean()
						.exec()
					const u = mgr
						? await this.userModel
								.findById(mgr.userId)
								.select('fullName')
								.lean()
								.exec()
						: null
					managerName = u?.fullName ?? null
				}
				const pid = project._id.toString()
				const taskStats = taskMap.get(pid) ?? { open: 0, overdue: 0 }
				return {
					id: pid,
					code: project.code,
					title: project.title,
					status: project.status,
					clientName: clientUser?.fullName ?? '',
					managerName,
					dueDate: project.dueDate,
					openTasks: taskStats.open,
					overdueTasks: taskStats.overdue,
				}
			})
		)
		return {
			finance: {
				paidRevenue: String(paidRevenue),
				invoiceTotal: String(invoiceTotal),
				outstanding: String(invoiceTotal - paidRevenue),
				paymentsCount: payments.length,
			},
			revenueTimeSeries,
			revenueByProject,
			procurement: {
				inventoryValue: String(inventoryValue),
				lowStockCount: materials.filter(
					(item) => Number(item.stockQty) <= Number(item.minStockQty)
				).length,
				suppliersAtRisk: suppliers
					.filter((supplier) => supplier.reliability < 90)
					.map((supplier) => ({
						id: supplier._id.toString(),
						name: supplier.name,
						city: supplier.city,
						reliability: supplier.reliability,
					})),
			},
			projectHealth,
			statusMix: Object.entries(
				projects.reduce<Record<string, number>>((acc, project) => {
					acc[project.status] = (acc[project.status] ?? 0) + 1
					return acc
				}, {})
			).map(([status, count]) => ({ status, count })),
		}
	}
}
