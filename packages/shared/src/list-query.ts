export const listSortValues = ['latest', 'oldest'] as const
export type ListSort = (typeof listSortValues)[number]

export const sortLabels: Record<ListSort, string> = {
	latest: 'Новіші спочатку',
	oldest: 'Старіші спочатку',
}
