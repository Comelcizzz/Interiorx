import { Button, Card, CardContent } from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import { Link, useNavigate } from 'react-router-dom'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicImage } from '@/components/PublicImage'
import { publicApi } from '@/lib/api'
import { portfolioImage, publicHeroImage, serviceImage } from '@/lib/public-visuals'
import type { Paginated, PortfolioItemRow, PublicReviewRow, PublicServiceRow } from '@/lib/types'
import { clientAuthHref } from '@/lib/client-auth'
import { useLoad } from '@/lib/use-load'

const NEW_ORDER_NEXT = '/portal/orders/new'

export function MarketingPublicHomePage() {
	const navigate = useNavigate()
	const catalog = useLoad(
		() =>
			publicApi
				.get<Paginated<PublicServiceRow>>('/catalog/services?page=1&perPage=4')
				.then((r) => r.data),
		[]
	)
	const portfolio = useLoad(
		() =>
			publicApi
				.get<Paginated<PortfolioItemRow>>('/portfolio?page=1&perPage=3')
				.then((r) => r.data),
		[]
	)
	const reviews = useLoad(
		() =>
			publicApi
				.get<Paginated<PublicReviewRow>>('/reviews?page=1&perPage=3')
				.then((r) => r.data),
		[]
	)

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-7xl space-y-14 px-5 pb-20 pt-8 lg:px-8">
				<section className="grid min-h-[620px] overflow-hidden rounded-[36px] border border-white/75 bg-white/70 shadow-[0_30px_90px_rgba(17,24,39,0.12)] backdrop-blur-xl lg:grid-cols-[1fr_0.92fr]">
					<div className="flex flex-col justify-between p-7 lg:p-10">
						<div>
							<div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--tds-primary)]">
								INTERIORIX
							</div>
							<h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.03] lg:text-6xl">
								Інтерʼєр, екстерʼєр і керування проєктом в одному процесі.
							</h1>
							<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
								Клієнт залишає заявку, отримує зрозумілий кошторис, погоджує дизайн-пакет,
								відстежує виконання, оплачує онлайн і зберігає чеки в кабінеті проєкту.
							</p>
							<div className="mt-7 flex flex-wrap gap-3">
								<Button
									type="button"
									onClick={() =>
										navigate(
											clientAuthHref('/login', { next: NEW_ORDER_NEXT })
										)
									}
								>
									Створити заявку
								</Button>
								<Button type="button" variant="secondary" onClick={() => navigate('/services')}>
									Переглянути послуги
								</Button>
							</div>
						</div>
					</div>
					<div className="relative min-h-[360px] overflow-hidden bg-slate-200">
						<PublicImage
							fallback={publicHeroImage}
							alt="INTERIORIX residential interior"
							className="h-full w-full object-cover"
						/>
					</div>
				</section>

				<section className="space-y-5">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div>
							<div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--tds-primary)]">
								Каталог послуг
							</div>
							<h2 className="mt-2 text-3xl font-black">Пакети, які клієнт може замовити одразу</h2>
						</div>
						<Button type="button" variant="secondary" onClick={() => navigate('/services')}>
							Відкрити каталог
						</Button>
					</div>
					<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
						{(catalog.data?.items ?? []).map((service) => (
							<Card key={service.slug} className="overflow-hidden rounded-[26px]">
								<PublicImage
									src={service.heroImageUrl}
									fallback={serviceImage(service.slug)}
									alt={service.name}
									className="h-44 w-full object-cover"
								/>
								<CardContent className="p-5">
									<h3 className="text-lg font-black">{service.name}</h3>
									<p className="mt-2 min-h-[64px] text-sm leading-6 text-slate-600">
										{service.shortDescription}
									</p>
									<div className="mt-4 flex items-center justify-between gap-3">
										<span className="text-sm font-black text-slate-950">
											Від {formatNumber(service.basePrice)} грн
										</span>
										<Link className="text-sm font-semibold text-[var(--tds-primary)]" to={`/services/${service.slug}`}>
											Деталі
										</Link>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				<section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
					<div className="space-y-5">
						<div>
							<div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--tds-primary)]">
								Реалізовані роботи
							</div>
							<h2 className="mt-2 text-3xl font-black">Фрагменти портфоліо</h2>
						</div>
						<div className="grid gap-4 md:grid-cols-3">
							{(portfolio.data?.items ?? []).map((item) => (
								<Link key={item.slug} to={`/portfolio/${item.slug}`} className="group">
									<Card className="h-full overflow-hidden rounded-[24px]">
										<PublicImage
											src={item.coverImageUrl}
											fallback={portfolioImage(item.slug)}
											alt={item.title}
											className="h-40 w-full object-cover transition group-hover:scale-[1.03]"
										/>
										<CardContent className="p-4">
											<div className="text-xs uppercase text-slate-500">{item.category}</div>
											<div className="mt-1 font-black">{item.title}</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					</div>

					{/*
						Світла «папка» з явним кольором тексту: не залежить від тьмяного bg з Tailwind
						(якщо бандл/каскад зʼїв класи — темний варіант знову ставав нечитабельним).
						Card (tds-glass-card) тут не використовуємо.
					*/}
					<div className="rounded-[28px] border border-slate-200 bg-white p-6 text-slate-900 shadow-[0_18px_56px_rgba(15,23,42,0.08)]">
						<div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--tds-primary)]">
							Відгуки клієнтів
						</div>
						<div className="mt-4 space-y-4">
							{(reviews.data?.items ?? []).map((review, idx) => (
								<div
									key={review._id ?? `${review.title}-${idx}`}
									className="rounded-[20px] border border-slate-100 bg-slate-50 p-4"
								>
									<div className="text-sm font-black text-amber-800">
										{review.rating.toFixed(1)} / 5
									</div>
									<div className="mt-1 text-base font-black text-slate-900">
										{review.title}
									</div>
									<p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
										{review.body}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}
