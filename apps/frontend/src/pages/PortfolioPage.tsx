import { Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { Link } from 'react-router-dom'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicImage } from '@/components/PublicImage'
import { publicApi } from '@/lib/api'
import { portfolioImage } from '@/lib/public-visuals'
import type { Paginated, PortfolioItemRow } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

export function PortfolioPage() {
	const { page, perPage, q, from, to, sort, queryString, patchParams } =
		useListQuery(10)
	const filtersActive = !!(q || from || to || sort !== 'latest')
	const { data, loading, error } = useLoad(
		() =>
			publicApi
				.get<Paginated<PortfolioItemRow>>(`/portfolio?${queryString}`)
				.then((r) => r.data),
		[queryString]
	)

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			q: values.q || null,
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			q: null,
			from: null,
			to: null,
			sort: null,
		})
	}

	const pageCount = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-7xl space-y-7 px-6 py-8">
				<div className="flex flex-wrap items-end justify-between gap-5">
					<PageHeader
						title="Портфоліо"
						description="Завершені інтерʼєри, фасади, комерційні простори й ремонтні проєкти."
					/>
				</div>

				<ListQueryBar
					values={{ status: '', q, from, to, sort }}
					onApply={applyFilters}
					onReset={resetFilters}
					showSearch
					searchPlaceholder="Пошук за містом, стилем або типом простору..."
				/>

				{loading ? (
					<p className="text-sm text-slate-500">Завантажуємо портфоліо...</p>
				) : null}
				{error ? <p className="text-sm text-rose-600">{error}</p> : null}
				{!loading && !error && data?.items.length === 0 ? (
					<p className="text-sm text-slate-600">
						{filtersActive
							? 'Нічого не знайдено за обраними фільтрами'
							: 'Портфоліо поки порожнє.'}
					</p>
				) : null}

				<div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
					{data?.items.map((item) => (
						<Card
							key={item.slug}
							className="group flex h-full overflow-hidden border-white/80 bg-white/82 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
						>
							<div className="flex min-h-full w-full flex-col">
								<div className="relative h-60 overflow-hidden bg-slate-200">
									<PublicImage
										src={item.coverImageUrl}
										fallback={portfolioImage(item.slug)}
										alt={item.title}
										className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
									/>
									<div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-600 backdrop-blur">
										{item.category}
									</div>
								</div>
								<CardContent className="flex flex-1 flex-col p-5">
									<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
										{item.style}
									</div>
									<h3 className="mt-2 text-xl font-black leading-tight text-slate-950">
										{item.title}
									</h3>
									<p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
										{item.summary}
									</p>
									<div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
										<Link
											className="text-sm font-black text-[var(--tds-primary)]"
											to={`/portfolio/${item.slug}`}
										>
											Дивитись кейс
										</Link>
										<Link
											className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
											to={`/register?project=${encodeURIComponent(item.slug)}`}
										>
											Хочу подібний
										</Link>
									</div>
								</CardContent>
							</div>
						</Card>
					))}
				</div>

				{data ? (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/80 bg-white/70 px-4 py-3">
						<Button
							type="button"
							variant="ghost"
							disabled={page <= 1}
							onClick={() => patchParams({ page: String(page - 1) })}
						>
							Назад
						</Button>
						<span className="text-sm font-semibold text-slate-600">
							Сторінка {data.page} з {pageCount} · показуємо {perPage} · усього {data.total}
						</span>
						<Button
							type="button"
							variant="ghost"
							disabled={page >= pageCount}
							onClick={() => patchParams({ page: String(page + 1) })}
						>
							Далі
						</Button>
					</div>
				) : null}
			</main>
		</div>
	)
}
