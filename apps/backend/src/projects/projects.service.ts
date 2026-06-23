import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { DesignMeasurement } from '../mongo/schemas/design-measurement.schema'
import { EstimateItem } from '../mongo/schemas/estimate-item.schema'
import { Estimate } from '../mongo/schemas/estimate.schema'
import { ChangeRequest } from '../mongo/schemas/change-request.schema'
import { Invoice } from '../mongo/schemas/invoice.schema'
import { Payment } from '../mongo/schemas/payment.schema'
import { ProjectLocation } from '../mongo/schemas/project-location.schema'
import { Order } from '../mongo/schemas/order.schema'
import { Project } from '../mongo/schemas/project.schema'
import { QualityChecklist } from '../mongo/schemas/quality-checklist.schema'
import { Receipt } from '../mongo/schemas/receipt.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { Task } from '../mongo/schemas/task.schema'
import { Team } from '../mongo/schemas/team.schema'
import { User } from '../mongo/schemas/user.schema'
import { normalizeWorkspaceRole } from '../auth/role-normalize'
import { escapeRegExp } from '../lib/regex'
import { toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	applyStatusFilter,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { EstimateStatus, ProjectStatus, RoleCode } from '../domain/enums'
import { canTransitionProject } from '../domain/project-state-machine'
import { UpdateProjectTeamDto } from './dto/update-project-team.dto'
@Injectable()
export class ProjectsService {
	constructor(
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(ProjectLocation.name)
		private readonly locationModel: Model<ProjectLocation>,
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(DesignMeasurement.name)
		private readonly measurementModel: Model<DesignMeasurement>,
		@InjectModel(Estimate.name)
		private readonly estimateModel: Model<Estimate>,
		@InjectModel(EstimateItem.name)
		private readonly estimateItemModel: Model<EstimateItem>,
		@InjectModel(Task.name)
		private readonly taskModel: Model<Task>,
		@InjectModel(Payment.name)
		private readonly paymentModel: Model<Payment>,
		@InjectModel(Invoice.name)
		private readonly invoiceModel: Model<Invoice>,
		@InjectModel(Receipt.name)
		private readonly receiptModel: Model<Receipt>,
		@InjectModel(ChangeRequest.name)
		private readonly changeRequestModel: Model<ChangeRequest>,
		@InjectModel(QualityChecklist.name)
		private readonly qualityModel: Model<QualityChecklist>,
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>,
		@InjectModel(Team.name)
		private readonly teamModel: Model<Team>,
		@InjectModel(Order.name)
		private readonly orderModel: Model<Order>
	) {}

	private sumApprovedEstimateTotals(
		estimates: Array<{ status: string; total: string }>
	): string | null {
		const sum = estimates
			.filter((e) => e.status === EstimateStatus.APPROVED)
			.reduce(
				(acc, e) => acc + (parseFloat(String(e.total)) || 0),
				0
			)
		if (sum <= 0) return null
		return String(Math.round(sum))
	}

	private async resolveClientRequestedBudget(
		projectId: Types.ObjectId,
		budgetPlanned: string
	): Promise<string | null> {
		const order = await this.orderModel
			.findOne({ projectId })
			.select('requestedBudget')
			.lean()
			.exec()
		const raw =
			order?.requestedBudget?.trim() ||
			(budgetPlanned?.trim() && budgetPlanned !== '0'
				? budgetPlanned.trim()
				: '')
		return raw || null
	}

	async syncProjectApprovedBudget(projectId: Types.ObjectId) {
		const approved = await this.estimateModel
			.find({
				projectId,
				status: EstimateStatus.APPROVED,
			})
			.select('total')
			.lean()
			.exec()
		const total = this.sumApprovedEstimateTotals(approved)
		await this.projectModel
			.updateOne(
				{ _id: projectId },
				{ budgetApproved: total ?? undefined }
			)
			.exec()
		return total
	}
	async list(filters: {
		status?: string
		city?: string
		q?: string
		page?: number
		perPage?: number
		from?: string
		to?: string
		sort?: string
		requestingUserId?: string
		requestingRole?: string
	}) {
		const where: Record<string, unknown> = {}
		if (filters.requestingRole === 'BRIGADIR' && filters.requestingUserId) {
			const staff = await this.staffModel
				.findOne({ userId: new Types.ObjectId(filters.requestingUserId) })
				.select('_id')
				.lean()
				.exec()
			if (staff) {
				where.brigadirId = staff._id
			} else {
				// BRIGADIR without staff profile sees nothing
				return { items: [], total: 0, page: 1, perPage: filters.perPage ?? 20 }
			}
		}
		applyStatusFilter(where, filters.status)
		if (filters.q?.trim()) {
			const re = new RegExp(escapeRegExp(filters.q.trim()), 'i')
			where.$or = [{ code: re }, { title: re }]
		}
		let projectIdsInCity: Types.ObjectId[] | undefined
		if (filters.city) {
			const locs = await this.locationModel
				.find({ city: new RegExp(escapeRegExp(filters.city), 'i') })
				.select('projectId')
				.lean()
				.exec()
			projectIdsInCity = locs.map((l) => l.projectId as Types.ObjectId)
			where._id = { $in: projectIdsInCity }
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const [projects, total] = await Promise.all([
			this.projectModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.projectModel.countDocuments(where),
		])
		const results = await Promise.all(
			projects.map(async (project) => {
				const [
					client,
					manager,
					location,
					taskCount,
					paymentCount,
					crCount,
				] = await Promise.all([
					this.clientModel.findById(project.clientId).lean().exec(),
					project.managerId
						? this.staffModel
								.findById(project.managerId)
								.lean()
								.exec()
						: Promise.resolve(null),
					this.locationModel
						.findOne({ projectId: project._id })
						.lean()
						.exec(),
					this.taskModel.countDocuments({ projectId: project._id }),
					this.paymentModel.countDocuments({
						projectId: project._id,
					}),
					this.changeRequestModel.countDocuments({
						projectId: project._id,
					}),
				])
				const clientUser = client
					? await this.userModel
							.findById(client.userId)
							.select('email fullName')
							.lean()
							.exec()
					: null
				const managerUser = manager
					? await this.userModel
							.findById(manager.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				return {
					id: project._id.toString(),
					code: project.code,
					title: project.title,
					status: project.status,
					city: location?.city,
					clientName: clientUser?.fullName ?? '',
					managerName: managerUser?.fullName ?? null,
					budgetPlanned: project.budgetPlanned,
					budgetApproved: project.budgetApproved ?? null,
					dueDate: project.dueDate,
					counters: {
						tasks: taskCount,
						payments: paymentCount,
						changeRequests: crCount,
					},
				}
			})
		)
		return { items: results, total, page, perPage }
	}
	async listMine(userId: string, role: RoleCode) {
		const effective = normalizeWorkspaceRole(role)
		const staff = await this.staffModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.lean()
			.exec()
		if (!staff && effective !== RoleCode.ADMIN) {
			return { items: [], total: 0, page: 1, perPage: 50 }
		}
		const where: Record<string, unknown> = {}
		if (effective === RoleCode.DESIGNER && staff) {
			where.designerId = staff._id
		} else if (effective === RoleCode.PROJECT_MANAGER && staff) {
			where.managerId = staff._id
		} else if (effective !== RoleCode.ADMIN) {
			return { items: [], total: 0, page: 1, perPage: 50 }
		}
		const projects = await this.projectModel
			.find(where)
			.sort({ updatedAt: -1 })
			.limit(50)
			.lean()
			.exec()
		const items = await Promise.all(
			projects.map(async (project) => {
				const [client, manager, designer, location, taskCount] =
					await Promise.all([
						this.clientModel.findById(project.clientId).lean().exec(),
						project.managerId
							? this.staffModel
									.findById(project.managerId)
									.lean()
									.exec()
							: Promise.resolve(null),
						project.designerId
							? this.staffModel
									.findById(project.designerId)
									.lean()
									.exec()
							: Promise.resolve(null),
						this.locationModel
							.findOne({ projectId: project._id })
							.lean()
							.exec(),
						this.taskModel.countDocuments({ projectId: project._id }),
					])
				const clientUser = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				const managerUser = manager
					? await this.userModel
							.findById(manager.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				const designerUser = designer
					? await this.userModel
							.findById(designer.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				return {
					id: project._id.toString(),
					code: project.code,
					title: project.title,
					status: project.status,
					city: location?.city,
					clientName: clientUser?.fullName ?? '',
					managerName: managerUser?.fullName ?? null,
					designerName: designerUser?.fullName ?? null,
					budgetPlanned: project.budgetPlanned,
					dueDate: project.dueDate,
					openTasks: taskCount,
				}
			})
		)
		return { items, total: items.length, page: 1, perPage: 50 }
	}
	async listForClientUser(userId: string) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) {
			return []
		}
		const projects = await this.projectModel
			.find({ clientId: client._id })
			.sort({ status: 1, dueDate: 1 })
			.limit(100)
			.lean()
			.exec()
		const results = await Promise.all(
			projects.map(async (project) => {
				const [manager, location, taskCount, paymentCount, crCount] =
					await Promise.all([
						project.managerId
							? this.staffModel
									.findById(project.managerId)
									.lean()
									.exec()
							: Promise.resolve(null),
						this.locationModel
							.findOne({ projectId: project._id })
							.lean()
							.exec(),
						this.taskModel.countDocuments({
							projectId: project._id,
						}),
						this.paymentModel.countDocuments({
							projectId: project._id,
						}),
						this.changeRequestModel.countDocuments({
							projectId: project._id,
						}),
					])
				const clientUser = await this.userModel
					.findById(client.userId)
					.select('email fullName')
					.lean()
					.exec()
				const managerUser = manager
					? await this.userModel
							.findById(manager.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				return {
					id: project._id.toString(),
					code: project.code,
					title: project.title,
					status: project.status,
					city: location?.city,
					clientName: clientUser?.fullName ?? '',
					managerName: managerUser?.fullName ?? null,
					budgetPlanned: project.budgetPlanned,
					budgetApproved: project.budgetApproved ?? null,
					dueDate: project.dueDate,
					counters: {
						tasks: taskCount,
						payments: paymentCount,
						changeRequests: crCount,
					},
				}
			})
		)
		return results
	}
	async listForClientUserPaginated(
		userId: string,
		filters: {
			page?: number
			perPage?: number
			q?: string
			status?: string
			from?: string
			to?: string
			sort?: string
		}
	) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) return { items: [], total: 0, page: 1, perPage: 10 }
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage,
			10,
			50
		)
		const where: Record<string, unknown> = { clientId: client._id }
		applyStatusFilter(where, filters.status)
		if (filters.q) {
			const re = new RegExp(escapeRegExp(filters.q.trim()), 'i')
			where.$or = [{ code: re }, { title: re }]
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const sort =
			filters.sort?.trim().toLowerCase() === 'oldest'
				? resolveSort('oldest', 'createdAt')
				: ({ dueDate: 1, createdAt: -1 } as Record<string, 1 | -1>)
		const [projects, total] = await Promise.all([
			this.projectModel
				.find(where)
				.sort(sort)
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.projectModel.countDocuments(where),
		])
		const items = await Promise.all(
			projects.map(async (project) => {
				const [manager, location] = await Promise.all([
					project.managerId
						? this.staffModel
								.findById(project.managerId)
								.lean()
								.exec()
						: Promise.resolve(null),
					this.locationModel
						.findOne({ projectId: project._id })
						.lean()
						.exec(),
				])
				const managerUser = manager
					? await this.userModel
							.findById(manager.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				const latestEstimate = await this.estimateModel
					.findOne({ projectId: project._id })
					.sort({ version: -1, createdAt: -1 })
					.select('status')
					.lean()
					.exec()
				const clientStatusKey =
					latestEstimate?.status === 'SENT'
						? 'estimate_action_required'
						: project.status === 'COMPLETED'
							? 'project_completed'
							: project.status === 'CANCELLED'
								? 'project_cancelled'
								: project.status === 'WARRANTY'
									? 'warranty_period'
									: project.status === 'IN_PROGRESS' ||
										  project.status === 'APPROVED'
										? 'work_in_progress'
										: 'project_planning'
				const clientStatusLabel =
					clientStatusKey === 'estimate_action_required'
						? 'Кошторис — потрібне ваше рішення'
						: clientStatusKey === 'project_completed'
							? 'Проєкт завершено'
							: clientStatusKey === 'project_cancelled'
								? 'Проєкт скасовано'
								: clientStatusKey === 'warranty_period'
									? 'Гарантійний період'
									: clientStatusKey === 'work_in_progress'
										? 'Роботи в процесі'
										: 'Підготовка пропозиції'
				return {
					id: project._id.toString(),
					code: project.code,
					title: project.title,
					status: project.status,
					clientStatusKey,
					clientStatusLabel,
					city: location?.city,
					managerName: managerUser?.fullName ?? null,
					budgetPlanned: project.budgetPlanned,
					budgetApproved: project.budgetApproved ?? null,
					dueDate: project.dueDate,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async detailByCodeForClientUser(userId: string, code: string) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) throw new NotFoundException('Project not found')
		const project = await this.projectModel
			.findOne({ clientId: client._id, code })
			.lean()
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		const detail = await this.detail(project._id.toString())
		const clientVisibleStatuses = new Set([
			'SENT',
			'APPROVED',
			'REJECTED',
			'EXPIRED',
		])
		return {
			...detail,
			estimates: detail.estimates.filter((e) =>
				clientVisibleStatuses.has(e.status)
			),
		}
	}
	async mapMarkers() {
		const locations = await this.locationModel.find().lean().exec()
		const out = []
		for (const loc of locations) {
			const project = await this.projectModel
				.findById(loc.projectId)
				.lean()
				.exec()
			if (!project) continue
			const client = await this.clientModel
				.findById(project.clientId)
				.lean()
				.exec()
			const user = client
				? await this.userModel
						.findById(client.userId)
						.select('fullName')
						.lean()
						.exec()
				: null
			out.push({
				id: project._id.toString(),
				code: project.code,
				title: project.title,
				status: project.status,
				clientName: user?.fullName ?? '',
				address: loc.addressLine,
				city: loc.city,
				lat: parseFloat(loc.latitude),
				lng: parseFloat(loc.longitude),
			})
		}
		return out.sort((a, b) => a.code.localeCompare(b.code))
	}
	async detail(id: string) {
		const projectOid = toObjectId(id, 'Invalid project id')
		const project = await this.projectModel
			.findById(projectOid)
			.lean()
			.exec()
		if (!project) {
			throw new NotFoundException('Project not found')
		}
		const pid = project._id as Types.ObjectId
		const [
			location,
			client,
			manager,
			designer,
			brigadir,
			measurements,
			estimates,
			tasks,
			payments,
			invoices,
			receipts,
			changeRequests,
			qualityChecks,
			auditLogs,
		] = await Promise.all([
			this.locationModel.findOne({ projectId: pid }).lean().exec(),
			this.clientModel.findById(project.clientId).lean().exec(),
			project.managerId
				? this.staffModel.findById(project.managerId).lean().exec()
				: Promise.resolve(null),
			project.designerId
				? this.staffModel.findById(project.designerId).lean().exec()
				: Promise.resolve(null),
			project.brigadirId
				? this.staffModel.findById(project.brigadirId).lean().exec()
				: Promise.resolve(null),
			this.measurementModel.find({ projectId: pid }).lean().exec(),
			this.estimateModel
				.find({ projectId: pid })
				.sort({ version: -1 })
				.lean()
				.exec(),
			this.taskModel
				.find({ projectId: pid })
				.sort({ status: 1, dueDate: 1 })
				.lean()
				.exec(),
			this.paymentModel.find({ projectId: pid }).lean().exec(),
			this.invoiceModel.find({ projectId: pid }).lean().exec(),
			this.receiptModel.find({ projectId: pid }).lean().exec(),
			this.changeRequestModel.find({ projectId: pid }).lean().exec(),
			this.qualityModel.find({ projectId: pid }).lean().exec(),
			this.auditModel
				.find({ projectId: pid })
				.sort({ createdAt: -1 })
				.limit(12)
				.lean()
				.exec(),
		])
		const clientUser = client
			? await this.userModel
					.findById(client.userId)
					.select('fullName email phone')
					.lean()
					.exec()
			: null
		const managerUser = manager
			? await this.userModel
					.findById(manager.userId)
					.select('fullName email')
					.lean()
					.exec()
			: null
		const designerUser = designer
			? await this.userModel
					.findById(designer.userId)
					.select('fullName email')
					.lean()
					.exec()
			: null
		const brigadirUser = brigadir
			? await this.userModel
					.findById(brigadir.userId)
					.select('fullName email')
					.lean()
					.exec()
			: null
		const estimateIds = estimates.map((e) => e._id)
		const allItems = await this.estimateItemModel
			.find({ estimateId: { $in: estimateIds } })
			.sort({ sortOrder: 1 })
			.lean()
			.exec()
		const itemsByEstimate = new Map<string, typeof allItems>()
		for (const item of allItems) {
			const eid = (item.estimateId as Types.ObjectId).toString()
			if (!itemsByEstimate.has(eid)) itemsByEstimate.set(eid, [])
			itemsByEstimate.get(eid)!.push(item)
		}
		const tasksOut = await Promise.all(
			tasks.map(async (t) => {
				const assignee = t.assigneeId
					? await this.staffModel.findById(t.assigneeId).lean().exec()
					: null
				const assigneeUser = assignee
					? await this.userModel
							.findById(assignee.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				const team = t.teamId
					? await this.teamModel.findById(t.teamId).lean().exec()
					: null
				return {
					...t,
					id: t._id.toString(),
					assignee: assignee
						? {
								...assignee,
								user: { fullName: assigneeUser?.fullName },
							}
						: null,
					team,
				}
			})
		)
		const approvedEstimatesTotal = this.sumApprovedEstimateTotals(estimates)
		const clientRequestedBudget = await this.resolveClientRequestedBudget(
			pid,
			project.budgetPlanned
		)
		return {
			...project,
			id: project._id.toString(),
			budgetPlanned: project.budgetPlanned,
			budgetApproved:
				approvedEstimatesTotal ?? project.budgetApproved ?? null,
			clientRequestedBudget,
			approvedEstimatesTotal,
			location,
			client: client
				? {
						...client,
						user: {
							fullName: clientUser?.fullName,
							email: clientUser?.email,
							phone: clientUser?.phone,
						},
					}
				: null,
			manager: manager
				? {
						id: (manager._id as Types.ObjectId).toString(),
						user: {
							fullName: managerUser?.fullName,
							email: managerUser?.email,
						},
					}
				: null,
			designer: designer
				? {
						id: (designer._id as Types.ObjectId).toString(),
						user: {
							fullName: designerUser?.fullName,
							email: designerUser?.email,
						},
					}
				: null,
			brigadir: brigadir
				? {
						id: (brigadir._id as Types.ObjectId).toString(),
						user: {
							fullName: brigadirUser?.fullName,
							email: brigadirUser?.email,
						},
					}
				: null,
			measurements,
			estimates: estimates.map((estimate) => ({
				...estimate,
				id: estimate._id.toString(),
				subtotal: estimate.subtotal,
				discount: estimate.discount,
				tax: estimate.tax,
				margin: estimate.margin,
				total: estimate.total,
				items: (itemsByEstimate.get(estimate._id.toString()) ?? []).map(
					(item) => ({
						...item,
						id: item._id.toString(),
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						total: item.total,
					})
				),
			})),
			tasks: tasksOut,
			payments: payments.map((p) => ({
				...p,
				id: p._id.toString(),
				amount: p.amount,
			})),
			invoices: invoices.map((inv) => ({
				...inv,
				id: inv._id.toString(),
				amount: inv.amount,
			})),
			receipts: await Promise.all(
				receipts.map(async (r) => {
					let invoiceNumber: string | null = null
					let invoiceStatus: string | null = null
					let invoiceIdStr: string | null = null
					if (r.invoiceId) {
						invoiceIdStr = r.invoiceId.toString()
						const inv = await this.invoiceModel
							.findById(r.invoiceId)
							.select('number status')
							.lean()
							.exec()
						invoiceNumber = inv?.number ?? null
						invoiceStatus = inv?.status ?? null
					}
					return {
						...r,
						id: r._id.toString(),
						amount: r.amount,
						invoiceId: invoiceIdStr,
						invoiceNumber,
						invoiceStatus,
					}
				})
			),
			changeRequests,
			qualityChecks,
			auditLogs: await Promise.all(
				auditLogs.map(async (log) => {
					const user = log.userId
						? await this.userModel
								.findById(log.userId)
								.select('fullName email')
								.lean()
								.exec()
						: null
					const createdAt = (
						log as {
							createdAt?: Date
						}
					).createdAt
					return {
						id: (log._id as Types.ObjectId).toString(),
						action: log.action,
						entityType: log.entityType,
						entityId: log.entityId,
						metadata: log.metadata ?? null,
						createdAt,
						user: user
							? { fullName: user.fullName, email: user.email }
							: null,
					}
				})
			),
		}
	}
	async listAuditForProject(
		projectId: string,
		page?: number,
		perPage?: number
	) {
		const pid = toObjectId(projectId, 'Invalid project id')
		const exists = await this.projectModel
			.findById(pid)
			.select('_id')
			.lean()
			.exec()
		if (!exists) throw new NotFoundException('Project not found')
		const p = page && page > 0 ? page : 1
		const pp = perPage && perPage > 0 ? Math.min(perPage, 100) : 12
		const skip = (p - 1) * pp
		const filter = { projectId: pid }
		const [rows, total] = await Promise.all([
			this.auditModel
				.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(pp)
				.lean()
				.exec(),
			this.auditModel.countDocuments(filter),
		])
		const items = await Promise.all(
			rows.map(async (row) => {
				const user = row.userId
					? await this.userModel
							.findById(row.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				const createdAt = (
					row as {
						createdAt?: Date
					}
				).createdAt
				return {
					id: (row._id as Types.ObjectId).toString(),
					action: row.action,
					entityType: row.entityType,
					entityId: row.entityId,
					metadata: row.metadata ?? null,
					createdAt,
					user: user
						? { fullName: user.fullName, email: user.email }
						: null,
				}
			})
		)
		return { items, total, page: p, perPage: pp }
	}
	async listAuditForClientProjectByCode(
		userId: string,
		code: string,
		page?: number,
		perPage?: number
	) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) throw new NotFoundException('Project not found')
		const project = await this.projectModel
			.findOne({ clientId: client._id, code })
			.select('_id')
			.lean()
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		return this.listAuditForProject(
			(project._id as Types.ObjectId).toString(),
			page,
			perPage
		)
	}
	async listForBrigadir(userId: string) {
		const staff = await this.staffModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.lean()
			.exec()
		if (!staff) return { items: [], total: 0, page: 1, perPage: 50 }
		const projects = await this.projectModel
			.find({ brigadirId: staff._id })
			.sort({ updatedAt: -1 })
			.limit(50)
			.lean()
			.exec()
		const items = await Promise.all(
			projects.map(async (project) => {
				const location = await this.locationModel
					.findOne({ projectId: project._id })
					.lean()
					.exec()
				const taskCount = await this.taskModel.countDocuments({
					projectId: project._id,
				})
				return {
					id: project._id.toString(),
					code: project.code,
					title: project.title,
					status: project.status,
					city: location?.city,
					budgetPlanned: project.budgetPlanned,
					dueDate: project.dueDate,
					openTasks: taskCount,
				}
			})
		)
		return { items, total: items.length, page: 1, perPage: 50 }
	}
	async transitionStatus(id: string, nextStatus: ProjectStatus) {
		const project = await this.projectModel.findById(toObjectId(id)).exec()
		if (!project) throw new NotFoundException('Project not found')
		if (!canTransitionProject(project.status, nextStatus)) {
			throw new BadRequestException(
				`Cannot move project from ${project.status} to ${nextStatus}`
			)
		}
		// Payment gate: all transitions from DESIGN and later require a fully paid approved estimate
		const GATED_FROM: ProjectStatus[] = [
			ProjectStatus.DESIGN,
			ProjectStatus.APPROVED,
			ProjectStatus.IN_PROGRESS,
			ProjectStatus.COMPLETED,
		]
		if (GATED_FROM.includes(project.status as ProjectStatus)) {
			const approvedEstimate = await this.estimateModel
				.findOne({ projectId: project._id, status: EstimateStatus.APPROVED })
				.sort({ version: -1 })
				.select('total')
				.lean()
				.exec()
			if (!approvedEstimate) {
				throw new BadRequestException(
					'Потрібен погоджений кошторис перед переходом до наступного етапу'
				)
			}
			const paidResult = await this.paymentModel
				.aggregate([
					{
						$match: {
							projectId: project._id,
							status: 'PAID',
						},
					},
					{
						$group: {
							_id: null,
							total: { $sum: { $toDouble: '$amount' } },
						},
					},
				])
				.exec()
			const paidSum: number = paidResult[0]?.total ?? 0
			const estimateTotal = parseFloat(String(approvedEstimate.total))
			if (paidSum < estimateTotal) {
				throw new BadRequestException(
					`Кошторис не сплачено повністю. Сплачено: ${paidSum} грн з ${estimateTotal} грн`
				)
			}
		}
		const prev = project.status
		project.status = nextStatus
		if (nextStatus === ProjectStatus.APPROVED) {
			const total = await this.syncProjectApprovedBudget(
				project._id as Types.ObjectId
			)
			if (total) project.budgetApproved = total
		}
		await project.save()
		await this.auditModel.create({
			projectId: project._id,
			action: 'project.status_changed',
			entityType: 'Project',
			entityId: project._id.toString(),
			metadata: { prev, next: nextStatus },
		})
		return {
			id: project._id.toString(),
			code: project.code,
			status: project.status,
		}
	}
	async updateTeam(id: string, role: RoleCode, dto: UpdateProjectTeamDto) {
		if (![RoleCode.ADMIN, RoleCode.PROJECT_MANAGER].includes(role)) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const project = await this.projectModel
			.findById(toObjectId(id, 'Invalid project id'))
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		const assign = async (
			field: 'managerId' | 'designerId' | 'brigadirId',
			val: string | null | undefined
		) => {
			if (val === undefined) return
			if (val === null || val === '') {
				project[field] = undefined
				return
			}
			const sid = toObjectId(val, 'Invalid staff id')
			const staff = await this.staffModel.findById(sid).exec()
			if (!staff) throw new BadRequestException('Staff profile not found')
			project[field] = sid
		}
		await assign('managerId', dto.managerStaffId)
		await assign('designerId', dto.designerStaffId)
		await assign('brigadirId', dto.brigadirStaffId)
		await project.save()
		await this.auditModel.create({
			projectId: project._id,
			action: 'project.team_updated',
			entityType: 'Project',
			entityId: project._id.toString(),
			metadata: {},
		})
		return this.detail(id)
	}
}
