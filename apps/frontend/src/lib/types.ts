import {
	PaymentStatusCode,
	ProjectStatusCode,
	RoleCode,
} from '@tailored/shared'
export type AuthUser = {
	id: string
	email: string
	fullName: string
	title?: string
	phone?: string
	role: RoleCode
	permissions: string[]
	avatarUrl?: string | null
}
export type LoginResponse = {
	accessToken: string
	user: AuthUser
}
export type Paginated<T> = {
	items: T[]
	total: number
	page: number
	perPage: number
}
export type PublicServiceRow = {
	_id?: string
	slug: string
	name: string
	shortDescription: string
	longDescription: string
	basePrice: string
	priceUnit: string
	style: string[]
	category?: string
	heroImageUrl?: string
	galleryImageUrls?: string[]
	relatedPortfolio?: Array<{
		slug: string
		title: string
		summary: string
		coverImageUrl?: string
		category: string
		style: string
	}>
}
export type PortfolioItemRow = {
	_id?: string
	slug: string
	title: string
	summary: string
	description: string
	category: string
	style: string
	coverImageUrl?: string
	galleryImageUrls?: string[]
}
export type PortalReviewItem = {
	id: string
	projectId: string | null
	projectCode?: string | null
	rating: number
	title: string
	body: string
	status: string
	publishedAt?: string
	photoUrls: string[]
	createdAt?: string
	updatedAt?: string
}
export type PortalEligibleProject = {
	projectId: string
	code: string
	title: string
}
export type PublicReviewRow = {
	_id?: string
	rating: number
	title: string
	body: string
	publishedAt?: string
	createdAt?: string
	reviewerName?: string
	photoUrls?: string[]
}
export type ReviewHistogram = Record<'1' | '2' | '3' | '4' | '5', number>
export type PublicReviewsListResponse = Paginated<PublicReviewRow> & {
	histogram: ReviewHistogram
	avgRating: number | null
}
export type DashboardSummary = {
	totalProjects: number
	activeProjects: number
	pausedProjects: number
	overdueTasks: number
	lowStockMaterials: number
	revenuePaid: string
	pendingPayments: number
	statusDistribution: Array<{
		status: ProjectStatusCode
		count: number
	}>
	recentAudit: Array<{
		id: string
		action: string
		entityType: string
		createdAt: string
	}>
}
export type ProjectListItem = {
	id: string
	code: string
	title: string
	status: ProjectStatusCode
	city?: string
	clientName: string
	managerName?: string
	budgetPlanned: string
	budgetApproved?: string | null
	dueDate?: string
	counters: {
		tasks: number
		payments: number
		changeRequests: number
	}
}
export type ProjectDetail = {
	id: string
	code: string
	title: string
	description: string
	status: ProjectStatusCode
	budgetPlanned: string
	budgetApproved?: string | null
	/** Бюджет із заявки клієнта (order.requestedBudget). */
	clientRequestedBudget?: string | null
	/** Сума total усіх кошторисів зі статусом APPROVED. */
	approvedEstimatesTotal?: string | null
	startDate?: string | null
	dueDate?: string | null
	location?: {
		addressLine: string
		city: string
		region: string
		placeLabel: string
		latitude: string
		longitude: string
	} | null
	client: {
		user: {
			fullName: string
			email: string
			phone?: string | null
		}
	}
	manager?: {
		id: string
		user: {
			fullName: string
			email: string
		}
	} | null
	designer?: {
		id: string
		user: {
			fullName: string
			email: string
		}
	} | null
	brigadir?: {
		id: string
		user: { fullName?: string; email?: string }
	} | null
	measurements: Array<{
		id: string
		zoneName: string
		floorArea: string
		wallArea: string
		ceilingHeight: string
		notes?: string | null
	}>
	estimates: Array<{
		id: string
		version: number
		status: string
		subtotal: string
		discount: string
		margin: string
		total: string
		items: Array<{
			id: string
			category: string
			title: string
			unit: string
			quantity: string
			unitPrice: string
			total: string
		}>
	}>
	tasks: Array<{
		id: string
		title: string
		status: TaskStatusCode
		priority: number
		dueDate?: string | null
		assignee?: {
			user: {
				fullName: string
			}
		} | null
		team?: {
			name: string
		} | null
	}>
	payments: Array<{
		id: string
		status: PaymentStatusCode
		method: string
		amount: string
		currency: string
		createdAt: string
	}>
	invoices: Array<{
		id: string
		number: string
		status: string
		amount: string
		currency: string
		dueDate?: string | null
	}>
	receipts: Array<{
		id: string
		number: string
		status: string
		amount: string
		currency: string
		issuedAt: string
		invoiceId?: string | null
		invoiceNumber?: string | null
		invoiceStatus?: string | null
	}>
	changeRequests: Array<{
		id: string
		title: string
		status: string
		impactCost: string
		impactDays: number
	}>
	qualityChecks: Array<{
		id: string
		title: string
		score: number
		items: unknown
	}>
	auditLogs: Array<{
		id: string
		action: string
		entityType: string
		entityId?: string
		metadata?: Record<string, unknown> | null
		createdAt: string
		user?: {
			fullName: string
			email: string
		} | null
	}>
}
export type ProjectMapMarker = {
	id: string
	code: string
	title: string
	status: ProjectStatusCode
	clientName: string
	address?: string
	city?: string
	lat: number
	lng: number
}
export type PaymentRow = {
	id: string
	status: PaymentStatusCode
	method: string
	amount: string
	currency: string
	projectCode: string
	projectTitle: string
	clientName: string
	createdAt: string
	receipt?: {
		id: string
		number: string
	} | null
}
export type ReceiptRow = {
	id: string
	number: string
	status: string
	amount: string
	currency: string
	projectCode: string
	projectTitle: string
	clientName: string
	issuedAt: string
	invoiceId?: string | null
	invoiceNumber?: string | null
	invoiceStatus?: string | null
}
export type MaterialRow = {
	id: string
	sku: string
	name: string
	category: string
	unit: string
	purchasePrice: string
	salePrice: string
	stockQty: string
	minStockQty: string
	isLowStock: boolean
	stockValue: string
	supplier?: {
		id: string
		name: string
		contactName: string
		city: string
		reliability: number
	} | null
	recentMovements: Array<{
		id: string
		type: string
		quantity: string
		reason: string
		createdAt: string
	}>
}
export type MaterialsOverview = {
	totalMaterials: number
	totalStockValue: string
	lowStock: Array<{
		id: string
		sku: string
		name: string
		stockQty: string
		minStockQty: string
		supplierName?: string | null
	}>
	byCategory: Array<{
		category: string
		count: number
		value: string
	}>
	suppliers: Array<{
		id: string
		name: string
		city: string
		reliability: number
		materialsCount: number
	}>
	recentMovements: Array<{
		id: string
		materialSku: string
		materialName: string
		type: string
		quantity: string
		reason: string
		createdAt: string
	}>
}
export type TaskStatusCode =
	| 'BACKLOG'
	| 'READY'
	| 'IN_PROGRESS'
	| 'BLOCKED'
	| 'REVIEW'
	| 'DONE'
