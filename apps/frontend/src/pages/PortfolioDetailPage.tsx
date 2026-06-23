import { Card, CardContent, PageHeader } from '@tailored/ui'
import { formatDate } from '@tailored/shared'
import { Link, useParams } from 'react-router-dom'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicImage } from '@/components/PublicImage'
import { publicApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { portfolioImage, publicHeroImage } from '@/lib/public-visuals'
import type { PortfolioItemRow, PublicReviewsListResponse } from '@/lib/types'
import { clientAuthHref } from '@/lib/client-auth'
import { useLoad } from '@/lib/use-load'

function similarProjectPath(slug: string, isClient: boolean) {
	if (isClient) {
		return `/portal/orders/new?portfolio=${encodeURIComponent(slug)}`
	}
	return clientAuthHref('/login', {
		next: '/portal/orders/new',
		project: slug,
	})
}

export function PortfolioDetailPage() {
	const { slug = '' } = useParams()
	const isClient = useAuthStore((s) => s.user?.role === 'CLIENT')
	const orderCta = slug
		? similarProjectPath(slug, isClient)
		: clientAuthHref('/login', { next: '/portal/orders/new' })
	const { data, loading, error } = useLoad(
		() =>
			publicApi
				.get<PortfolioItemRow>(`/portfolio/${slug}`)
				.then((r) => r.data),
		[slug]
	)
	const { data: reviews } = useLoad(
		() =>
			publicApi
				.get<PublicReviewsListResponse>('/reviews?page=1&perPage=3&sort=latest')
				.then((r) => r.data),
		[]
	)

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="mx-auto max-w-6xl space-y-7 px-6 py-8">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<PageHeader
						title={data?.title ?? 'Проєкт портфоліо'}
						description={
							data
								? `${data.category} · ${data.style}. Планування, матеріали, бюджет і виконання зібрані в одному процесі.`
								: 'Завантажуємо кейс INTERIORIX.'
						}
					/>
					<div className="flex flex-wrap gap-2">
						<Link
							to={orderCta}
							className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/70 bg-[var(--tds-primary)] px-5 text-sm font-semibold text-white shadow-[10px_20px_40px_rgba(38,132,91,0.24)] transition hover:bg-[var(--tds-primary-strong)]"
						>
							Хочу подібний проєкт
						</Link>
						<Link
							to="/portfolio"
							className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/75 bg-white/72 px-5 text-sm font-semibold text-[var(--tds-ink)] transition hover:bg-white"
						>
							Всі кейси
						</Link>
					</div>
				</div>

				{loading ? (
					<p className="text-sm text-slate-500">Завантажуємо проєкт...</p>
				) : null}
				{error ? <p className="text-sm text-rose-600">{error}</p> : null}

				{data?.coverImageUrl ? (
					<div className="overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
						<PublicImage
							src={data.coverImageUrl}
							fallback={portfolioImage(data.slug)}
							alt={data.title}
							className="h-[300px] w-full object-cover sm:h-[520px]"
						/>
					</div>
				) : null}

				{data ? (
					<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
						<Card className="bg-white/82">
							<CardContent className="p-6">
								<div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--tds-muted)]">
									{data.category} · {data.style}
								</div>
								<h2 className="mt-2 text-2xl font-black text-slate-950">
									Що зробили
								</h2>
								<p className="mt-3 text-base leading-7 text-slate-700">
									{data.description}
								</p>
							</CardContent>
						</Card>

						<Card className="border-emerald-100 bg-emerald-50/70">
							<CardContent className="p-6">
								<div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
									Замовити схожий результат
								</div>
								<h2 className="mt-2 text-2xl font-black text-slate-950">
									Покажіть цей кейс менеджеру
								</h2>
								<p className="mt-3 text-sm leading-6 text-slate-700">
									Ми створимо заявку з референсом на цей проєкт, а далі підберемо пакет,
									кошторис, команду й терміни під вашу локацію.
								</p>
								<Link
									to={similarProjectPath(data.slug, isClient)}
									className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/70 bg-[var(--tds-primary)] px-5 text-sm font-semibold text-white shadow-[10px_20px_40px_rgba(38,132,91,0.24)] transition hover:bg-[var(--tds-primary-strong)]"
								>
									Хочу подібний проєкт
								</Link>
							</CardContent>
						</Card>
					</div>
				) : null}

				{data?.galleryImageUrls && data.galleryImageUrls.length > 0 ? (
					<section>
						<h2 className="mb-4 text-2xl font-black">Галерея</h2>
						<div className="grid gap-4 md:grid-cols-3">
							{data.galleryImageUrls.map((url) => (
								<PublicImage
									key={url}
									src={url}
									fallback={portfolioImage(data.slug)}
									alt={data.title}
									className="h-64 rounded-[24px] border border-white/80 object-cover shadow-sm"
								/>
							))}
						</div>
					</section>
				) : null}

				{reviews?.items.length ? (
					<section className="space-y-4">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--tds-muted)]">
									Досвід клієнтів
								</div>
								<h2 className="mt-1 text-2xl font-black">Відгуки після завершення робіт</h2>
							</div>
							<Link className="text-sm font-black text-[var(--tds-primary)]" to="/reviews">
								Усі відгуки
							</Link>
						</div>
						<div className="grid gap-4 md:grid-cols-3">
							{reviews.items.map((review) => (
								<Card key={review._id ?? review.title} className="bg-white/82">
									<CardContent className="p-5">
										<div className="text-sm font-black text-amber-600">
											{'★'.repeat(Math.max(1, review.rating))}
										</div>
										<h3 className="mt-2 font-black">{review.title}</h3>
										<p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">
											{review.body}
										</p>
										<div className="mt-4 text-xs font-semibold text-slate-500">
											{review.reviewerName ?? 'Клієнт'} ·{' '}
											{review.publishedAt ? formatDate(review.publishedAt) : 'нещодавно'}
										</div>
										{review.photoUrls?.[0] ? (
											<PublicImage
												src={review.photoUrls[0]}
												fallback={publicHeroImage}
												alt={review.title}
												className="mt-4 h-32 rounded-2xl object-cover"
											/>
										) : null}
									</CardContent>
								</Card>
							))}
						</div>
					</section>
				) : null}
			</main>
		</div>
	)
}
