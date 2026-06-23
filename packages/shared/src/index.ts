
export const roleLabels = {
	ADMIN: 'Адміністратор',
	PROJECT_MANAGER: 'Менеджер проєкту',
	DESIGNER: 'Дизайнер',
	BRIGADIR: 'Бригадир',
	CLIENT: 'Клієнт',
} as const

export function roleLabel(role: string): string {
	return roleLabels[role as keyof typeof roleLabels] ?? role
}
export const projectStatusLabels = {
	DRAFT: 'Чернетка',
	ESTIMATION: 'Кошторис',
	DESIGN: 'Дизайн',
	APPROVED: 'Погоджено',
	IN_PROGRESS: 'У роботі',
	PAUSED: 'На паузі',
	COMPLETED: 'Завершено',
	CANCELLED: 'Скасовано',
	WARRANTY: 'Гарантія',
} as const
export const taskStatusLabels: Record<string, string> = {
	BACKLOG: 'Заплановано',
	READY: 'Готово до старту',
	IN_PROGRESS: 'У роботі',
	BLOCKED: 'Заблоковано',
	REVIEW: 'На перевірці',
	DONE: 'Виконано',
}
export const paymentStatusLabels = {
	PENDING: 'Очікує оплати',
	PAID: 'Оплачено',
	FAILED: 'Не пройшло',
	REFUNDED: 'Повернено',
} as const
export const estimateStatusLabels: Record<string, string> = {
	DRAFT: 'Чернетка',
	PRICING: 'Розрахунок',
	PENDING_REVIEW: 'На внутрішній перевірці',
	SENT: 'Надіслано клієнту',
	APPROVED: 'Погоджено',
	REJECTED: 'Відхилено',
	EXPIRED: 'Прострочено',
}
export const orderStatusLabels: Record<string, string> = {
	NEW: 'Нова',
	QUALIFIED: 'Кваліфікована',
	CONVERTED: 'Конвертована',
	REJECTED: 'Відхилена',
}
export const receiptStatusLabels: Record<string, string> = {
	ISSUED: 'Видано',
	VOIDED: 'Анульовано',
	VOID: 'Анульовано',
}
export const invoiceStatusLabels: Record<string, string> = {
	DRAFT: 'Чернетка',
	SENT: 'Надіслано',
	PAID: 'Оплачено',
	OVERDUE: 'Прострочено',
	CANCELLED: 'Скасовано',
}
export const portalProjectTabLabels: Record<string, string> = {
	Overview: 'Огляд',
	Estimates: 'Кошториси',
	Schedule: 'Графік',
	Quality: 'Якість',
	Photos: 'Фото',
	Payments: 'Оплати',
	Activity: 'Події',
}
export type RoleCode = keyof typeof roleLabels

export {
	normalizeWorkspaceRole,
	WORKSPACE_CORE_ROLES,
	isWorkspaceCoreRole,
	type WorkspaceCoreRole,
	type WorkspaceRoleCode,
} from './workspace-roles'
export type ProjectStatusCode = keyof typeof projectStatusLabels
export type PaymentStatusCode = keyof typeof paymentStatusLabels
export * from './format'
export * from './audit-actions'
export * from './notification-i18n'
export * from './project-status-flow'
export * from './list-query'
export * from './order-intake'
export * from './ua-phone'
export * from './contact-phone'
