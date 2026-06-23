import { escapeRegExp } from './regex'

export type ListQueryInput = {
	page?: number
	perPage?: number
	status?: string
	q?: string
	from?: string
	to?: string
	sort?: string
}

export type PaginationResult = {
	page: number
	perPage: number
	skip: number
}

export function parsePagination(
	page?: number,
	perPage?: number,
	defaultPerPage = 20,
	maxPerPage = 100
): PaginationResult {
	const p = page && page > 0 ? page : 1
	const pp =
		perPage && perPage > 0 ? Math.min(perPage, maxPerPage) : defaultPerPage
	return { page: p, perPage: pp, skip: (p - 1) * pp }
}

export function buildDateRangeFilter(
	field: string,
	from?: string,
	to?: string
): Record<string, Date> | undefined {
	const f = from?.trim()
	const t = to?.trim()
	if (!f && !t) return undefined
	const range: Record<string, Date> = {}
	if (f) {
		const start = new Date(f)
		if (!Number.isNaN(start.getTime())) range.$gte = start
	}
	if (t) {
		const end = new Date(t)
		if (!Number.isNaN(end.getTime())) {
			end.setHours(23, 59, 59, 999)
			range.$lte = end
		}
	}
	if (Object.keys(range).length === 0) return undefined
	return range
}

export function applyDateRangeToWhere(
	where: Record<string, unknown>,
	field: string,
	from?: string,
	to?: string
) {
	const range = buildDateRangeFilter(field, from, to)
	if (range) where[field] = range
}

export function resolveSort(
	sort: string | undefined,
	defaultField = 'createdAt'
): Record<string, 1 | -1> {
	const s = sort?.trim().toLowerCase()
	if (s === 'oldest') return { [defaultField]: 1 }
	return { [defaultField]: -1 }
}

export function applyStatusFilter(
	where: Record<string, unknown>,
	status?: string
) {
	const s = status?.trim()
	if (s) where.status = s
}

/** Case-insensitive regex OR on string fields. */
export function applySearchOr(
	where: Record<string, unknown>,
	q: string | undefined,
	fields: string[]
) {
	const term = q?.trim()
	if (!term || fields.length === 0) return
	const rx = new RegExp(escapeRegExp(term), 'i')
	where.$or = fields.map((field) => ({ [field]: rx }))
}
