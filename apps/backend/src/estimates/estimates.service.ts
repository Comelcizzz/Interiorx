import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { optionalToObjectId, toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { escapeRegExp } from '../lib/regex'
import { EstimateStatus, RoleCode } from '../domain/enums'
import { Approval } from '../mongo/schemas/approval.schema'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { EstimateItem } from '../mongo/schemas/estimate-item.schema'
import { Estimate } from '../mongo/schemas/estimate.schema'
import { Notification } from '../mongo/schemas/notification.schema'
import { Project } from '../mongo/schemas/project.schema'
import { PaymentsService } from '../payments/payments.service'
import { ProjectsService } from '../projects/projects.service'
import { CreateEstimateDto } from './dto/create-estimate.dto'
import { RejectEstimateDto } from './dto/reject-estimate.dto'
@Injectable()
export class EstimatesService {
	constructor(
		@InjectModel(Estimate.name)
		private readonly estimateModel: Model<Estimate>,
		@InjectModel(EstimateItem.name)
		private readonly estimateItemModel: Model<EstimateItem>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(ClientProfile.name)
		private readonly clientProfileModel: Model<ClientProfile>,
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>,
		@InjectModel(Approval.name)
		private readonly approvalModel: Model<Approval>,
		@InjectModel(Notification.name)
		private readonly notificationModel: Model<Notification>,
		private readonly paymentsService: PaymentsService,
		private readonly projectsService: ProjectsService
	) {}
	private async getClientProfileId(
		userId: string
	): Promise<Types.ObjectId | null> {
		const row = await this.clientProfileModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.select('_id')
			.lean()
			.exec()
		return row?._id ?? null
	}
	private async assertClientOwnsEstimateProject(
		projectId: Types.ObjectId,
		userId: string
	): Promise<Types.ObjectId> {
		const clientProfileId = await this.getClientProfileId(userId)
		if (!clientProfileId) {
			throw new ForbiddenException('Client profile required')
		}
		const project = await this.projectModel
			.findById(projectId)
			.select('clientId')
			.lean()
			.exec()
		if (!project || !project.clientId.equals(clientProfileId)) {
			throw new ForbiddenException('Access denied')
		}
		return clientProfileId
	}
	private async assertClientCanMutateSentEstimate(
		estimate: Estimate,
		userId: string
	): Promise<void> {
		if (estimate.status !== EstimateStatus.SENT) {
			throw new BadRequestException(
				'Estimate is not awaiting your response'
			)
		}
		await this.assertClientOwnsEstimateProject(
			estimate.projectId as Types.ObjectId,
			userId
		)
	}
	async list(
		filters: {
			projectId?: string
			status?: string
			q?: string
			page?: number
			perPage?: number
			from?: string
			to?: string
			sort?: string
		},
		userId: string,
		role: RoleCode
	) {
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const projectId = filters.projectId
		const statusQuery = filters.status
		let where: Record<string, unknown> = {}
		if (role === RoleCode.CLIENT) {
			const clientProfileId = await this.getClientProfileId(userId)
			if (!clientProfileId) {
				return { items: [], total: 0, page, perPage }
			}
			if (projectId) {
				const pid = optionalToObjectId(projectId, 'projectId')
				const project = await this.projectModel
					.findById(pid)
					.select('clientId')
					.lean()
					.exec()
				if (!project || !project.clientId.equals(clientProfileId)) {
					return { items: [], total: 0, page, perPage }
				}
				where = { projectId: pid }
			} else {
				const projects = await this.projectModel
					.find({ clientId: clientProfileId })
					.select('_id')
					.lean()
					.exec()
				const ids = projects.map((p) => p._id)
				if (!ids.length) {
					return { items: [], total: 0, page, perPage }
				}
				where = { projectId: { $in: ids } }
			}
		} else {
			const pid = optionalToObjectId(projectId, 'projectId')
			where = pid ? { projectId: pid } : {}
			const q = statusQuery?.trim()
			if (q && q !== 'ALL') {
				if (
					!Object.values(EstimateStatus).includes(q as EstimateStatus)
				) {
					throw new BadRequestException('Invalid status filter')
				}
				where.status = q
			}
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const term = filters.q?.trim()
		if (term && role !== RoleCode.CLIENT) {
			const re = new RegExp(escapeRegExp(term), 'i')
			const projects = await this.projectModel
				.find({ $or: [{ code: re }, { title: re }] })
				.select('_id')
				.lean()
				.exec()
			const ids = projects.map((p) => p._id)
			if (ids.length) {
				where.projectId = { $in: ids }
			} else {
				return { items: [], total: 0, page, perPage }
			}
		}
		const [rows, total] = await Promise.all([
			this.estimateModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.estimateModel.countDocuments(where),
		])
		const estimateIdStrings = rows.map((e) => e._id.toString())
		const commentByEstimateId = new Map<string, string>()
		const commentSourceByEstimateId = new Map<
			string,
			'changes_requested' | 'estimate_rejected'
		>()
		if (estimateIdStrings.length && role !== RoleCode.CLIENT) {
			const audits = await this.auditModel
				.find({
					action: {
						$in: [
							'estimate.changes_requested',
							'estimate.rejected',
						],
					},
					entityType: 'Estimate',
					entityId: { $in: estimateIdStrings },
				})
				.sort({ createdAt: -1 })
				.lean()
				.exec()
			for (const a of audits) {
				if (a.action !== 'estimate.changes_requested') continue
				const eid = a.entityId
				if (commentByEstimateId.has(eid)) continue
				const raw = a.metadata?.comment
				const c =
					typeof raw === 'string' && raw.trim() ? raw.trim() : ''
				if (!c) continue
				commentByEstimateId.set(eid, c)
				commentSourceByEstimateId.set(eid, 'changes_requested')
			}
			for (const a of audits) {
				if (a.action !== 'estimate.rejected') continue
				const eid = a.entityId
				if (commentByEstimateId.has(eid)) continue
				const raw = a.metadata?.comment
				const c =
					typeof raw === 'string' && raw.trim() ? raw.trim() : ''
				if (!c) continue
				commentByEstimateId.set(eid, c)
				commentSourceByEstimateId.set(eid, 'estimate_rejected')
			}
		}
		const items = await Promise.all(
			rows.map(async (e) => {
				const project = await this.projectModel
					.findById(e.projectId)
					.select('id code title status')
					.lean()
					.exec()
				const items = await this.estimateItemModel
					.find({ estimateId: e._id })
					.sort({ sortOrder: 1 })
					.lean()
					.exec()
				const itemCount = items.length
				const approvalCount = await this.approvalModel.countDocuments({
					estimateId: e._id,
				})
				return {
					...e,
					id: e._id.toString(),
					subtotal: e.subtotal,
					discount: e.discount,
					tax: e.tax,
					margin: e.margin,
					total: e.total,
					project,
					items: items.map((i) => ({
						...i,
						id: i._id.toString(),
						quantity: i.quantity,
						unitPrice: i.unitPrice,
						total: i.total,
					})),
					_count: { items: itemCount, approvals: approvalCount },
					clientChangeComment:
						role !== RoleCode.CLIENT
							? commentByEstimateId.get(e._id.toString())
							: undefined,
					estimateCommentSource:
						role !== RoleCode.CLIENT
							? commentSourceByEstimateId.get(e._id.toString())
							: undefined,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async findOne(id: string, userId: string, role: RoleCode) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.lean()
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		if (role === RoleCode.CLIENT) {
			const clientProfileId = await this.getClientProfileId(userId)
			if (!clientProfileId) {
				throw new NotFoundException('Estimate not found')
			}
			const project = await this.projectModel
				.findById(estimate.projectId)
				.select('clientId')
				.lean()
				.exec()
			if (!project || !project.clientId.equals(clientProfileId)) {
				throw new NotFoundException('Estimate not found')
			}
		}
		const project = await this.projectModel
			.findById(estimate.projectId)
			.select('id code title status')
			.lean()
			.exec()
		const items = await this.estimateItemModel
			.find({ estimateId: estimate._id })
			.sort({ sortOrder: 1 })
			.lean()
			.exec()
		const approvals = await this.approvalModel
			.find({ estimateId: estimate._id })
			.sort({ createdAt: -1 })
			.limit(5)
			.lean()
			.exec()
		return {
			...estimate,
			id: estimate._id.toString(),
			subtotal: estimate.subtotal,
			discount: estimate.discount,
			tax: estimate.tax,
			margin: estimate.margin,
			total: estimate.total,
			project,
			items: items.map((i) => ({
				...i,
				id: i._id.toString(),
				quantity: i.quantity,
				unitPrice: i.unitPrice,
				total: i.total,
			})),
			approvals,
		}
	}
	async create(dto: CreateEstimateDto) {
		const project = await this.projectModel
			.findById(toObjectId(dto.projectId, 'Invalid projectId'))
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		const last = await this.estimateModel
			.findOne({ projectId: project._id })
			.sort({ version: -1 })
			.select('version')
			.lean()
			.exec()
		const version = (last?.version ?? 0) + 1
		const subtotal = dto.items.reduce(
			(sum, item) => sum + item.quantity * item.unitPrice,
			0
		)
		const discount = dto.discount ?? 0
		const tax = dto.tax ?? 0
		const margin = dto.margin ?? 0
		const total = subtotal - discount + tax + margin
		const estimate = await this.estimateModel.create({
			projectId: project._id,
			version,
			status: EstimateStatus.DRAFT,
			subtotal: String(subtotal),
			discount: String(discount),
			tax: String(tax),
			margin: String(margin),
			total: String(total),
			validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
		})
		for (let idx = 0; idx < dto.items.length; idx++) {
			const item = dto.items[idx]
			await this.estimateItemModel.create({
				estimateId: estimate._id,
				category: item.category,
				title: item.title,
				unit: item.unit,
				quantity: String(item.quantity),
				unitPrice: String(item.unitPrice),
				total: String(item.quantity * item.unitPrice),
				sortOrder: item.sortOrder ?? idx,
			})
		}
		const items = await this.estimateItemModel
			.find({ estimateId: estimate._id })
			.lean()
			.exec()
		await this.auditModel.create({
			projectId: project._id,
			action: 'estimate.created',
			entityType: 'Estimate',
			entityId: estimate.id,
			metadata: { version, total },
		})
		return { ...estimate.toObject(), items }
	}
	async approve(id: string, userId: string, role: RoleCode) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		if (role === RoleCode.CLIENT) {
			await this.assertClientCanMutateSentEstimate(estimate, userId)
		}
		if (estimate.status === EstimateStatus.APPROVED)
			throw new BadRequestException('Already approved')
		const prev = estimate.status
		estimate.status = EstimateStatus.APPROVED
		await estimate.save()
		await this.projectsService.syncProjectApprovedBudget(
			estimate.projectId as Types.ObjectId
		)
		await this.auditModel.create({
			projectId: estimate.projectId,
			action: 'estimate.approved',
			entityType: 'Estimate',
			entityId: id,
			metadata: { prevStatus: prev },
		})
		if (role === RoleCode.CLIENT) {
			const project = await this.projectModel
				.findById(estimate.projectId)
				.select('code clientId')
				.lean()
				.exec()
			await this.notificationModel.create({
				title: 'Кошторис погоджено',
				body: 'Дякуємо! Команда підготує наступні кроки (рахунок, графік робіт).',
				userId: new Types.ObjectId(userId),
				projectId: estimate.projectId,
				entityType: 'Estimate',
				entityId: id,
				link: project
					? `/portal/projects/${encodeURIComponent(project.code)}`
					: undefined,
			})
			await this.notificationModel.create({
				title: 'Клієнт погодив кошторис',
				body: `Кошторис v${estimate.version} для ${project?.code ?? 'проєкту'} погоджено клієнтом.`,
				roleCode: RoleCode.PROJECT_MANAGER,
				projectId: estimate.projectId,
				entityType: 'Estimate',
				entityId: id,
				link: '/workspace/estimates',
			})
			if (project?.clientId && project.code) {
				await this.paymentsService.ensureSentInvoiceForApprovedEstimate(
					estimate.projectId as Types.ObjectId,
					project.clientId as Types.ObjectId,
					project.code,
					estimate.version,
					estimate.total
				)
			}
		}
		return estimate
	}
	async reject(
		id: string,
		userId: string,
		role: RoleCode,
		dto: RejectEstimateDto
	) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		if (role === RoleCode.CLIENT) {
			await this.assertClientCanMutateSentEstimate(estimate, userId)
		}
		if (estimate.status === EstimateStatus.REJECTED)
			throw new BadRequestException('Already rejected')
		const prev = estimate.status
		estimate.status = EstimateStatus.REJECTED
		await estimate.save()
		const comment = dto?.comment?.trim() ?? ''
		if (role === RoleCode.CLIENT) {
			await this.auditModel.create({
				projectId: estimate.projectId,
				action: 'estimate.changes_requested',
				entityType: 'Estimate',
				entityId: id,
				metadata: { prevStatus: prev, comment },
			})
		} else {
			await this.auditModel.create({
				projectId: estimate.projectId,
				action: 'estimate.rejected',
				entityType: 'Estimate',
				entityId: id,
				metadata: { prevStatus: prev, ...(comment ? { comment } : {}) },
			})
		}
		return estimate
	}
	async send(id: string) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		const s = estimate.status
		if (s === EstimateStatus.PRICING) {
			throw new BadRequestException(
				'Move the estimate to pending review before sending it to the client'
			)
		}
		if (s !== EstimateStatus.DRAFT && s !== EstimateStatus.PENDING_REVIEW) {
			throw new BadRequestException(`Cannot send estimate in status ${s}`)
		}
		estimate.status = EstimateStatus.SENT
		await estimate.save()
		await this.auditModel.create({
			projectId: estimate.projectId,
			action: 'estimate.sent',
			entityType: 'Estimate',
			entityId: id,
			metadata: { fromStatus: s },
		})
		const project = await this.projectModel
			.findById(estimate.projectId)
			.select('code clientId')
			.lean()
			.exec()
		if (project?.clientId) {
			const client = await this.clientProfileModel
				.findById(project.clientId)
				.select('userId')
				.lean()
				.exec()
			if (client?.userId) {
				await this.notificationModel.create({
					title: 'Кошторис надіслано',
					body: `Кошторис v${estimate.version} для проєкту ${project.code} готовий до перегляду та погодження.`,
					userId: client.userId,
					projectId: estimate.projectId,
					entityType: 'Estimate',
					entityId: id,
					link: `/portal/projects/${encodeURIComponent(project.code)}`,
				})
			}
		}
		return estimate
	}
	async advanceToPricing(id: string) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		if (estimate.status !== EstimateStatus.DRAFT) {
			throw new BadRequestException(
				'Only draft estimates can enter pricing'
			)
		}
		estimate.status = EstimateStatus.PRICING
		await estimate.save()
		await this.auditModel.create({
			projectId: estimate.projectId,
			action: 'estimate.pricing',
			entityType: 'Estimate',
			entityId: id,
		})
		return estimate
	}
	async advanceToPendingReview(id: string) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		if (estimate.status !== EstimateStatus.PRICING) {
			throw new BadRequestException(
				'Estimate must be in pricing before internal review'
			)
		}
		estimate.status = EstimateStatus.PENDING_REVIEW
		await estimate.save()
		await this.auditModel.create({
			projectId: estimate.projectId,
			action: 'estimate.pending_review',
			entityType: 'Estimate',
			entityId: id,
		})
		return estimate
	}
	async remove(id: string) {
		const estimate = await this.estimateModel
			.findById(toObjectId(id))
			.exec()
		if (!estimate) throw new NotFoundException('Estimate not found')
		await this.estimateItemModel.deleteMany({ estimateId: estimate._id })
		await estimate.deleteOne()
		return { deleted: true }
	}
}
