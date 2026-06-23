import {
	ApprovalStatus,
	ChangeRequestStatus,
	ClientProfile,
	DocumentType,
	EstimateStatus,
	InventoryMovementType,
	InvoiceStatus,
	Material,
	OrderStatus,
	PaymentStatus,
	PrismaClient,
	ProjectStatus,
	ReceiptStatus,
	RoleCode,
	StaffProfile,
	TaskStatus,
	User,
} from '@prisma/client'
import * as bcrypt from 'bcrypt'
const prisma = new PrismaClient()
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
		name: 'Project Manager',
		description: 'Проєкти, задачі, календар і команди',
		permissions: [
			'projects:manage',
			'orders:manage',
			'tasks:manage',
			'reports:read',
		],
	},
	{
		code: RoleCode.DESIGNER,
		name: 'Designer',
		description: 'Заміри, дизайн-вимоги, медіа й матеріали',
		permissions: ['projects:read', 'measurements:manage', 'materials:read'],
	},
	{
		code: RoleCode.ESTIMATOR,
		name: 'Estimator',
		description: 'Кошториси, ціни, маржа й погодження',
		permissions: ['estimates:manage', 'materials:read', 'projects:read'],
	},
	{
		code: RoleCode.WORKER_LEAD,
		name: 'Worker Lead',
		description: 'Бригади, виконання робіт і звіти',
		permissions: ['tasks:manage_team', 'projects:read', 'quality:manage'],
	},
	{
		code: RoleCode.WORKER,
		name: 'Worker',
		description: 'Особисті задачі та статус виконання',
		permissions: ['tasks:read_assigned', 'tasks:update_assigned'],
	},
	{
		code: RoleCode.ACCOUNTANT,
		name: 'Accountant',
		description: 'Оплати, рахунки, чеки та фінансові звіти',
		permissions: ['payments:manage', 'receipts:manage', 'reports:finance'],
	},
	{
		code: RoleCode.SUPPLIER,
		name: 'Supplier',
		description: 'Поставки, матеріали, складські заявки',
		permissions: ['materials:supply', 'procurement:read'],
	},
	{
		code: RoleCode.CLIENT,
		name: 'Client',
		description: 'Кабінет клієнта, погодження, оплати й чеки',
		permissions: ['client_portal:read', 'payments:create'],
	},
]
const demoUsers = [
	['admin@tailored.demo', 'Іван Бідловський', RoleCode.ADMIN, 'System Owner'],
	[
		'manager@tailored.demo',
		'Олена Кравець',
		RoleCode.PROJECT_MANAGER,
		'Project Manager',
	],
	[
		'designer@tailored.demo',
		'Марія Савчук',
		RoleCode.DESIGNER,
		'Interior Designer',
	],
	[
		'estimator@tailored.demo',
		'Андрій Мельник',
		RoleCode.ESTIMATOR,
		'Estimator',
	],
	['lead@tailored.demo', 'Тарас Гнатюк', RoleCode.WORKER_LEAD, 'Worker Lead'],
	[
		'worker@tailored.demo',
		'Роман Левицький',
		RoleCode.WORKER,
		'Finishing Worker',
	],
	[
		'accountant@tailored.demo',
		'Наталія Бойко',
		RoleCode.ACCOUNTANT,
		'Accountant',
	],
	[
		'supplier@tailored.demo',
		'Олег Романюк',
		RoleCode.SUPPLIER,
		'Supplier Manager',
	],
	['client@tailored.demo', 'Юлія Мороз', RoleCode.CLIENT, 'Client'],
	[
		'client.hotel@tailored.demo',
		'Daria Horova',
		RoleCode.CLIENT,
		'Hotel Owner',
	],
	[
		'client.office@tailored.demo',
		'Maksym Rudenko',
		RoleCode.CLIENT,
		'Office Director',
	],
	[
		'client.retail@tailored.demo',
		'Iryna Shevets',
		RoleCode.CLIENT,
		'Retail Owner',
	],
] as const
async function upsertRoles() {
	const entries = await Promise.all(
		roleRows.map((role) =>
			prisma.role.upsert({
				where: { code: role.code },
				update: {
					name: role.name,
					description: role.description,
					permissions: role.permissions,
				},
				create: role,
			})
		)
	)
	return Object.fromEntries(entries.map((role) => [role.code, role]))
}
async function upsertUsers(
	roleByCode: Awaited<ReturnType<typeof upsertRoles>>
) {
	const passwordHash = await bcrypt.hash(password, 12)
	const users: Record<string, User> = {}
	for (const [email, fullName, roleCode, title] of demoUsers) {
		users[email] = await prisma.user.upsert({
			where: { email },
			update: {
				fullName,
				title,
				roleId: roleByCode[roleCode].id,
				isActive: true,
			},
			create: {
				email,
				fullName,
				title,
				passwordHash,
				roleId: roleByCode[roleCode].id,
				phone: '+380 67 000 00 00',
			},
		})
	}
	const clientUser = users['client@tailored.demo']
	const client = await prisma.clientProfile.upsert({
		where: { userId: clientUser.id },
		update: {
			companyName: 'Moroz Family Residence',
			leadSource: 'Instagram',
		},
		create: {
			userId: clientUser.id,
			companyName: 'Moroz Family Residence',
			leadSource: 'Instagram',
		},
	})
	const extraClientRows = [
		['client.hotel@tailored.demo', 'Horova Boutique Hotel', 'Referral'],
		['client.office@tailored.demo', 'Rudenko Consulting Office', 'Google Search'],
		['client.retail@tailored.demo', 'Shevets Concept Store', 'Expo Lead'],
	] as const
	const extraClients: ClientProfile[] = []
	for (const [email, companyName, leadSource] of extraClientRows) {
		extraClients.push(
			await prisma.clientProfile.upsert({
				where: { userId: users[email].id },
				update: { companyName, leadSource },
				create: {
					userId: users[email].id,
					companyName,
					leadSource,
				},
			})
		)
	}
	const clientOrderRows = [
		[
			extraClients[0].id,
			'TDS-LEAD-HOTEL-01',
			'Lobby refresh before summer season',
			OrderStatus.QUALIFIED,
			'540000',
			'Lviv',
			'Rynok Square 7',
		],
		[
			extraClients[0].id,
			'TDS-LEAD-HOTEL-02',
			'Guest room lighting package',
			OrderStatus.NEW,
			'220000',
			'Lviv',
			'Valova 12',
		],
		[
			extraClients[1].id,
			'TDS-LEAD-OFFICE-01',
			'Consultation office acoustic redesign',
			OrderStatus.CONVERTED,
			'310000',
			'Kyiv',
			'Yaroslaviv Val 18',
		],
		[
			extraClients[2].id,
			'TDS-LEAD-RETAIL-01',
			'Concept store interior and checkout zone',
			OrderStatus.QUALIFIED,
			'470000',
			'Ivano-Frankivsk',
			'Nezalezhnosti 44',
		],
		[
			extraClients[2].id,
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
		await prisma.order.upsert({
			where: { code },
			update: {
				title,
				status,
				requestedBudget,
				city,
				addressLine,
			},
			create: {
				code,
				title,
				description: `${title}. Demo CRM request prepared for sales pipeline.`,
				status,
				requestedBudget,
				clientId,
				addressLine,
				city,
				phone: '+380 67 555 11 22',
			},
		})
	}
	const staff: Record<string, StaffProfile> = {}
	const staffRows = [
		['manager@tailored.demo', 'Project orchestration', 38],
		[
			'designer@tailored.demo',
			'Interior measurements and concept design',
			34,
		],
		['estimator@tailored.demo', 'Estimates and project margin', 36],
		['lead@tailored.demo', 'Team planning and quality control', 42],
		['worker@tailored.demo', 'Finishing works', 40],
		['accountant@tailored.demo', 'Payments and documents', 35],
		['supplier@tailored.demo', 'Procurement and materials', 35],
	] as const
	for (const [email, specialization, capacityHours] of staffRows) {
		staff[email] = await prisma.staffProfile.upsert({
			where: { userId: users[email].id },
			update: { specialization, capacityHours },
			create: {
				userId: users[email].id,
				specialization,
				capacityHours,
			},
		})
	}
	return { users, client, extraClients, staff }
}
async function seedSuppliersAndMaterials() {
	const woodSupplier = await prisma.supplier.upsert({
		where: { name: 'Ternopil Wood Studio' },
		update: {
			contactName: 'Петро Данилюк',
			email: 'wood@tailored.demo',
			phone: '+380 67 110 20 30',
			city: 'Тернопіль',
			reliability: 92,
		},
		create: {
			name: 'Ternopil Wood Studio',
			contactName: 'Петро Данилюк',
			email: 'wood@tailored.demo',
			phone: '+380 67 110 20 30',
			city: 'Тернопіль',
			reliability: 92,
		},
	})
	const finishSupplier = await prisma.supplier.upsert({
		where: { name: 'Lviv Finish Depot' },
		update: {
			contactName: 'Софія Ільницька',
			email: 'finish@tailored.demo',
			phone: '+380 67 220 40 50',
			city: 'Львів',
			reliability: 86,
		},
		create: {
			name: 'Lviv Finish Depot',
			contactName: 'Софія Ільницька',
			email: 'finish@tailored.demo',
			phone: '+380 67 220 40 50',
			city: 'Львів',
			reliability: 86,
		},
	})
	const materials = [
		[
			'MAT-OAK-PANEL',
			'Дубова декоративна панель',
			'Wood',
			'м2',
			'860',
			'1240',
			'42',
			'12',
			woodSupplier.id,
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
			finishSupplier.id,
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
			finishSupplier.id,
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
			finishSupplier.id,
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
			finishSupplier.id,
		],
		[
			'MAT-BRASS-RAIL',
			'Brass decorative rail',
			'Metal',
			'm',
			'510',
			'780',
			'28',
			'14',
			finishSupplier.id,
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
			finishSupplier.id,
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
			woodSupplier.id,
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
			finishSupplier.id,
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
			finishSupplier.id,
		],
	]
	const saved = []
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
		const material = await prisma.material.upsert({
			where: { sku },
			update: {
				name,
				category,
				unit,
				purchasePrice,
				salePrice,
				stockQty,
				minStockQty,
				supplierId,
			},
			create: {
				sku,
				name,
				category,
				unit,
				purchasePrice,
				salePrice,
				stockQty,
				minStockQty,
				supplierId,
			},
		})
		await prisma.inventoryMovement.deleteMany({
			where: {
				materialId: material.id,
				reason: `Demo stock balance for ${name}`,
			},
		})
		await prisma.inventoryMovement.create({
			data: {
				materialId: material.id,
				type: InventoryMovementType.ADJUSTMENT,
				quantity: stockQty,
				reason: `Demo stock balance for ${name}`,
			},
		})
		saved.push(material)
	}
	return saved
}
async function seedProjects(
	client: ClientProfile,
	staff: Record<string, StaffProfile>,
	materials: Material[]
) {
	const manager = staff['manager@tailored.demo']
	const designer = staff['designer@tailored.demo']
	const estimator = staff['estimator@tailored.demo']
	const lead = staff['lead@tailored.demo']
	const worker = staff['worker@tailored.demo']
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
			budgetApproved: null,
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
	]
	const savedProjects = []
	for (const item of projectRows) {
		const project = await prisma.project.upsert({
			where: { code: item.code },
			update: {
				title: item.title,
				description: item.description,
				status: item.status,
				managerId: manager.id,
				designerId: designer.id,
				budgetPlanned: item.budgetPlanned,
				budgetApproved: item.budgetApproved,
				dueDate: new Date('2026-06-20T12:00:00.000Z'),
			},
			create: {
				code: item.code,
				title: item.title,
				description: item.description,
				status: item.status,
				clientId: client.id,
				managerId: manager.id,
				designerId: designer.id,
				budgetPlanned: item.budgetPlanned,
				budgetApproved: item.budgetApproved,
				startDate: new Date('2026-05-05T10:00:00.000Z'),
				dueDate: new Date('2026-06-20T12:00:00.000Z'),
			},
		})
		await prisma.notification.deleteMany({
			where: { projectId: project.id },
		})
		await prisma.auditLog.deleteMany({ where: { projectId: project.id } })
		await prisma.projectDocument.deleteMany({
			where: { projectId: project.id },
		})
		await prisma.qualityChecklist.deleteMany({
			where: { projectId: project.id },
		})
		await prisma.changeRequest.deleteMany({
			where: { projectId: project.id },
		})
		await prisma.approval.deleteMany({ where: { projectId: project.id } })
		await prisma.projectLocation.upsert({
			where: { projectId: project.id },
			update: {
				addressLine: item.addressLine,
				city: item.city,
				region: item.region,
				placeLabel: item.placeLabel,
				latitude: item.latitude,
				longitude: item.longitude,
			},
			create: {
				projectId: project.id,
				addressLine: item.addressLine,
				city: item.city,
				region: item.region,
				placeLabel: item.placeLabel,
				latitude: item.latitude,
				longitude: item.longitude,
			},
		})
		await prisma.order.upsert({
			where: { code: `${item.code}-ORDER` },
			update: {
				status:
					item.status === ProjectStatus.ESTIMATION
						? OrderStatus.QUALIFIED
						: OrderStatus.CONVERTED,
				projectId: project.id,
			},
			create: {
				code: `${item.code}-ORDER`,
				title: `Заявка: ${item.title}`,
				description: item.description,
				status:
					item.status === ProjectStatus.ESTIMATION
						? OrderStatus.QUALIFIED
						: OrderStatus.CONVERTED,
				requestedBudget: item.budgetPlanned,
				clientId: client.id,
				projectId: project.id,
				addressLine: item.addressLine,
				city: item.city,
				phone: '+380 67 333 44 55',
			},
		})
		await prisma.designMeasurement.deleteMany({
			where: { projectId: project.id },
		})
		await prisma.designMeasurement.createMany({
			data: [
				{
					projectId: project.id,
					zoneName: 'Вітальня',
					floorArea: '28.4',
					wallArea: '61.2',
					ceilingHeight: '2.75',
					notes: 'Потрібна ніша під приховане світло.',
				},
				{
					projectId: project.id,
					zoneName: 'Передпокій',
					floorArea: '9.6',
					wallArea: '24.1',
					ceilingHeight: '2.70',
					notes: 'Є обмеження по глибині шафи.',
				},
			],
		})
		const estimate = await prisma.estimate.upsert({
			where: {
				projectId_version: {
					projectId: project.id,
					version: 1,
				},
			},
			update: {
				status:
					item.status === ProjectStatus.ESTIMATION
						? EstimateStatus.SENT
						: EstimateStatus.APPROVED,
				subtotal: '388000',
				discount: '8000',
				tax: '0',
				margin: '83800',
				total: item.budgetApproved ?? '463800',
			},
			create: {
				projectId: project.id,
				version: 1,
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
			},
		})
		await prisma.estimateItem.deleteMany({
			where: { estimateId: estimate.id },
		})
		await prisma.estimateItem.createMany({
			data: [
				{
					estimateId: estimate.id,
					materialId: materials[0].id,
					category: 'Матеріали',
					title: materials[0].name,
					unit: 'м2',
					quantity: '22',
					unitPrice: '1240',
					total: '27280',
					sortOrder: 1,
				},
				{
					estimateId: estimate.id,
					materialId: materials[3].id,
					category: 'Освітлення',
					title: materials[3].name,
					unit: 'м',
					quantity: '38',
					unitPrice: '410',
					total: '15580',
					sortOrder: 2,
				},
				{
					estimateId: estimate.id,
					category: 'Роботи',
					title: 'Монтаж декоративних панелей і фінальне оздоблення',
					unit: 'послуга',
					quantity: '1',
					unitPrice: '142000',
					total: '142000',
					sortOrder: 3,
				},
			],
		})
		const team = await prisma.team.upsert({
			where: { name: 'Бригада Тернопіль Finish 01' },
			update: { city: 'Тернопіль', speciality: 'Interior finishing' },
			create: {
				name: 'Бригада Тернопіль Finish 01',
				city: 'Тернопіль',
				speciality: 'Interior finishing',
			},
		})
		await prisma.teamMember.upsert({
			where: { teamId_staffId: { teamId: team.id, staffId: lead.id } },
			update: { isLead: true },
			create: { teamId: team.id, staffId: lead.id, isLead: true },
		})
		await prisma.teamMember.upsert({
			where: { teamId_staffId: { teamId: team.id, staffId: worker.id } },
			update: { isLead: false },
			create: { teamId: team.id, staffId: worker.id, isLead: false },
		})
		await prisma.task.deleteMany({ where: { projectId: project.id } })
		await prisma.task.createMany({
			data: [
				{
					projectId: project.id,
					teamId: team.id,
					assigneeId: lead.id,
					title: 'Погодити порядок робіт на тиждень',
					status: TaskStatus.READY,
					priority: 2,
					dueDate: new Date('2026-05-09T12:00:00.000Z'),
				},
				{
					projectId: project.id,
					teamId: team.id,
					assigneeId: worker.id,
					title: 'Змонтувати LED профіль у вітальні',
					status:
						item.status === ProjectStatus.PAUSED
							? TaskStatus.BLOCKED
							: TaskStatus.IN_PROGRESS,
					priority: 1,
					dueDate: new Date('2026-05-12T12:00:00.000Z'),
				},
				{
					projectId: project.id,
					teamId: team.id,
					assigneeId: estimator.id,
					title: 'Перевірити маржу після зміни матеріалів',
					status: TaskStatus.REVIEW,
					priority: 3,
					dueDate: new Date('2026-05-15T12:00:00.000Z'),
				},
			],
		})
		const invoice = await prisma.invoice.upsert({
			where: { number: `${item.code}-INV-001` },
			update: {
				projectId: project.id,
				clientId: client.id,
				status:
					item.status === ProjectStatus.IN_PROGRESS
						? InvoiceStatus.PAID
						: InvoiceStatus.SENT,
				amount: item.budgetApproved ?? '120000',
				dueDate: new Date('2026-05-18T12:00:00.000Z'),
			},
			create: {
				number: `${item.code}-INV-001`,
				projectId: project.id,
				clientId: client.id,
				status:
					item.status === ProjectStatus.IN_PROGRESS
						? InvoiceStatus.PAID
						: InvoiceStatus.SENT,
				amount: item.budgetApproved ?? '120000',
				dueDate: new Date('2026-05-18T12:00:00.000Z'),
			},
		})
		const payment = await prisma.payment.upsert({
			where: { providerRef: `${item.code}-PAY-DEMO-001` },
			update: {
				projectId: project.id,
				clientId: client.id,
				status:
					item.status === ProjectStatus.IN_PROGRESS
						? PaymentStatus.PAID
						: PaymentStatus.PENDING,
				amount: invoice.amount,
				method: 'mock-card',
				paidAt:
					item.status === ProjectStatus.IN_PROGRESS
						? new Date('2026-05-06T10:30:00.000Z')
						: null,
			},
			create: {
				projectId: project.id,
				clientId: client.id,
				status:
					item.status === ProjectStatus.IN_PROGRESS
						? PaymentStatus.PAID
						: PaymentStatus.PENDING,
				amount: invoice.amount,
				method: 'mock-card',
				providerRef: `${item.code}-PAY-DEMO-001`,
				paidAt:
					item.status === ProjectStatus.IN_PROGRESS
						? new Date('2026-05-06T10:30:00.000Z')
						: null,
			},
		})
		if (payment.status === PaymentStatus.PAID) {
			await prisma.receipt.upsert({
				where: { number: `${item.code}-RCPT-001` },
				update: {
					projectId: project.id,
					clientId: client.id,
					paymentId: payment.id,
					status: ReceiptStatus.ISSUED,
					amount: payment.amount,
					pdfPath: `/receipts/${item.code}-RCPT-001.pdf`,
				},
				create: {
					number: `${item.code}-RCPT-001`,
					projectId: project.id,
					clientId: client.id,
					paymentId: payment.id,
					status: ReceiptStatus.ISSUED,
					amount: payment.amount,
					pdfPath: `/receipts/${item.code}-RCPT-001.pdf`,
				},
			})
		}
		await prisma.changeRequest.create({
			data: {
				projectId: project.id,
				title: 'Додати теплу LED-лінію біля робочої зони',
				description:
					'Клієнт попросив додати окремий сценарій освітлення після затвердження концепту.',
				status:
					item.status === ProjectStatus.IN_PROGRESS
						? ChangeRequestStatus.APPROVED
						: ChangeRequestStatus.OPEN,
				impactCost: '18500',
				impactDays: 2,
			},
		})
		await prisma.qualityChecklist.create({
			data: {
				projectId: project.id,
				title: 'Проміжна перевірка оздоблення',
				score: item.status === ProjectStatus.PAUSED ? 62 : 88,
				items: [
					{ label: 'Геометрія стиків', done: true },
					{
						label: 'Відповідність матеріалів кошторису',
						done: item.status !== ProjectStatus.PAUSED,
					},
					{ label: 'Фото-звіт додано', done: true },
				],
			},
		})
		await prisma.approval.create({
			data: {
				projectId: project.id,
				estimateId: estimate.id,
				kind: 'estimate',
				status:
					item.status === ProjectStatus.ESTIMATION
						? ApprovalStatus.PENDING
						: ApprovalStatus.APPROVED,
				requestedBy: 'estimator@tailored.demo',
				decidedBy:
					item.status === ProjectStatus.ESTIMATION
						? null
						: 'client@tailored.demo',
				notes: 'Demo approval flow for estimate.',
				decidedAt:
					item.status === ProjectStatus.ESTIMATION
						? null
						: new Date('2026-05-06T09:00:00.000Z'),
			},
		})
		await prisma.projectDocument.create({
			data: {
				projectId: project.id,
				type: DocumentType.PHOTO_REPORT,
				title: 'Фото-звіт стану обʼєкта',
				fileName: `${item.code.toLowerCase()}-photo-report.pdf`,
				fileSize: 248000,
			},
		})
		await prisma.auditLog.create({
			data: {
				projectId: project.id,
				action: 'seed.project.prepared',
				entityType: 'Project',
				entityId: project.id,
				metadata: { code: item.code, status: item.status },
			},
		})
		await prisma.notification.create({
			data: {
				projectId: project.id,
				title: `Оновлення по ${item.code}`,
				body: `Проєкт "${item.title}" має статус ${item.status}.`,
				roleCode: RoleCode.PROJECT_MANAGER,
			},
		})
		savedProjects.push(project)
	}
	return savedProjects
}
async function seedExpansion(
	roleByCode: Record<
		string,
		{
			id: string
		}
	>
) {
	const roleId = (code: RoleCode) => roleByCode[code].id
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
	const extraClientIds: string[] = []
	for (let i = 0; i < extraEmails.length; i++) {
		const [email, fullName, phone, companyName] = extraEmails[i]
		const existingUser = await prisma.user.findUnique({ where: { email } })
		let userId: string
		if (existingUser) {
			userId = existingUser.id
		} else {
			const hash = await bcrypt.hash('Demo12345!', 10)
			const u = await prisma.user.create({
				data: {
					email,
					passwordHash: hash,
					fullName,
					phone,
					isActive: true,
					roleId: roleId(RoleCode.CLIENT),
				},
			})
			userId = u.id
		}
		const cp = await prisma.clientProfile.upsert({
			where: { userId },
			update: {
				companyName,
				leadSource: leadSources[i % leadSources.length],
			},
			create: {
				userId,
				companyName,
				leadSource: leadSources[i % leadSources.length],
			},
		})
		extraClientIds.push(cp.id)
	}
	const extraMats = [
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
		[
			'MAT-CEMENT-SCREED',
			'Self-leveling cement screed',
			'Floor',
			'кг',
			'95',
			'165',
			'200',
			'80',
		],
		[
			'MAT-GYPSUM-BOARD',
			'Gypsum board 12.5mm',
			'Wall',
			'шт',
			'340',
			'520',
			'120',
			'40',
		],
		[
			'MAT-METAL-PROFILE',
			'Metal profile CD 60',
			'Metal',
			'м',
			'85',
			'140',
			'350',
			'100',
		],
		[
			'MAT-DOOR-OAK',
			'Interior oak door',
			'Door',
			'шт',
			'6500',
			'9200',
			'8',
			'3',
		],
		[
			'MAT-DOOR-GLASS',
			'Glass sliding door',
			'Door',
			'шт',
			'12000',
			'16500',
			'4',
			'2',
		],
		[
			'MAT-HDPE-BLIND',
			'HDPE roller blind',
			'Textile',
			'м2',
			'420',
			'680',
			'32',
			'12',
		],
		[
			'MAT-SMART-SWITCH',
			'Smart touch switch',
			'Lighting',
			'шт',
			'850',
			'1290',
			'30',
			'10',
		],
		[
			'MAT-TRACK-LIGHT',
			'Track light 12W',
			'Lighting',
			'шт',
			'780',
			'1180',
			'40',
			'15',
		],
		[
			'MAT-SPOT-GYPSUM',
			'Recessed spotlight gypsum',
			'Lighting',
			'шт',
			'320',
			'520',
			'60',
			'20',
		],
		[
			'MAT-MIRROR-TINTED',
			'Tinted mirror glass',
			'Glass',
			'м2',
			'1100',
			'1650',
			'12',
			'6',
		],
		[
			'MAT-GLASS-TEMPERED',
			'Tempered glass 10mm',
			'Glass',
			'м2',
			'1380',
			'2050',
			'8',
			'4',
		],
		[
			'MAT-STEEL-HANDLE',
			'Steel door handle set',
			'Metal',
			'шт',
			'420',
			'680',
			'25',
			'10',
		],
		[
			'MAT-BRASS-FAUCET',
			'Brass wall-mount faucet',
			'Plumbing',
			'шт',
			'2800',
			'4200',
			'6',
			'2',
		],
		[
			'MAT-TILE-METRO',
			'Metro tile 10x20 white',
			'Tile',
			'м2',
			'380',
			'590',
			'50',
			'20',
		],
		[
			'MAT-TILE-HERRING',
			'Herringbone parquet tile',
			'Floor',
			'м2',
			'1150',
			'1680',
			'18',
			'8',
		],
		[
			'MAT-STONE-MARBLE',
			'Marble slab 2cm Carrara',
			'Stone',
			'м2',
			'3800',
			'5400',
			'5',
			'3',
		],
		[
			'MAT-STONE-QUARTZITE',
			'Quartzite countertop',
			'Stone',
			'м2',
			'4200',
			'6100',
			'4',
			'2',
		],
		[
			'MAT-ACOUSTIC-FOAM',
			'Acoustic foam 5cm',
			'Acoustic',
			'м2',
			'290',
			'480',
			'40',
			'15',
		],
		[
			'MAT-SOUND-BARRIER',
			'Sound barrier membrane',
			'Acoustic',
			'м2',
			'380',
			'590',
			'25',
			'10',
		],
		[
			'MAT-VINYL-FLOOR',
			'Luxury vinyl plank SPC',
			'Floor',
			'м2',
			'520',
			'790',
			'35',
			'15',
		],
		[
			'MAT-LAMINATE-8MM',
			'Laminate 8mm AC4',
			'Floor',
			'м2',
			'290',
			'450',
			'60',
			'25',
		],
		[
			'MAT-UNDERLAY-5MM',
			'Acoustic underlay 5mm',
			'Floor',
			'м2',
			'95',
			'160',
			'80',
			'30',
		],
		[
			'MAT-PRIMER-DEEP',
			'Deep penetration primer',
			'Paint',
			'л',
			'145',
			'240',
			'50',
			'20',
		],
		[
			'MAT-SEALER-GROUT',
			'Grout sealer',
			'Finish',
			'л',
			'280',
			'420',
			'30',
			'12',
		],
		[
			'MAT-ADHESIVE-TILE',
			'Tile adhesive C2',
			'Finish',
			'кг',
			'62',
			'110',
			'200',
			'80',
		],
		[
			'MAT-ADHESIVE-PARQUET',
			'Parquet adhesive MS polymer',
			'Finish',
			'кг',
			'180',
			'290',
			'40',
			'15',
		],
		[
			'MAT-CAULK-SILICON',
			'Silicone sealant neutral',
			'Finish',
			'шт',
			'75',
			'130',
			'100',
			'40',
		],
		[
			'MAT-PAINT-FACADE',
			'Facade paint weather-shield',
			'Paint',
			'л',
			'390',
			'620',
			'45',
			'20',
		],
		[
			'MAT-PLINT-MDF',
			'MDF skirting board 80mm',
			'Wood',
			'м',
			'145',
			'230',
			'150',
			'50',
		],
		[
			'MAT-CORNICE-GYPSUM',
			'Gypsum cornice 80mm',
			'Finish',
			'м',
			'180',
			'290',
			'80',
			'30',
		],
	]
	const anySupplier = await prisma.supplier.findFirst({
		orderBy: { createdAt: 'asc' },
	})
	if (!anySupplier) return
	for (const [sku, name, category, unit, pp, sp, sq, msq] of extraMats) {
		await prisma.material.upsert({
			where: { sku },
			update: {},
			create: {
				sku,
				name,
				category,
				unit,
				purchasePrice: pp,
				salePrice: sp,
				stockQty: sq,
				minStockQty: msq,
				supplierId: anySupplier.id,
			},
		})
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
		await prisma.supplier.upsert({
			where: { name: String(name) },
			update: { reliability },
			create: {
				name: String(name),
				contactName: String(contactName),
				email: String(email),
				phone: String(phone),
				city: String(city),
				reliability,
			},
		})
	}
	const existingClient = await prisma.clientProfile.findFirst({
		orderBy: { createdAt: 'asc' },
	})
	const manager = await prisma.staffProfile.findFirst({
		include: { user: true },
	})
	if (!existingClient || !manager) return
	const newProjects = [
		{
			code: 'TDS-P-011',
			title: 'Офіс технологічного стартапу Kyiv Hub',
			status: ProjectStatus.IN_PROGRESS,
			budgetPlanned: '780000',
			city: 'Київ',
			lat: 50.4551,
			lng: 30.5238,
			address: 'вул. Велика Васильківська, 55',
			region: 'Kyiv',
		},
		{
			code: 'TDS-P-012',
			title: 'Ресторан з відкритою кухнею Shef Table',
			status: ProjectStatus.DESIGN,
			budgetPlanned: '1250000',
			city: 'Львів',
			lat: 49.8397,
			lng: 24.0297,
			address: 'вул. Ринок, 3',
			region: 'Lviv',
		},
		{
			code: 'TDS-P-013',
			title: 'Спа-центр Harmony Wellness',
			status: ProjectStatus.ESTIMATION,
			budgetPlanned: '2100000',
			city: 'Одеса',
			lat: 46.4825,
			lng: 30.7233,
			address: 'Французький бульвар, 14',
			region: 'Odesa',
		},
		{
			code: 'TDS-P-014',
			title: 'Шоурум меблевого бренду Kvadrat',
			status: ProjectStatus.APPROVED,
			budgetPlanned: '560000',
			city: 'Харків',
			lat: 49.9935,
			lng: 36.2304,
			address: 'проспект Науки, 22',
			region: 'Kharkiv',
		},
		{
			code: 'TDS-P-015',
			title: 'Приватна бібліотека і кабінет Humeniuk',
			status: ProjectStatus.COMPLETED,
			budgetPlanned: '340000',
			city: 'Дніпро',
			lat: 48.4647,
			lng: 35.0462,
			address: 'вул. Набережна Перемоги, 7',
			region: 'Dnipro',
		},
	]
	for (const p of newProjects) {
		const existing = await prisma.project.findUnique({
			where: { code: p.code },
		})
		if (existing) continue
		const project = await prisma.project.create({
			data: {
				code: p.code,
				title: p.title,
				description: `${p.title}. Demo project for Phase 3 expansion.`,
				status: p.status,
				clientId: existingClient.id,
				managerId: manager.id,
				budgetPlanned: p.budgetPlanned,
				startDate: new Date(2025, 10, 1),
				dueDate: new Date(2026, 6, 30),
			},
		})
		await prisma.projectLocation.upsert({
			where: { projectId: project.id },
			update: {},
			create: {
				projectId: project.id,
				addressLine: p.address,
				city: p.city,
				region: p.region,
				country: 'Україна',
				placeLabel: `${p.city}, ${p.address}`,
				latitude: p.lat,
				longitude: p.lng,
			},
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
		for (let i = 0; i < taskTitles.length; i++) {
			await prisma.task.create({
				data: {
					projectId: project.id,
					title: taskTitles[i],
					status: statuses[i],
					priority: i + 1,
					dueDate: new Date(2026, 3 + i, 15),
				},
			})
		}
		await prisma.notification.create({
			data: {
				projectId: project.id,
				title: `Новий проєкт: ${p.code}`,
				body: `Проєкт "${p.title}" додано до системи.`,
				roleCode: RoleCode.PROJECT_MANAGER,
			},
		})
		await prisma.auditLog.create({
			data: {
				projectId: project.id,
				action: 'project.created',
				entityType: 'Project',
				entityId: project.id,
				metadata: { source: 'seed.phase3', status: p.status },
			},
		})
	}
	const sysNotifs = [
		[
			null,
			'Матеріали поповнено',
			'40 нових SKU матеріалів додано до каталогу.',
			null,
		],
		[
			null,
			'Нові постачальники',
			'5 нових постачальників зареєстровано в системі.',
			RoleCode.ESTIMATOR,
		],
		[
			null,
			'Демо: Phase 3 seed завершено',
			'Всі розширені тестові дані успішно завантажено.',
			RoleCode.ADMIN,
		],
	] as const
	await prisma.notification.deleteMany({
		where: {
			projectId: null,
			title: { in: sysNotifs.map(([, title]) => title) },
		},
	})
	for (const [, title, body, roleCode] of sysNotifs) {
		await prisma.notification.create({
			data: { title, body, ...(roleCode ? { roleCode } : {}) },
		})
	}
	console.log('Phase 3 expansion seeded.')
}
async function seedPhase4() {
	const projects = await prisma.project.findMany({
		where: { code: { startsWith: 'TDS-2026-0' } },
		take: 6,
	})
	if (projects.length === 0) {
		console.log('No TDS-2026-00x projects found — skipping phase-4 seed.')
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
		{
			items: [
				{
					category: 'Меблі',
					title: 'Кухонний гарнітур на замовлення',
					unit: 'пог.м.',
					qty: 5,
					price: 8500,
				},
				{
					category: 'Меблі',
					title: 'Вбудована шафа-купе',
					unit: 'шт',
					qty: 2,
					price: 12000,
				},
			],
		},
		{
			items: [
				{
					category: 'Ремонт',
					title: 'Штукатурення стін',
					unit: 'м²',
					qty: 200,
					price: 75,
				},
				{
					category: 'Ремонт',
					title: 'Вирівнювання підлоги',
					unit: 'м²',
					qty: 90,
					price: 60,
				},
				{
					category: 'Ремонт',
					title: 'Стяжка підлоги',
					unit: 'м²',
					qty: 90,
					price: 110,
				},
			],
		},
		{
			items: [
				{
					category: 'Освітлення',
					title: 'Точкові світильники',
					unit: 'шт',
					qty: 30,
					price: 450,
				},
				{
					category: 'Освітлення',
					title: 'Люстра в вітальню',
					unit: 'шт',
					qty: 1,
					price: 3200,
				},
				{
					category: 'Освітлення',
					title: 'Монтаж натяжної стелі',
					unit: 'м²',
					qty: 45,
					price: 320,
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
	const phase4ProjectIds = projects.map((project) => project.id)
	await prisma.auditLog.deleteMany({
		where: {
			projectId: { in: phase4ProjectIds },
			entityType: 'Estimate',
			action: 'estimate.created',
		},
	})
	for (let i = 0; i < projects.length; i++) {
		const tpl = estimateTemplates[i % estimateTemplates.length]
		const proj = projects[i]
		const status = statuses[i % statuses.length]
		const subtotal = tpl.items.reduce((s, it) => s + it.qty * it.price, 0)
		const discount = Math.round(subtotal * 0.05)
		const tax = Math.round(subtotal * 0.02)
		const total = subtotal - discount + tax
		const est = await prisma.estimate.upsert({
			where: {
				projectId_version: {
					projectId: proj.id,
					version: 1,
				},
			},
			update: {
				status,
				subtotal,
				discount,
				tax,
				margin: 0,
				total,
				validUntil: new Date(2026, 8, 30),
			},
			create: {
				projectId: proj.id,
				version: 1,
				status,
				subtotal,
				discount,
				tax,
				margin: 0,
				total,
				validUntil: new Date(2026, 8, 30),
			},
		})
		await prisma.estimateItem.deleteMany({ where: { estimateId: est.id } })
		await prisma.estimateItem.createMany({
			data: tpl.items.map((it, idx) => ({
				estimateId: est.id,
				category: it.category,
				title: it.title,
				unit: it.unit,
				quantity: it.qty,
				unitPrice: it.price,
				total: it.qty * it.price,
				sortOrder: idx,
			})),
		})
		await prisma.auditLog.create({
			data: {
				projectId: proj.id,
				action: 'estimate.created',
				entityType: 'Estimate',
				entityId: est.id,
				metadata: { version: 1, status, source: 'seed.phase4' },
			},
		})
		if (i < 6) {
			const est2 = await prisma.estimate.upsert({
				where: {
					projectId_version: {
						projectId: proj.id,
						version: 2,
					},
				},
				update: {
					status: EstimateStatus.DRAFT,
					subtotal: subtotal * 1.1,
					discount: 0,
					tax,
					margin: Math.round(subtotal * 0.08),
					total: subtotal * 1.1 + tax + Math.round(subtotal * 0.08),
				},
				create: {
					projectId: proj.id,
					version: 2,
					status: EstimateStatus.DRAFT,
					subtotal: subtotal * 1.1,
					discount: 0,
					tax,
					margin: Math.round(subtotal * 0.08),
					total: subtotal * 1.1 + tax + Math.round(subtotal * 0.08),
				},
			})
			await prisma.estimateItem.deleteMany({
				where: { estimateId: est2.id },
			})
			await prisma.estimateItem.createMany({
				data: tpl.items.map((it, idx) => ({
					estimateId: est2.id,
					category: it.category,
					title: it.title,
					unit: it.unit,
					quantity: it.qty * 1.1,
					unitPrice: it.price,
					total: it.qty * 1.1 * it.price,
					sortOrder: idx,
				})),
			})
			await prisma.auditLog.create({
				data: {
					projectId: proj.id,
					action: 'estimate.created',
					entityType: 'Estimate',
					entityId: est2.id,
					metadata: {
						version: 2,
						status: 'DRAFT',
						source: 'seed.phase4',
					},
				},
			})
		}
	}
	const zoneTemplates = [
		{
			zone: 'Вітальня',
			floor: 28.5,
			wall: 48.0,
			height: 2.8,
			notes: 'Є ніша під ТВ-зону',
		},
		{ zone: 'Спальня', floor: 18.2, wall: 35.0, height: 2.75, notes: null },
		{
			zone: 'Кухня',
			floor: 14.0,
			wall: 32.0,
			height: 2.7,
			notes: 'Кутова конфігурація',
		},
		{
			zone: 'Санвузол',
			floor: 7.5,
			wall: 22.4,
			height: 2.6,
			notes: 'Суміщений санвузол',
		},
		{ zone: 'Прихожа', floor: 6.0, wall: 20.0, height: 2.75, notes: null },
		{
			zone: 'Балкон',
			floor: 4.2,
			wall: 12.0,
			height: 2.5,
			notes: 'Утеплений',
		},
		{
			zone: 'Дитяча кімната',
			floor: 16.5,
			wall: 34.0,
			height: 2.75,
			notes: 'Два вікна, схід',
		},
		{ zone: 'Кабінет', floor: 12.0, wall: 28.0, height: 2.8, notes: null },
	]
	await prisma.designMeasurement.deleteMany({
		where: { projectId: { in: phase4ProjectIds } },
	})
	for (const proj of projects) {
		const zonesCount = 3 + (projects.indexOf(proj) % 3)
		for (let z = 0; z < zonesCount; z++) {
			const tpl = zoneTemplates[z % zoneTemplates.length]
			await prisma.designMeasurement.create({
				data: {
					projectId: proj.id,
					zoneName: tpl.zone,
					floorArea: tpl.floor,
					wallArea: tpl.wall,
					ceilingHeight: tpl.height,
					notes: tpl.notes,
				},
			})
		}
	}
	await prisma.projectDocument.deleteMany({
		where: { projectId: { in: phase4ProjectIds } },
	})
	const docTemplates: Array<{
		type: DocumentType
		title: string
		fileName: string
		size: number
	}> = [
		{
			type: DocumentType.CONTRACT,
			title: 'Договір на дизайн-проєкт',
			fileName: 'contract_design.pdf',
			size: 245760,
		},
		{
			type: DocumentType.ACT,
			title: 'Акт прийому-передачі робіт',
			fileName: 'act_001.pdf',
			size: 102400,
		},
		{
			type: DocumentType.PHOTO_REPORT,
			title: 'Фотозвіт — стан до ремонту',
			fileName: 'before_photos.zip',
			size: 15728640,
		},
		{
			type: DocumentType.INVOICE,
			title: 'Рахунок-фактура №001',
			fileName: 'invoice_001.pdf',
			size: 81920,
		},
		{
			type: DocumentType.WARRANTY,
			title: 'Гарантійний талон',
			fileName: 'warranty.pdf',
			size: 51200,
		},
		{
			type: DocumentType.OTHER,
			title: 'Технічне завдання',
			fileName: 'technical_spec.docx',
			size: 307200,
		},
		{
			type: DocumentType.PHOTO_REPORT,
			title: 'Фотозвіт — після ремонту',
			fileName: 'after_photos.zip',
			size: 22020096,
		},
		{
			type: DocumentType.CONTRACT,
			title: 'Договір на постачання матеріалів',
			fileName: 'supply_contract.pdf',
			size: 196608,
		},
	]
	for (let i = 0; i < projects.length; i++) {
		const proj = projects[i]
		const docsCount = 1 + (i % 3)
		for (let d = 0; d < docsCount; d++) {
			const tpl = docTemplates[(i + d) % docTemplates.length]
			await prisma.projectDocument.create({
				data: {
					projectId: proj.id,
					type: tpl.type,
					title: tpl.title,
					fileName: tpl.fileName,
					fileSize: tpl.size,
				},
			})
		}
	}
	console.log('Phase 4 data seeded: estimates, measurements, documents.')
}
async function main() {
	const roleByCode = await upsertRoles()
	const { client, staff } = await upsertUsers(roleByCode)
	const materials = await seedSuppliersAndMaterials()
	await seedProjects(client, staff, materials)
	await seedExpansion(roleByCode)
	await seedPhase4()
}
main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (error) => {
		console.error('Seed failed', error)
		await prisma.$disconnect()
		process.exit(1)
	})
