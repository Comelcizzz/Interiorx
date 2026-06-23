import { formatCurrency } from '@tailored/shared'

/** v1 — основний кошторис проєкту; v2+ — додаткові (допрацювання, зміни). */
export function estimateKindLabel(version: number): string {
	if (version <= 1) return 'Основний кошторис'
	if (version === 2) return 'Додатковий кошторис'
	return `Додатковий кошторис (${version - 1}-й)`
}

export function estimateKindShort(version: number): string {
	if (version <= 1) return 'Основний'
	return version === 2 ? 'Додатковий' : `Додатковий ${version - 1}`
}

export function estimateCountSummary(versions: number[]): string {
	const sorted = [...versions].sort((a, b) => a - b)
	const additional = sorted.filter((v) => v > 1).length
	if (additional === 0) return 'Основний кошторис'
	if (additional === 1) return 'Основний + 1 додатковий'
	return `Основний + ${additional} додаткових`
}

export function invoiceNumberForEstimate(
	projectCode: string,
	version: number
): string {
	return `${projectCode}-INV-${String(version).padStart(3, '0')}`
}

export function findInvoiceForEstimate<
	T extends { number: string; status: string },
>(invoices: T[], projectCode: string, version: number): T | undefined {
	const num = invoiceNumberForEstimate(projectCode, version)
	return invoices.find((i) => i.number === num)
}

/** Клієнт може оплатити лише погоджений кошторис з рахунком «до оплати». */
export function canClientPayEstimate(
	estimateStatus: string,
	estimateVersion: number,
	invoices: Array<{ number: string; status: string }>,
	projectCode: string
): boolean {
	if (estimateStatus !== 'APPROVED') return false
	const inv = findInvoiceForEstimate(
		invoices,
		projectCode,
		estimateVersion
	)
	if (!inv) return false
	return inv.status === 'SENT' || inv.status === 'OVERDUE'
}

export function clientInvoicePayState(
	estimateStatus: string,
	estimateVersion: number,
	invoices: Array<{ number: string; status: string }>,
	projectCode: string
): 'none' | 'awaiting_approval' | 'awaiting_payment' | 'paid' {
	if (estimateStatus === 'SENT') return 'awaiting_approval'
	if (estimateStatus !== 'APPROVED') return 'none'
	const inv = findInvoiceForEstimate(
		invoices,
		projectCode,
		estimateVersion
	)
	if (!inv) return 'none'
	if (inv.status === 'PAID') return 'paid'
	if (inv.status === 'SENT' || inv.status === 'OVERDUE')
		return 'awaiting_payment'
	return 'none'
}

export function sumApprovedEstimateTotals(
	estimates: Array<{ status: string; total: string | number }>
): number {
	return estimates
		.filter((e) => e.status === 'APPROVED')
		.reduce((sum, e) => sum + (Number.parseFloat(String(e.total)) || 0), 0)
}

/** Сума всіх погоджених кошторисів (основний + додаткові). */
export function formatApprovedEstimatesBudget(
	estimates: Array<{ status: string; total: string | number }>,
	fallbackApproved?: string | null
): string | null {
	const sum = sumApprovedEstimateTotals(estimates)
	if (sum > 0) return formatCurrency(sum)
	if (fallbackApproved) {
		const n = Number.parseFloat(fallbackApproved)
		if (Number.isFinite(n) && n > 0) return formatCurrency(n)
	}
	return null
}

/** Бюджет із заявки клієнта (при конвертації ліда в проєкт). */
export function formatClientRequestedBudget(
	clientRequestedBudget?: string | null,
	budgetPlanned?: string | null
): string | null {
	const raw = (clientRequestedBudget ?? budgetPlanned ?? '').trim()
	if (!raw || raw === '0') return null
	const n = Number.parseFloat(raw)
	if (!Number.isFinite(n) || n <= 0) return null
	return formatCurrency(raw)
}
