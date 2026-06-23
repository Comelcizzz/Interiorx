const BUDGET_MIN_UAH = 1_000
const BUDGET_MAX_UAH = 50_000_000

function digitsOnlyNumber(chunk: string): number | null {
	const n = Number(chunk.replace(/\D/g, ''))
	return Number.isFinite(n) && n > 0 ? n : null
}

function extractBudgetAmountUah(value: string): number | null {
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