export type OperationsTask = {
	id: string
	title: string
	description?: string | null
	status: TaskStatusCode
	priority: number
	dueDate?: string | null
	project: {
		id: string
		code: string
		title: string
		status: ProjectStatusCode
		dueDate?: string | null
	}
	teamName?: string | null
	assigneeName?: string | null
}
export type OperationsBoard = {
	total: number
	byStatus: Record<TaskStatusCode, OperationsTask[]>
}
export type ApprovalRow = {
	id: string
	kind: string
	status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'
	requestedBy: string
	decidedBy?: string | null
	notes?: string | null
	createdAt: string
	decidedAt?: string | null
	project: {
		id: string
		code: string
		title: string
	}
	estimate?: {
		id: string
		version: number
		total: string
		status: string
	} | null
}
export type ChangeRequestRow = {
	id: string
	title: string
	description: string
	status: 'OPEN' | 'PRICED' | 'APPROVED' | 'REJECTED' | 'APPLIED'
	impactCost: string
	impactDays: number
	createdAt: string
	project: {
		id: string
		code: string
		title: string
		status: ProjectStatusCode
	}
}
export type QualityRow = {
	id: string
	title: string
	score: number
	items: unknown
	createdAt: string
	project: {
		id: string
		code: string
		title: string
		status: ProjectStatusCode
	}
}
export type ClientRow = {
	id: string
	userId: string
	fullName: string
	email: string
	phone?: string | null
	companyName?: string | null
	leadSource: string
	createdAt: string
	paidTotal: string
	counters: {
		orders: number
		projects: number
		payments: number
		invoices: number
	}
}
export type OrderRow = {
	id: string
	code: string
	title: string
	description: string
	status: string
	requestedBudget?: string | null
	preferredStart?: string | null
	addressLine: string
	city: string
	phone: string
	createdAt: string
	clientName: string
	clientEmail: string
	project?: {
		id: string
		code: string
		title: string
		status: ProjectStatusCode
	} | null
}
export type CrmFunnelRow = {
	status: string
	count: number
	requestedBudget: string
}
export type ReportsOverview = {
	finance: {
		paidRevenue: string
		invoiceTotal: string
		outstanding: string
		paymentsCount: number
	}
	revenueTimeSeries: Array<{
		period: string
		paid: string
		paymentsCount: number
	}>
	revenueByProject: Array<{
		projectId: string
		code: string
		title: string
		paid: string
		paymentsCount: number
	}>
	procurement: {
		inventoryValue: string
		lowStockCount: number
		suppliersAtRisk: Array<{
			id: string
			name: string
			city: string
			reliability: number
		}>
	}
	projectHealth: Array<{
		id: string
		code: string
		title: string
		status: ProjectStatusCode
		clientName: string
		managerName?: string | null
		dueDate?: string | null
		openTasks: number
		overdueTasks: number
	}>
	statusMix: Array<{
		status: ProjectStatusCode
		count: number
	}>
}
export type UserRow = {
	id: string
	email: string
	fullName: string
	phone?: string | null
	title?: string | null
	isActive: boolean
	createdAt: string
	profileType: 'client' | 'staff' | 'system'
	role: {
		code: RoleCode
		name: string
		permissions: string[]
	}
}
export type RoleRow = {
	id: string
	code: RoleCode
	name: string
	description: string
	permissions: string[]
	usersCount: number
}
export type CalendarTask = {
	id: string
	title: string
	status: TaskStatusCode
	priority: number
	dueDate?: string | null
	projectCode: string
	projectTitle: string
	projectId: string
	assigneeName?: string | null
	teamName?: string | null
}
export type CalendarProject = {
	id: string
	code: string
	title: string
	status: ProjectStatusCode
	startDate?: string | null
	dueDate?: string | null
	clientName: string
}
export type CalendarData = {
	tasks: CalendarTask[]
	projects: CalendarProject[]
}
export type BoardTask = {
	id: string
	title: string
	description?: string | null
	status: TaskStatusCode
	priority: number
	dueDate?: string | null
	project: {
		id: string
		code: string
		title: string
		status: ProjectStatusCode
	}
	teamName?: string | null
	assigneeName?: string | null
}
export type BoardData = {
	total: number
	byStatus: Record<TaskStatusCode, BoardTask[]>
}
