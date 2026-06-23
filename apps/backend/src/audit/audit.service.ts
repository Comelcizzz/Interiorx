import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { optionalToObjectId, toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { Project } from '../mongo/schemas/project.schema'
import { User } from '../mongo/schemas/user.schema'
export interface LogParams {
	projectId?: string
	userId?: string
	action: string
	entityType: string
	entityId: string
	metadata?: Record<string, unknown>
}
@Injectable()
export class AuditService {
	constructor(
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>
	) {}
	async log(params: LogParams) {
		return this.auditModel.create({
			projectId: optionalToObjectId(params.projectId, 'projectId'),
			userId: optionalToObjectId(params.userId, 'userId'),
			action: params.action,
			entityType: params.entityType,
			entityId: params.entityId,
			metadata: params.metadata,
		})
	}
	async list(filters: {
		entityType?: string
		userId?: string
		projectId?: string
		from?: string
		to?: string
		sort?: string
		page?: number
		perPage?: number
	}) {
		const where: Record<string, unknown> = {}
		if (filters.entityType) where.entityType = filters.entityType
		if (filters.userId)
			where.userId = toObjectId(filters.userId, 'Invalid userId')
		if (filters.projectId)
			where.projectId = toObjectId(filters.projectId, 'Invalid projectId')
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const [rows, total] = await Promise.all([
			this.auditModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.auditModel.countDocuments(where),
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
				const project = row.projectId
					? await this.projectModel
							.findById(row.projectId)
							.select('code title')
							.lean()
							.exec()
					: null
				return {
					...row,
					id: row._id.toString(),
					user: user
						? { fullName: user.fullName, email: user.email }
						: null,
					project: project
						? { code: project.code, title: project.title }
						: null,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async entityTypes() {
		const rows = await this.auditModel.aggregate<{
			_id: string
			count: number
		}>([
			{ $group: { _id: '$entityType', count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
		])
		return rows.map((r) => ({ entityType: r._id, count: r.count }))
	}
}
