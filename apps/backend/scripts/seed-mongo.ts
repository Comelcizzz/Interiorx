import { NestFactory } from '@nestjs/core'
import { getModelToken } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { Model, Types } from 'mongoose'
import {
	localizeNotificationFields,
	projectStatusLabel,
} from '@tailored/shared'
import { AppModule } from '../src/app.module'
import {
	ApprovalStatus,
	ChangeRequestStatus,
	EstimateStatus,
	InventoryMovementType,
	InvoiceStatus,
	OrderStatus,
	PaymentStatus,
	ProjectStatus,
	ReceiptStatus,
	RoleCode,
	TaskStatus,
} from '../src/domain/enums'
import { Approval } from '../src/mongo/schemas/approval.schema'
import { AuditLog } from '../src/mongo/schemas/audit-log.schema'
import { CatalogService } from '../src/mongo/schemas/catalog-service.schema'
import { ChangeRequest } from '../src/mongo/schemas/change-request.schema'
import { ClientProfile } from '../src/mongo/schemas/client-profile.schema'
import { ContactSubmission } from '../src/mongo/schemas/contact-submission.schema'
import { DesignMeasurement } from '../src/mongo/schemas/design-measurement.schema'
import { EstimateItem } from '../src/mongo/schemas/estimate-item.schema'
import { Estimate } from '../src/mongo/schemas/estimate.schema'
import { InventoryMovement } from '../src/mongo/schemas/inventory-movement.schema'
import { Invoice } from '../src/mongo/schemas/invoice.schema'
import { Material } from '../src/mongo/schemas/material.schema'
import { Notification } from '../src/mongo/schemas/notification.schema'
import { Order } from '../src/mongo/schemas/order.schema'
import { Payment } from '../src/mongo/schemas/payment.schema'
import { PortfolioItem } from '../src/mongo/schemas/portfolio-item.schema'
import { ProjectLocation } from '../src/mongo/schemas/project-location.schema'
import { Project } from '../src/mongo/schemas/project.schema'
import { QualityChecklist } from '../src/mongo/schemas/quality-checklist.schema'
import { Receipt } from '../src/mongo/schemas/receipt.schema'
import { Review, ReviewStatus } from '../src/mongo/schemas/review.schema'
import {
	volumeReviewReviewerNames,
	volumeReviewRows,
} from './seed-reviews-volume'
import { Role } from '../src/mongo/schemas/role.schema'
import { StaffProfile } from '../src/mongo/schemas/staff-profile.schema'
import { Supplier } from '../src/mongo/schemas/supplier.schema'
import { Task } from '../src/mongo/schemas/task.schema'
import { TeamMember } from '../src/mongo/schemas/team-member.schema'
import { Team } from '../src/mongo/schemas/team.schema'
import { UploadedFileEntity } from '../src/mongo/schemas/uploaded-file.schema'
import { User } from '../src/mongo/schemas/user.schema'
const password = 'Demo12345!'
const roleRows: Array<{
	code: RoleCode
	name: string
	description: string
	permissions: string[]
}> = [
	{
		code: RoleCode.ADMIN,
		name: 'Admin',
		description: 'Повний контроль платформи',
		permissions: ['*'],
	},
	{
		code: RoleCode.PROJECT_MANAGER,
		name: 'Менеджер проєкту',
		description: 'Заявки, проєкти, кошториси, оплати, чеки',
		permissions: [
			'projects:manage',
			'orders:manage',
			'estimates:manage',
			'payments:manage',
			'receipts:manage',
			'reports:read',
		],
	},
	{
		code: RoleCode.DESIGNER,
		name: 'Дизайнер',
		description: 'Моя робота, заміри, фото-звіти на проєкті',
		permissions: ['projects:read', 'measurements:manage', 'materials:read'],
	},
	{
		code: RoleCode.BRIGADIR,
		name: 'Бригадир',
		description: "Задачі, фото з об'єкту, перегляд проєктів бригади",
		permissions: ['projects:read', 'tasks:manage', 'photo_reports:create'],
	},
	{
		code: RoleCode.CLIENT,
		name: 'Клієнт',
		description: 'Портал: заявки, проєкти, рахунки, оплата',
		permissions: ['client_portal:read', 'payments:create'],
	},
]
const demoUsers = [
	['admin@tailored.demo', 'Іван Бідловський', RoleCode.ADMIN, 'Власник системи'],
	[
		'manager@tailored.demo',
		'Олена Кравець',
		RoleCode.PROJECT_MANAGER,
		'Керівниця проєктів',
	],
	[
		'designer@tailored.demo',
		'Марія Савчук',
		RoleCode.DESIGNER,
		'Дизайнерка інтерʼєру',
	],
	[
		'brigadir@tailored.demo',
		'Василь Ткаченко',
		RoleCode.BRIGADIR,
		'Бригадир будівельних робіт',
	],
	['client@tailored.demo', 'Юлія Мороз', RoleCode.CLIENT, 'Клієнтка'],
	[
		'client.hotel@tailored.demo',
		'Дарія Горова',
		RoleCode.CLIENT,
		'Власниця готелю',
	],
	[
		'client.office@tailored.demo',
		'Максим Руденко',
		RoleCode.CLIENT,
		'Директор офісу',
	],
	[
		'client.retail@tailored.demo',
		'Ірина Шевець',
		RoleCode.CLIENT,
		'Власниця магазину',
	],
] as const
type Ctx = {
	roleModel: Model<Role>
	userModel: Model<User>
	clientModel: Model<ClientProfile>
	staffModel: Model<StaffProfile>
	orderModel: Model<Order>
	supplierModel: Model<Supplier>
	materialModel: Model<Material>
	movementModel: Model<InventoryMovement>
	projectModel: Model<Project>
	locationModel: Model<ProjectLocation>
	measurementModel: Model<DesignMeasurement>
	estimateModel: Model<Estimate>
	estimateItemModel: Model<EstimateItem>
	teamModel: Model<Team>
	teamMemberModel: Model<TeamMember>
	taskModel: Model<Task>
	invoiceModel: Model<Invoice>
	paymentModel: Model<Payment>
	receiptModel: Model<Receipt>
	changeRequestModel: Model<ChangeRequest>
	qualityModel: Model<QualityChecklist>
	approvalModel: Model<Approval>
	auditModel: Model<AuditLog>
	notificationModel: Model<Notification>
	catalogModel: Model<CatalogService>
	portfolioModel: Model<PortfolioItem>
	reviewModel: Model<Review>
	contactSubmissionModel: Model<ContactSubmission>
	fileModel: Model<UploadedFileEntity>
}

function uploadRootPath() {
	const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads'
	return path.isAbsolute(uploadRoot)
		? uploadRoot
		: path.join(process.cwd(), uploadRoot)
}

