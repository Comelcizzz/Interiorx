import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { RoleCode } from '../domain/enums'
import { toObjectId } from '../lib/object-id'
import { CatalogService } from '../mongo/schemas/catalog-service.schema'
import { PortfolioItem } from '../mongo/schemas/portfolio-item.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import {
	CreateWorkspaceCatalogDto,
	UpdateWorkspaceCatalogDto,
} from './dto/workspace-catalog.dto'
import {
	CreateWorkspacePortfolioDto,
	UpdateWorkspacePortfolioDto,
} from './dto/workspace-portfolio.dto'
function mapCatalog(
	row: CatalogService & {
		_id: Types.ObjectId
	}
) {
	return {
		id: row._id.toString(),
		slug: row.slug,
		name: row.name,
		shortDescription: row.shortDescription,
		longDescription: row.longDescription,
		basePrice: row.basePrice,
		priceUnit: row.priceUnit,
		style: row.style ?? [],
		isActive: row.isActive,
		sortOrder: row.sortOrder,
		heroImageUrl: row.heroImageUrl,
		galleryImageUrls: row.galleryImageUrls ?? [],
		ownerStaffId: row.ownerStaffId?.toString() ?? null,
		createdAt: (
			row as {
				createdAt?: Date
			}
		).createdAt,
		updatedAt: (
			row as {
				updatedAt?: Date
			}
		).updatedAt,
	}
}
function mapPortfolio(
	row: PortfolioItem & {
		_id: Types.ObjectId
	}
) {
	return {
		id: row._id.toString(),
		slug: row.slug,
		title: row.title,
		summary: row.summary,
		description: row.description,
		category: row.category,
		style: row.style,
		completedAt: row.completedAt,
		isPublished: row.isPublished,
		sortOrder: row.sortOrder,
		coverImageUrl: row.coverImageUrl,
		galleryImageUrls: row.galleryImageUrls ?? [],
		projectId: row.projectId?.toString() ?? null,
		ownerStaffId: row.ownerStaffId?.toString() ?? null,
		createdAt: (
			row as {
				createdAt?: Date
			}
		).createdAt,
		updatedAt: (
			row as {
				updatedAt?: Date
			}
		).updatedAt,
	}
}
@Injectable()
export class MarketingWorkspaceService {
	constructor(
		@InjectModel(CatalogService.name)
		private readonly catalogModel: Model<CatalogService>,
		@InjectModel(PortfolioItem.name)
		private readonly portfolioModel: Model<PortfolioItem>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>
	) {}
	private async staffOidForUser(
		userId: string
	): Promise<Types.ObjectId | null> {
		const s = await this.staffModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.select('_id')
			.lean()
			.exec()
		return s?._id ?? null
	}
	private assertDesignerOwnsRecord(
		role: RoleCode,
		staffOid: Types.ObjectId | null,
		ownerStaffId?: Types.ObjectId | null
	) {
		if (role === RoleCode.ADMIN) return
		if (role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		if (!staffOid) {
			throw new ForbiddenException('Staff profile required')
		}
		if (!ownerStaffId || !ownerStaffId.equals(staffOid)) {
			throw new ForbiddenException(
				'You can only manage your own catalog entries'
			)
		}
	}
	async listCatalog(userId: string, role: RoleCode, page = 1, perPage = 24) {
		const p = Math.max(1, page)
		const pp = Math.min(100, Math.max(1, perPage))
		const filter: Record<string, unknown> = {}
		if (role === RoleCode.DESIGNER) {
			const sid = await this.staffOidForUser(userId)
			if (!sid) return { items: [], total: 0, page: p, perPage: pp }
			filter.ownerStaffId = sid
		} else if (role !== RoleCode.ADMIN) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const [total, rows] = await Promise.all([
			this.catalogModel.countDocuments(filter).exec(),
			this.catalogModel
				.find(filter)
				.sort({ sortOrder: 1, name: 1 })
				.skip((p - 1) * pp)
				.limit(pp)
				.lean()
				.exec(),
		])
		return {
			items: rows.map((r) =>
				mapCatalog(
					r as CatalogService & {
						_id: Types.ObjectId
					}
				)
			),
			total,
			page: p,
			perPage: pp,
		}
	}
	async getCatalog(id: string, userId: string, role: RoleCode) {
		const oid = toObjectId(id, 'Invalid id')
		const row = await this.catalogModel.findById(oid).lean().exec()
		if (!row) throw new NotFoundException('Catalog service not found')
		this.assertDesignerOwnsRecord(
			role,
			await this.staffOidForUser(userId),
			row.ownerStaffId as Types.ObjectId | undefined
		)
		return mapCatalog(
			row as CatalogService & {
				_id: Types.ObjectId
			}
		)
	}
	async createCatalog(
		userId: string,
		role: RoleCode,
		dto: CreateWorkspaceCatalogDto
	) {
		if (role !== RoleCode.ADMIN && role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const slug = dto.slug.trim().toLowerCase()
		const exists = await this.catalogModel.exists({ slug }).exec()
		if (exists) throw new ConflictException('Slug already in use')
		let ownerStaffId: Types.ObjectId | undefined
		if (role === RoleCode.DESIGNER) {
			const sid = await this.staffOidForUser(userId)
			if (!sid) throw new ForbiddenException('Staff profile required')
			ownerStaffId = sid
		} else {
			ownerStaffId = dto.resolveOwnerStaffOid()
		}
		const row = await this.catalogModel.create({
			slug,
			name: dto.name.trim(),
			shortDescription: dto.shortDescription?.trim() ?? '',
			longDescription: dto.longDescription?.trim() ?? '',
			basePrice: dto.basePrice?.trim() ?? '0',
			priceUnit: dto.priceUnit?.trim() ?? 'project',
			style: dto.style ?? [],
			isActive: dto.isActive ?? true,
			sortOrder: dto.sortOrder ?? 0,
			heroImageUrl: dto.heroImageUrl,
			galleryImageUrls: dto.galleryImageUrls ?? [],
			ownerStaffId,
		})
		return mapCatalog(
			row.toObject() as CatalogService & {
				_id: Types.ObjectId
			}
		)
	}
	async updateCatalog(
		id: string,
		userId: string,
		role: RoleCode,
		dto: UpdateWorkspaceCatalogDto
	) {
		if (role !== RoleCode.ADMIN && role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const oid = toObjectId(id, 'Invalid id')
		const row = await this.catalogModel.findById(oid).exec()
		if (!row) throw new NotFoundException('Catalog service not found')
		this.assertDesignerOwnsRecord(
			role,
			await this.staffOidForUser(userId),
			row.ownerStaffId as Types.ObjectId | undefined
		)
		if (dto.slug != null) {
			const slug = dto.slug.trim().toLowerCase()
			const clash = await this.catalogModel
				.findOne({ slug, _id: { $ne: oid } })
				.exec()
			if (clash) throw new ConflictException('Slug already in use')
			row.slug = slug
		}
		if (dto.name != null) row.name = dto.name.trim()
		if (dto.shortDescription != null)
			row.shortDescription = dto.shortDescription
		if (dto.longDescription != null)
			row.longDescription = dto.longDescription
		if (dto.basePrice != null) row.basePrice = dto.basePrice
		if (dto.priceUnit != null) row.priceUnit = dto.priceUnit
		if (dto.style != null) row.style = dto.style
		if (dto.isActive != null) row.isActive = dto.isActive
		if (dto.sortOrder != null) row.sortOrder = dto.sortOrder
		if (dto.heroImageUrl != null) row.heroImageUrl = dto.heroImageUrl
		if (dto.galleryImageUrls != null)
			row.galleryImageUrls = dto.galleryImageUrls
		const nextOwner = dto.resolveOwnerStaffOid()
		if (nextOwner !== undefined) {
			if (role !== RoleCode.ADMIN) {
				throw new ForbiddenException('Only admins can reassign owner')
			}
			row.ownerStaffId = nextOwner ?? undefined
		}
		await row.save()
		return mapCatalog(
			row.toObject() as CatalogService & {
				_id: Types.ObjectId
			}
		)
	}
	async deleteCatalog(id: string, userId: string, role: RoleCode) {
		if (role !== RoleCode.ADMIN && role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const oid = toObjectId(id, 'Invalid id')
		const row = await this.catalogModel.findById(oid).exec()
		if (!row) throw new NotFoundException('Catalog service not found')
		this.assertDesignerOwnsRecord(
			role,
			await this.staffOidForUser(userId),
			row.ownerStaffId as Types.ObjectId | undefined
		)
		await row.deleteOne()
		return { ok: true }
	}
	async listPortfolio(
		userId: string,
		role: RoleCode,
		page = 1,
		perPage = 24
	) {
		const p = Math.max(1, page)
		const pp = Math.min(100, Math.max(1, perPage))
		const filter: Record<string, unknown> = {}
		if (role === RoleCode.DESIGNER) {
			const sid = await this.staffOidForUser(userId)
			if (!sid) return { items: [], total: 0, page: p, perPage: pp }
			filter.ownerStaffId = sid
		} else if (role !== RoleCode.ADMIN) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const [total, rows] = await Promise.all([
			this.portfolioModel.countDocuments(filter).exec(),
			this.portfolioModel
				.find(filter)
				.sort({ sortOrder: 1, title: 1 })
				.skip((p - 1) * pp)
				.limit(pp)
				.lean()
				.exec(),
		])
		return {
			items: rows.map((r) =>
				mapPortfolio(
					r as PortfolioItem & {
						_id: Types.ObjectId
					}
				)
			),
			total,
			page: p,
			perPage: pp,
		}
	}
	async getPortfolio(id: string, userId: string, role: RoleCode) {
		const oid = toObjectId(id, 'Invalid id')
		const row = await this.portfolioModel.findById(oid).lean().exec()
		if (!row) throw new NotFoundException('Portfolio item not found')
		this.assertDesignerOwnsRecord(
			role,
			await this.staffOidForUser(userId),
			row.ownerStaffId as Types.ObjectId | undefined
		)
		return mapPortfolio(
			row as PortfolioItem & {
				_id: Types.ObjectId
			}
		)
	}
	async createPortfolio(
		userId: string,
		role: RoleCode,
		dto: CreateWorkspacePortfolioDto
	) {
		if (role !== RoleCode.ADMIN && role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const slug = dto.slug.trim().toLowerCase()
		const exists = await this.portfolioModel.exists({ slug }).exec()
		if (exists) throw new ConflictException('Slug already in use')
		let ownerStaffId: Types.ObjectId | undefined
		if (role === RoleCode.DESIGNER) {
			const sid = await this.staffOidForUser(userId)
			if (!sid) throw new ForbiddenException('Staff profile required')
			ownerStaffId = sid
		} else {
			ownerStaffId = dto.resolveOwnerStaffOid()
		}
		let completedAt: Date | undefined
		if (dto.completedAt) {
			const d = new Date(dto.completedAt)
			if (Number.isNaN(d.getTime()))
				throw new BadRequestException('Invalid completedAt')
			completedAt = d
		}
		const row = await this.portfolioModel.create({
			slug,
			title: dto.title.trim(),
			summary: dto.summary?.trim() ?? '',
			description: dto.description?.trim() ?? '',
			category: dto.category?.trim() ?? '',
			style: dto.style?.trim() ?? '',
			completedAt,
			isPublished: dto.isPublished ?? false,
			sortOrder: dto.sortOrder ?? 0,
			coverImageUrl: dto.coverImageUrl?.trim() ?? '',
			galleryImageUrls: dto.galleryImageUrls ?? [],
			projectId: dto.resolveProjectOid(),
			ownerStaffId,
		})
		return mapPortfolio(
			row.toObject() as PortfolioItem & {
				_id: Types.ObjectId
			}
		)
	}
	async updatePortfolio(
		id: string,
		userId: string,
		role: RoleCode,
		dto: UpdateWorkspacePortfolioDto
	) {
		if (role !== RoleCode.ADMIN && role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const oid = toObjectId(id, 'Invalid id')
		const row = await this.portfolioModel.findById(oid).exec()
		if (!row) throw new NotFoundException('Portfolio item not found')
		this.assertDesignerOwnsRecord(
			role,
			await this.staffOidForUser(userId),
			row.ownerStaffId as Types.ObjectId | undefined
		)
		if (dto.slug != null) {
			const slug = dto.slug.trim().toLowerCase()
			const clash = await this.portfolioModel
				.findOne({ slug, _id: { $ne: oid } })
				.exec()
			if (clash) throw new ConflictException('Slug already in use')
			row.slug = slug
		}
		if (dto.title != null) row.title = dto.title.trim()
		if (dto.summary != null) row.summary = dto.summary
		if (dto.description != null) row.description = dto.description
		if (dto.category != null) row.category = dto.category
		if (dto.style != null) row.style = dto.style
		if (dto.isPublished != null) row.isPublished = dto.isPublished
		if (dto.sortOrder != null) row.sortOrder = dto.sortOrder
		if (dto.coverImageUrl != null) row.coverImageUrl = dto.coverImageUrl
		if (dto.galleryImageUrls != null)
			row.galleryImageUrls = dto.galleryImageUrls
		if (dto.completedAt !== undefined) {
			if (dto.completedAt === null || dto.completedAt === '') {
				row.completedAt = undefined
			} else {
				const d = new Date(dto.completedAt)
				if (Number.isNaN(d.getTime()))
					throw new BadRequestException('Invalid completedAt')
				row.completedAt = d
			}
		}
		const nextProject = dto.resolveProjectOid()
		if (nextProject !== undefined) {
			row.projectId = nextProject ?? undefined
		}
		const nextOwner = dto.resolveOwnerStaffOid()
		if (nextOwner !== undefined) {
			if (role !== RoleCode.ADMIN) {
				throw new ForbiddenException('Only admins can reassign owner')
			}
			row.ownerStaffId = nextOwner ?? undefined
		}
		await row.save()
		return mapPortfolio(
			row.toObject() as PortfolioItem & {
				_id: Types.ObjectId
			}
		)
	}
	async deletePortfolio(id: string, userId: string, role: RoleCode) {
		if (role !== RoleCode.ADMIN && role !== RoleCode.DESIGNER) {
			throw new ForbiddenException('Insufficient permissions')
		}
		const oid = toObjectId(id, 'Invalid id')
		const row = await this.portfolioModel.findById(oid).exec()
		if (!row) throw new NotFoundException('Portfolio item not found')
		this.assertDesignerOwnsRecord(
			role,
			await this.staffOidForUser(userId),
			row.ownerStaffId as Types.ObjectId | undefined
		)
		await row.deleteOne()
		return { ok: true }
	}
}
