import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { OrderStatus, ProjectStatus, RoleCode } from '../domain/enums'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { CatalogService } from '../mongo/schemas/catalog-service.schema'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Notification } from '../mongo/schemas/notification.schema'
import { Invoice } from '../mongo/schemas/invoice.schema'
import { Order } from '../mongo/schemas/order.schema'
import { PortfolioItem } from '../mongo/schemas/portfolio-item.schema'
import { Payment } from '../mongo/schemas/payment.schema'
import { Project } from '../mongo/schemas/project.schema'
import { ProjectLocation } from '../mongo/schemas/project-location.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { User } from '../mongo/schemas/user.schema'
import { PortalCreateOrderDto } from '../portal/dto/portal-create-order.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { escapeRegExp } from '../lib/regex'
import { toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	applyStatusFilter,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
@Injectable()
export class CrmService {
	constructor(
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Order.name)
		private readonly orderModel: Model<Order>,
		@InjectModel(Payment.name)
		private readonly paymentModel: Model<Payment>,
		@InjectModel(Notification.name)
		private readonly notificationModel: Model<Notification>,
		@InjectModel(Invoice.name)
		private readonly invoiceModel: Model<Invoice>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(ProjectLocation.name)
		private readonly projectLocationModel: Model<ProjectLocation>,
		@InjectModel(CatalogService.name)
		private readonly catalogModel: Model<CatalogService>,
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>,
		@InjectModel(PortfolioItem.name)
		private readonly portfolioModel: Model<PortfolioItem>
	) {}
	private async resolvePublishedPortfolioSlug(
		slug: string | undefined
	): Promise<string | undefined> {
		const trimmed = slug?.trim()
		if (!trimmed) return undefined
		const item = await this.portfolioModel
			.findOne({ slug: trimmed, isPublished: true })
			.select('slug title coverImageUrl galleryImageUrls')
			.lean()
			.exec()
		if (!item) {
			throw new NotFoundException('Portfolio reference not found')
		}
		return item.slug
	}
	private async portfolioReferenceMeta(slug: string | undefined) {
		if (!slug?.trim()) {
			return {
				portfolioReferenceSlug: null as string | null,
				portfolioReferenceTitle: null as string | null,
			}
		}
		const item = await this.portfolioModel
			.findOne({ slug: slug.trim(), isPublished: true })
			.select('slug title')
			.lean()
			.exec()
		return {
			portfolioReferenceSlug: item?.slug ?? slug,
			portfolioReferenceTitle: item?.title ?? null,
		}
	}
	private async nextProjectCodePrj(): Promise<string> {
		const prefix = 'TDS-PRJ-'
		const rows = await this.projectModel
			.find({ code: /^TDS-PRJ-\d+$/ })
			.select('code')
			.lean()
			.exec()
		let max = 0
		for (const r of rows) {
			const n = parseInt(String(r.code).slice(prefix.length), 10)
			if (!Number.isNaN(n) && n > max) max = n
		}
		return `${prefix}${max + 1}`
	}
	private portalStatusCopy(status: string) {
		const labels: Record<string, string> = {
			[OrderStatus.NEW]: 'Надіслано — очікує на розгляд',
			[OrderStatus.QUALIFIED]: 'Команда опрацьовує вашу заявку',
			[OrderStatus.REJECTED]: 'Заявку закрито',
			[OrderStatus.CONVERTED]: 'Перетворено на активний проєкт',
		}
		return labels[status] ?? status
	}
	private buildOrderTimeline(order: {
		status: string
		createdAt?: Date
		updatedAt?: Date
	}) {
		const events: Array<{
			at: Date
			kind: string
			label: string
		}> = []
		const created = order.createdAt ?? new Date()
		events.push({
			at: created,
			kind: 'created',
			label: 'Заявку надіслано',
		})
		if (order.status === OrderStatus.QUALIFIED) {
			events.push({
				at: order.updatedAt ?? created,
				kind: 'status',
				label: 'Команда кваліфікувала заявку',
			})
		} else if (order.status === OrderStatus.CONVERTED) {
			events.push({
				at: order.updatedAt ?? created,
				kind: 'converted',
				label: 'Перетворено на проєкт',
			})
		} else if (order.status === OrderStatus.REJECTED) {
			events.push({
				at: order.updatedAt ?? created,
				kind: 'cancelled',
				label: 'Заявку закрито',
			})
		}
		return events
	}
	private async mapOrderToClientPortalItem(
		order: {
			_id: Types.ObjectId
			code: string
			title: string
			description?: string
			status: string
			requestedBudget?: string | null
			preferredStart?: Date
			addressLine?: string
			city?: string
			phone?: string
			projectId?: Types.ObjectId
			serviceCatalogId?: Types.ObjectId
			serviceSlug?: string
			style?: string
			source?: string
			estimatedPrice?: string
			referencePhotoUrls?: string[]
			portfolioReferenceSlug?: string
			createdAt?: Date
			updatedAt?: Date
		},
		user: {
			fullName?: string
			email?: string
		} | null
	) {
		let project: {
			id: string
			code: string
			title: string
			status: string
		} | null = null
		if (order.projectId) {
			const p = await this.projectModel
				.findById(order.projectId)
				.select('code title status')
				.lean()
				.exec()
			if (p) {
				project = {
					id: p._id.toString(),
					code: p.code,
					title: p.title,
					status: p.status,
				}
			}
		}
		let serviceName: string | null = null
		if (order.serviceCatalogId) {
			const svc = await this.catalogModel
				.findById(order.serviceCatalogId)
				.select('name')
				.lean()
				.exec()
			serviceName = svc?.name ?? null
		}
		const portfolioMeta = await this.portfolioReferenceMeta(
			order.portfolioReferenceSlug
		)
		return {
			id: order._id.toString(),
			code: order.code,
			title: order.title,
			description: order.description,
			status: order.status,
			clientStatusKey:
				order.status === OrderStatus.NEW
					? 'order_submitted'
					: order.status === OrderStatus.QUALIFIED
						? 'order_in_review'
						: order.status === OrderStatus.REJECTED
							? 'order_cancelled'
							: 'project_active',
			clientStatusLabel: this.portalStatusCopy(order.status),
			requestedBudget: order.requestedBudget ?? null,
			preferredStart: order.preferredStart,
			addressLine: order.addressLine,
			city: order.city,
			phone: order.phone,
			serviceSlug: order.serviceSlug ?? null,
			serviceName,
			style: order.style ?? null,
			source: order.source ?? null,
			estimatedPrice: order.estimatedPrice ?? null,
			referencePhotoUrls: order.referencePhotoUrls ?? [],
			portfolioReferenceSlug: portfolioMeta.portfolioReferenceSlug,
			portfolioReferenceTitle: portfolioMeta.portfolioReferenceTitle,
			createdAt: order.createdAt,
			updatedAt: order.updatedAt,
			timeline: this.buildOrderTimeline(order),
			clientName: user?.fullName ?? '',
			clientEmail: user?.email ?? '',
			project,
		}
	}
	async clients() {
		const clients = await this.clientModel
			.find()
			.sort({ createdAt: -1 })
			.lean()
			.exec()
		const results = await Promise.all(
			clients.map(async (client) => {
				const user = await this.userModel
					.findById(client.userId)
					.lean()
					.exec()
				const [orders, projects, payments, invoices] =
					await Promise.all([
						this.orderModel.countDocuments({
							clientId: client._id,
						}),
						this.projectModel.countDocuments({
							clientId: client._id,
						}),
						this.paymentModel.countDocuments({
							clientId: client._id,
						}),
						this.invoiceModel.countDocuments({
							clientId: client._id,
						}),
					])
				const paidAgg = await this.paymentModel.aggregate([
					{ $match: { clientId: client._id, status: 'PAID' } },
					{
						$group: {
							_id: null,
							total: { $sum: { $toDouble: '$amount' } },
						},
					},
				])
				const paidTotal =
					paidAgg[0]?.total != null ? String(paidAgg[0].total) : '0'
				return {
					id: client._id.toString(),
					userId: client.userId.toString(),
					fullName: user?.fullName ?? '',
					email: user?.email ?? '',
					phone: user?.phone,
					companyName: client.companyName,
					leadSource: client.leadSource,
					createdAt: client.createdAt,
					counters: {
						orders,
						projects,
						payments,
						invoices,
					},
					paidTotal,
				}
			})
		)
		return results
	}
	async orders(filters: {
		page?: number
		perPage?: number
		q?: string
		status?: string
		from?: string
		to?: string
		sort?: string
	} = {}) {
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const where: Record<string, unknown> = {}
		applyStatusFilter(where, filters.status)
		if (filters.q?.trim()) {
			const re = new RegExp(escapeRegExp(filters.q.trim()), 'i')
			where.$or = [{ code: re }, { title: re }, { city: re }]
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const [orders, total] = await Promise.all([
			this.orderModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.orderModel.countDocuments(where),
		])
		const items = await Promise.all(
			orders.map(async (order) => {
				const client = await this.clientModel
					.findById(order.clientId)
					.lean()
					.exec()
				const user = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				let project: {
					id: string
					code: string
					title: string
					status: string
				} | null = null
				if (order.projectId) {
					const p = await this.projectModel
						.findById(order.projectId)
						.select('code title status')
						.lean()
						.exec()
					if (p) {
						project = {
							id: p._id.toString(),
							code: p.code,
							title: p.title,
							status: p.status,
						}
					}
				}
				return {
					id: order._id.toString(),
					code: order.code,
					title: order.title,
					description: order.description,
					status: order.status,
					requestedBudget: order.requestedBudget ?? null,
					preferredStart: order.preferredStart,
					addressLine: order.addressLine,
					city: order.city,
					phone: order.phone,
					createdAt: order.createdAt,
					clientName: user?.fullName ?? '',
					clientEmail: user?.email ?? '',
					project,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async ordersLegacy() {
		const orders = await this.orderModel
			.find()
			.sort({ createdAt: -1 })
			.limit(100)
			.lean()
			.exec()
		return Promise.all(
			orders.map(async (order) => {
				const client = await this.clientModel
					.findById(order.clientId)
					.lean()
					.exec()
				const user = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				let project: {
					id: string
					code: string
					title: string
					status: string
				} | null = null
				if (order.projectId) {
					const p = await this.projectModel
						.findById(order.projectId)
						.select('code title status')
						.lean()
						.exec()
					if (p) {
						project = {
							id: p._id.toString(),
							code: p.code,
							title: p.title,
							status: p.status,
						}
					}
				}
				return {
					id: order._id.toString(),
					code: order.code,
					title: order.title,
					description: order.description,
					status: order.status,
					requestedBudget: order.requestedBudget ?? null,
					preferredStart: order.preferredStart,
					addressLine: order.addressLine,
					city: order.city,
					phone: order.phone,
					createdAt: order.createdAt,
					clientName: user?.fullName ?? '',
					clientEmail: user?.email ?? '',
					project,
				}
			})
		)
	}
	async ordersForClientUser(userId: string) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) {
			return []
		}
		const orders = await this.orderModel
			.find({ clientId: client._id })
			.sort({ createdAt: -1 })
			.limit(100)
			.lean()
			.exec()
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.select('fullName email')
			.lean()
			.exec()
		return Promise.all(
			orders.map(async (order) => {
				let project: {
					id: string
					code: string
					title: string
					status: string
				} | null = null
				if (order.projectId) {
					const p = await this.projectModel
						.findById(order.projectId)
						.select('code title status')
						.lean()
						.exec()
					if (p) {
						project = {
							id: p._id.toString(),
							code: p.code,
							title: p.title,
							status: p.status,
						}
					}
				}
				return {
					id: order._id.toString(),
					code: order.code,
					title: order.title,
					description: order.description,
					status: order.status,
					requestedBudget: order.requestedBudget ?? null,
					preferredStart: order.preferredStart,
					addressLine: order.addressLine,
					city: order.city,
					phone: order.phone,
					createdAt: order.createdAt,
					clientName: user?.fullName ?? '',
					clientEmail: user?.email ?? '',
					project,
				}
			})
		)
	}
	async ordersForClientUserPaginated(
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
		const [orders, total, user] = await Promise.all([
			this.orderModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.orderModel.countDocuments(where),
			this.userModel
				.findById(new Types.ObjectId(userId))
				.select('fullName email')
				.lean()
				.exec(),
		])
		const items = await Promise.all(
			orders.map(async (order) =>
				this.mapOrderToClientPortalItem(order, user)
			)
		)
		return { items, total, page, perPage }
	}
	async orderByCodeForClientUser(userId: string, code: string) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) throw new NotFoundException('Order not found')
		const order = await this.orderModel
			.findOne({ clientId: client._id, code })
			.lean()
			.exec()
		if (!order) throw new NotFoundException('Order not found')
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.select('fullName email')
			.lean()
			.exec()
		return this.mapOrderToClientPortalItem(order, user)
	}
	async orderByCodeForWorkspace(code: string) {
		const order = await this.orderModel.findOne({ code }).lean().exec()
		if (!order) throw new NotFoundException('Order not found')
		const client = await this.clientModel
			.findById(order.clientId)
			.lean()
			.exec()
		const user = client
			? await this.userModel
					.findById(client.userId)
					.select('fullName email phone')
					.lean()
					.exec()
			: null
		let designerName: string | null = null
		if (order.designerId) {
			const designerStaff = await this.staffModel
				.findById(order.designerId)
				.lean()
				.exec()
			if (designerStaff?.userId) {
				const designerUser = await this.userModel
					.findById(designerStaff.userId)
					.select('fullName')
					.lean()
					.exec()
				designerName = designerUser?.fullName ?? null
			}
		}
		const base = await this.mapOrderToClientPortalItem(order, user)
		const auditTrail = await this.auditModel
			.find({
				entityType: 'Order',
				entityId: order._id.toString(),
			})
			.sort({ createdAt: 1 })
			.lean()
			.exec()
		return {
			...base,
			companyName: client?.companyName ?? null,
			leadSource: client?.leadSource ?? null,
			designerName,
			auditTrail: auditTrail.map((row) => ({
				at: row.createdAt,
				action: row.action,
				metadata: row.metadata ?? {},
			})),
		}
	}
	async createOrder(dto: CreateOrderDto) {
		const client = await this.clientModel
			.findById(toObjectId(dto.clientId, 'Invalid clientId'))
			.exec()
		if (!client) {
			throw new NotFoundException('Client not found')
		}
		const user = await this.userModel.findById(client.userId).exec()
		const order = await this.orderModel.create({
			code: `TDS-LEAD-${Date.now().toString().slice(-8)}`,
			title: dto.title,
			description: dto.description,
			status: OrderStatus.NEW,
			requestedBudget: dto.requestedBudget ?? undefined,
			preferredStart: dto.preferredStart
				? new Date(dto.preferredStart)
				: undefined,
			clientId: client._id,
			addressLine: dto.addressLine,
			city: dto.city,
			phone: dto.phone,
			referencePhotoUrls: [],
			source: 'crm',
			workerIds: [],
		})
		await this.notificationModel.create({
			title: 'Нова заявка з CRM',
			body: `${user?.fullName ?? 'Клієнт'} створив(ла) заявку ${order.code}`,
			roleCode: RoleCode.PROJECT_MANAGER,
		})
		return {
			id: order.id,
			code: order.code,
			status: order.status,
		}
	}
	async createOrderForPortalClient(
		userId: string,
		dto: PortalCreateOrderDto
	) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) {
			throw new NotFoundException('Client profile not found')
		}
		const catalog = await this.catalogModel
			.findOne({ slug: dto.serviceSlug.trim(), isActive: true })
			.lean()
			.exec()
		if (!catalog) {
			throw new NotFoundException('Service not found')
		}
		const stylePick =
			dto.style?.trim() ||
			(Array.isArray(catalog.style) && catalog.style.length
				? catalog.style[0]
				: undefined)
		const portfolioReferenceSlug = await this.resolvePublishedPortfolioSlug(
			dto.portfolioReferenceSlug
		)
		const user = await this.userModel.findById(client.userId).exec()
		const order = await this.orderModel.create({
			code: `TDS-LEAD-${Date.now().toString().slice(-8)}`,
			title: dto.title,
			description: dto.description,
			status: OrderStatus.NEW,
			requestedBudget: dto.requestedBudget ?? undefined,
			preferredStart: dto.preferredStart
				? new Date(dto.preferredStart)
				: undefined,
			clientId: client._id,
			addressLine: dto.addressLine,
			city: dto.city,
			phone: dto.phone,
			serviceCatalogId: catalog._id,
			serviceSlug: catalog.slug,
			style: stylePick,
			source: 'portal',
			estimatedPrice: catalog.basePrice,
			referencePhotoUrls: dto.referencePhotoUrls?.length
				? [...dto.referencePhotoUrls]
				: [],
			portfolioReferenceSlug,
			workerIds: [],
		})
		await this.notificationModel.create({
			title: 'Нова заявка з порталу',
			body: `${user?.fullName ?? 'Клієнт'} подав(ла) заявку ${order.code} на «${catalog.name}»`,
			roleCode: RoleCode.PROJECT_MANAGER,
			entityType: 'Order',
			entityId: order._id.toString(),
			link: `/workspace/orders/${order.code}`,
		})
		await this.notificationModel.create({
			title: 'Заявку отримано',
			body: `Ми отримали ${order.code} на послугу «${catalog.name}».`,
			userId: client.userId,
			entityType: 'Order',
			entityId: order._id.toString(),
			link: `/portal/orders/${order.code}`,
		})
		return {
			id: order.id,
			code: order.code,
			status: order.status,
			serviceSlug: catalog.slug,
			estimatedPrice: order.estimatedPrice ?? null,
		}
	}
	async cancelOrderForClientUser(userId: string, code: string) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) throw new NotFoundException('Order not found')
		const order = await this.orderModel
			.findOne({ clientId: client._id, code })
			.exec()
		if (!order) throw new NotFoundException('Order not found')
		if (order.status === OrderStatus.CONVERTED) {
			throw new BadRequestException(
				'Converted orders cannot be cancelled from the portal'
			)
		}
		if (order.status === OrderStatus.REJECTED) {
			return { code: order.code, status: order.status }
		}
		if (
			order.status !== OrderStatus.NEW &&
			order.status !== OrderStatus.QUALIFIED
		) {
			throw new BadRequestException(
				'This order can no longer be cancelled'
			)
		}
		order.status = OrderStatus.REJECTED
		await order.save()
		await this.auditModel.create({
			projectId: order.projectId,
			action: 'crm.order.cancelled_by_client',
			entityType: 'Order',
			entityId: order._id.toString(),
			metadata: { code: order.code },
		})
		await this.notificationModel.create({
			title: 'Заявку скасовано',
			body: `Клієнт скасував заявку ${order.code}`,
			roleCode: RoleCode.PROJECT_MANAGER,
			entityType: 'Order',
			entityId: order._id.toString(),
			link: `/workspace/orders`,
		})
		return { code: order.code, status: order.status }
	}
	async appendReferencePhotosForClientUser(
		userId: string,
		code: string,
		urls: string[]
	) {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!client) throw new NotFoundException('Order not found')
		const order = await this.orderModel
			.findOne({ clientId: client._id, code })
			.exec()
		if (!order) throw new NotFoundException('Order not found')
		if (
			order.status === OrderStatus.REJECTED ||
			order.status === OrderStatus.CONVERTED
		) {
			throw new BadRequestException('Cannot update photos for this order')
		}
		const merged = [...(order.referencePhotoUrls ?? []), ...urls]
		const unique = Array.from(new Set(merged)).slice(0, 24)
		order.referencePhotoUrls = unique
		await order.save()
		return {
			code: order.code,
			referencePhotoUrls: order.referencePhotoUrls,
		}
	}
	async qualifyCrmOrder(code: string) {
		const order = await this.orderModel.findOne({ code }).exec()
		if (!order) throw new NotFoundException('Order not found')
		if (order.status !== OrderStatus.NEW) {
			throw new BadRequestException('Only new leads can be qualified')
		}
		order.status = OrderStatus.QUALIFIED
		await order.save()
		await this.auditModel.create({
			projectId: order.projectId,
			action: 'crm.order.qualified',
			entityType: 'Order',
			entityId: order._id.toString(),
			metadata: { code },
		})
		return { ok: true, code: order.code, status: order.status }
	}
	async convertCrmOrder(code: string, actorUserId: string) {
		const staff = await this.staffModel
			.findOne({ userId: new Types.ObjectId(actorUserId) })
			.exec()
		if (!staff) {
			throw new ForbiddenException(
				'Staff profile required to convert orders'
			)
		}
		const order = await this.orderModel.findOne({ code }).exec()
		if (!order) throw new NotFoundException('Order not found')
		if (order.status !== OrderStatus.QUALIFIED) {
			throw new BadRequestException(
				'Only qualified leads can be converted'
			)
		}
		const projectCode = await this.nextProjectCodePrj()
		const city = order.city?.trim() || 'Unknown'
		const region = city
		const project = await this.projectModel.create({
			code: projectCode,
			title: order.title,
			description: order.description,
			status: ProjectStatus.DRAFT,
			clientId: order.clientId,
			managerId: staff._id,
			designerId: order.designerId,
			budgetPlanned: order.requestedBudget?.trim()
				? order.requestedBudget
				: '0',
		})
		try {
			await this.projectLocationModel.create({
				projectId: project._id,
				addressLine: order.addressLine,
				city: order.city,
				region,
				placeLabel: city,
				latitude: '0',
				longitude: '0',
			})
			order.projectId = project._id
			order.status = OrderStatus.CONVERTED
			await order.save()
		} catch (err) {
			await this.projectModel.deleteOne({ _id: project._id }).exec()
			throw err
		}
		const client = await this.clientModel
			.findById(order.clientId)
			.lean()
			.exec()
		if (client?.userId) {
			await this.notificationModel.create({
				title: 'Проєкт створено',
				body: `Вашу заявку ${order.code} перетворено на проєкт ${project.code}`,
				userId: client.userId,
				projectId: project._id,
				entityType: 'Project',
				entityId: project._id.toString(),
				link: `/portal/projects/${encodeURIComponent(project.code)}`,
			})
		}
		await this.auditModel.create({
			projectId: project._id,
			action: 'crm.order.converted',
			entityType: 'Order',
			entityId: order._id.toString(),
			metadata: {
				code,
				projectId: project._id.toString(),
				projectCode: project.code,
			},
		})
		return {
			ok: true,
			code: order.code,
			status: order.status,
			project: {
				id: project._id.toString(),
				code: project.code,
				title: project.title,
			},
		}
	}
	async rejectCrmOrder(code: string) {
		const order = await this.orderModel.findOne({ code }).exec()
		if (!order) throw new NotFoundException('Order not found')
		if (order.status === OrderStatus.CONVERTED) {
			throw new BadRequestException(
				'Converted orders cannot be rejected from CRM'
			)
		}
		order.status = OrderStatus.REJECTED
		await order.save()
		await this.auditModel.create({
			projectId: order.projectId,
			action: 'crm.order.rejected',
			entityType: 'Order',
			entityId: order._id.toString(),
			metadata: { code },
		})
		await this.notificationModel.create({
			title: 'Заявку відхилено',
			body: `Заявку ${order.code} відхилено`,
			roleCode: RoleCode.PROJECT_MANAGER,
			entityType: 'Order',
			entityId: order._id.toString(),
			link: `/workspace/orders`,
		})
		return { ok: true, code: order.code, status: order.status }
	}
	async claimOrderForDesigner(userId: string, code: string) {
		const staff = await this.staffModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!staff)
			throw new ForbiddenException(
				'Staff profile required to claim orders'
			)
		const order = await this.orderModel.findOne({ code }).exec()
		if (!order) throw new NotFoundException('Order not found')
		if (order.designerId && !order.designerId.equals(staff._id)) {
			throw new BadRequestException(
				'This order is assigned to another designer'
			)
		}
		order.designerId = staff._id
		await order.save()
		await this.auditModel.create({
			projectId: order.projectId,
			action: 'order.designer_claimed',
			entityType: 'Order',
			entityId: order._id.toString(),
			metadata: { code, staffId: staff._id.toString() },
		})
		return { ok: true, code: order.code, designerId: staff._id.toString() }
	}
	async funnel() {
		const rows = await this.orderModel.aggregate([
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		])
		return rows.map((r) => ({
			status: r._id,
			count: r.count,
		}))
	}
	async stats() {
		const [budgetAgg, ordersCount] = await Promise.all([
			this.orderModel.aggregate([
				{ $match: { status: { $ne: OrderStatus.REJECTED } } },
				{
					$group: {
						_id: null,
						total: {
							$sum: {
								$convert: {
									input: '$requestedBudget',
									to: 'double',
									onError: 0,
									onNull: 0,
								},
							},
						},
					},
				},
			]),
			this.orderModel.countDocuments().exec(),
		])
		const pipelineBudget = budgetAgg[0]?.total ?? 0
		return {
			pipelineBudget: String(pipelineBudget),
			ordersCount,
		}
	}
}
