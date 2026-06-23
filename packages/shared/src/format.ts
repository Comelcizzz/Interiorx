export const FORMAT_DEFAULT_LOCALE = 'uk-UA' as const
export function formatNumber(
	value: string | number,
	locale: string = FORMAT_DEFAULT_LOCALE
): string {
	const n = typeof value === 'string' ? Number(value) : value
	if (!Number.isFinite(n)) return String(value)
	return new Intl.NumberFormat(locale).format(n)
}
export function formatCurrency(
	value: string | number,
	currency = 'UAH',
	locale: string = FORMAT_DEFAULT_LOCALE
): string {
	const n = typeof value === 'string' ? Number(value) : value
	if (!Number.isFinite(n)) return String(value)
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		maximumFractionDigits: 0,
	}).format(n)
}
export function formatDate(
	value: Date | string | number,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
	locale: string = FORMAT_DEFAULT_LOCALE
): string {
	const d = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(d.getTime())) return ''
	return d.toLocaleDateString(locale, options)
}
export function formatDateTime(
	value: Date | string | number,
	options: Intl.DateTimeFormatOptions = {
		dateStyle: 'short',
		timeStyle: 'short',
	},
	locale: string = FORMAT_DEFAULT_LOCALE
): string {
	const d = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(d.getTime())) return ''
	return d.toLocaleString(locale, options)
}
