import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ListSort } from '@tailored/shared'

export type ListQueryState = {
	page: number
	perPage: number
	status: string
	q: string
	from: string
	to: string
	sort: ListSort
}

export function useListQuery(defaultPerPage = 10) {
	const [searchParams, setSearchParams] = useSearchParams()

	const state = useMemo((): ListQueryState => {
		const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
		const perPageRaw = Number(searchParams.get('perPage') ?? String(defaultPerPage)) || defaultPerPage
		const perPage = Math.min(100, Math.max(5, perPageRaw))
		const sortRaw = searchParams.get('sort') ?? 'latest'
		const sort: ListSort = sortRaw === 'oldest' ? 'oldest' : 'latest'
		return {
			page,
			perPage,
			status: (searchParams.get('status') ?? '').trim(),
			q: (searchParams.get('q') ?? '').trim(),
			from: (searchParams.get('from') ?? '').trim(),
			to: (searchParams.get('to') ?? '').trim(),
			sort,
		}
	}, [searchParams, defaultPerPage])

	const queryString = useMemo(() => {
		const qs = new URLSearchParams()
		qs.set('page', String(state.page))
		qs.set('perPage', String(state.perPage))
		if (state.status) qs.set('status', state.status)
		if (state.q) qs.set('q', state.q)
		if (state.from) qs.set('from', state.from)
		if (state.to) qs.set('to', state.to)
		if (state.sort && state.sort !== 'latest') qs.set('sort', state.sort)
		else if (state.sort === 'latest') qs.set('sort', 'latest')
		return qs.toString()
	}, [state])

	function patchParams(next: Record<string, string | null>) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev)
				for (const [k, v] of Object.entries(next)) {
					if (v === null || v === '') n.delete(k)
					else n.set(k, v)
				}
				return n
			},
			{ replace: true }
		)
	}

	return { ...state, queryString, patchParams, searchParams }
}
