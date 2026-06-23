import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
	PageHeader,
	SkeletonTable,
} from '@tailored/ui'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { formatDateTime } from '@tailored/shared'
import { MessageSquareQuote } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getApi, mediaUrl, patchApi } from '@/lib/api'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

type ModerationReview = {
	id: string
	rating: number
	title: string
	body: string
	status: string
	photoUrls: string[]
	reviewerName: string | null
	clientDisplayName: string | null
	projectId: string | null
	projectCode: string | null
	projectTitle: string | null
	publishedAt?: string
	createdAt?: string
}
type ListResponse = {
	items: ModerationReview[]
	total: number
	page: number
	perPage: number
}

const moderationStatusOptions = [
	{ value: 'PENDING', label: 'Очікує' },
	{ value: 'PUBLISHED', label: 'Опубліковано' },
	{ value: 'HIDDEN', label: 'Приховано' },
	{ value: 'ALL', label: 'Усі' },
]

const moderationStatusLabels: Record<string, string> = {
	PENDING: 'На модерації',
	PUBLISHED: 'Опубліковано',
	HIDDEN: 'Приховано',
}

function truncate(s: string, max: number) {
	if (s.length <= max) return s
	return `${s.slice(0, max - 1)}…`
}
function statusTone(s: string): 'neutral' | 'blue' | 'green' | 'amber' | 'red' {
	if (s === 'PENDING') return 'amber'
	if (s === 'PUBLISHED') return 'green'
	if (s === 'HIDDEN') return 'neutral'
	return 'neutral'
}
export function WorkspaceReviewsModerationPage() {
	const { page, perPage, status: statusRaw, from, to, sort, patchParams } =
		useListQuery(20)
	const status = statusRaw || 'PENDING'
	const filtersActive = !!(
		statusRaw ||
		from ||
		to ||
		sort !== 'latest'
	)
	const [busyId, setBusyId] = useState<string | null>(null)
	const qs = useMemo(() => {
		const p = new URLSearchParams()
		p.set('status', status)
		p.set('page', String(page))
		p.set('perPage', String(perPage))
		if (from) p.set('from', from)
		if (to) p.set('to', to)
		if (sort) p.set('sort', sort)
		return p.toString()
	}, [status, page, perPage, from, to, sort])
	const { data, loading, error, reload } = useLoad(
		() => getApi<ListResponse>(`/moderation/reviews?${qs}`),
		[qs]
	)

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			status: values.status || null,
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			status: null,
			from: null,
			to: null,
			sort: null,
		})
	}

	async function publish(id: string) {
		setBusyId(id)
		try {
			await patchApi(`/moderation/reviews/${id}/publish`, {})
			await reload()
		} finally {
			setBusyId(null)
		}
	}
	async function hide(id: string) {
		setBusyId(id)
		try {
			await patchApi(`/moderation/reviews/${id}/hide`, {})
			await reload()
		} finally {
			setBusyId(null)
		}
	}
	return (
		<div className="space-y-6">
			<PageHeader
				title="Модерація відгуків"
				description="Публікуйте відгуки клієнтів на публічній сторінці або приховуйте їх. Очікуючі модерації не видно на сайті."
			/>

			<ListQueryBar
				values={{ status: statusRaw, q: '', from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={moderationStatusOptions}
				showSearch={false}
			/>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
							<MessageSquareQuote className="h-4 w-4 text-[var(--tds-primary)]" />
							Відгуки
						</div>
						<Badge tone="neutral">{data?.total ?? 0} усього</Badge>
					</div>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					{error ? <ErrorState message={error} /> : null}
					{loading ? <SkeletonTable rows={6} cols={5} /> : null}
					{!loading && !error && (data?.items.length ?? 0) === 0 ? (
						<EmptyState
							title={
								filtersActive
									? 'Нічого не знайдено за обраними фільтрами'
									: 'Відгуків немає'
							}
							description={
								filtersActive
									? undefined
									: 'За цим фільтром нічого не знайдено.'
							}
						/>
					) : null}
					{!loading && !error && data && data.items.length > 0 ? (
						<table className="w-full min-w-[880px] border-collapse text-left text-sm">
							<thead>
								<tr className="border-b border-white/60 text-xs font-bold uppercase tracking-[0.1em] text-[var(--tds-muted)]">
									<th className="py-3 pr-4">Review</th>
									<th className="py-3 pr-4">Client</th>
									<th className="py-3 pr-4">Project</th>
									<th className="py-3 pr-4">Status</th>
									<th className="py-3 pr-4 text-right">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{data.items.map((r) => (
									<tr
										key={r.id}
										className="border-b border-white/40 align-top"
									>
										<td className="py-4 pr-4">
											<div className="flex gap-3">
												<div className="flex shrink-0 gap-1">
													{r.photoUrls
														.slice(0, 5)
														.map((u) => (
															<img
																key={u}
																src={mediaUrl(
																	u
																)}
																alt=""
																className="h-12 w-12 rounded-lg border border-white/60 object-cover"
															/>
														))}
												</div>
												<div className="min-w-0 space-y-1">
													<div className="flex flex-wrap items-center gap-2">
														<span className="font-bold text-[var(--tds-ink)]">
															{r.title}
														</span>
														<Badge tone="amber">
															{r.rating}★
														</Badge>
													</div>
													<p className="text-[var(--tds-muted)]">
														{truncate(r.body, 220)}
													</p>
													<p className="text-xs text-[var(--tds-muted)]">
														{r.createdAt
															? formatDateTime(
																	r.createdAt
																)
															: '—'}
													</p>
												</div>
											</div>
										</td>
										<td className="py-4 pr-4 text-[var(--tds-ink)]">
											<div className="font-medium">
												{r.clientDisplayName ??
													r.reviewerName ??
													'—'}
											</div>
											{r.reviewerName &&
											r.clientDisplayName &&
											r.reviewerName !==
												r.clientDisplayName ? (
												<div className="text-xs text-[var(--tds-muted)]">
													as {r.reviewerName}
												</div>
											) : null}
										</td>
										<td className="py-4 pr-4">
											{r.projectCode ? (
												<>
													<div className="font-mono text-xs text-[var(--tds-ink)]">
														{r.projectCode}
													</div>
													<div className="text-xs text-[var(--tds-muted)]">
														{r.projectTitle ?? ''}
													</div>
												</>
											) : (
												<span className="text-[var(--tds-muted)]">
													—
												</span>
											)}
										</td>
										<td className="py-4 pr-4">
											<Badge tone={statusTone(r.status)}>
												{moderationStatusLabels[r.status] ?? r.status}
											</Badge>
										</td>
										<td className="py-4 pr-4 text-right">
											<div className="flex flex-wrap justify-end gap-2">
												{r.status !== 'PUBLISHED' ? (
													<Button
														className="text-sm"
														disabled={
															busyId === r.id
														}
														onClick={() =>
															publish(r.id)
														}
													>
														Опублікувати
													</Button>
												) : null}
												{r.status !== 'HIDDEN' ? (
													<Button
														variant="secondary"
														className="text-sm"
														disabled={
															busyId === r.id
														}
														onClick={() =>
															hide(r.id)
														}
													>
														Приховати
													</Button>
												) : null}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					) : null}
					{data && data.total > perPage ? (
						<div className="mt-4 flex items-center justify-between gap-2 border-t border-white/50 pt-4">
							<Button
								variant="secondary"
								className="text-sm"
								disabled={page <= 1}
								onClick={() =>
									patchParams({
										page: String(Math.max(1, page - 1)),
									})
								}
							>
								Previous
							</Button>
							<span className="text-xs text-[var(--tds-muted)]">
								Page {page} of{' '}
								{Math.max(1, Math.ceil(data.total / perPage))}
							</span>
							<Button
								variant="secondary"
								className="text-sm"
								disabled={
									page >= Math.ceil(data.total / perPage)
								}
								onClick={() =>
									patchParams({ page: String(page + 1) })
								}
							>
								Next
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
