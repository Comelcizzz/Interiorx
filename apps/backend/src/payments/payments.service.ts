import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
	PaymentStatus,
	ReceiptStatus,
	RoleCode,
	InvoiceStatus,
} from '../domain/enums'
import { randomUUID } from 'crypto'
import { buildReceiptPdf, defaultReceiptCompany } from './receipt-pdf.builder'
import { normalizeWorkspaceRole } from '../auth/role-normalize'
import { AuthenticatedUser } from '../auth/request-user'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Payment } from '../mongo/schemas/payment.schema'
import { Project } from '../mongo/schemas/project.schema'
import { Receipt } from '../mongo/schemas/receipt.schema'
import { Invoice } from '../mongo/schemas/invoice.schema'
import { Notification } from '../mongo/schemas/notification.schema'
import { User } from '../mongo/schemas/user.schema'
import { MockPaymentDto } from './dto/mock-payment.dto'
import { toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	applyStatusFilter,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { escapeRegExp } from '../lib/regex'
@Injectable()
export class PaymentsService {
	constructor(
		private readonly config: ConfigService,
		@InjectModel(Payment.name)
		private readonly paymentModel: Model<Payment>,
		@InjectModel(Receipt.name)
		private readonly receiptModel: Model<Receipt>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>,
		@InjectModel(Invoice.name)
		private readonly invoiceModel: Model<Invoice>,
		@InjectModel(Notification.name)
		private readonly notificationModel: Model<Notification>
	) {}
	private receiptVerifyUrl(receiptNumber: string) {
		const base = (
			this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
		).replace(/\/$/, '')
		return `${base}/verify/${encodeURIComponent(receiptNumber)}`
	}
	private async clientProfileIdForUser(
		userId: string
	): Promise<Types.ObjectId | null> {
		const client = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.select('_id')
			.lean()
			.exec()
		return client?._id ?? null
	}
	private mockCardStatus(normalizedCard: string): PaymentStatus {
		const FAILED_CARDS = new Set(['5000000000000000', '4111111111110000'])
		const SUCCESS_CARDS = new Set(['4242424242424242'])
		if (FAILED_CARDS.has(normalizedCard)) return PaymentStatus.FAILED
		if (SUCCESS_CARDS.has(normalizedCard)) return PaymentStatus.PAID
		return PaymentStatus.PAID
	}
	async listInvoicesForPortalUser(
		userId: string,
		opts?: {
			page?: number
			perPage?: number
			status?: string
			q?: string
			from?: string
			to?: string
			sort?: string
		}
	): Promise<{
		items: Array<{
			id: string
			number: string
			status: string
			amount: string
			currency: string
			projectId: string
			projectCode: string
		}>
		total: number
		page: number
		perPage: number
	}> {
		const clientId = await this.clientProfileIdForUser(userId)
		if (!clientId) {
			return { items: [], total: 0, page: 1, perPage: 25 }
		}
		const { page, perPage, skip } = parsePagination(
			opts?.page,
			opts?.perPage,
			25
		)
		const where: Record<string, unknown> = { clientId }
		applyStatusFilter(where, opts?.status)
		applyDateRangeToWhere(where, 'createdAt', opts?.from, opts?.to)
		const term = opts?.q?.trim()
		if (term) {
			const re = new RegExp(escapeRegExp(term), 'i')
			const projectRows = await this.projectModel
				.find({ code: re })
				.select('_id')
				.lean()
				.exec()
			const or: Record<string, unknown>[] = [{ number: re }]
			if (projectRows.length > 0) {
				or.push({
					projectId: { $in: projectRows.map((p) => p._id) },
				})
			}
			where.$or = or
		}
		const [rows, total] = await Promise.all([
			this.invoiceModel
				.find(where)
				.sort(resolveSort(opts?.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.invoiceModel.countDocuments(where),
		])
		const items = await Promise.all(
			rows.map(async (inv) => {
				const project = await this.projectModel
					.findById(inv.projectId)
					.select('code')
					.lean()
					.exec()
				return {
					id: inv._id.toString(),
					number: inv.number,
					status: inv.status,
					amount: inv.amount,
					currency: inv.currency ?? 'UAH',
					projectId: inv.projectId.toString(),
					projectCode: project?.code ?? '',
					dueDate: inv.dueDate?.toISOString?.() ?? null,
					createdAt:
						(inv as { createdAt?: Date }).createdAt?.toISOString() ??
						null,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async getInvoiceForPortalUser(userId: string, invoiceId: string) {
		const clientId = await this.clientProfileIdForUser(userId)
		if (!clientId) throw new NotFoundException('Invoice not found')
		const inv = await this.invoiceModel
			.findOne({
				_id: toObjectId(invoiceId, 'Invalid invoice id'),
				clientId,
			})
			.lean()
			.exec()
		if (!inv) throw new NotFoundException('Invoice not found')
		const project = await this.projectModel
			.findById(inv.projectId)
			.select('code')
			.lean()
			.exec()
		return {
			id: inv._id.toString(),
			number: inv.number,
			status: inv.status,
			amount: inv.amount,
			currency: inv.currency ?? 'UAH',
			projectId: inv.projectId.toString(),
			projectCode: project?.code ?? '',
		}
	}
	async mockPayment(dto: MockPaymentDto, actor: AuthenticatedUser) {
		const normalizedCard = dto.cardNumber.replace(/\s/g, '')
		const status = this.mockCardStatus(normalizedCard)
		let project: Project & {
			_id: Types.ObjectId
		}
		let amount: string
		let invoiceOid: Types.ObjectId | undefined
		if (dto.invoiceId?.trim()) {
			if (actor.role !== RoleCode.CLIENT) {
				throw new ForbiddenException(
					'Invoice checkout is only available in the client portal'
				)
			}
			const invoice = await this.invoiceModel
				.findById(toObjectId(dto.invoiceId.trim(), 'Invalid invoiceId'))
				.exec()
			if (!invoice) {
				throw new NotFoundException('Invoice not found')
			}
			if (invoice.status !== InvoiceStatus.SENT) {
				throw new BadRequestException('Invoice is not payable yet')
			}
			const p = await this.projectModel
				.findById(invoice.projectId)
				.lean()
				.exec()
			if (!p) throw new NotFoundException('Project not found')
			project = p as Project & {
				_id: Types.ObjectId
			}
			amount = invoice.amount
			invoiceOid = invoice._id as Types.ObjectId
			const clientId = await this.clientProfileIdForUser(actor.id)
			if (
				!clientId ||
				!clientId.equals(invoice.clientId as Types.ObjectId)
			) {
				throw new ForbiddenException('You cannot pay this invoice')
			}
		} else {
			if (!dto.projectId?.trim()) {
				throw new BadRequestException(
					'projectId is required when invoiceId is omitted'
				)
			}
			if (dto.amount == null || dto.amount === '') {
				throw new BadRequestException(
					'amount is required when invoiceId is omitted'
				)
			}
			const p = await this.projectModel
				.findById(toObjectId(dto.projectId, 'Invalid projectId'))
				.lean()
				.exec()
			if (!p) {
				throw new NotFoundException('Project not found')
			}
			project = p as Project & {
				_id: Types.ObjectId
			}
			amount = dto.amount
			if (actor.role === RoleCode.CLIENT) {
				const clientId = await this.clientProfileIdForUser(actor.id)
				if (
					!clientId ||
					!clientId.equals(project.clientId as Types.ObjectId)
				) {
					throw new ForbiddenException(
						'You cannot record payments for this project'
					)
				}
			}
		}
		if (status === PaymentStatus.PAID && invoiceOid) {
			const claimed = await this.invoiceModel
				.findOneAndUpdate(
					{ _id: invoiceOid, status: InvoiceStatus.SENT },
					{ $set: { status: InvoiceStatus.PAID } },
					{ returnDocument: 'after' }
				)
				.exec()
			if (!claimed) {
				throw new BadRequestException('Invoice is no longer payable')
			}
		}
		const payment = await this.paymentModel.create({
			projectId: project._id,
			clientId: project.clientId,
			...(invoiceOid ? { invoiceId: invoiceOid } : {}),
			status,
			method: 'card',
			amount,
			providerRef: `MOCK-${randomUUID()}`,
			paidAt: status === PaymentStatus.PAID ? new Date() : undefined,
		})
		if (status === PaymentStatus.FAILED) {
			await this.auditModel.create({
				projectId: project._id,
				action: 'payment.failed',
				entityType: 'Payment',
				entityId: payment._id.toString(),
				metadata: { amount },
			})
			return {
				status,
				paymentId: payment._id.toString(),
				message: 'Банк відхилив операцію. Перевірте реквізити або використайте іншу картку.',
			}
		}
		const receipt = await this.receiptModel.create({
			number: `RCPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`,
			projectId: project._id,
			clientId: project.clientId,
			paymentId: payment._id,
			...(invoiceOid ? { invoiceId: invoiceOid } : {}),
			status: ReceiptStatus.ISSUED,
			amount,
			pdfPath: `/receipts/${payment._id.toString()}.pdf`,
			issuedAt: new Date(),
		})
		await this.auditModel.create({
			projectId: project._id,
			action: 'payment.paid',
			entityType: 'Payment',
			entityId: payment._id.toString(),
			metadata: { receiptId: receipt._id.toString(), amount },
		})
		const client = await this.clientModel
			.findById(project.clientId)
			.select('userId')
			.lean()
			.exec()
		const amountFormatted = new Intl.NumberFormat('uk-UA', {
			style: 'currency',
			currency: receipt.currency || 'UAH',
			maximumFractionDigits: 0,
		}).format(Number(amount))
		if (client?.userId) {
			await this.notificationModel.create({
				title: 'Оплату отримано',
				body: `Платіж ${amountFormatted} за проєкт ${project.code} прийнято. Чек ${receipt.number} доступний у розділі «Чеки».`,
				userId: client.userId,
				projectId: project._id,
				entityType: 'Receipt',
				entityId: receipt._id.toString(),
				link: '/portal/receipts',
			})
		}
		await this.notificationModel.create({
			title: 'Надійшла оплата',
			body: `Клієнт оплатив ${amountFormatted} по проєкту ${project.code}. Чек: ${receipt.number}.`,
			roleCode: RoleCode.PROJECT_MANAGER,
			projectId: project._id,
			entityType: 'Payment',
			entityId: payment._id.toString(),
			link: '/workspace/receipts',
		})
		return {
			status,
			paymentId: payment._id.toString(),
			receiptId: receipt._id.toString(),
			receiptNumber: receipt.number,
			receiptVerifyUrl: this.receiptVerifyUrl(receipt.number),
			...(invoiceOid ? { invoiceId: invoiceOid.toString() } : {}),
		}
	}
	async list(opts?: {
		page?: number
		perPage?: number
		status?: string
		projectId?: string
		from?: string
		to?: string
		sort?: string
	}) {
		const { page, perPage, skip } = parsePagination(opts?.page, opts?.perPage)
		const where: Record<string, unknown> = {}
		if (opts?.status) where.status = opts.status
		if (opts?.projectId?.trim()) {
			where.projectId = toObjectId(
				opts.projectId.trim(),
				'Invalid project id'
			)
		}
		applyDateRangeToWhere(where, 'createdAt', opts?.from, opts?.to)
		const [payments, total] = await Promise.all([
			this.paymentModel
				.find(where)
				.sort(resolveSort(opts?.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.paymentModel.countDocuments(where),
		])
		const items = await Promise.all(
			payments.map(async (payment) => {
				const project = await this.projectModel
					.findById(payment.projectId)
					.select('code title')
					.lean()
					.exec()
				const client = await this.clientModel
					.findById(payment.clientId)
					.lean()
					.exec()
				const user = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				const receipt = await this.receiptModel
					.findOne({ paymentId: payment._id })
					.lean()
					.exec()
				return {
					id: payment._id.toString(),
					status: payment.status,
					method: payment.method,
					amount: payment.amount,
					currency: payment.currency ?? 'UAH',
					clientName: user?.fullName ?? '',
					projectCode: project?.code ?? '',
					projectTitle: project?.title ?? '',
					createdAt:
						(payment as { createdAt?: Date }).createdAt?.toISOString() ??
						new Date().toISOString(),
					receipt: receipt
						? {
								id: receipt._id.toString(),
								number: receipt.number,
								status: receipt.status,
							}
						: null,
				}
			})
		)
		return { items, total, page, perPage }
	}

	async refundPayment(id: string, actor: AuthenticatedUser) {
		const effective = normalizeWorkspaceRole(actor.role)
		if (effective !== RoleCode.ADMIN && effective !== RoleCode.PROJECT_MANAGER) {
			throw new ForbiddenException(
				'Refund is restricted to admin or project manager'
			)
		}
		const payment = await this.paymentModel
			.findById(toObjectId(id, 'Invalid payment id'))
			.exec()
		if (!payment) throw new NotFoundException('Payment not found')
		if (payment.status !== PaymentStatus.PAID) {
			throw new BadRequestException('Only paid payments can be refunded')
		}
		payment.status = PaymentStatus.REFUNDED
		await payment.save()
		await this.receiptModel.updateMany(
			{
				paymentId: payment._id,
				status: ReceiptStatus.ISSUED,
			},
			{ $set: { status: ReceiptStatus.VOIDED } }
		)
		await this.auditModel.create({
			projectId: payment.projectId,
			userId: new Types.ObjectId(actor.id),
			action: 'payment.refunded',
			entityType: 'Payment',
			entityId: payment._id.toString(),
			metadata: { amount: payment.amount },
		})
		return { ok: true, id: payment._id.toString(), status: payment.status }
	}
	async receipts(
		actor: AuthenticatedUser,
		filters: {
			page?: number
			perPage?: number
			status?: string
			q?: string
			from?: string
			to?: string
			sort?: string
		} = {}
	) {
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const where: Record<string, unknown> = {}
		if (actor.role === RoleCode.CLIENT) {
			const clientId = await this.clientProfileIdForUser(actor.id)
			if (!clientId) {
				return { items: [], total: 0, page, perPage }
			}
			where.clientId = clientId
		}
		applyStatusFilter(where, filters.status)
		applyDateRangeToWhere(where, 'issuedAt', filters.from, filters.to)
		const term = filters.q?.trim()
		if (term) {
			const re = new RegExp(escapeRegExp(term), 'i')
			where.$or = [{ number: re }]
		}
		const [receipts, total] = await Promise.all([
			this.receiptModel
				.find(where)
				.sort(resolveSort(filters.sort, 'issuedAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.receiptModel.countDocuments(where),
		])
		const items = await Promise.all(
			receipts.map(async (receipt) => {
				const project = await this.projectModel
					.findById(receipt.projectId)
					.select('code title')
					.lean()
					.exec()
				const client = await this.clientModel
					.findById(receipt.clientId)
					.lean()
					.exec()
				const user = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName email')
							.lean()
							.exec()
					: null
				const payment = await this.paymentModel
					.findById(receipt.paymentId)
					.lean()
					.exec()
				let invoiceNumber: string | null = null
				let invoiceStatus: string | null = null
				if (receipt.invoiceId) {
					const inv = await this.invoiceModel
						.findById(receipt.invoiceId)
						.select('number status')
						.lean()
						.exec()
					invoiceNumber = inv?.number ?? null
					invoiceStatus = inv?.status ?? null
				}
				return {
					...receipt,
					id: receipt._id.toString(),
					amount: receipt.amount,
					projectCode: project?.code ?? '',
					projectTitle: project?.title ?? '',
					clientName: user?.fullName ?? '',
					payment,
					invoiceId: receipt.invoiceId?.toString(),
					invoiceNumber,
					invoiceStatus,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async receiptPdf(id: string, actor: AuthenticatedUser) {
		const receipt = await this.receiptModel
			.findById(toObjectId(id))
			.lean()
			.exec()
		if (!receipt) {
			throw new NotFoundException('Receipt not found')
		}
		if (actor.role === RoleCode.CLIENT) {
			const clientId = await this.clientProfileIdForUser(actor.id)
			if (
				!clientId ||
				!clientId.equals(receipt.clientId as Types.ObjectId)
			) {
				throw new ForbiddenException('Receipt not found')
			}
		}
		if (receipt.status !== ReceiptStatus.ISSUED) {
			throw new BadRequestException('Receipt is not active')
		}
		const project = await this.projectModel
			.findById(receipt.projectId)
			.lean()
			.exec()
		const client = await this.clientModel
			.findById(receipt.clientId)
			.lean()
			.exec()
		const clientUser = client
			? await this.userModel.findById(client.userId).lean().exec()
			: null
		const payment = await this.paymentModel
			.findById(receipt.paymentId)
			.lean()
			.exec()
		if (!project || !clientUser || !payment) {
			throw new NotFoundException('Receipt relations not found')
		}
		const verifyUrl = this.receiptVerifyUrl(receipt.number)
		let invoice: { number: string; dueDate?: Date | null } | null = null
		if (receipt.invoiceId) {
			const inv = await this.invoiceModel
				.findById(receipt.invoiceId)
				.select('number dueDate')
				.lean()
				.exec()
			if (inv) {
				invoice = {
					number: inv.number,
					dueDate: inv.dueDate ?? null,
				}
			}
		}
		const lineDescription = invoice
			? `Оплата за рахунком ${invoice.number} (проєкт ${project.code})`
			: `Оплата послуг з дизайну — ${project.title}`
		const buffer = await buildReceiptPdf({
			number: receipt.number,
			issuedAt: receipt.issuedAt ?? new Date(),
			amount: receipt.amount,
			currency: receipt.currency,
			status: receipt.status,
			company: defaultReceiptCompany(this.config),
			client: {
				fullName: clientUser.fullName,
				email: clientUser.email,
				phone: clientUser.phone ?? null,
			},
			project: {
				code: project.code,
				title: project.title,
			},
			payment: {
				method: payment.method,
				providerRef: payment.providerRef ?? payment._id.toString(),
				paidAt: payment.paidAt ?? null,
			},
			invoice,
			lineDescription,
			verifyUrl,
		})
		return {
			fileName: `${receipt.number}.pdf`,
			buffer,
		}
	}
	/** Створює або оновлює рахунок SENT після погодження кошторису клієнтом. */
	async ensureSentInvoiceForApprovedEstimate(
		projectId: Types.ObjectId,
		clientId: Types.ObjectId,
		projectCode: string,
		estimateVersion: number,
		amount: string
	): Promise<void> {
		const number = `${projectCode}-INV-${String(estimateVersion).padStart(3, '0')}`
		const dueDate = new Date()
		dueDate.setDate(dueDate.getDate() + 14)
		const existing = await this.invoiceModel.findOne({ number }).exec()
		if (existing) {
			if (
				existing.status === InvoiceStatus.SENT ||
				existing.status === InvoiceStatus.PAID
			) {
				return
			}
			existing.status = InvoiceStatus.SENT
			existing.amount = amount
			existing.dueDate = dueDate
			await existing.save()
		} else {
			await this.invoiceModel.create({
				number,
				projectId,
				clientId,
				status: InvoiceStatus.SENT,
				amount,
				currency: 'UAH',
				dueDate,
			})
		}
		const client = await this.clientModel
			.findById(clientId)
			.select('userId')
			.lean()
			.exec()
		if (client?.userId) {
			await this.notificationModel.create({
				title: 'Рахунок до оплати',
				body: `Рахунок ${number} на ${amount} UAH за проєкт ${projectCode} готовий до оплати в кабінеті.`,
				userId: client.userId,
				projectId,
				entityType: 'Invoice',
				entityId: number,
				link: '/portal/invoices',
			})
		}
		await this.auditModel.create({
			projectId,
			action: 'invoice.sent',
			entityType: 'Invoice',
			entityId: number,
			metadata: { amount, estimateVersion },
		})
	}
}
