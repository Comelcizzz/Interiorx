import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { PublicContactDto } from './dto/public-contact.dto'
import { CatalogService } from '../mongo/schemas/catalog-service.schema'
import { PortfolioItem } from '../mongo/schemas/portfolio-item.schema'
import { Project } from '../mongo/schemas/project.schema'
import { Receipt } from '../mongo/schemas/receipt.schema'
import { ContactSubmission } from '../mongo/schemas/contact-submission.schema'
import { Review, ReviewStatus } from '../mongo/schemas/review.schema'
import { Role } from '../mongo/schemas/role.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { User } from '../mongo/schemas/user.schema'
import { escapeRegExp } from '../lib/regex'
import { applyDateRangeToWhere } from '../lib/list-query'
@Injectable()
export class PublicService {
	constructor(
		@InjectModel(CatalogService.name)
		private readonly catalogModel: Model<CatalogService>,
		@InjectModel(PortfolioItem.name)
		private readonly portfolioModel: Model<PortfolioItem>,
		@InjectModel(Receipt.name)
		private readonly receiptModel: Model<Receipt>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(Review.name)
		private readonly reviewModel: Model<Review>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Role.name)
		private readonly roleModel: Model<Role>,
		@InjectModel(ContactSubmission.name)
		private readonly contactModel: Model<ContactSubmission>
	) {}
	private parsePagination(page?: number, perPage?: number, max = 48) {
		const normalizedPage =
			Number.isFinite(page) && (page ?? 0) > 0 ? Number(page) : 1
		const normalizedPerPage =
			Number.isFinite(perPage) && (perPage ?? 0) > 0
				? Math.min(Number(perPage), max)
				: 12
		return {
			page: normalizedPage,
			perPage: normalizedPerPage,
			skip: (normalizedPage - 1) * normalizedPerPage,
		}
	}
	async catalogServices(filters: {
		page?: number
		perPage?: number
		q?: string
		category?: string
		style?: string
		sort?: string
		from?: string
		to?: string
	}) {
		const where: Record<string, unknown> = { isActive: true }
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		if (filters.q) {
			const re = new RegExp(escapeRegExp(filters.q.trim()), 'i')
			where.$or = [
				{ name: re },
				{ shortDescription: re },
				{ longDescription: re },
			]
		}
		if (filters.category) where.category = filters.category
		if (filters.style) where.style = filters.style
		const sortMap: Record<string, Record<string, 1 | -1>> = {
			popular: { sortOrder: 1, name: 1 },
			price: { basePrice: 1 },
			'-price': { basePrice: -1 },
			name: { name: 1 },
			'-name': { name: -1 },
		}
		const sort = sortMap[filters.sort ?? 'popular'] ?? sortMap.popular
		const { page, perPage, skip } = this.parsePagination(
			filters.page,
			filters.perPage
		)
		const [items, total] = await Promise.all([
			this.catalogModel
				.find(where)
				.sort(sort)
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.catalogModel.countDocuments(where),
		])
		return { items, total, page, perPage }
	}
	async catalogServiceBySlug(slug: string) {
		const row = await this.catalogModel
			.findOne({ slug, isActive: true })
			.lean()
			.exec()
		if (!row) throw new NotFoundException('Service not found')
		const orClause: Record<string, unknown>[] = []
		const styles = Array.isArray(row.style) ? row.style : []
		for (const s of styles) {
			if (s) orClause.push({ style: s })
		}
		const relatedWhere: Record<string, unknown> = { isPublished: true }
		if (orClause.length) {
			relatedWhere.$or = orClause
		}
		const relatedPortfolio = await this.portfolioModel
			.find(relatedWhere)
			.sort({ completedAt: -1, sortOrder: 1 })
			.limit(6)
			.select('slug title summary coverImageUrl category style')
			.lean()
			.exec()
		return {
			...row,
			relatedPortfolio: relatedPortfolio.map((p) => ({
				slug: p.slug,
				title: p.title,
				summary: p.summary,
				coverImageUrl: p.coverImageUrl,
				category: p.category,
				style: p.style,
			})),
		}
	}
	async portfolioList(filters: {
		page?: number
		perPage?: number
		q?: string
		category?: string
		style?: string
		sort?: string
		from?: string
		to?: string
	}) {
		const where: Record<string, unknown> = { isPublished: true }
		applyDateRangeToWhere(where, 'completedAt', filters.from, filters.to)
		if (filters.q) {
			const re = new RegExp(escapeRegExp(filters.q.trim()), 'i')
			where.$or = [{ title: re }, { summary: re }, { description: re }]
		}
		if (filters.category) where.category = filters.category
		if (filters.style) where.style = filters.style
		const sortMap: Record<string, Record<string, 1 | -1>> = {
			latest: { completedAt: -1, sortOrder: 1 },
			oldest: { completedAt: 1, sortOrder: 1 },
			title: { title: 1 },
		}
		const sort = sortMap[filters.sort ?? 'latest'] ?? sortMap.latest
		const { page, perPage, skip } = this.parsePagination(
			filters.page,
			filters.perPage
		)
		const [items, total] = await Promise.all([
			this.portfolioModel
				.find(where)
				.sort(sort)
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.portfolioModel.countDocuments(where),
		])
		return { items, total, page, perPage }
	}
	async reviews(filters: {
		page?: number
		perPage?: number
		sort?: string
		minRating?: number
		from?: string
		to?: string
	}) {
		const basePublished = { status: ReviewStatus.PUBLISHED }
		const where: Record<string, unknown> = { ...basePublished }
		applyDateRangeToWhere(where, 'publishedAt', filters.from, filters.to)
		if (filters.minRating != null && Number.isFinite(filters.minRating)) {
			const m = Math.min(
				5,
				Math.max(1, Math.floor(Number(filters.minRating)))
			)
			where.rating = { $gte: m }
		}
		let sort: Record<string, 1 | -1>
		switch (filters.sort) {
			case 'rating':
				sort = { rating: -1, publishedAt: -1 }
				break
			case 'rating_asc':
				sort = { rating: 1, publishedAt: -1 }
				break
			case 'oldest':
				sort = { publishedAt: 1, createdAt: 1 }
				break
			default:
				sort = { publishedAt: -1, createdAt: -1 }
		}
		const { page, perPage, skip } = this.parsePagination(
			filters.page,
			filters.perPage
		)
		const rows = await this.reviewModel.find(where).sort(sort).lean().exec()
		const seen = new Set<string>()
		const uniqueRows = rows.filter((row) => {
			const key = [
				row.clientId?.toString() ?? '',
				row.projectId?.toString() ?? '',
				row.title,
			].join('|')
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})
		const items = uniqueRows.slice(skip, skip + perPage)
		const total = uniqueRows.length
		const histogram: Record<string, number> = {
			'1': 0,
			'2': 0,
			'3': 0,
			'4': 0,
			'5': 0,
		}
		for (const row of uniqueRows) {
			const key = String(row.rating)
			if (histogram[key] !== undefined) {
				histogram[key] += 1
			}
		}
		const ratingTotal = uniqueRows.reduce((sum, row) => sum + row.rating, 0)
		const avgRating = uniqueRows.length
			? Math.round((ratingTotal / uniqueRows.length) * 10) / 10
			: null
		return { items, total, page, perPage, histogram, avgRating }
	}
	async portfolioBySlug(slug: string) {
		const row = await this.portfolioModel
			.findOne({ slug, isPublished: true })
			.lean()
			.exec()
		if (!row) throw new NotFoundException('Portfolio item not found')
		return row
	}
	async teamMembers() {
		const profiles = await this.staffModel
			.find()
			.sort({ createdAt: 1 })
			.limit(100)
			.lean()
			.exec()
		if (!profiles.length) return { items: [] }
		const userIds = profiles.map((p) => p.userId)
		const users = await this.userModel
			.find({ _id: { $in: userIds }, isActive: true })
			.select('fullName title email roleId')
			.lean()
			.exec()
		const userById = new Map(users.map((u) => [u._id.toString(), u]))
		const roleIds = [...new Set(users.map((u) => u.roleId.toString()))]
		const roles = await this.roleModel
			.find({ _id: { $in: roleIds.map((id) => new Types.ObjectId(id)) } })
			.lean()
			.exec()
		const roleById = new Map(roles.map((r) => [r._id.toString(), r]))
		const items = profiles
			.map((p) => {
				const u = userById.get(p.userId.toString())
				if (!u) return null
				const role = roleById.get(u.roleId.toString())
				return {
					id: p._id.toString(),
					fullName: u.fullName,
					headline: u.title ?? role?.name ?? 'Team specialist',
					roleCode: role?.code ?? '',
					roleName: role?.name ?? '',
					specialization: p.specialization,
				}
			})
			.filter((row): row is NonNullable<typeof row> => Boolean(row))
		return { items }
	}
	async submitContact(dto: PublicContactDto) {
		const doc = await this.contactModel.create({
			fullName: dto.fullName.trim(),
			email: dto.email.trim(),
			phone: dto.phone?.trim() || undefined,
			message: dto.message.trim(),
			attachmentUrl: dto.attachmentUrl?.trim() || undefined,
		})
		return { id: doc.id, ok: true }
	}
	async verifyReceipt(number: string) {
		const receipt = await this.receiptModel
			.findOne({ number })
			.lean()
			.exec()
		if (!receipt) throw new NotFoundException('Receipt not found')
		const project = await this.projectModel
			.findById(receipt.projectId)
			.select('code')
			.lean()
			.exec()
		return {
			number: receipt.number,
			status: receipt.status,
			amount: receipt.amount,
			currency: receipt.currency,
			issuedAt: receipt.issuedAt,
			projectCode: project?.code ?? null,
		}
	}
}