function writeDemoSvg(name: string, title: string, subtitle: string, tone: string) {
	const root = path.join(uploadRootPath(), 'demo')
	fs.mkdirSync(root, { recursive: true })
	const file = path.join(root, name)
	const palette: Record<string, [string, string, string]> = {
		interior: ['#f2efe8', '#243126', '#b8794c'],
		lighting: ['#eef3f6', '#1f2a44', '#d7a43b'],
		facade: ['#ebe7df', '#2f3d46', '#8b9a72'],
		material: ['#f5efe6', '#2a2f2d', '#607466'],
		terrace: ['#edf2ea', '#243126', '#c06f44'],
	}
	const [bg, ink, accent] = palette[tone] ?? palette.interior
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="820" viewBox="0 0 1280 820">
<rect width="1280" height="820" fill="${bg}"/>
<rect x="78" y="74" width="1124" height="672" rx="44" fill="#fffaf3" opacity=".82"/>
<path d="M128 642 C312 560 438 612 590 502 C748 388 846 434 1154 238" fill="none" stroke="${accent}" stroke-width="42" stroke-linecap="round" opacity=".35"/>
<rect x="158" y="144" width="410" height="278" rx="28" fill="${ink}" opacity=".92"/>
<rect x="618" y="150" width="476" height="84" rx="22" fill="${accent}" opacity=".82"/>
<rect x="618" y="278" width="360" height="34" rx="17" fill="${ink}" opacity=".23"/>
<rect x="618" y="334" width="430" height="34" rx="17" fill="${ink}" opacity=".18"/>
<rect x="170" y="458" width="170" height="128" rx="26" fill="${accent}" opacity=".78"/>
<rect x="372" y="458" width="170" height="128" rx="26" fill="${ink}" opacity=".12"/>
<text x="158" y="668" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="${ink}">${title}</text>
<text x="158" y="718" font-family="Arial, sans-serif" font-size="26" fill="${ink}" opacity=".72">${subtitle}</text>
</svg>`
	fs.writeFileSync(file, svg)
}

function ensureDemoMarketingImages() {
	const rows: Array<[string, string, string, string]> = [
		['catalog-full-interior.svg', 'Повний інтерʼєр', 'Концепція, матеріали, реалізація', 'interior'],
		['catalog-kitchen-living.svg', 'Кухня-вітальня', 'Зонування, світло, меблі', 'interior'],
		['catalog-commercial-lobby.svg', 'Комерційне лобі', 'Рецепція, навігація, атмосфера', 'material'],
		['catalog-lighting-design.svg', 'Світловий дизайн', 'Сценарії, акценти, керування', 'lighting'],
		['catalog-exterior-facade.svg', 'Фасад і тераса', 'Матеріали, вхідна група, дренаж', 'facade'],
		['catalog-bathroom-remodel.svg', 'Санвузол під ключ', 'Гідроізоляція, плитка, сантехніка', 'material'],
		['ternopil-residence.svg', 'Тернопільська резиденція', 'Теплий інтерʼєр з деревом', 'interior'],
		['lviv-facade.svg', 'Львівський фасад', 'Тераса та вхідна група', 'facade'],
		['kyiv-office-quiet.svg', 'Київський офіс', 'Акустика і гнучкі робочі зони', 'material'],
		['ifr-retail-light.svg', 'Retail lighting', 'Світло для вітрин і маршруту', 'lighting'],
		['uzhhorod-terrace.svg', 'Ужгородська тераса', 'Камінь, зелень і дренаж', 'terrace'],
		['review-1.svg', 'Фінальний огляд', 'Фото до відгуку клієнта', 'interior'],
	]
	for (const row of rows) writeDemoSvg(...row)
}

function ctx(
	app: Awaited<ReturnType<typeof NestFactory.createApplicationContext>>
): Ctx {
	return {
		roleModel: app.get(getModelToken(Role.name)),
		userModel: app.get(getModelToken(User.name)),
		clientModel: app.get(getModelToken(ClientProfile.name)),
		staffModel: app.get(getModelToken(StaffProfile.name)),
		orderModel: app.get(getModelToken(Order.name)),
		supplierModel: app.get(getModelToken(Supplier.name)),
		materialModel: app.get(getModelToken(Material.name)),
		movementModel: app.get(getModelToken(InventoryMovement.name)),
		projectModel: app.get(getModelToken(Project.name)),
		locationModel: app.get(getModelToken(ProjectLocation.name)),
		measurementModel: app.get(getModelToken(DesignMeasurement.name)),
		estimateModel: app.get(getModelToken(Estimate.name)),
		estimateItemModel: app.get(getModelToken(EstimateItem.name)),
		teamModel: app.get(getModelToken(Team.name)),
		teamMemberModel: app.get(getModelToken(TeamMember.name)),
		taskModel: app.get(getModelToken(Task.name)),
		invoiceModel: app.get(getModelToken(Invoice.name)),
		paymentModel: app.get(getModelToken(Payment.name)),
		receiptModel: app.get(getModelToken(Receipt.name)),
		changeRequestModel: app.get(getModelToken(ChangeRequest.name)),
		qualityModel: app.get(getModelToken(QualityChecklist.name)),
		approvalModel: app.get(getModelToken(Approval.name)),
		auditModel: app.get(getModelToken(AuditLog.name)),
		notificationModel: app.get(getModelToken(Notification.name)),
		catalogModel: app.get(getModelToken(CatalogService.name)),
		portfolioModel: app.get(getModelToken(PortfolioItem.name)),
		reviewModel: app.get(getModelToken(Review.name)),
		contactSubmissionModel: app.get(getModelToken(ContactSubmission.name)),
		fileModel: app.get(getModelToken(UploadedFileEntity.name)),
	}
}
const RETIRED_DEMO_EMAILS = [
	'lead@tailored.demo',
	'worker@tailored.demo',
	'supplier@tailored.demo',
	'estimator@tailored.demo',
	'accountant@tailored.demo',
	'accountant2@tailored.demo',
] as const

async function migrateLegacyUserRoles(
	c: Ctx,
	roleByCode: Record<
		RoleCode,
		Role & {
			_id: Types.ObjectId
		}
	>
) {
	// Legacy roles removed — no migration needed
	const mappings: Array<[RoleCode, RoleCode]> = []
	let migrated = 0
	for (const [from, to] of mappings) {
		const fromRole = await c.roleModel.findOne({ code: from }).lean().exec()
		const toRole = roleByCode[to]
		if (!fromRole?._id || !toRole?._id) continue
		const res = await c.userModel
			.updateMany(
				{ roleId: fromRole._id },
				{ $set: { roleId: toRole._id } }
			)
			.exec()
		migrated += res.modifiedCount ?? 0
	}
	if (migrated > 0) {
		console.log(`Migrated ${migrated} user(s) from legacy roles.`)
	}
	await c.userModel
		.updateMany(
			{ email: { $in: [...RETIRED_DEMO_EMAILS] } },
			{ $set: { isActive: false } }
		)
		.exec()
}

async function upsertRoles(c: Ctx) {
	const map = {} as Record<
		RoleCode,
		Role & {
			_id: Types.ObjectId
		}
	>
	for (const row of roleRows) {
		const doc = await c.roleModel.findOneAndUpdate(
			{ code: row.code },
			{
				$set: {
					name: row.name,
					description: row.description,
					permissions: row.permissions,
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
		map[row.code] = doc!
	}
	return map
}
async function upsertUsers(
	c: Ctx,
	roleByCode: Record<
		RoleCode,
		Role & {
			_id: Types.ObjectId
		}
	>
) {
	const passwordHash = await bcrypt.hash(password, 12)
	const users: Record<
		string,
		User & {
			_id: Types.ObjectId
		}
	> = {}
	for (const [email, fullName, roleCode, title] of demoUsers) {
		let u = await c.userModel.findOne({ email }).exec()
		if (!u) {
			u = await c.userModel.create({
				email,
				fullName,
				title,
				passwordHash,
				roleId: roleByCode[roleCode]._id,
				phone: '+380 67 000 00 00',
				isActive: true,
			})
		} else {
			u.fullName = fullName
			u.title = title
			u.roleId = roleByCode[roleCode]._id
			u.isActive = true
			await u.save()
		}
		users[email] = u
	}
	const clientUser = users['client@tailored.demo']
	let client = await c.clientModel.findOne({ userId: clientUser._id }).exec()
	if (!client) {
		client = await c.clientModel.create({
			userId: clientUser._id,
			companyName: 'Moroz Family Residence',
			leadSource: 'Instagram',
		})
	} else {
		client.companyName = 'Moroz Family Residence'
		client.leadSource = 'Instagram'
		await client.save()
	}
	const extraClientRows = [
		['client.hotel@tailored.demo', 'Horova Boutique Hotel', 'Referral'],
		['client.office@tailored.demo', 'Rudenko Consulting Office', 'Google Search'],
		['client.retail@tailored.demo', 'Shevets Concept Store', 'Expo Lead'],
	] as const
	const extraClients: (ClientProfile & {
		_id: Types.ObjectId
	})[] = []
	for (const [email, companyName, leadSource] of extraClientRows) {
		let cp = await c.clientModel
			.findOne({ userId: users[email]._id })
			.exec()
		if (!cp) {
			cp = await c.clientModel.create({
				userId: users[email]._id,
				companyName,
				leadSource,
			})
		} else {
			cp.companyName = companyName
			cp.leadSource = leadSource
			await cp.save()
		}
		extraClients.push(cp)
	}
	const clientOrderRows = [
		[
			extraClients[0]._id,
			'TDS-LEAD-HOTEL-01',
			'Lobby refresh before summer season',
			OrderStatus.QUALIFIED,
			'540000',
			'Lviv',
			'Rynok Square 7',
		],
		[
			extraClients[0]._id,
			'TDS-LEAD-HOTEL-02',
			'Guest room lighting package',
			OrderStatus.NEW,
			'220000',
			'Lviv',
			'Valova 12',
		],
		[
			extraClients[1]._id,
			'TDS-LEAD-OFFICE-01',
			'Consultation office acoustic redesign',
			OrderStatus.CONVERTED,
			'310000',
			'Kyiv',
			'Yaroslaviv Val 18',
		],
		[
			extraClients[2]._id,
			'TDS-LEAD-RETAIL-01',
			'Concept store interior and checkout zone',
			OrderStatus.QUALIFIED,
			'470000',
			'Ivano-Frankivsk',
			'Nezalezhnosti 44',
		],
		[
			extraClients[2]._id,
			'TDS-LEAD-RETAIL-02',
			'Seasonal window display system',
			OrderStatus.NEW,
			'96000',
			'Ivano-Frankivsk',
			'Nezalezhnosti 44',
		],
	] as const
	for (const [
		clientId,
		code,
		title,
		status,
		requestedBudget,
		city,
		addressLine,
	] of clientOrderRows) {
		let ord = await c.orderModel.findOne({ code }).exec()
		if (!ord) {
			await c.orderModel.create({
				code,
				title,
				description: `${title}. Demo CRM request prepared for sales pipeline.`,
				status,
				requestedBudget,
				clientId,
				addressLine,
				city,
				phone: '+380 67 555 11 22',
				workerIds: [],
				referencePhotoUrls: [],
				source: 'crm_seed',
			})
		} else {
			ord.title = title
			ord.status = status
			ord.requestedBudget = requestedBudget
			ord.city = city
			ord.addressLine = addressLine
			await ord.save()
		}
	}
	const staff: Record<
		string,
		StaffProfile & {
			_id: Types.ObjectId
		}
	> = {}
	const staffRows = [
		['manager@tailored.demo', 'Планування, дедлайни і комунікація з клієнтом', 38],
		[
			'designer@tailored.demo',
			'Заміри, концепція інтерʼєру і дизайн-пакет',
			34,
		],
		[
			'brigadir@tailored.demo',
			"Виконання будівельних і оздоблювальних робіт на об’єктах",
			48,
		],
	] as const
	for (const [email, specialization, capacityHours] of staffRows) {
		let s = await c.staffModel.findOne({ userId: users[email]._id }).exec()
		if (!s) {
			s = await c.staffModel.create({
				userId: users[email]._id,
				specialization,
				capacityHours,
			})
		} else {
			s.specialization = specialization
			s.capacityHours = capacityHours
			await s.save()
		}
		staff[email] = s
	}
	return { users, client, extraClients, staff }
}
async function seedSuppliersAndMaterials(c: Ctx) {
	const woodSupplier = (await c.supplierModel.findOneAndUpdate(
		{ name: 'Ternopil Wood Studio' },
		{
			$set: {
				contactName: 'Петро Данилюк',
				email: 'wood@tailored.demo',
				phone: '+380 67 110 20 30',
				city: 'Тернопіль',
				reliability: 92,
			},
		},
		{ upsert: true, returnDocument: 'after' }
	))!
	const finishSupplier = (await c.supplierModel.findOneAndUpdate(
		{ name: 'Lviv Finish Depot' },
		{
			$set: {
				contactName: 'Софія Ільницька',
				email: 'finish@tailored.demo',
				phone: '+380 67 220 40 50',
				city: 'Львів',
				reliability: 86,
			},
		},
		{ upsert: true, returnDocument: 'after' }
	))!
	const materials: Array<
		[
			string,
			string,
			string,
			string,
			string,
			string,
			string,
			string,
			Types.ObjectId,
		]
	> = [
		[
			'MAT-OAK-PANEL',
			'Дубова декоративна панель',
			'Wood',
			'м2',
			'860',
			'1240',
			'42',
			'12',
			woodSupplier._id,
		],
		[
			'MAT-PAINT-WARM',
			'Фарба тепла біла premium',
			'Paint',
			'л',
			'310',
			'520',
			'18',
			'25',
			finishSupplier._id,
		],
		[
			'MAT-TILE-STONE',
			'Керамограніт stone grey',
			'Tile',
			'м2',
			'720',
			'990',
			'9',
			'18',
			finishSupplier._id,
		],
		[
			'MAT-LED-LINE',
			'LED профіль прихованого світла',
			'Lighting',
			'м',
			'240',
			'410',
			'55',
			'30',
			finishSupplier._id,
		],
		[
			'MAT-ACOUSTIC-FELT',
			'Acoustic felt wall panel',
			'Acoustic',
			'm2',
			'640',
			'940',
			'16',
			'10',
			finishSupplier._id,
		],
		[
			'MAT-BRASS-RAIL',
			'Brass decorative rail',
			'Metal',
			'м',
			'510',
			'780',
			'28',
			'14',
			finishSupplier._id,
		],
		[
			'MAT-MICROCEMENT',
			'Microcement finish kit',
			'Finish',
			'kg',
			'180',
			'310',
			'74',
			'35',
			finishSupplier._id,
		],
		[
			'MAT-WALNUT-VENEER',
			'Walnut veneer sheet',
			'Wood',
			'm2',
			'980',
			'1410',
			'11',
			'12',
			woodSupplier._id,
		],
		[
			'MAT-SMART-DIMMER',
			'Smart dimmer module',
			'Lighting',
			'pcs',
			'760',
			'1180',
			'24',
			'8',
			finishSupplier._id,
		],
		[
			'MAT-OUTDOOR-STONE',
			'Outdoor stone cladding',
			'Exterior',
			'm2',
			'890',
			'1290',
			'20',
			'15',
			finishSupplier._id,
		],
	]
	const saved: (Material & {
		_id: Types.ObjectId
	})[] = []
	for (const [
		sku,
		name,
		category,
		unit,
		purchasePrice,
		salePrice,
		stockQty,
		minStockQty,
		supplierId,
	] of materials) {
		let m = await c.materialModel.findOne({ sku }).exec()
		if (!m) {
			m = await c.materialModel.create({
				sku,
				name,
				category,
				unit,
				purchasePrice,
				salePrice,
				stockQty,
				minStockQty,
				supplierId,
			})
		} else {
			m.name = name
			m.category = category
			m.unit = unit
			m.purchasePrice = purchasePrice
			m.salePrice = salePrice
			m.stockQty = stockQty
			m.minStockQty = minStockQty
			m.supplierId = supplierId
			await m.save()
		}
		await c.movementModel.deleteMany({
			materialId: m._id,
			reason: `Demo stock balance for ${name}`,
		})
		await c.movementModel.create({
			materialId: m._id,
			type: InventoryMovementType.ADJUSTMENT,
			quantity: stockQty,
			reason: `Demo stock balance for ${name}`,
		})
		saved.push(m)
	}
	return saved
}
async function seedProjects(
	c: Ctx,
	client: ClientProfile & {
		_id: Types.ObjectId
	},
	staff: Record<
		string,
		StaffProfile & {
			_id: Types.ObjectId
		}
	>,
	materials: (Material & {
		_id: Types.ObjectId
	})[]
) {
	const manager = staff['manager@tailored.demo']
	const designer = staff['designer@tailored.demo']
	const brigadir = staff['brigadir@tailored.demo']
	const estimator = staff['manager@tailored.demo']
	const lead = staff['manager@tailored.demo']
	const worker = staff['designer@tailored.demo']
	const projectRows = [
		{
			code: 'TDS-2026-001',
			title: 'Квартира з прихованим освітленням',
			description:
				'Комплексний дизайн і реалізація квартири для сімʼї у Тернополі.',
			status: ProjectStatus.IN_PROGRESS,
			city: 'Тернопіль',
			region: 'Тернопільська область',
			addressLine: 'вул. Руська, 18',
			placeLabel: 'Центр Тернополя',
			latitude: '49.5535',
			longitude: '25.5948',
			budgetPlanned: '420000',
			budgetApproved: '463800',
		},
		{
			code: 'TDS-2026-002',
			title: 'Екстерʼєр приватного будинку',
			description:
				'Фасад, тераса, освітлення і зона входу для будинку під Львовом.',
			status: ProjectStatus.ESTIMATION,
			city: 'Львів',
			region: 'Львівська область',
			addressLine: 'вул. Пасічна, 72',
			placeLabel: 'Львів, східний район',
			latitude: '49.8351',
			longitude: '24.0741',
			budgetPlanned: '680000',
			budgetApproved: null as string | null,
		},
		{
			code: 'TDS-2026-003',
			title: 'Офіс-студія для консультацій',
			description:
				'Невеликий офіс із приймальною, робочою зоною та акустичними панелями.',
			status: ProjectStatus.PAUSED,
			city: 'Київ',
			region: 'Київська область',
			addressLine: 'вул. Велика Васильківська, 48',
			placeLabel: 'Київ, діловий центр',
			latitude: '50.4384',
			longitude: '30.5156',
			budgetPlanned: '310000',
			budgetApproved: '295000',
		},
		{
			code: 'TDS-2026-004',
			title: 'Boutique hotel lobby and reception',
			description:
				'Lobby redesign, reception desk, acoustic panels and durable guest-zone finishes.',
			status: ProjectStatus.DESIGN,
			city: 'Lviv',
			region: 'Lviv region',
			addressLine: 'Rynok Square 7',
			placeLabel: 'Lviv old town hotel',
			latitude: '49.8419',
			longitude: '24.0315',
			budgetPlanned: '540000',
			budgetApproved: '575000',
		},
		{
			code: 'TDS-2026-005',
			title: 'Retail concept store lighting',
			description:
				'Lighting plan, checkout area, display modules and weekend installation schedule.',
			status: ProjectStatus.APPROVED,
			city: 'Ivano-Frankivsk',
			region: 'Ivano-Frankivsk region',
			addressLine: 'Nezalezhnosti 44',
			placeLabel: 'Central retail street',
			latitude: '48.9226',
			longitude: '24.7111',
			budgetPlanned: '470000',
			budgetApproved: '492000',
		},
		{
			code: 'TDS-2026-006',
			title: 'Exterior terrace and entrance upgrade',
			description:
				'Outdoor cladding, pathway lighting, drainage details and facade accent work.',
			status: ProjectStatus.WARRANTY,
			city: 'Uzhhorod',
			region: 'Zakarpattia region',
			addressLine: 'Korzo 3',
			placeLabel: 'Uzhhorod pedestrian center',
			latitude: '48.6242',
			longitude: '22.2947',
			budgetPlanned: '360000',
			budgetApproved: '382500',
		},
		{
			code: 'TDS-2026-010',
			title: 'Завершена резиденція на Подолі',
			description:
				'Завершений житловий проєкт з кошторисами, актами, оплатами і клієнтськими відгуками.',
			status: ProjectStatus.COMPLETED,
			city: 'Ternopil',
			region: 'Ternopilska oblast',
			addressLine: 'Вулиця Межигірська, 12',
			placeLabel: 'Central Ternopil',
			latitude: '49.5535',
			longitude: '25.5948',
			budgetPlanned: '410000',
			budgetApproved: '410000',
		},
	]
	const savedProjects: (Project & {
		_id: Types.ObjectId
	})[] = []
	for (const item of projectRows) {
		let project = await c.projectModel.findOne({ code: item.code }).exec()
		const needsBrigadir = [
			ProjectStatus.APPROVED,
			ProjectStatus.IN_PROGRESS,
			ProjectStatus.COMPLETED,
		].includes(item.status as ProjectStatus)
		const base = {
			title: item.title,
			description: item.description,
			status: item.status,
			managerId: manager._id,
			designerId: designer._id,
			brigadirId: needsBrigadir && brigadir ? brigadir._id : undefined,
			budgetPlanned: item.budgetPlanned,
			budgetApproved: item.budgetApproved ?? undefined,
			dueDate: new Date('2026-06-20T12:00:00.000Z'),
		}
		if (!project) {
			project = await c.projectModel.create({
				code: item.code,
				clientId: client._id,
				...base,
				startDate: new Date('2026-05-05T10:00:00.000Z'),
			})
		} else {
			Object.assign(project, base)
			await project.save()
		}
		await c.notificationModel.deleteMany({ projectId: project._id })
		await c.auditModel.deleteMany({ projectId: project._id })
		await c.qualityModel.deleteMany({ projectId: project._id })
		await c.changeRequestModel.deleteMany({ projectId: project._id })
		await c.approvalModel.deleteMany({ projectId: project._id })
		await c.locationModel.findOneAndUpdate(
			{ projectId: project._id },
			{
				$set: {
					addressLine: item.addressLine,
					city: item.city,
					region: item.region,
					placeLabel: item.placeLabel,
					latitude: item.latitude,
					longitude: item.longitude,
					country: 'Україна',
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
		const orderCode = `${item.code}-ORDER`
		let ord = await c.orderModel.findOne({ code: orderCode }).exec()
		const ordStatus =
			item.status === ProjectStatus.ESTIMATION
				? OrderStatus.QUALIFIED
				: OrderStatus.CONVERTED
		if (!ord) {
			await c.orderModel.create({
				code: orderCode,
				title: `Заявка: ${item.title}`,
				description: item.description,
				status: ordStatus,
				requestedBudget: item.budgetPlanned,
				clientId: client._id,
				projectId: project._id,
				addressLine: item.addressLine,
				city: item.city,
				phone: '+380 67 333 44 55',
				workerIds: [],
			})
		} else {
			ord.status = ordStatus
			ord.projectId = project._id
			await ord.save()
		}
		await c.measurementModel.deleteMany({ projectId: project._id })
		await c.measurementModel.insertMany([
			{
				projectId: project._id,
				zoneName: 'Вітальня',
				floorArea: '28.4',
				wallArea: '61.2',
				ceilingHeight: '2.75',
				notes: 'Потрібна ніша під приховане світло.',
			},
			{
				projectId: project._id,
				zoneName: 'Передпокій',
				floorArea: '9.6',
				wallArea: '24.1',
				ceilingHeight: '2.70',
				notes: 'Є обмеження по глибині шафи.',
			},
		])
		let estimate = await c.estimateModel
			.findOne({ projectId: project._id, version: 1 })
			.exec()
		const estPayload = {
			status:
				item.status === ProjectStatus.ESTIMATION
					? EstimateStatus.SENT
					: EstimateStatus.APPROVED,
			subtotal: '388000',
			discount: '8000',
			tax: '0',
			margin: '83800',
			total: item.budgetApproved ?? '463800',
			validUntil: new Date('2026-05-25T12:00:00.000Z'),
		}
		if (!estimate) {
			estimate = await c.estimateModel.create({
				projectId: project._id,
				version: 1,
				...estPayload,
			})
		} else {
			Object.assign(estimate, estPayload)
			await estimate.save()
		}
		await c.estimateItemModel.deleteMany({ estimateId: estimate._id })
		await c.estimateItemModel.insertMany([
			{
				estimateId: estimate._id,
				materialId: materials[0]._id,
				category: 'Матеріали',
				title: materials[0].name,
				unit: 'м2',
				quantity: '22',
				unitPrice: '1240',
				total: '27280',
				sortOrder: 1,
			},
			{
				estimateId: estimate._id,
				materialId: materials[3]._id,
				category: 'Освітлення',
				title: materials[3].name,
				unit: 'м',
				quantity: '38',
				unitPrice: '410',
				total: '15580',
				sortOrder: 2,
			},
			{
				estimateId: estimate._id,
				category: 'Роботи',
				title: 'Монтаж декоративних панелей і фінальне оздоблення',
				unit: 'послуга',
				quantity: '1',
				unitPrice: '142000',
				total: '142000',
				sortOrder: 3,
			},
		])
		const team = (await c.teamModel.findOneAndUpdate(
			{ name: 'Бригада Тернопіль Finish 01' },
			{ $set: { city: 'Тернопіль', speciality: 'Interior finishing' } },
			{ upsert: true, returnDocument: 'after' }
		))!
		await c.teamMemberModel.deleteMany({ teamId: team._id })
		await c.teamMemberModel.insertMany([
			{ teamId: team._id, staffId: lead._id, isLead: true },
			{ teamId: team._id, staffId: worker._id, isLead: false },
		])
		await c.taskModel.deleteMany({ projectId: project._id })
		await c.taskModel.insertMany([
			{
				projectId: project._id,
				teamId: team._id,
				assigneeId: lead._id,
				title: 'Погодити порядок робіт на тиждень',
				status: TaskStatus.READY,
				priority: 2,
				dueDate: new Date('2026-05-09T12:00:00.000Z'),
			},
			{
				projectId: project._id,
				teamId: team._id,
				assigneeId: worker._id,
				title: 'Змонтувати LED профіль у вітальні',
				status:
					item.status === ProjectStatus.PAUSED
						? TaskStatus.BLOCKED
						: TaskStatus.IN_PROGRESS,
				priority: 1,
				dueDate: new Date('2026-05-12T12:00:00.000Z'),
			},
			{
				projectId: project._id,
				teamId: team._id,
				assigneeId: estimator._id,
				title: 'Перевірити маржу після зміни матеріалів',
				status: TaskStatus.REVIEW,
				priority: 3,
				dueDate: new Date('2026-05-15T12:00:00.000Z'),
			},
		])
		const invNum = `${item.code}-INV-001`
		let invoice = await c.invoiceModel.findOne({ number: invNum }).exec()
		const invAmt = item.budgetApproved ?? '120000'
		const invStatus =
			item.status === ProjectStatus.IN_PROGRESS
				? InvoiceStatus.PAID
				: InvoiceStatus.SENT
		if (!invoice) {
			invoice = await c.invoiceModel.create({
				number: invNum,
				projectId: project._id,
				clientId: client._id,
				status: invStatus,
				amount: invAmt,
				dueDate: new Date('2026-05-18T12:00:00.000Z'),
			})
		} else {
			invoice.projectId = project._id
			invoice.clientId = client._id
			invoice.status = invStatus
			invoice.amount = invAmt
			invoice.dueDate = new Date('2026-05-18T12:00:00.000Z')
			await invoice.save()
		}
		const pref = `${item.code}-PAY-001`
		let payment = await c.paymentModel.findOne({ providerRef: pref }).exec()
		const payStatus =
			item.status === ProjectStatus.IN_PROGRESS
				? PaymentStatus.PAID
				: PaymentStatus.PENDING
		if (!payment) {
			payment = await c.paymentModel.create({
				projectId: project._id,
				clientId: client._id,
				status: payStatus,
				amount: invoice.amount,
				method: 'card',
				providerRef: pref,
				paidAt:
					payStatus === PaymentStatus.PAID
						? new Date('2026-05-06T10:30:00.000Z')
						: undefined,
			})
		} else {
			payment.projectId = project._id
			payment.clientId = client._id
			payment.status = payStatus
			payment.amount = invoice.amount
			payment.paidAt =
				payStatus === PaymentStatus.PAID
					? new Date('2026-05-06T10:30:00.000Z')
					: undefined
			await payment.save()
		}
		if (payment.status === PaymentStatus.PAID) {
			const rcptNum = `${item.code}-RCPT-001`
			await c.receiptModel.findOneAndUpdate(
				{ number: rcptNum },
				{
					$set: {
						projectId: project._id,
						clientId: client._id,
						paymentId: payment._id,
						status: ReceiptStatus.ISSUED,
						amount: payment.amount,
						pdfPath: `/receipts/${item.code}-RCPT-001.pdf`,
						issuedAt: new Date(),
					},
				},
				{ upsert: true, returnDocument: 'after' }
			)
		}
		await c.changeRequestModel.create({
			projectId: project._id,
			title: 'Додати теплу LED-лінію біля робочої зони',
			description:
				'Клієнт попросив додати окремий сценарій освітлення після затвердження концепту.',
			status:
				item.status === ProjectStatus.IN_PROGRESS
					? ChangeRequestStatus.APPROVED
					: ChangeRequestStatus.OPEN,
			impactCost: '18500',
			impactDays: 2,
		})
		await c.qualityModel.create({
			projectId: project._id,
			title: 'Проміжна перевірка оздоблення',
			score: item.status === ProjectStatus.PAUSED ? 62 : 88,
			items: {
				rows: [
					{ label: 'Геометрія стиків', done: true },
					{
						label: 'Відповідність матеріалів кошторису',
						done: item.status !== ProjectStatus.PAUSED,
					},
					{ label: 'Фото-звіт додано', done: true },
				],
			},
		})
		await c.approvalModel.create({
			projectId: project._id,
			estimateId: estimate._id,
			kind: 'estimate',
			status:
				item.status === ProjectStatus.ESTIMATION
					? ApprovalStatus.PENDING
					: ApprovalStatus.APPROVED,
			requestedBy: 'manager@tailored.demo',
			decidedBy:
				item.status === ProjectStatus.ESTIMATION
					? undefined
					: 'client@tailored.demo',
			notes: 'Погодження кошторису клієнтом через портал.',
			decidedAt:
				item.status === ProjectStatus.ESTIMATION
					? undefined
					: new Date('2026-05-06T09:00:00.000Z'),
		})
		await c.auditModel.create({
			projectId: project._id,
			action: 'seed.project.prepared',
			entityType: 'Project',
			entityId: project._id.toString(),
			metadata: { code: item.code, status: item.status },
		})
		await c.notificationModel.create({
			projectId: project._id,
			title: `Оновлення по ${item.code}`,
			body: `Проєкт «${item.title}» має статус ${projectStatusLabel(item.status)}.`,
			roleCode: RoleCode.PROJECT_MANAGER,
		})
		savedProjects.push(project)
	}
	return savedProjects
}
async function seedExpansion(
	c: Ctx,
	roleByCode: Record<
		RoleCode,
		Role & {
			_id: Types.ObjectId
		}
	>
) {
	const roleId = (code: RoleCode) => roleByCode[code]._id
	const extraEmails = [
		[
			'andrii.kovalenko@demo.ua',
			'Андрій Коваленко',
			'+380501112233',
			'Kovalenko Residence',
		],
		[
			'olena.petrenko@demo.ua',
			'Олена Петренко',
			'+380672223344',
			'Petrenko Family Home',
		],
		[
			'mykola.savchenko@demo.ua',
			'Микола Савченко',
			'+380933334455',
			'Savchenko Villa',
		],
		[
			'tetiana.bondar@demo.ua',
			'Тетяна Бондар',
			'+380504445566',
			'Bondar Penthouse',
		],
		[
			'vasyl.kravchenko@demo.ua',
			'Василь Кравченко',
			'+380675556677',
			'Kravchenko Office',
		],
		[
			'iryna.sydorenko@demo.ua',
			'Ірина Сидоренко',
			'+380936667788',
			'Sydorenko Cafe',
		],
		[
			'dmytro.melnyk@demo.ua',
			'Дмитро Мельник',
			'+380507778899',
			'Melnyk Showroom',
		],
		[
			'natalia.tkachenko@demo.ua',
			'Наталія Ткаченко',
			'+380678889900',
			'Tkachenko Studio',
		],
		[
			'serhii.ponomarenko@demo.ua',
			'Сергій Пономаренко',
			'+380939990011',
			'Ponomarenko Clinic',
		],
		[
			'larysa.kovalchuk@demo.ua',
			'Лариса Ковальчук',
			'+380500001122',
			'Kovalchuk Spa',
		],
		[
			'oleksii.marchenko@demo.ua',
			'Олексій Марченко',
			'+380671112233',
			'Marchenko Gym',
		],
		[
			'yuliia.lysenko@demo.ua',
			'Юлія Лисенко',
			'+380932223344',
			'Lysenko Boutique',
		],
		[
			'roman.humeniuk@demo.ua',
			'Роман Гуменюк',
			'+380503334455',
			'Humeniuk Library',
		],
		[
			'alla.shevchenko@demo.ua',
			'Алла Шевченко',
			'+380674445566',
			'Shevchenko Gallery',
		],
		[
			'pavlo.kulish@demo.ua',
			'Павло Куліш',
			'+380935556677',
			'Kulish Restaurant',
		],
		[
			'oksana.vorona@demo.ua',
			'Оксана Ворона',
			'+380506667788',
			'Vorona Kindergarten',
		],
	]
	const leadSources = [
		'Instagram',
		'Referral',
		'Google Search',
		'Expo Lead',
		'Facebook',
		'Direct Call',
	]
	for (let i = 0; i < extraEmails.length; i++) {
		const [email, fullName, phone, companyName] = extraEmails[i]
		let u = await c.userModel.findOne({ email }).exec()
		if (!u) {
			const hash = await bcrypt.hash('Demo12345!', 10)
			u = await c.userModel.create({
				email,
				passwordHash: hash,
				fullName,
				phone,
				isActive: true,
				roleId: roleId(RoleCode.CLIENT),
			})
		}
		await c.clientModel.findOneAndUpdate(
			{ userId: u._id },
			{
				$set: {
					companyName,
					leadSource: leadSources[i % leadSources.length],
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
	}
	const extraMats: Array<
		[string, string, string, string, string, string, string, string]
	> = [
		[
			'MAT-CORK-FLOOR',
			'Cork floor tile',
			'Floor',
			'м2',
			'420',
			'680',
			'30',
			'15',
		],
		[
			'MAT-EPOXY-FLOOR',
			'Epoxy floor system',
			'Floor',
			'кг',
			'290',
			'490',
			'60',
			'20',
		],
		[
			'MAT-BAMBOO-PANEL',
			'Bamboo wall panel',
			'Wood',
			'м2',
			'540',
			'820',
			'22',
			'10',
		],
		[
			'MAT-LINEN-CURTAIN',
			'Linen blackout curtain',
			'Textile',
			'м',
			'380',
			'590',
			'45',
			'20',
		],
		[
			'MAT-VELVET-FABRIC',
			'Velvet upholstery fabric',
			'Textile',
			'м',
			'650',
			'980',
			'18',
			'8',
		],
		[
			'MAT-TERRAZZO-TILE',
			'Terrazzo floor tile 60x60',
			'Tile',
			'м2',
			'810',
			'1150',
			'14',
			'10',
		],
		[
			'MAT-MOSAIC-GLASS',
			'Glass mosaic 5x5cm',
			'Tile',
			'м2',
			'920',
			'1380',
			'7',
			'6',
		],
		[
			'MAT-PLASTER-IMIT',
			'Декоративна штукатурка imitація каменю',
			'Finish',
			'кг',
			'190',
			'320',
			'80',
			'40',
		],
		[
			'MAT-PAINT-CHALK',
			'Chalk mat paint',
			'Paint',
			'л',
			'270',
			'430',
			'35',
			'20',
		],
		[
			'MAT-PAINT-PEARL',
			'Pearl shimmer paint',
			'Paint',
			'л',
			'340',
			'570',
			'28',
			'15',
		],
	]
	const anySupplier = await c.supplierModel
		.findOne()
		.sort({ createdAt: 1 })
		.exec()
	if (anySupplier) {
		for (const [sku, name, category, unit, pp, sp, sq, msq] of extraMats) {
			await c.materialModel.findOneAndUpdate(
				{ sku },
				{
					$setOnInsert: {
						sku,
						name,
						category,
						unit,
						purchasePrice: pp,
						salePrice: sp,
						stockQty: sq,
						minStockQty: msq,
						supplierId: anySupplier._id,
					},
				},
				{ upsert: true }
			)
		}
	}
	const supplierRows = [
		[
			'EcoWood Ukraine',
			'Yaroslav Hryhorenko',
			'ecowood@demo.ua',
			'+380441234567',
			'Ivano-Frankivsk',
			95,
		],
		[
			'LightMasters UA',
			'Bohdan Sokil',
			'lightmasters@demo.ua',
			'+380672345678',
			'Kharkiv',
			88,
		],
		[
			'AquaDesign Pro',
			'Halyna Koshova',
			'aquadesign@demo.ua',
			'+380933456789',
			'Odesa',
			82,
		],
		[
			'StoneCraft Ltd',
			'Viktor Rudnyk',
			'stonecraft@demo.ua',
			'+380504567890',
			'Dnipro',
			91,
		],
		[
			'SmartHome Systems',
			'Olha Prykhodko',
			'smarthome@demo.ua',
			'+380675678901',
			'Kyiv',
			96,
		],
	]
	for (const [
		name,
		contactName,
		email,
		phone,
		city,
		reliabilityRaw,
	] of supplierRows) {
		const reliability = Number(reliabilityRaw)
		await c.supplierModel.findOneAndUpdate(
			{ name: String(name) },
			{
				$set: { reliability },
				$setOnInsert: {
					name: String(name),
					contactName: String(contactName),
					email: String(email),
					phone: String(phone),
					city: String(city),
				},
			},
			{ upsert: true }
		)
	}
	const existingClient = await c.clientModel
		.findOne()
		.sort({ createdAt: 1 })
		.exec()
	const manager = await c.staffModel.findOne().sort({ createdAt: 1 }).exec()
	if (!existingClient || !manager) return
	const newProjects = [
		{
			code: 'TDS-P-011',
			title: 'Офіс технологічного стартапу Kyiv Hub',
			status: ProjectStatus.IN_PROGRESS,
			budgetPlanned: '780000',
			city: 'Київ',
			lat: '50.4551',
			lng: '30.5238',
			address: 'вул. Велика Васильківська, 55',
			region: 'Kyiv',
		},
		{
			code: 'TDS-P-012',
			title: 'Ресторан з відкритою кухнею Shef Table',
			status: ProjectStatus.DESIGN,
			budgetPlanned: '1250000',
			city: 'Львів',
			lat: '49.8397',
			lng: '24.0297',
			address: 'вул. Ринок, 3',
			region: 'Lviv',
		},
		{
			code: 'TDS-P-013',
			title: 'Спа-центр Harmony Wellness',
			status: ProjectStatus.ESTIMATION,
			budgetPlanned: '2100000',
			city: 'Одеса',
			lat: '46.4825',
			lng: '30.7233',
			address: 'Французький бульвар, 14',
			region: 'Odesa',
		},
	]
	for (const p of newProjects) {
		const exists = await c.projectModel.findOne({ code: p.code }).exec()
		if (exists) continue
		const project = await c.projectModel.create({
			code: p.code,
			title: p.title,
			description: `${p.title}. Demo project for Phase 3 expansion.`,
			status: p.status,
			clientId: existingClient._id,
			managerId: manager._id,
			budgetPlanned: p.budgetPlanned,
			startDate: new Date(2025, 10, 1),
			dueDate: new Date(2026, 6, 30),
		})
		await c.locationModel.create({
			projectId: project._id,
			addressLine: p.address,
			city: p.city,
			region: p.region,
			country: 'Україна',
			placeLabel: `${p.city}, ${p.address}`,
			latitude: p.lat,
			longitude: p.lng,
		})
		const taskTitles = [
			'Планування та виміри',
			'Дизайн-концепт',
			'Погодження з клієнтом',
			'Закупівля матеріалів',
			'Монтажні роботи',
		]
		const statuses = [
			TaskStatus.DONE,
			TaskStatus.IN_PROGRESS,
			TaskStatus.READY,
			TaskStatus.BACKLOG,
			TaskStatus.BACKLOG,
		]
		for (let ti = 0; ti < taskTitles.length; ti++) {
			await c.taskModel.create({
				projectId: project._id,
				title: taskTitles[ti],
				status: statuses[ti],
				priority: ti + 1,
				dueDate: new Date(2026, 3 + ti, 15),
			})
		}
		await c.notificationModel.create({
			projectId: project._id,
			title: `Новий проєкт: ${p.code}`,
			body: `Проєкт "${p.title}" додано до системи.`,
			roleCode: RoleCode.PROJECT_MANAGER,
		})
		await c.auditModel.create({
			projectId: project._id,
			action: 'project.created',
			entityType: 'Project',
			entityId: project._id.toString(),
			metadata: { source: 'seed.phase3', status: p.status },
		})
	}
	const sysNotifs: Array<[string, string, RoleCode | null]> = [
		[
			'Матеріали поповнено',
			'Нові позиції матеріалів додано до каталогу.',
			RoleCode.DESIGNER,
		],
		[
			'Нові постачальники',
			'Нові постачальники зареєстровано в системі.',
			RoleCode.PROJECT_MANAGER,
		],
		[
			'Демо: завантаження даних завершено',
			'Розширені тестові дані завантажено.',
			RoleCode.ADMIN,
		],
	]
	await c.notificationModel.deleteMany({
		$and: [
			{ $or: [{ projectId: { $exists: false } }, { projectId: null }] },
			{ title: { $in: sysNotifs.map(([t]) => t) } },
		],
	})
	for (const [title, body, roleCode] of sysNotifs) {
		await c.notificationModel.create({
			title,
			body,
			...(roleCode ? { roleCode } : {}),
		})
	}
	console.log('Phase 3 expansion seeded.')
}
async function seedPhase4(c: Ctx) {
	const projects = await c.projectModel
		.find({ code: /^TDS-2026-0/ })
		.limit(6)
		.exec()
	if (projects.length === 0) {
		console.log('No TDS-2026-00x projects — skipping phase-4.')
		return
	}
	const estimateTemplates = [
		{
			items: [
				{
					category: 'Оздоблення',
					title: 'Поклейка шпалер',
					unit: 'м²',
					qty: 80,
					price: 120,
				},
				{
					category: 'Оздоблення',
					title: 'Фарбування стель',
					unit: 'м²',
					qty: 60,
					price: 95,
				},
				{
					category: 'Підлога',
					title: 'Укладка ламінату',
					unit: 'м²',
					qty: 65,
					price: 280,
				},
			],
		},
		{
			items: [
				{
					category: 'Електрика',
					title: 'Прокладка кабелю',
					unit: 'п.м.',
					qty: 150,
					price: 45,
				},
				{
					category: 'Електрика',
					title: 'Монтаж розеток',
					unit: 'шт',
					qty: 24,
					price: 180,
				},
				{
					category: 'Сантехніка',
					title: 'Встановлення змішувачів',
					unit: 'шт',
					qty: 4,
					price: 850,
				},
			],
		},
	]
	const statuses = [
		EstimateStatus.DRAFT,
		EstimateStatus.SENT,
		EstimateStatus.APPROVED,
		EstimateStatus.REJECTED,
		EstimateStatus.APPROVED,
	]
	const phase4ProjectIds = projects.map((p) => p._id)
	await c.auditModel.deleteMany({
		projectId: { $in: phase4ProjectIds },
		entityType: 'Estimate',
		action: 'estimate.created',
	})
	for (let i = 0; i < projects.length; i++) {
		const tpl = estimateTemplates[i % estimateTemplates.length]
		const proj = projects[i]
		const status = statuses[i % statuses.length]
		const subtotal = tpl.items.reduce((s, it) => s + it.qty * it.price, 0)
		const discount = Math.round(subtotal * 0.05)
		const tax = Math.round(subtotal * 0.02)
		const total = subtotal - discount + tax
		let est = await c.estimateModel
			.findOne({ projectId: proj._id, version: 1 })
			.exec()
		const estData = {
			status,
			subtotal: String(subtotal),
			discount: String(discount),
			tax: String(tax),
			margin: '0',
			total: String(total),
			validUntil: new Date(2026, 8, 30),
		}
		if (!est) {
			est = await c.estimateModel.create({
				projectId: proj._id,
				version: 1,
				...estData,
			})
		} else {
			Object.assign(est, estData)
			await est.save()
		}
		await c.estimateItemModel.deleteMany({ estimateId: est._id })
		await c.estimateItemModel.insertMany(
			tpl.items.map((it, idx) => ({
				estimateId: est!._id,
				category: it.category,
				title: it.title,
				unit: it.unit,
				quantity: String(it.qty),
				unitPrice: String(it.price),
				total: String(it.qty * it.price),
				sortOrder: idx,
			}))
		)
		await c.auditModel.create({
			projectId: proj._id,
			action: 'estimate.created',
			entityType: 'Estimate',
			entityId: est!._id.toString(),
			metadata: { version: 1, status, source: 'seed.phase4' },
		})
	}
	const zoneTemplates = [
		{
			zone: 'Вітальня',
			floor: 28.5,
			wall: 48.0,
			height: 2.8,
			notes: 'Є ніша під ТВ-зону',
		},
		{
			zone: 'Спальня',
			floor: 18.2,
			wall: 35.0,
			height: 2.75,
			notes: null as string | null,
		},
		{
			zone: 'Кухня',
			floor: 14.0,
			wall: 32.0,
			height: 2.7,
			notes: 'Кутова конфігурація',
		},
	]
	await c.measurementModel.deleteMany({
		projectId: { $in: phase4ProjectIds },
	})
	for (const proj of projects) {
		const zonesCount = 3 + (projects.indexOf(proj) % 3)
		for (let z = 0; z < zonesCount; z++) {
			const t = zoneTemplates[z % zoneTemplates.length]
			await c.measurementModel.create({
				projectId: proj._id,
				zoneName: t.zone,
				floorArea: String(t.floor),
				wallArea: String(t.wall),
				ceilingHeight: String(t.height),
				notes: t.notes ?? undefined,
			})
		}
	}
	console.log('Phase 4 seeded (estimates, measurements).')
}
async function seedCatalogAndPortfolio(
	c: Ctx,
	designer: StaffProfile & {
		_id: Types.ObjectId
	}
) {
	const services = [
		[
			'full-interior',
			'Повний інтерʼєр під ключ',
			'Планування, візуалізації, матеріали, закупівлі та контроль реалізації',
			'185000',
			['сучасний', 'мінімалізм'],
		],
		[
			'kitchen-living',
			'Кухня-вітальня',
			'Зонування, ергономіка, меблеві рішення та світлові сценарії',
			'98000',
			['скандинавський', 'сучасний'],
		],
		[
			'commercial-lobby',
			'Комерційне лобі',
			'Дизайн рецепції, навігації, зони очікування та матеріальної карти',
			'240000',
			['бутік', 'індустріальний'],
		],
		[
			'lighting-design',
			'Світловий дизайн',
			'Технічне і декоративне світло, димування, сценарії та специфікація',
			'45000',
			['сучасний'],
		],
		[
			'exterior-facade',
			'Фасад і тераса',
			'Матеріали фасаду, вхідна група, тераса, водовідведення та підсвітка',
			'120000',
			['контемпорарі'],
		],
		[
			'bathroom-remodel',
			'Санвузол під ключ',
			'Компактна реконструкція з гідроізоляцією, плиткою і преміальною сантехнікою',
			'76000',
			['мінімалізм'],
		],
	] as const
	for (let i = 0; i < services.length; i++) {
		const [slug, name, short, price, style] = services[i]
		await c.catalogModel.findOneAndUpdate(
			{ slug },
			{
				$set: {
					name,
					shortDescription: short,
					longDescription: `${name}. ${short}`,
					basePrice: price,
					priceUnit: 'project',
					style: [...style],
					isActive: true,
					sortOrder: i,
					ownerStaffId: designer._id,
					heroImageUrl: `/uploads/demo/catalog-${slug}.svg`,
					galleryImageUrls: [
						`/uploads/demo/catalog-${slug}.svg`,
						`/uploads/demo/catalog-${slug}.svg`,
					],
				},
			},
			{ upsert: true }
		)
	}
	const portfolio = [
		[
			'ternopil-residence',
			'Тернопільська резиденція',
			'Приховане світло, дерево, спокійна палітра і продумане зберігання',
			'житловий інтерʼєр',
			'сучасний',
		],
		[
			'lviv-facade',
			'Львівський фасад',
			'Оновлена тераса, вхідна група, фасадні матеріали і вечірня підсвітка',
			'екстерьєр',
			'контемпорарі',
		],
		[
			'kyiv-office-quiet',
			'Київський офіс Quiet Work',
			'Акустика, гнучкі робочі зони, переговорні та мʼяке загальне світло',
			'комерційний простір',
			'мінімалізм',
		],
		[
			'ifr-retail-light',
			'Світло для retail-простору',
			'Сценарії для вітрин, касової зони, навігації і вечірнього режиму',
			'ритейл',
			'індустріальний',
		],
		[
			'uzhhorod-terrace',
			'Ужгородська тераса',
			'Камінь, дренаж, озеленення, меблі та атмосферна підсвітка',
			'екстерьєр',
			'бутік',
		],
	] as const
	for (let i = 0; i < portfolio.length; i++) {
		const [slug, title, summary, category, style] = portfolio[i]
		await c.portfolioModel.findOneAndUpdate(
			{ slug },
			{
				$set: {
					title,
					summary,
					description: summary,
					category,
					style,
					isPublished: true,
					sortOrder: i,
					ownerStaffId: designer._id,
					coverImageUrl: `/uploads/demo/${slug}.svg`,
					galleryImageUrls: [
						`/uploads/demo/${slug}.svg`,
						`/uploads/demo/${slug}.svg`,
					],
				},
			},
			{ upsert: true }
		)
	}
	const orderCatalogMap: Array<[string, string]> = [
		['TDS-LEAD-HOTEL-01', 'commercial-lobby'],
		['TDS-LEAD-HOTEL-02', 'lighting-design'],
		['TDS-LEAD-OFFICE-01', 'full-interior'],
		['TDS-LEAD-RETAIL-01', 'commercial-lobby'],
		['TDS-LEAD-RETAIL-02', 'exterior-facade'],
	]
	for (const [code, slug] of orderCatalogMap) {
		const cat = await c.catalogModel.findOne({ slug }).lean().exec()
		if (!cat) continue
		const style =
			Array.isArray(cat.style) && cat.style.length
				? cat.style[0]
				: undefined
		await c.orderModel.updateOne(
			{ code },
			{
				$set: {
					serviceCatalogId: cat._id,
					serviceSlug: slug,
					source: 'seed',
					estimatedPrice: cat.basePrice,
					...(style ? { style } : {}),
				},
			}
		)
	}
}
async function seedClientPortalDemo(
	c: Ctx,
	users: Record<
		string,
		User & {
			_id: Types.ObjectId
		}
	>
) {
	const clientUser = users['client@tailored.demo']
	if (!clientUser) return
	const profile = await c.clientModel
		.findOne({ userId: clientUser._id })
		.exec()
	if (!profile) return
	const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads'
	const avatarName = 'seed-demo-avatar.png'
	const abs = path.join(uploadRootPath(), avatarName)
	fs.mkdirSync(path.dirname(abs), { recursive: true })
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
		'base64'
	)
	fs.writeFileSync(abs, png)
	const sha256 = createHash('sha256').update(png).digest('hex')
	const storagePath = path.posix.join(
		(process.env.UPLOAD_DIR ?? 'uploads').replace(/\\/g, '/'),
		avatarName
	)
	await c.fileModel.updateOne(
		{ sha256 },
		{
			$setOnInsert: {
				originalName: 'demo-avatar.png',
				storagePath,
				mimeType: 'image/png',
				size: png.length,
				sha256,
				uploadedBy: clientUser._id,
			},
		},
		{ upsert: true }
	)
	const avatarFile = await c.fileModel.findOne({ sha256 }).exec()
	if (avatarFile) {
		await c.userModel
			.updateOne(
				{ _id: clientUser._id },
				{ $set: { avatarFileId: avatarFile._id } }
			)
			.exec()
	}
	const demoProject = await c.projectModel
		.findOne({ code: 'TDS-2026-010' })
		.exec()
	if (!demoProject) return
	const extraCompleted = [
		[
			'TDS-2026-011',
			'Квартира з прихованим освітленням',
			'Завершений інтерʼєр з теплими сценаріями світла і меблями під замовлення.',
			'328000',
		],
		[
			'TDS-2026-012',
			'Кабінет керівника у Львові',
			'Офісний простір з акустикою, робочим столом і переговорною зоною.',
			'286000',
		],
		[
			'TDS-2026-013',
			'Тераса приватного будинку',
			'Зовнішня зона з дренажем, підсвіткою і стійкими матеріалами.',
			'374000',
		],
		[
			'TDS-2026-014',
			'Санвузол з авторським наглядом',
			'Повний цикл ремонту санвузла з комплектацією і фінальним актом.',
			'198000',
		],
	] as const
	for (const [code, title, description, budget] of extraCompleted) {
		await c.projectModel.findOneAndUpdate(
			{ code },
			{
				$set: {
					title,
					description,
					status: ProjectStatus.COMPLETED,
					clientId: profile._id,
					budgetPlanned: budget,
					budgetApproved: budget,
					startDate: new Date('2026-03-01T09:00:00.000Z'),
					dueDate: new Date('2026-04-25T18:00:00.000Z'),
				},
			},
			{ upsert: true }
		)
	}
	await c.reviewModel.deleteMany({
		title: {
			$in: [
				'Portal demo — published review',
				'Portal demo — pending review',
				'Everything on schedule',
				'Office redesign exceeded expectations',
				'Premium finish',
				'Good quality and responsive PM',
			],
		},
	})
	await c.reviewModel.findOneAndUpdate(
		{ clientId: profile._id, title: 'Все пройшло за графіком' },
		{
			$set: {
				clientId: profile._id,
				projectId: demoProject._id,
				rating: 5,
				title: 'Все пройшло за графіком',
				body: 'Команда чітко пояснювала зміни, швидко погоджувала рішення і довела обʼєкт до фінального огляду без хаосу.',
				status: ReviewStatus.PUBLISHED,
				reviewerName: clientUser.fullName,
				photoUrls: ['/uploads/demo/review-1.svg'],
				publishedAt: new Date(Date.now() - 5 * 86400000),
			},
		},
		{ upsert: true }
	)
	await c.reviewModel.findOneAndUpdate(
		{ clientId: profile._id, title: 'Зручно бачити статус у кабінеті' },
		{
			$set: {
				clientId: profile._id,
				projectId: demoProject._id,
				rating: 5,
				title: 'Зручно бачити статус у кабінеті',
				body: 'Заявка, рахунки і чеки були в одному місці. Це дуже спростило погодження.',
				status: ReviewStatus.PENDING,
				reviewerName: clientUser.fullName,
				photoUrls: [],
			},
		},
		{ upsert: true }
	)
}

const remotePhotoUrls = [
	'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80',
	'https://images.unsplash.com/photo-1616137466211-f939a420be84?auto=format&fit=crop&w=1200&q=80',
]

function photoAt(index: number) {
	return remotePhotoUrls[index % remotePhotoUrls.length]
}

async function seedDiplomaVolumeData(
	c: Ctx,
	users: Record<
		string,
		User & {
			_id: Types.ObjectId
		}
	>,
	roleByCode: Record<RoleCode, Role & { _id: Types.ObjectId }>
) {
	const passwordHash = await bcrypt.hash('Demo12345!', 10)
	const extraStaffRows: Array<[string, string, RoleCode, string, string]> = [
		['art-director@tailored.demo', 'Софія Демчук', RoleCode.DESIGNER, 'Артдиректорка', 'Авторський нагляд і стилістика'],
		['visualizer@tailored.demo', 'Павло Рибак', RoleCode.DESIGNER, '3D-візуалізатор', 'Візуалізації, колажі, світло'],
		['lighting@tailored.demo', 'Ірина Коваль', RoleCode.DESIGNER, 'Світлодизайнерка', 'Сценарії освітлення та специфікації'],
		['facade@tailored.demo', 'Богдан Клим', RoleCode.DESIGNER, 'Архітектор фасадів', 'Фасади, тераси і вхідні групи'],
		['procurement@tailored.demo', 'Леся Гринь', RoleCode.PROJECT_MANAGER, 'Координаторка закупівель', 'Замовлення матеріалів і контроль поставок'],
		['quality@tailored.demo', 'Микита Стельмах', RoleCode.DESIGNER, 'Інженер якості', 'Чеклісти, приймання і дефекти'],
		['sitelead2@tailored.demo', 'Віктор Лис', RoleCode.DESIGNER, 'Керівник монтажу', 'Монтажні роботи і графік на обʼєкті'],
		['finisher2@tailored.demo', 'Оксана Романів', RoleCode.DESIGNER, 'Майстриня оздоблення', 'Фарбування, декоративні покриття'],
		['finisher3@tailored.demo', 'Сергій Лаврів', RoleCode.DESIGNER, 'Майстер плитки', 'Плитка, санвузли, вологі зони'],
		['accountant2@tailored.demo', 'Катерина Ільницька', RoleCode.PROJECT_MANAGER, 'Фінансова менеджерка', 'Рахунки, акти, контроль оплат'],
	]
	for (let i = 0; i < extraStaffRows.length; i++) {
		const [email, fullName, roleCode, headline, specialization] = extraStaffRows[i]
		let user = await c.userModel.findOne({ email }).exec()
		if (!user) {
			user = await c.userModel.create({
				email,
				passwordHash,
				fullName,
				title: headline,
				roleId: roleByCode[roleCode]._id,
				isActive: true,
			})
		} else {
			Object.assign(user, {
				fullName,
				title: headline,
				roleId: roleByCode[roleCode]._id,
				isActive: true,
			})
			await user.save()
		}
		await c.staffModel.findOneAndUpdate(
			{ userId: user._id },
			{
				$set: {
					userId: user._id,
					specialization,
					capacityHours: 32 + (i % 12),
				},
			},
			{ upsert: true }
		)
		await c.userModel.updateOne({ _id: user._id }, { $set: { title: headline } }).exec()
	}

	const supplierRows: Array<[string, string, string, string, string, number]> = [
		['Woodline Studio', 'Олег Матвіїв', 'woodline@example.com', '+380501110001', 'Львів', 96],
		['LightCraft UA', 'Анна Кравчук', 'lightcraft@example.com', '+380501110002', 'Київ', 94],
		['StoneLab', 'Дмитро Ярема', 'stonelab@example.com', '+380501110003', 'Тернопіль', 91],
		['Textile Point', 'Марина Гай', 'textile@example.com', '+380501110004', 'Івано-Франківськ', 89],
		['Facade Systems', 'Юрій Савка', 'facade@example.com', '+380501110005', 'Львів', 92],
		['Aqua Select', 'Віра Литвин', 'aqua@example.com', '+380501110006', 'Ужгород', 88],
		['Metal Form', 'Степан Білик', 'metal@example.com', '+380501110007', 'Київ', 90],
		['Green Terrace', 'Олена Лях', 'green@example.com', '+380501110008', 'Чернівці', 87],
		['Door&Wall Pro', 'Тарас Лоза', 'doorwall@example.com', '+380501110009', 'Луцьк', 93],
		['Ceramic Hub', 'Ігор Козак', 'ceramic@example.com', '+380501110010', 'Рівне', 86],
		['Glass House', 'Назар Петрів', 'glass@example.com', '+380501110011', 'Київ', 90],
		['Soft Office', 'Марко Шевчук', 'softoffice@example.com', '+380501110012', 'Львів', 84],
		['Premium Paints', 'Аліна Стець', 'paint@example.com', '+380501110013', 'Одеса', 91],
		['Outdoor Living', 'Роман Жук', 'outdoor@example.com', '+380501110014', 'Ужгород', 88],
		['Acoustic Line', 'Василь Семенюк', 'acoustic@example.com', '+380501110015', 'Київ', 92],
	]
	for (const [name, contactName, email, phone, city, reliability] of supplierRows) {
		await c.supplierModel.findOneAndUpdate(
			{ name },
			{ $set: { name, contactName, email, phone, city, reliability } },
			{ upsert: true }
		)
	}

	const designer = await c.staffModel.findOne().sort({ createdAt: 1 }).exec()
	const serviceRows = [
		['full-interior', 'Повний інтерʼєр під ключ', 'Житловий дизайн', 'Планування, візуалізації, матеріали, закупівлі та авторський контроль', '185000', ['сучасний', 'мінімалізм']],
		['kitchen-living', 'Кухня-вітальня', 'Житловий дизайн', 'Ергономіка кухні, острів, освітлення, меблі та сценарії користування', '98000', ['скандинавський', 'сучасний']],
		['commercial-lobby', 'Комерційне лобі', 'Комерційний дизайн', 'Рецепція, зона очікування, навігація, матеріали і світло для бізнесу', '240000', ['бутік', 'індустріальний']],
		['lighting-design', 'Світловий дизайн', 'Світло', 'Технічне і декоративне світло, димування, підбір світильників', '45000', ['сучасний']],
		['exterior-facade', 'Фасад і тераса', 'Екстерʼєр', 'Фасадні матеріали, тераса, водовідведення, озеленення і підсвітка', '120000', ['контемпорарі']],
		['bathroom-remodel', 'Санвузол під ключ', 'Ремонт', 'Планування, гідроізоляція, плитка, сантехніка і монтажні карти', '76000', ['мінімалізм']],
		['apartment-refresh', 'Оновлення квартири', 'Житловий дизайн', 'Швидке оновлення простору без повного демонтажу', '64000', ['сучасний', 'теплий']],
		['bedroom-suite', 'Майстер-спальня', 'Житловий дизайн', 'Спальня, гардероб, мʼяке світло, текстиль і приватна зона', '72000', ['бутик', 'мʼякий мінімалізм']],
		['kids-room', 'Дитяча кімната', 'Житловий дизайн', 'Безпечне зонування, меблі на виріст, зберігання і світло', '52000', ['скандинавський', 'кольоровий']],
		['home-office', 'Домашній офіс', 'Робочий простір', 'Акустика, освітлення, фон для відеодзвінків і зручне зберігання', '58000', ['мінімалізм', 'функціональний']],
		['retail-corner', 'Retail-корнер', 'Комерційний дизайн', 'Вітрина, маршрут покупця, касова зона і світлові акценти', '132000', ['індустріальний', 'контрастний']],
		['hotel-room', 'Готельний номер', 'HoReCa', 'Номер, санвузол, зносостійкі матеріали і карта комплектації', '168000', ['бутик', 'преміум']],
		['restaurant-hall', 'Зал ресторану', 'HoReCa', 'Посадка, атмосфера, світло, меблі і матеріальна специфікація', '210000', ['теплий', 'атмосферний']],
		['terrace-lounge', 'Тераса lounge', 'Екстерʼєр', 'Зонування тераси, меблі, кашпо, покриття і вечірнє світло', '99000', ['outdoor', 'натуральний']],
		['material-consulting', 'Підбір матеріалів', 'Консалтинг', 'Палітра, зразки, бюджетні альтернативи і фінальна специфікація', '38000', ['практичний']],
	]
	for (let i = 0; i < serviceRows.length; i++) {
		const [slug, name, category, shortDescription, basePrice, style] = serviceRows[i]
		await c.catalogModel.findOneAndUpdate(
			{ slug },
			{
				$set: {
					slug,
					name,
					category,
					shortDescription,
					longDescription: `${name}. ${shortDescription}. Пакет включає бриф, план робіт, бюджетну рамку, погодження і матеріали для запуску.`,
					basePrice,
					priceUnit: 'project',
					style,
					isActive: true,
					sortOrder: i,
					ownerStaffId: designer?._id,
					heroImageUrl: photoAt(i),
					galleryImageUrls: [photoAt(i + 1), photoAt(i + 2), photoAt(i + 3)],
				},
			},
			{ upsert: true }
		)
	}

	const portfolioRows = [
		['ternopil-residence', 'Тернопільська резиденція', 'житловий інтерʼєр', 'Приховане світло, дерево, спокійна палітра і продумане зберігання', 'сучасний'],
		['lviv-facade', 'Львівський фасад', 'екстерьєр', 'Оновлена тераса, вхідна група, фасадні матеріали і вечірня підсвітка', 'контемпорарі'],
		['kyiv-office-quiet', 'Київський офіс Quiet Work', 'комерційний простір', 'Акустика, гнучкі робочі зони, переговорні та мʼяке загальне світло', 'мінімалізм'],
		['ifr-retail-light', 'Світло для retail-простору', 'ритейл', 'Сценарії для вітрин, касової зони, навігації і вечірнього режиму', 'індустріальний'],
		['uzhhorod-terrace', 'Ужгородська тераса', 'екстерьєр', 'Камінь, дренаж, озеленення, меблі та атмосферна підсвітка', 'бутік'],
		['podil-apartment', 'Квартира на Подолі', 'житловий інтерʼєр', 'Компактна квартира з теплими матеріалами і прихованим зберіганням', 'сучасний'],
		['frankivsk-cafe', 'Кафе у Франківську', 'HoReCa', 'Барна зона, мʼяка посадка, декоративне світло і навігація', 'атмосферний'],
		['lutsk-office', 'Офіс продажів у Луцьку', 'комерційний простір', 'Робочі місця, переговорна і зона швидких зустрічей', 'функціональний'],
		['rivne-bathroom', 'Санвузол у Рівному', 'ремонт', 'Світла плитка, ніші, приховані ревізії і тепла підлога', 'мінімалізм'],
		['chernivtsi-bedroom', 'Спальня у Чернівцях', 'житловий інтерʼєр', 'Текстиль, приглушене світло, гардероб і спокійна палітра', 'мʼякий мінімалізм'],
		['odesa-retail', 'Retail-простір в Одесі', 'ритейл', 'Вітринне світло, маршрут покупця і компактний склад', 'контрастний'],
		['kyiv-penthouse', 'Пентхаус у Києві', 'житловий інтерʼєр', 'Велика вітальня, камін, кухня і панорамне світло', 'преміум'],
		['lviv-hotel-room', 'Готельний номер у Львові', 'HoReCa', 'Зносостійкі матеріали, санвузол і комплектація під експлуатацію', 'бутик'],
		['dnipro-home-office', 'Домашній офіс у Дніпрі', 'робочий простір', 'Акустика, зберігання, світло і фон для відеодзвінків', 'функціональний'],
		['kharkiv-lounge', 'Lounge-зона у Харкові', 'комерційний простір', 'Мʼяка посадка, зелень, вечірні сценарії світла', 'натуральний'],
	]
	for (let i = 0; i < portfolioRows.length; i++) {
		const [slug, title, category, summary, style] = portfolioRows[i]
		await c.portfolioModel.findOneAndUpdate(
			{ slug },
			{
				$set: {
					slug,
					title,
					summary,
					description: `${summary}. У проєкті пропрацьовано планування, матеріали, бюджетні рішення, світло і фінальну комплектацію.`,
					category,
					style,
					completedAt: new Date(Date.now() - (i + 10) * 86400000),
					isPublished: true,
					sortOrder: i,
					ownerStaffId: designer?._id,
					coverImageUrl: photoAt(i + 3),
					galleryImageUrls: [photoAt(i + 4), photoAt(i + 5), photoAt(i + 6)],
				},
			},
			{ upsert: true }
		)
	}

	const clients = await c.clientModel.find().limit(20).exec()
	const staffRows = await c.staffModel.find().limit(20).exec()
	let projects = await c.projectModel.find().limit(24).exec()
	const servicesForOrders = await c.catalogModel.find().limit(15).exec()
	if (clients.length && staffRows.length && projects.length < 15) {
		for (let i = projects.length; i < 15; i++) {
			const client = clients[i % clients.length]
			const manager = staffRows[i % staffRows.length]
			const designerProfile = staffRows[(i + 2) % staffRows.length]
			const project = await c.projectModel.findOneAndUpdate(
				{ code: `TDS-VOL-${String(i + 1).padStart(3, '0')}` },
				{
					$set: {
						code: `TDS-VOL-${String(i + 1).padStart(3, '0')}`,
						title: `Демо-проєкт INTERIORIX ${i + 1}`,
						description: 'Додатковий проєкт для перевірки пагінації, карти, рахунків і клієнтського порталу.',
						status: [ProjectStatus.DESIGN, ProjectStatus.IN_PROGRESS, ProjectStatus.APPROVED, ProjectStatus.COMPLETED][i % 4],
						clientId: client._id,
						managerId: manager._id,
						designerId: designerProfile._id,
						budgetPlanned: String(125000 + i * 7000),
						budgetApproved: String(132000 + i * 7200),
						startDate: new Date(Date.now() - (35 - i) * 86400000),
						dueDate: new Date(Date.now() + (40 + i) * 86400000),
					},
				},
				{ upsert: true, returnDocument: 'after' }
			)
			await c.locationModel.findOneAndUpdate(
				{ projectId: project._id },
				{
					$set: {
						projectId: project._id,
						addressLine: `вул. Дизайнерська, ${20 + i}`,
						city: ['Київ', 'Львів', 'Тернопіль', 'Ужгород', 'Івано-Франківськ'][i % 5],
						region: ['Київська', 'Львівська', 'Тернопільська', 'Закарпатська', 'Івано-Франківська'][i % 5],
						postalCode: `79${String(100 + i).padStart(3, '0')}`,
						country: 'Україна',
						placeLabel: `Локація демо-проєкту ${i + 1}`,
						latitude: String(49.2 + i * 0.07),
						longitude: String(24.0 + i * 0.09),
					},
				},
				{ upsert: true }
			)
		}
		projects = await c.projectModel.find().limit(24).exec()
	}
	if (clients.length) {
		const orderCount = await c.orderModel.countDocuments()
		for (let i = orderCount; i < 15; i++) {
			const service = servicesForOrders[i % Math.max(servicesForOrders.length, 1)]
			await c.orderModel.findOneAndUpdate(
				{ code: `TDS-ORD-VOL-${String(i + 1).padStart(3, '0')}` },
				{
					$set: {
						code: `TDS-ORD-VOL-${String(i + 1).padStart(3, '0')}`,
						title: `Заявка на дизайн ${i + 1}`,
						description: 'Заявка з публічного сайту для демо-пагінації та CRM.',
						status: [OrderStatus.NEW, OrderStatus.QUALIFIED, OrderStatus.CONVERTED][i % 3],
						requestedBudget: String(65000 + i * 4500),
						preferredStart: new Date(Date.now() + (10 + i) * 86400000),
						clientId: clients[i % clients.length]._id,
						projectId: projects[i % Math.max(projects.length, 1)]?._id,
						serviceCatalogId: service?._id,
						serviceSlug: service?.slug,
						style: ['сучасний', 'натуральний', 'преміум', 'комерційний'][i % 4],
						source: 'public_site',
						estimatedPrice: String(78000 + i * 4200),
						referencePhotoUrls: [photoAt(i), photoAt(i + 1)],
						addressLine: `вул. Заявок, ${i + 4}`,
						city: ['Київ', 'Львів', 'Одеса', 'Рівне'][i % 4],
						phone: `+38067122${String(3000 + i).slice(-4)}`,
						designerId: staffRows[i % Math.max(staffRows.length, 1)]?._id,
						workerIds: staffRows.slice(0, 2).map((row) => row._id),
					},
				},
				{ upsert: true }
			)
		}
	}
	if (staffRows.length) {
		for (let i = 0; i < 15; i++) {
			const team = await c.teamModel.findOneAndUpdate(
				{ name: `Команда TDS-${String(i + 1).padStart(2, '0')}` },
				{
					$set: {
						name: `Команда TDS-${String(i + 1).padStart(2, '0')}`,
						city: ['Київ', 'Львів', 'Тернопіль', 'Ужгород', 'Івано-Франківськ'][i % 5],
						speciality: ['інтерʼєри', 'фасади', 'світло', 'комерційні простори', 'ремонт'][i % 5],
					},
				},
				{ upsert: true, returnDocument: 'after' }
			)
			await c.teamMemberModel.updateOne(
				{ teamId: team._id, staffId: staffRows[i % staffRows.length]._id },
				{ $set: { teamId: team._id, staffId: staffRows[i % staffRows.length]._id, isLead: true } },
				{ upsert: true }
			)
			await c.teamMemberModel.updateOne(
				{ teamId: team._id, staffId: staffRows[(i + 3) % staffRows.length]._id },
				{ $set: { teamId: team._id, staffId: staffRows[(i + 3) % staffRows.length]._id, isLead: false } },
				{ upsert: true }
			)
		}
	}

	for (let i = 0; i < projects.length; i++) {
		const project = projects[i]
		const client = clients[i % clients.length]
		if (!client) continue
		let estimate = await c.estimateModel.findOne({ projectId: project._id, version: 5 }).exec()
		if (!estimate) {
			estimate = await c.estimateModel.create({
				projectId: project._id,
				version: 5,
				status: i % 3 === 0 ? EstimateStatus.SENT : EstimateStatus.APPROVED,
				subtotal: String(82000 + i * 4200),
				discount: String(i % 4 === 0 ? 2500 : 0),
				tax: String(16400 + i * 700),
				margin: String(11000 + i * 500),
				total: String(109400 + i * 5400),
				validUntil: new Date(Date.now() + (20 + i) * 86400000),
			})
		}
		await c.estimateItemModel.deleteMany({ estimateId: estimate._id })
		await c.estimateItemModel.insertMany([
			{ estimateId: estimate._id, category: 'Дизайн', title: `Дизайн-пакет приміщень ${i + 1}`, unit: 'пакет', quantity: '1', unitPrice: String(42000 + i * 900), total: String(42000 + i * 900), sortOrder: 1 },
			{ estimateId: estimate._id, category: 'Матеріали', title: `Комплектація матеріалів ${i + 1}`, unit: 'комплект', quantity: '1', unitPrice: String(38000 + i * 800), total: String(38000 + i * 800), sortOrder: 2 },
			{ estimateId: estimate._id, category: 'Авторський нагляд', title: `Авторський контроль робіт ${i + 1}`, unit: 'послуга', quantity: '1', unitPrice: String(14000 + i * 400), total: String(14000 + i * 400), sortOrder: 3 },
		])
		const invoice = await c.invoiceModel.findOneAndUpdate(
			{ number: `TDS-INV-VOL-${String(i + 1).padStart(3, '0')}` },
			{
				$set: {
					number: `TDS-INV-VOL-${String(i + 1).padStart(3, '0')}`,
					projectId: project._id,
					clientId: client._id,
					status: i % 4 === 0 ? InvoiceStatus.SENT : InvoiceStatus.PAID,
					amount: String(56000 + i * 3200),
					currency: 'UAH',
					dueDate: new Date(Date.now() + (7 + i) * 86400000),
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
		const payment = await c.paymentModel.findOneAndUpdate(
			{ providerRef: `mock-volume-${String(i + 1).padStart(3, '0')}` },
			{
				$set: {
					projectId: project._id,
					invoiceId: invoice._id,
					clientId: client._id,
					status: PaymentStatus.PAID,
					method: ['card', 'bank_transfer', 'apple_pay'][i % 3],
					amount: invoice.amount,
					currency: 'UAH',
					providerRef: `mock-volume-${String(i + 1).padStart(3, '0')}`,
					paidAt: new Date(Date.now() - (i + 1) * 3600000),
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
		await c.receiptModel.findOneAndUpdate(
			{ number: `TDS-RCP-VOL-${String(i + 1).padStart(3, '0')}` },
			{
				$set: {
					number: `TDS-RCP-VOL-${String(i + 1).padStart(3, '0')}`,
					projectId: project._id,
					clientId: client._id,
					paymentId: payment._id,
					invoiceId: invoice._id,
					status: ReceiptStatus.ISSUED,
					amount: invoice.amount,
					currency: 'UAH',
					pdfPath: `/api/receipts/TDS-RCP-VOL-${String(i + 1).padStart(3, '0')}/pdf`,
					issuedAt: new Date(Date.now() - i * 86400000),
				},
			},
			{ upsert: true }
		)
	}

	await c.reviewModel.deleteMany({
		$or: [
			{ title: { $regex: /^Демо-відгук №/ } },
			{ title: { $regex: /^Відгук №/ } },
		],
	})
	const completedProjects = await c.projectModel
		.find({ status: ProjectStatus.COMPLETED })
		.sort({ completedAt: -1, updatedAt: -1 })
		.limit(36)
		.exec()
	const reviewProjects =
		completedProjects.length > 0 ? completedProjects : projects
	for (let i = 0; i < volumeReviewRows.length; i++) {
		const row = volumeReviewRows[i]
		const client = clients[i % clients.length]
		const project = reviewProjects[i % reviewProjects.length]
		if (!client || !project) continue
		const publishedAt =
			row.status === ReviewStatus.PUBLISHED
				? new Date(Date.now() - row.daysAgo * 86400000)
				: undefined
		await c.reviewModel.findOneAndUpdate(
			{ title: row.title },
			{
				$set: {
					clientId: client._id,
					projectId: project._id,
					rating: row.rating,
					title: row.title,
					body: row.body,
					status: row.status,
					reviewerName:
						volumeReviewReviewerNames[
							i % volumeReviewReviewerNames.length
						],
					photoUrls: [photoAt(row.photoIdx + i)],
					publishedAt,
				},
			},
			{ upsert: true }
		)
	}
	const contactSamples: Array<[string, string, string]> = [
		[
			'Анна Коваль',
			'anna.koval@example.com',
			'Потрібен дизайн двокімнатної квартири 68 м² у Києві, бюджет до 400 тис. грн.',
		],
		[
			'Петро Мельник',
			'petro.m@example.com',
			'Цікавить пакет «фасад і тераса» для приватного будинку біля Львова.',
		],
		[
			'Марія Гринь',
			'maria.g@example.com',
			'Шукаємо підрядника на світлодизайн офісу 120 м², старт у червні.',
		],
		[
			'Олег Савчук',
			'oleg.s@example.com',
			'Потрібна консультація по матеріалах для ресторану — 80 посадочних місць.',
		],
		[
			'Ірина Литвин',
			'iryna.l@example.com',
			'Запит на повний інтерʼєр під ключ для новобудови в Одесі, є план БТІ.',
		],
	]
	for (const [fullName, email, message] of contactSamples) {
		await c.contactSubmissionModel.findOneAndUpdate(
			{ email, message: message.slice(0, 120) },
			{
				$set: {
					fullName,
					email,
					phone: '+380671234567',
					message,
				},
			},
			{ upsert: true }
		)
	}

	const receiptCount = await c.receiptModel.countDocuments()
	for (let i = receiptCount; i < 15; i++) {
		const project = projects[i % projects.length]
		const client = clients[i % clients.length]
		if (!project || !client) continue
		const invoice = await c.invoiceModel.findOneAndUpdate(
			{ number: `TDS-INV-EXTRA-${String(i + 1).padStart(3, '0')}` },
			{
				$set: {
					number: `TDS-INV-EXTRA-${String(i + 1).padStart(3, '0')}`,
					projectId: project._id,
					clientId: client._id,
					status: InvoiceStatus.PAID,
					amount: String(48000 + i * 3100),
					currency: 'UAH',
					dueDate: new Date(Date.now() + (5 + i) * 86400000),
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
		const payment = await c.paymentModel.findOneAndUpdate(
			{ providerRef: `mock-extra-receipt-${String(i + 1).padStart(3, '0')}` },
			{
				$set: {
					projectId: project._id,
					invoiceId: invoice._id,
					clientId: client._id,
					status: PaymentStatus.PAID,
					method: 'card',
					amount: invoice.amount,
					currency: 'UAH',
					providerRef: `mock-extra-receipt-${String(i + 1).padStart(3, '0')}`,
					paidAt: new Date(Date.now() - (i + 2) * 7200000),
				},
			},
			{ upsert: true, returnDocument: 'after' }
		)
		await c.receiptModel.findOneAndUpdate(
			{ number: `TDS-RCP-EXTRA-${String(i + 1).padStart(3, '0')}` },
			{
				$set: {
					number: `TDS-RCP-EXTRA-${String(i + 1).padStart(3, '0')}`,
					projectId: project._id,
					clientId: client._id,
					paymentId: payment._id,
					invoiceId: invoice._id,
					status: ReceiptStatus.ISSUED,
					amount: invoice.amount,
					currency: 'UAH',
					pdfPath: `/api/receipts/TDS-RCP-EXTRA-${String(i + 1).padStart(3, '0')}/pdf`,
					issuedAt: new Date(Date.now() - i * 86400000),
				},
			},
			{ upsert: true }
		)
	}

	for (let i = 0; i < 15; i++) {
		await c.contactSubmissionModel.findOneAndUpdate(
			{ email: `contact${i + 1}@tailored.demo` },
			{
				$set: {
					fullName: `Контакт з сайту ${i + 1}`,
					email: `contact${i + 1}@tailored.demo`,
					phone: `+38063111${String(4000 + i).slice(-4)}`,
					message: 'Потрібна консультація щодо дизайну, бюджету та старту робіт.',
					attachmentUrl: photoAt(i + 2),
				},
			},
			{ upsert: true }
		)
	}

	const uploadCount = await c.fileModel.countDocuments()
	for (let i = uploadCount; i < 15; i++) {
		const sha256 = createHash('sha256').update(`tailored-demo-upload-${i}`).digest('hex')
		await c.fileModel.findOneAndUpdate(
			{ sha256 },
			{
				$set: {
					originalName: `reference-photo-${i + 1}.jpg`,
					storagePath: photoAt(i + 4),
					mimeType: 'image/jpeg',
					size: 180000 + i * 900,
					sha256,
					uploadedBy: users['client@tailored.demo']?._id,
				},
			},
			{ upsert: true }
		)
	}

	await c.auditModel.deleteMany({
		action: {
			$in: [
				'project.created',
				'project.status_changed',
				'estimate.sent',
				'payment.paid',
				'receipt.created',
				'task.status.updated',
				'review.submitted',
			],
		},
	})
	const auditActions = [
		'project.created',
		'project.status_changed',
		'estimate.sent',
		'payment.paid',
		'receipt.created',
		'task.status.updated',
		'review.submitted',
	] as const
	for (let i = 0; i < 64; i++) {
		const project = projects[i % projects.length]
		if (!project) continue
		const action = auditActions[i % auditActions.length]
		const at = new Date(Date.now() - i * 9 * 3600000)
		await c.auditModel.collection.insertOne({
			projectId: project._id,
			action,
			entityType:
				action.startsWith('payment')
					? 'Payment'
					: action.startsWith('receipt')
						? 'Receipt'
						: action.startsWith('estimate')
							? 'Estimate'
							: action.startsWith('task')
								? 'Task'
								: action.startsWith('review')
									? 'Review'
									: 'Project',
			entityId: project._id.toString(),
			metadata: {
				code: project.code,
				source: 'seed',
				step: i + 1,
			},
			createdAt: at,
			updatedAt: at,
			__v: 0,
		})
	}

	const removedDemoNotifications = await c.notificationModel
		.deleteMany({
			$or: [
				{ title: { $regex: /^Демо-сповіщення \d+$/ } },
				{ title: { $regex: /^Demo notification \d+$/i } },
			],
		})
		.exec()
	if ((removedDemoNotifications.deletedCount ?? 0) > 0) {
		console.log(
			`Removed ${removedDemoNotifications.deletedCount} hardcoded demo notification(s).`
		)
	}
}

async function patchLegacyNotificationTexts(c: Ctx) {
	const rows = await c.notificationModel.find().select('title body').lean().exec()
	let updated = 0
	for (const row of rows) {
		const localized = localizeNotificationFields(
			row.title,
			row.body ?? ''
		)
		if (localized.title !== row.title || localized.body !== (row.body ?? '')) {
			await c.notificationModel
				.updateOne(
					{ _id: row._id },
					{ $set: { title: localized.title, body: localized.body } }
				)
				.exec()
			updated += 1
		}
	}
	if (updated > 0) {
		console.log(`Patched ${updated} notification(s) to Ukrainian.`)
	}
}

export async function runMongoSeed() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: ['error', 'warn', 'log'],
	})
	const c = ctx(app)
	try {
		ensureDemoMarketingImages()
		const roleByCode = await upsertRoles(c)
		await migrateLegacyUserRoles(c, roleByCode)
		const { users, client, staff } = await upsertUsers(c, roleByCode)
		const materials = await seedSuppliersAndMaterials(c)
		await seedProjects(c, client, staff, materials)
		await seedClientPortalDemo(c, users)
		await seedExpansion(c, roleByCode)
		await seedPhase4(c)
		await seedCatalogAndPortfolio(c, staff['designer@tailored.demo'])
		await seedDiplomaVolumeData(c, users, roleByCode)
		await patchLegacyNotificationTexts(c)
		const unsetNotes = await c.clientModel
			.updateMany({ notes: { $exists: true } }, { $unset: { notes: '' } })
			.exec()
		if ((unsetNotes.modifiedCount ?? 0) > 0) {
			console.log(
				`Removed legacy client notes from ${unsetNotes.modifiedCount} profile(s).`
			)
		}
		console.log('Mongo seed completed.')
	} finally {
		await app.close()
	}
}

async function main() {
	if (process.env.FORCE_SEED !== 'true') {
		const probe = await NestFactory.createApplicationContext(AppModule, {
			logger: ['error', 'warn'],
		})
		try {
			const userModel = probe.get<Model<User>>(getModelToken(User.name))
			const count = await userModel.countDocuments()
			if (count > 0) {
				console.log(
					`Seed skipped (${count} users already in database). Set FORCE_SEED=true to re-run.`
				)
				return
			}
		} finally {
			await probe.close()
		}
	}
	await runMongoSeed()
}
main().catch((err) => {
	console.error('Seed failed', err)
	process.exit(1)
})
