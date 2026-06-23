import { Button, Card, CardContent, Input, PageHeader } from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '@/lib/api'
import type { Paginated, PublicServiceRow } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
export function ServicesPage() {
	const [q, setQ] = useState('')
	const [query, setQuery] = useState('')
	const [page, setPage] = useState(1)
	const qs = useMemo(() => {
		const params = new URLSearchParams()
		params.set('page', String(page))
		params.set('perPage', '12')
		if (query) params.set('q', query)
		return params.toString()
	}, [page, query])
	const { data, loading, error } = useLoad(
		() =>
			publicApi
				.get<Paginated<PublicServiceRow>>(`/catalog/services?${qs}`)
				.then((r) => r.data),
		[qs]
	)
	function submit(event: FormEvent) {
		event.preventDefault()
		setPage(1)
		setQuery(q.trim())
	}
	return (
		<div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
			<PageHeader
				title="Services"
				description="Browse INTERIORIX design and renovation service packages."
			/>
			<form onSubmit={submit} className="flex gap-2">
				<Input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search services..."
				/>
				<Button type="submit">Search</Button>
			</form>
			{loading ? (
				<p className="text-sm text-slate-500">Loading services...</p>
			) : null}
			{error ? <p className="text-sm text-rose-600">{error}</p> : null}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{data?.items.map((service) => (
					<Card key={service.slug}>
						<CardContent>
							<div className="text-xs uppercase tracking-wide text-slate-500">
								{service.slug}
							</div>
							<h3 className="mt-1 text-lg font-bold">
								{service.name}
							</h3>
							<p className="mt-2 text-sm text-slate-600">
								{service.shortDescription}
							</p>
							<p className="mt-3 text-sm font-semibold">
								From {formatNumber(service.basePrice)} UAH /{' '}
								{service.priceUnit}
							</p>
							<Link
								className="mt-3 inline-block text-sm font-semibold text-[var(--tds-primary)]"
								to={`/services/${service.slug}`}
							>
								View details
							</Link>
						</CardContent>
					</Card>
				))}
			</div>
			{data ? (
				<div className="flex items-center justify-between">
					<Button
						type="button"
						variant="ghost"
						disabled={data.page <= 1}
						onClick={() => setPage((p) => p - 1)}
					>
						Previous
					</Button>
					<span className="text-sm text-slate-500">
						Page {data.page} · Total {data.total}
					</span>
					<Button
						type="button"
						variant="ghost"
						disabled={data.page * data.perPage >= data.total}
						onClick={() => setPage((p) => p + 1)}
					>
						Next
					</Button>
				</div>
			) : null}
		</div>
	)
}
