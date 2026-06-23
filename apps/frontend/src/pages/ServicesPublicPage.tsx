import { Button, Card, CardContent } from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import { Link } from 'react-router-dom'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicImage } from '@/components/PublicImage'
import { publicApi } from '@/lib/api'
import { serviceImage } from '@/lib/public-visuals'
import type { Paginated, PublicServiceRow } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

const processSteps = [
	'Первинний бриф',
	'Заміри',
	'Кошторис',
	'Дизайн-пакет',
	'Закупівлі',
	'Контроль робіт',
]

function priceUnitLabel(unit: string) {
	return unit === 'project' ? 'проєкт' : unit
}

export function ServicesPublicPage() {
	const { page, perPage, q, from, to, sort, queryString, patchParams } =
		useListQuery(12)
	const filtersActive = !!(q || from || to || sort !== 'latest')
	const { data, loading, error } = useLoad(
		() =>
			publicApi
				.get<Paginated<PublicServiceRow>>(`/catalog/services?${queryString}`)
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

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-7xl space-y-10 px-5 pb-20 pt-8 lg:px-8">
				<section className="grid gap-6 overflow-hidden rounded-[34px] border border-white/75 bg-white/70 p-6 shadow-[0_24px_80px_rgba(17,24,39,0.10)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_420px] lg:p-8">
					<div>
						<div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--tds-primary)]">
							Каталог послуг
						</div>
						<h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight lg:text-6xl">
							Оберіть дизайн-пакет і перетворіть його на керовану заявку.
						</h1>
						<p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
							Кожна послуга проходить повний шлях: заявка клієнта, дані обʼєкта,
							заміри, кошторис, погодження, закупівлі, оплата та історія чеків.
						</p>
						<div className="mt-7">
							<ListQueryBar
								values={{ status: '', q, from, to, sort }}
								onApply={applyFilters}
								onReset={resetFilters}
								showSearch
								searchPlaceholder="Пошук за кімнатою, матеріалом, фасадом, світлом..."
							/>
						</div>
					</div>
					<div className="rounded-[28px] bg-slate-950 p-5 text-white">
						<div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
							Як це працює
						</div>
						<div className="mt-5 grid gap-3">
							{processSteps.map((step, index) => (
								<div
									key={step}
									className="flex items-center gap-3 rounded-[18px] bg-white/8 px-3 py-3"
								>
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
										{index + 1}
									</span>
									<span className="text-sm font-semibold">{step}</span>
								</div>
							))}
						</div>
					</div>
				</section>

				{loading ? <p className="text-sm text-slate-500">Завантажуємо послуги...</p> : null}
				{error ? (
					<p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						Послуги тимчасово недоступні.
					</p>
				) : null}
				{!loading && !error && data?.items.length === 0 ? (
					<p className="text-sm text-slate-600">
						{filtersActive
							? 'Нічого не знайдено за обраними фільтрами'
							: 'Послуг не знайдено.'}
					</p>
				) : null}

				<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{data?.items.map((service) => (
						<Card key={service.slug} className="group overflow-hidden rounded-[26px]">
							<div className="relative h-56 overflow-hidden bg-slate-100">
								<PublicImage
									src={service.heroImageUrl}
									fallback={serviceImage(service.slug)}
									alt={service.name}
									className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
								/>
								<div className="absolute left-4 top-4 rounded-full bg-white/88 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-700 backdrop-blur">
									{service.category ?? 'Дизайн'}
								</div>
							</div>
							<CardContent className="p-5">
								<div className="flex items-start justify-between gap-4">
									<div>
										<div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
											{service.slug}
										</div>
										<h2 className="mt-1 text-xl font-black text-slate-950">
											{service.name}
										</h2>
									</div>
									<div className="shrink-0 rounded-2xl bg-emerald-50 px-3 py-2 text-right">
										<div className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
											Від
										</div>
										<div className="text-sm font-black text-emerald-900">
											{formatNumber(service.basePrice)} грн
										</div>
									</div>
								</div>
								<p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-600">
									{service.shortDescription}
								</p>
								<div className="mt-4 flex flex-wrap gap-2">
									{service.style.slice(0, 3).map((style) => (
										<span
											key={style}
											className="rounded-full border border-slate-200 bg-white/75 px-2.5 py-1 text-xs font-semibold text-slate-600"
										>
											{style}
										</span>
									))}
								</div>
								<div className="mt-5 flex items-center justify-between gap-3">
									<span className="text-sm text-slate-500">
										/{priceUnitLabel(service.priceUnit)}
									</span>
									<Link
										className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--tds-primary)]"
										to={`/services/${service.slug}`}
									>
										Дивитись пакет
									</Link>
								</div>
							</CardContent>
						</Card>
					))}
				</div>

				{data ? (
					<div className="flex items-center justify-between rounded-[24px] border border-white/75 bg-white/60 px-4 py-3">
						<Button
							type="button"
							variant="ghost"
							disabled={page <= 1}
							onClick={() => patchParams({ page: String(page - 1) })}
						>
							Назад
						</Button>
						<span className="text-sm text-slate-500">
							Сторінка {data.page} / {Math.max(1, Math.ceil(data.total / data.perPage))}
						</span>
						<Button
							type="button"
							variant="ghost"
							disabled={page >= Math.ceil(data.total / data.perPage)}
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
