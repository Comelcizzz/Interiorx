import { Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { formatDate } from '@tailored/shared'
import { useMemo } from 'react'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicImage } from '@/components/PublicImage'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { publicApi } from '@/lib/api'
import { publicHeroImage } from '@/lib/public-visuals'
import type { PublicReviewsListResponse, ReviewHistogram } from '@/lib/types'
import {
	SearchableSelect,
	perPageSelectOptions,
} from '@/components/SearchableSelect'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

const emptyHistogram = (): ReviewHistogram => ({
	'1': 0,
	'2': 0,
	'3': 0,
	'4': 0,
	'5': 0,
})

export function ReviewsPage() {
	const { page, perPage, from, to, patchParams, searchParams } = useListQuery(10)
	const sort = searchParams.get('sort') ?? 'latest'
	const minRating = searchParams.get('minRating') ?? ''
	const filtersActive = !!(minRating || from || to || sort !== 'latest')

	const qs = useMemo(() => {
		const p = new URLSearchParams()
		p.set('page', String(page))
		p.set('perPage', String(perPage))
		p.set('sort', sort)
		if (minRating) p.set('minRating', minRating)
		if (from) p.set('from', from)
		if (to) p.set('to', to)
		return p.toString()
	}, [page, perPage, sort, minRating, from, to])
	const { data, loading, error } = useLoad(
		() => publicApi.get<PublicReviewsListResponse>(`/reviews?${qs}`).then((r) => r.data),
		[qs]
	)

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			from: values.from || null,
			to: values.to || null,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			from: null,
			to: null,
			minRating: null,
			sort: null,
		})
	}

	const histogram = data?.histogram ?? emptyHistogram()
	const histMax = Math.max(1, ...Object.values(histogram))
	const totalReviews = Object.values(histogram).reduce((a, b) => a + b, 0)

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-6xl space-y-6 px-6 py-8 pb-28">
				<PageHeader
					title="Відгуки клієнтів"
					description="Опубліковані відгуки після завершених проєктів: оцінки, фото, фільтри і пагінація."
				/>

				<Card className="overflow-hidden border-white/80 bg-white/82 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
					<CardContent className="p-0">
						<div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
							<div className="bg-slate-950 p-6 text-white">
								<div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
									Середня оцінка
								</div>
								<div className="mt-3 flex items-end gap-3">
									<div className="text-5xl font-black leading-none">
										{data?.avgRating != null ? data.avgRating : '—'}
									</div>
									<div className="pb-1 text-xl font-black text-white/70">/ 5</div>
								</div>
								<div className="mt-3 text-sm text-white/70">
									{totalReviews} опублікованих відгуків
								</div>
								<div className="mt-5 text-2xl tracking-[0.08em] text-amber-300">★★★★★</div>
							</div>

							<div className="grid gap-5 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
								<div>
									<div className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
										Розподіл оцінок
									</div>
									<div className="space-y-3">
										{(['5', '4', '3', '2', '1'] as const).map((star) => {
											const count = histogram[star] ?? 0
											const width = Math.max(4, Math.round((count / histMax) * 100))
											return (
												<div key={star} className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-3 text-sm">
													<div className="font-black text-slate-700">{star}★</div>
													<div className="h-3 overflow-hidden rounded-full bg-slate-100">
														<div className="h-full rounded-full bg-amber-400" style={{ width: `${width}%` }} />
													</div>
													<div className="text-right font-black text-slate-700">{count}</div>
												</div>
											)
										})}
									</div>
								</div>

								<ListQueryBar
									values={{ status: '', q: '', from, to, sort: 'latest' }}
									onApply={applyFilters}
									onReset={resetFilters}
									showSearch={false}
									showSort={false}
									extraFields={
										<>
											<label className="block min-w-[160px]">
												<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
													Мінімальна оцінка
												</span>
												<SearchableSelect
													value={minRating}
													onChange={(v) =>
														patchParams({
															page: '1',
															minRating: v || null,
														})
													}
													options={[
														{ value: '', label: 'Будь-яка' },
														{ value: '5', label: '5 зірок' },
														{ value: '4', label: '4+ зірки' },
														{ value: '3', label: '3+ зірки' },
														{ value: '2', label: '2+ зірки' },
														{ value: '1', label: '1+ зірка' },
													]}
												/>
											</label>
											<label className="block min-w-[160px]">
												<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
													Сортування
												</span>
												<SearchableSelect
													value={sort}
													onChange={(v) =>
														patchParams({ sort: v, page: '1' })
													}
													options={[
														{ value: 'latest', label: 'Спочатку нові' },
														{ value: 'oldest', label: 'Спочатку старі' },
														{ value: 'rating', label: 'Найвища оцінка' },
														{
															value: 'rating_asc',
															label: 'Найнижча оцінка',
														},
													]}
												/>
											</label>
										</>
									}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				{loading ? <p className="text-sm text-slate-500">Завантажуємо відгуки...</p> : null}
				{error ? <p className="text-sm text-rose-600">{error}</p> : null}
				{!loading && !error && data?.items.length === 0 ? (
					<p className="text-sm text-slate-600">
						{filtersActive
							? 'Нічого не знайдено за обраними фільтрами'
							: 'Відгуків поки немає.'}
					</p>
				) : null}

				<div className="grid gap-4 md:grid-cols-2">
					{data?.items.map((review) => (
						<Card key={review._id ?? review.title} className="bg-white/84">
							<CardContent className="p-5">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-sm font-black text-amber-600">
										{'★'.repeat(Math.max(1, review.rating))}
									</div>
									<div className="text-xs text-slate-500">
										{review.reviewerName ? `${review.reviewerName} · ` : null}
										{review.publishedAt ? formatDate(review.publishedAt) : 'Нещодавно'}
									</div>
								</div>
								<h3 className="mt-2 text-lg font-black">{review.title}</h3>
								<p className="mt-2 text-sm leading-6 text-slate-600">{review.body}</p>
								{review.photoUrls?.length ? (
									<div className="mt-3 grid grid-cols-2 gap-2">
										{review.photoUrls.slice(0, 2).map((url) => (
											<PublicImage
												key={url}
												src={url}
												fallback={publicHeroImage}
												alt={review.title}
												className="h-32 w-full rounded-xl object-cover"
											/>
										))}
									</div>
								) : null}
							</CardContent>
						</Card>
					))}
				</div>

				{data ? (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/80 bg-white/70 px-4 py-3">
						<label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
							На сторінці
							<SearchableSelect
								className="w-[100px]"
								value={String(perPage)}
								onChange={(v) =>
									patchParams({ perPage: v, page: '1' })
								}
								options={perPageSelectOptions([4, 8, 10, 12, 24])}
							/>
						</label>
						<div className="flex items-center gap-2">
							<Button type="button" variant="ghost" disabled={page <= 1} onClick={() => patchParams({ page: String(page - 1) })}>
								Назад
							</Button>
							<span className="text-sm font-semibold text-slate-500">
								Сторінка {data.page} · усього {data.total}
							</span>
							<Button
								type="button"
								variant="ghost"
								disabled={data.page * data.perPage >= data.total}
								onClick={() => patchParams({ page: String(page + 1) })}
							>
								Далі
							</Button>
						</div>
					</div>
				) : null}
			</main>
		</div>
	)
}
