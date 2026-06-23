export const AUDIT_ACTION_LABELS: Record<string, string> = {
	'payment.created': 'Створено платіж',
	'payment.paid': 'Платіж успішно проведено',
	'payment.failed': 'Платіж відхилено',
	'payment.refunded': 'Платіж повернуто (рефанд)',
	'receipt.created': 'Сформовано чек',
	'estimate.created': 'Створено кошторис',
	'estimate.approved': 'Кошторис погоджено',
	'estimate.rejected': 'Кошторис відхилено',
	'estimate.changes_requested': 'Клієнт запросив зміни до кошторису',
	'estimate.sent': 'Кошторис надіслано клієнту',
	'estimate.pricing': 'Кошторис передано на розрахунок',
	'estimate.pending_review': 'Кошторис очікує внутрішню перевірку',
	'task.created': 'Створено задачу',
	'task.status.updated': 'Оновлено статус задачі',
	'task.completed': 'Задачу виконано',
	'approval.decided': 'Зафіксовано рішення погодження',
	'change_request.created': 'Відкрито запит на зміну',
	'quality.score.updated': 'Оновлено оцінку якості',
	'project.created': 'Створено проєкт',
	'project.status_changed': 'Змінено статус проєкту',
	'project.team_updated': 'Оновлено команду проєкту',
	'project.team.updated': 'Оновлено команду проєкту',
	'project.photo_report.created': 'Додано фотозвіт',
	'crm.order.created': 'Створено заявку',
	'crm.order.qualified': 'Заявку взято в роботу',
	'crm.order.converted': 'Заявку перетворено на проєкт',
	'crm.order.rejected': 'Заявку відхилено',
	'crm.order.cancelled_by_client': 'Заявку скасовано клієнтом',
	'order.designer_claimed': 'Дизайнер взяв заявку',
	'review.submitted': 'Клієнт залишив відгук',
	'review.updated': 'Клієнт оновив відгук (на модерації)',
	'review.published': 'Відгук опубліковано',
	'seed.project.prepared': 'Підготовлено проєкт',
	'invoice.sent': 'Рахунок надіслано клієнту',
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
	Payment: 'Платіж',
	Receipt: 'Чек',
	Project: 'Проєкт',
	Estimate: 'Кошторис',
	Task: 'Задача',
	Review: 'Відгук',
	Order: 'Заявка',
	Approval: 'Погодження',
	ChangeRequest: 'Запит на зміну',
	QualityChecklist: 'Якість',
	SignedDocument: 'Документ',
	Invoice: 'Рахунок',
}

export function formatEntityType(entityType: string): string {
	return ENTITY_TYPE_LABELS[entityType] ?? entityType
}

export function formatAuditAction(action: string): string {
	return AUDIT_ACTION_LABELS[action] ?? action.replace(/[._]/g, ' · ')
}
