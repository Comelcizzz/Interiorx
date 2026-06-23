import { validateContactPhone } from './contact-phone'

export type PortalOrderIntakeInput = {
	serviceSlug: string
	title: string
	description: string
	style?: string
	requestedBudget?: string
	preferredStart?: string
	addressLine: string
	city: string
	phone: string
	referencePhotoUrls?: string[]
}

const HTTP_URL = /^https?:\/\/.+/i

/** Мінімальний орієнтовний бюджет (грн). */
export const BUDGET_MIN_UAH = 1_000
/** Верхня межа, щоб відсікати явно абсурдні значення. */
export const BUDGET_MAX_UAH = 50_000_000

function digitsOnlyNumber(chunk: string): number | null {
	const n = Number(chunk.replace(/\D/g, ''))
	return Number.isFinite(n) && n > 0 ? n : null
}

/** Витягує суму в грн з рядка; null — якщо це лише текст без числа. */
export function extractBudgetAmountUah(value: string): number | null {
	const t = value.trim().replace(/\u00a0/g, ' ')
	if (!t) return null

	const compact = t.replace(/[\s,]/g, '')
	if (/^-?\d+(\.\d+)?$/.test(compact)) {
		const n = Number(compact)
		return Number.isFinite(n) ? n : null
	}

	const doMatch = t.match(/до\s*([\d\s.,]+)/i)
	if (doMatch) {
		return digitsOnlyNumber(doMatch[1])
	}

	const numbers: number[] = []
	for (const m of t.matchAll(/\d[\d\s.,]*/g)) {
		const n = digitsOnlyNumber(m[0])
		if (n) numbers.push(n)
	}
	if (numbers.length === 1) return numbers[0]
	if (numbers.length > 1) return Math.max(...numbers)
	return null
}

export function validateRequestedBudget(value: string): string | null {
	const t = value.trim()
	if (!t) return null
	if (t.length > 80) {
		return 'Бюджет — не більше 80 символів.'
	}

	const compact = t.replace(/[\s,]/g, '')
	const isPureNumeric = /^-?\d+(\.\d+)?$/.test(compact)
	const amount = extractBudgetAmountUah(t)

	if (isPureNumeric) {
		const n = Number(compact)
		if (!Number.isFinite(n) || n <= 0) {
			return 'Вкажіть позитивну суму бюджету в гривнях.'
		}
		if (n < BUDGET_MIN_UAH) {
			return `Орієнтовний бюджет — від ${BUDGET_MIN_UAH.toLocaleString('uk-UA')} грн.`
		}
		if (n > BUDGET_MAX_UAH) {
			return `Занадто велика сума (максимум ${BUDGET_MAX_UAH.toLocaleString('uk-UA')} грн).`
		}
		return null
	}

	if (amount !== null) {
		if (amount <= 0) {
			return 'Сума в бюджеті має бути позитивною.'
		}
		if (amount < BUDGET_MIN_UAH) {
			return `Сума в бюджеті — від ${BUDGET_MIN_UAH.toLocaleString('uk-UA')} грн.`
		}
		if (amount > BUDGET_MAX_UAH) {
			return `Занадто велика сума (максимум ${BUDGET_MAX_UAH.toLocaleString('uk-UA')} грн).`
		}
		return null
	}

	if (t.length < 3) {
		return 'Опишіть бюджет (наприклад: «до 450 000 грн») або вкажіть суму.'
	}
	if (/^[-\d.\s,]+$/.test(t)) {
		return 'Некоректний формат бюджету.'
	}
	return null
}

export function parseDateOnly(value: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
	if (!m) return null
	const y = Number(m[1])
	const mo = Number(m[2]) - 1
	const d = Number(m[3])
	if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null
	const date = new Date(y, mo, d)
	if (
		date.getFullYear() !== y ||
		date.getMonth() !== mo ||
		date.getDate() !== d
	) {
		return null
	}
	return date
}

function startOfLocalDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Бажаний старт: календарний день після сьогодні (сьогодні й минуле — заборонено). */
export function isPreferredStartAfterToday(value: string): boolean {
	const d = parseDateOnly(value)
	if (!d) return false
	return (
		startOfLocalDay(d).getTime() > startOfLocalDay(new Date()).getTime()
	)
}

export function minPreferredStartInputValue(): string {
	const next = new Date()
	next.setDate(next.getDate() + 1)
	const y = next.getFullYear()
	const m = String(next.getMonth() + 1).padStart(2, '0')
	const d = String(next.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

export function isReferencePhotoUrl(url: string): boolean {
	const u = url.trim()
	if (!u) return false
	if (u.startsWith('/uploads/')) {
		return /^\/uploads\/[^/]+$/i.test(u)
	}
	return HTTP_URL.test(u)
}

export function parseOrderPhotoUrls(text: string): string[] {
	return text
		.split(/[\n,]+/)
		.map((u) => u.trim())
		.filter(Boolean)
		.filter((u) => isReferencePhotoUrl(u))
		.slice(0, 12)
}

export function validatePortalOrderIntake(
	input: PortalOrderIntakeInput
): Record<string, string> {
	const errors: Record<string, string> = {}
	const serviceSlug = input.serviceSlug?.trim() ?? ''
	const title = input.title?.trim() ?? ''
	const description = input.description?.trim() ?? ''
	const addressLine = input.addressLine?.trim() ?? ''
	const city = input.city?.trim() ?? ''
	const phone = input.phone?.trim() ?? ''
	const style = input.style?.trim() ?? ''
	const requestedBudget = input.requestedBudget?.trim() ?? ''
	const preferredStart = input.preferredStart?.trim() ?? ''

	if (!serviceSlug) {
		errors.serviceSlug = 'Оберіть послугу з каталогу.'
	}
	if (title.length < 3) {
		errors.title = 'Назва заявки — мінімум 3 символи.'
	} else if (title.length > 160) {
		errors.title = 'Назва заявки — не більше 160 символів.'
	}
	if (description.length < 5) {
		errors.description = 'Опис — мінімум 5 символів.'
	} else if (description.length > 4000) {
		errors.description = 'Опис — не більше 4000 символів.'
	}
	if (addressLine.length < 3) {
		errors.addressLine = 'Адреса — мінімум 3 символи.'
	} else if (addressLine.length > 200) {
		errors.addressLine = 'Адреса — не більше 200 символів.'
	}
	if (city.length < 2) {
		errors.city = 'Місто — мінімум 2 символи.'
	} else if (city.length > 80) {
		errors.city = 'Місто — не більше 80 символів.'
	}
	const phoneErr = validateContactPhone(phone)
	if (phoneErr) {
		errors.phone = phoneErr
	}
	if (style && style.length > 80) {
		errors.style = 'Стиль — не більше 80 символів.'
	}
	const budgetErr = validateRequestedBudget(requestedBudget)
	if (budgetErr) {
		errors.requestedBudget = budgetErr
	}
	if (preferredStart) {
		if (!parseDateOnly(preferredStart)) {
			errors.preferredStart = 'Некоректна дата.'
		} else if (!isPreferredStartAfterToday(preferredStart)) {
			errors.preferredStart =
				'Бажаний старт не може бути сьогодні чи в минулому — оберіть дату з завтра.'
		}
	}
	const urls = input.referencePhotoUrls ?? []
	if (urls.length > 12) {
		errors.referencePhotoUrls = 'Не більше 12 посилань на фото.'
	}
	const invalidUrl = urls.find((u) => !isReferencePhotoUrl(u))
	if (invalidUrl) {
		errors.referencePhotoUrls =
			'Кожне референс-фото — посилання https://… або завантажений файл.'
	}
	return errors
}

export function hasValidationErrors(errors: Record<string, string>): boolean {
	return Object.keys(errors).length > 0
}
