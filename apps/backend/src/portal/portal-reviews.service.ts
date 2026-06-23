import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { ProjectStatus } from '../domain/enums'
import { toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Project } from '../mongo/schemas/project.schema'
import { Review, ReviewStatus } from '../mongo/schemas/review.schema'
import { User } from '../mongo/schemas/user.schema'
import { PortalCreateReviewDto } from './dto/portal-create-review.dto'
import { PortalPatchReviewDto } from './dto/portal-patch-review.dto'
@Injectable()
export class PortalReviewsService {
	constructor(
		@InjectModel(Review.name)
		private readonly reviewModel: Model<Review>,
		@InjectModel(ClientProfile.name)
		private readonly clientProfileModel: Model<ClientProfile>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>
	) {}
	private async requireClientProfile(userId: string) {
		const profile = await this.clientProfileModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!profile) {
			throw new BadRequestException('Client profile not found')
		}
		return profile
	}
	private mapReview(
		r: Review & {
			_id: Types.ObjectId
		}
	) {
		return {
			id: r._id.toString(),
			projectId: r.projectId?.toString() ?? null,
			rating: r.rating,
			title: r.title,
			body: r.body,
			status: r.status,
			publishedAt: r.publishedAt,
			photoUrls: r.photoUrls ?? [],
			createdAt: r.createdAt,
			updatedAt: r.updatedAt,
		}
	}
	async listForClientUser(
		userId: string,
		opts: {
			page?: number
			perPage?: number
			status?: string
			from?: string
			to?: string
			sort?: string
		}
	) {
		const profile = await this.clientProfileModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!profile) {
			return {
				items: [],
				total: 0,
				page: opts.page ?? 1,
				perPage: opts.perPage ?? 20,
			}
		}
		const { page, perPage } = parsePagination(opts.page, opts.perPage)
		const filter: Record<string, unknown> = { clientId: profile._id }
		if (opts.status && opts.status !== 'all') {
			if (
				!Object.values(ReviewStatus).includes(
					opts.status as ReviewStatus
				)
			) {
				throw new BadRequestException('Invalid status filter')
			}
			filter.status = opts.status
		}
		applyDateRangeToWhere(filter, 'createdAt', opts.from, opts.to)
		const rows = await this.reviewModel
			.find(filter)
			.sort(resolveSort(opts.sort, 'createdAt'))
			.lean()
			.exec()
		const seen = new Set<string>()
		const uniqueRows = rows.filter((row) => {
			const key = [
				row.projectId?.toString() ?? '',
				row.title.trim().toLowerCase(),
			].join('|')
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})
		const pageRows = uniqueRows.slice(
			(page - 1) * perPage,
			(page - 1) * perPage + perPage
		)
		const items = await Promise.all(
			pageRows.map(async (r) => {
				const base = this.mapReview(
					r as Review & {
						_id: Types.ObjectId
					}
				)
				let projectCode: string | null = null
				if (r.projectId) {
					const p = await this.projectModel
						.findById(r.projectId)
						.select('code')
						.lean()
						.exec()
					projectCode = p?.code ?? null
				}
				return { ...base, projectCode }
			})
		)
		return {
			items,
			total: uniqueRows.length,
			page,
			perPage,
		}
	}
	async eligibleProjects(userId: string) {
		const profile = await this.requireClientProfile(userId)
		const projects = await this.projectModel
			.find({
				clientId: profile._id,
				status: ProjectStatus.COMPLETED,
			})
			.select('_id code title')
			.lean()
			.exec()
		const out: {
			projectId: string
			code: string
			title: string
		}[] = []
		for (const p of projects) {
			const existing = await this.reviewModel
				.exists({
					clientId: profile._id,
					projectId: p._id,
				})
				.exec()
			if (!existing) {
				out.push({
					projectId: p._id.toString(),
					code: p.code,
					title: p.title,
				})
			}
		}
		return { items: out }
	}
	async createForClientUser(userId: string, dto: PortalCreateReviewDto) {
		const profile = await this.requireClientProfile(userId)
		const projectOid = toObjectId(dto.projectId, 'Invalid projectId')
		const project = await this.projectModel.findById(projectOid).exec()
		if (!project) {
			throw new NotFoundException('Project not found')
		}
		if (!project.clientId.equals(profile._id)) {
			throw new BadRequestException('Project not found')
		}
		if (project.status !== ProjectStatus.COMPLETED) {
			throw new BadRequestException(
				'Reviews can be submitted only for completed projects'
			)
		}
		const existing = await this.reviewModel
			.exists({ clientId: profile._id, projectId: project._id })
			.exec()
		if (existing) {
			throw new BadRequestException(
				'Відгук для цього проєкту вже створено.'
			)
		}
		const photos = (dto.photoUrls ?? []).filter(Boolean).slice(0, 5)
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.select('fullName')
			.lean()
			.exec()
		const row = await this.reviewModel.create({
			clientId: profile._id,
			projectId: project._id,
			rating: dto.rating,
			title: dto.title.trim(),
			body: dto.body.trim(),
			status: ReviewStatus.PENDING,
			photoUrls: photos,
			reviewerName: user?.fullName,
		})
		return this.mapReview(
			row.toObject() as Review & {
				_id: Types.ObjectId
			}
		)
	}

	async updatePendingForClientUser(
		userId: string,
		reviewId: string,
		dto: PortalPatchReviewDto
	) {
		const profile = await this.requireClientProfile(userId)
		const rid = toObjectId(reviewId, 'Invalid review id')
		const row = await this.reviewModel.findById(rid).exec()
		if (!row) {
			throw new NotFoundException('Review not found')
		}
		if (!row.clientId.equals(profile._id)) {
			throw new BadRequestException('Review not found')
		}
		if (row.status !== ReviewStatus.PENDING) {
			throw new BadRequestException(
				'Після модерації або публікації відгук змінити неможливо.'
			)
		}
		const hasUpdate =
			dto.rating !== undefined ||
			dto.title !== undefined ||
			dto.body !== undefined ||
			dto.photoUrls !== undefined
		if (!hasUpdate) {
			throw new BadRequestException('Nothing to update')
		}
		if (dto.rating !== undefined) {
			row.rating = dto.rating
		}
		if (dto.title !== undefined) {
			row.title = dto.title.trim()
		}
		if (dto.body !== undefined) {
			row.body = dto.body.trim()
		}
		if (dto.photoUrls !== undefined) {
			row.photoUrls = (dto.photoUrls ?? []).filter(Boolean).slice(0, 5)
		}
		await row.save()
		return this.mapReview(
			row.toObject() as Review & {
				_id: Types.ObjectId
			}
		)
	}
}
