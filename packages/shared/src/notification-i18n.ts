const projectStatusLabels: Record<string, string> = {
	DRAFT: 'Чернетка',
	ESTIMATION: 'Кошторис',
	DESIGN: 'Дизайн',
	APPROVED: 'Погоджено',
	IN_PROGRESS: 'У роботі',
	PAUSED: 'На паузі',
	COMPLETED: 'Завершено',
	CANCELLED: 'Скасовано',
	WARRANTY: 'Гарантія',
}
const orderStatusLabels: Record<string, string> = {
	NEW: 'Нова',
	QUALIFIED: 'Кваліфікована',
	CONVERTED: 'Конвертована',
	REJECTED: 'Відхилена',
}
const estimateStatusLabels: Record<string, string> = {
	DRAFT: 'Чернетка',
	PRICING: 'Розрахунок',
	PENDING_REVIEW: 'На внутрішній перевірці',
	SENT: 'Надіслано клієнту',
	APPROVED: 'Погоджено',
	REJECTED: 'Відхилено',
	EXPIRED: 'Прострочено',
}

/** Старі англомовні заголовки з попередніх версій seed/CRM */
const LEGACY_TITLE_UK: Record<string, string> = {
	'Project created': 'Проєкт створено',
	'Order received': 'Заявку отримано',
	'New CRM order': 'Нова заявка з CRM',
	'New portal order': 'Нова заявка з порталу',
	'Order cancelled': 'Заявку скасовано',
	'Order rejected': 'Заявку відхилено',
	'Sign contract': 'Підпишіть договір',
	'Estimate sent': 'Кошторис надіслано',
	'Estimate approved': 'Кошторис погоджено',
	'Payment received': 'Оплату отримано',
	'Receipt issued': 'Чек видано',
	'Materials replenished': 'Матеріали поповнено',
}

const BODY_REPLACEMENTS: Array<[RegExp, string]> = [
	[
		/Your request (.+?) is now project (.+)/i,
		'Вашу заявку $1 перетворено на проєкт $2',
	],
	[/We received (.+?) for (.+)/i, 'Ми отримали $1 на послугу «$2».'],
	[/Client cancelled request (.+)/i, 'Клієнт скасував заявку $1'],
	[/(.+?) created request (.+)/i, '$1 створив(ла) заявку $2'],
	[/(.+?) submitted request (.+?) for (.+)/i, '$1 подав(ла) заявку $2 на «$3»'],
	[/Request (.+?) was rejected/i, 'Заявку $1 відхилено'],
	[/Order (.+?) was rejected/i, 'Заявку $1 відхилено'],
	[
		/Project "(.+?)" has status (.+)\./i,
		'Проєкт «$1» має статус $2.',
	],
	[
		/Project "(.+?)" was added to the system\./i,
		'Проєкт «$1» додано до системи.',
	],
	[
		/40 new material SKUs added to the catalog\./i,
		'Нові позиції матеріалів додано до каталогу.',
	],
	[
		/5 new suppliers registered in the system\./i,
		'Нових постачальників зареєстровано в системі.',
	],
	[
		/All extended test data loaded successfully\./i,
		'Розширені тестові дані завантажено.',
	],
	[
		/Sign the contract for project (.+?): (.+)/i,
		'Підпишіть договір для проєкту $1: $2',
	],
]

function replaceStatusTokens(text: string): string {
	let out = text
	const maps = [
		projectStatusLabels,
		orderStatusLabels,
		estimateStatusLabels,
	] as const
	for (const map of maps) {
		for (const [code, label] of Object.entries(map)) {
			out = out.replace(new RegExp(`\\b${code}\\b`, 'g'), label)
		}
	}
	return out
}

export function localizeNotificationFields(
	title: string,
	body: string
): { title: string; body: string } {
	let t = LEGACY_TITLE_UK[title] ?? title
	let b = body
	for (const [pattern, replace] of BODY_REPLACEMENTS) {
		b = b.replace(pattern, replace)
	}
	b = replaceStatusTokens(b)
	// Phase 3 seed — змішаний заголовок
	if (t.includes('Phase 3 seed')) {
		t = t.replace(/Phase 3 seed/gi, 'завантаження даних')
	}
	if (b.includes('SKU')) {
		b = b.replace(/\bSKU\b/g, 'позиції')
	}
	return { title: t, body: b }
}

export function projectStatusLabel(code: string): string {
	return projectStatusLabels[code] ?? code
}
