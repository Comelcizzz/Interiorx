import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { Material } from '../mongo/schemas/material.schema'
import { Payment } from '../mongo/schemas/payment.schema'
import { Project } from '../mongo/schemas/project.schema'
import { Task } from '../mongo/schemas/task.schema'
@Injectable()
export class DashboardService {
	constructor(
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(Task.name)
		private readonly taskModel: Model<Task>,
		@InjectModel(Material.name)
		private readonly materialModel: Model<Material>,
		@InjectModel(Payment.name)
		private readonly paymentModel: Model<Payment>,
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>
	) {}
	async getSummary() {
		const [
			totalProjects,
			activeProjects,
			pausedProjects,
			overdueTasks,
			materials,
			paymentsAgg,
			pendingPayments,
			recentAudit,
			statusGroups,
		] = await Promise.all([
			this.projectModel.countDocuments(),
			this.projectModel.countDocuments({
				status: { $in: ['DESIGN', 'APPROVED', 'IN_PROGRESS'] },
			}),
			this.projectModel.countDocuments({ status: 'PAUSED' }),
			this.taskModel.countDocuments({
				status: { $nin: ['DONE'] },
				dueDate: { $lt: new Date() },
			}),
			this.materialModel
				.find()
				.select('stockQty minStockQty')
				.lean()
				.exec(),
			this.paymentModel.aggregate([
				{ $match: { status: 'PAID' } },
				{
					$group: {
						_id: null,
						total: { $sum: { $toDouble: '$amount' } },
					},
				},
			]),
			this.paymentModel.countDocuments({ status: 'PENDING' }),
			this.auditModel
				.find()
				.sort({ createdAt: -1 })
				.limit(8)
				.lean()
				.exec(),
			this.projectModel.aggregate([
				{ $group: { _id: '$status', count: { $sum: 1 } } },
			]),
		])
		const revenuePaid =
			paymentsAgg[0]?.total != null ? String(paymentsAgg[0].total) : '0'
		return {
			totalProjects,
			activeProjects,
			pausedProjects,
			overdueTasks,
			lowStockMaterials: materials.filter(
				(m) => parseFloat(m.stockQty) <= parseFloat(m.minStockQty)
			).length,
			revenuePaid,
			pendingPayments,
			statusDistribution: statusGroups.map((item) => ({
				status: item._id,
				count: item.count,
			})),
			recentAudit,
		}
	}
}
