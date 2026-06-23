import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
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
@Injectable()
export class ReviewsModerationService {
	constructor(
		@InjectModel(Review.name)
		private readonly reviewModel: Model<Review>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(ClientProfile.name)
		private readonly clientProfileModel: Model<ClientProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>
	) {}
	async list(filters: {
		status?: string
		page?: number
		perPage?: number
		from?: string
		to?: string
		sort?: string
	}) {
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const raw = (filters.status ?? '').trim().toUpperCase()
		const effective = raw === '' ? 'PENDING' : raw
		const where: Record<string, unknown> = {}
		if (effective === 'ALL') {
		} else {
			if (
				!Object.values(ReviewStatus).includes(effective as ReviewStatus)
			) {
				throw new BadRequestException('Invalid status filter')
			}
			where.status = effective
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const [total, rows] = await Promise.all([
			this.reviewModel.countDocuments(where).exec(),
			this.reviewModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
		])
		const projectOids = rows
			.map((r) => r.projectId)
			.filter((id): id is Types.ObjectId => id != null)
		const clientOids = rows.map((r) => r.clientId)
		const [projects, profiles] = await Promise.all([
			projectOids.length
				? this.projectModel
						.find({ _id: { $in: projectOids } })
						.select('_id code title')
						.lean()
						.exec()
				: [],
			clientOids.length
				? this.clientProfileModel
						.find({ _id: { $in: clientOids } })
						.select('_id userId')
						.lean()
						.exec()
				: [],
		])
		const projectMap = new Map(projects.map((p) => [p._id.toString(), p]))
		const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]))
		const userIds = [...new Set(profiles.map((p) => p.userId.toString()))]
		const users =
			userIds.length > 0
				? await this.userModel
						.find({
							_id: {
								$in: userIds.map(
									(id) => new Types.ObjectId(id)
								),
							},
						})
						.select('_id fullName')
						.lean()
						.exec()
				: []
		const userMap = new Map(users.map((u) => [u._id.toString(), u]))
		const items = rows.map((r) => {
			const proj = r.projectId
				? projectMap.get(r.projectId.toString())
				: undefined
			const profile = profileMap.get(r.clientId.toString())
			const user = profile
				? userMap.get(profile.userId.toString())
				: undefined
			return {
				id: (
					r as {
						_id: Types.ObjectId
					}
				)._id.toString(),
				rating: r.rating,
				title: r.title,
				body: r.body,
				status: r.status,
				photoUrls: r.photoUrls ?? [],
				reviewerName: r.reviewerName ?? null,
				clientDisplayName: user?.fullName ?? null,
				projectId: r.projectId?.toString() ?? null,
				projectCode: proj?.code ?? null,
				projectTitle: proj?.title ?? null,
				publishedAt: r.publishedAt,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
			}
		})
		return { items, total, page, perPage }
	}
	async publish(id: string) {
		const oid = toObjectId(id, 'Invalid review id')
		const row = await this.reviewModel.findById(oid).exec()
		if (!row) throw new NotFoundException('Review not found')
		row.status = ReviewStatus.PUBLISHED
		row.publishedAt = new Date()
		await row.save()
		return {
			id: row._id.toString(),
			status: row.status,
			publishedAt: row.publishedAt,
		}
	}
	async hide(id: string) {
		const oid = toObjectId(id, 'Invalid review id')
		const row = await this.reviewModel.findById(oid).exec()
		if (!row) throw new NotFoundException('Review not found')
		row.status = ReviewStatus.HIDDEN
		await row.save()
		return { id: row._id.toString(), status: row.status }
	}
}
