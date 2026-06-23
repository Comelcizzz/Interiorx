import { BrandLockup, Button, Card, CardContent } from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import { useNavigate, Link } from 'react-router-dom'
import { mediaUrl, publicApi } from '@/lib/api'
import type {
	Paginated,
	PortfolioItemRow,
	PublicReviewRow,
	PublicServiceRow,
} from '@/lib/types'
import { useLoad } from '@/lib/use-load'
export function MarketingHomePage() {
	const navigate = useNavigate()
	const catalog = useLoad(
		() =>
			publicApi
				.get<
					Paginated<PublicServiceRow>
				>('/catalog/services?page=1&perPage=4')
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
	const catalogError = catalog.error
	const portfolioError = portfolio.error
	const reviewsError = reviews.error
	const feedErrorText = 'Demo feed is not available right now.'
	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
			<header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
				<BrandLockup />
				<div className="flex gap-3">
					<Button
						variant="ghost"
						type="button"
						onClick={() => navigate('/services')}
					>
						Services
					</Button>
					<Button
						variant="ghost"
						type="button"
						onClick={() => navigate('/login')}
					>
						Sign in
					</Button>
					<Button type="button" onClick={() => navigate('/register')}>
						Client register
					</Button>
				</div>
			</header>

			<main className="mx-auto max-w-5xl space-y-14 px-6 pb-20">
				<section className="grid gap-8 rounded-[32px] border border-slate-200 bg-white/80 p-8 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<div className="space-y-4">
						<p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--tds-primary)]">
							INTERIORIX
						</p>
						<h1 className="text-4xl font-black tracking-tight lg:text-5xl">
							Spaces that feel intentional — inside and out
						</h1>
						<p className="max-w-xl text-lg text-slate-600">
							Full-service interiors, lighting, and facades with
							transparent estimates, a client portal, and a
							workspace your team can run end-to-end.
						</p>
						<div className="flex flex-wrap gap-3">
							<Button
								type="button"
								onClick={() => navigate('/register')}
							>
								Start as a client
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={() => navigate('/services')}
							>
								Browse services
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={() => navigate('/contact')}
							>
								Book a discovery call
							</Button>
						</div>
					</div>
					<div className="overflow-hidden rounded-[28px] border border-slate-100 bg-slate-100">
						<img
							src={mediaUrl(
								'/uploads/demo/ternopil-residence.jpg'
							)}
							alt=""
							className="h-72 w-full object-cover lg:h-full lg:min-h-[320px]"
						/>
					</div>
				</section>

				<section className="space-y-4">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="text-2xl font-black">
								Featured services
							</h2>
							<p className="text-sm text-slate-600">
								Fixed-scope packages you can order online.
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							onClick={() => navigate('/services')}
						>
							View catalog
						</Button>
					</div>
					{catalogError ? (
						<p className="text-sm text-slate-500">{feedErrorText}</p>
					) : null}
					<div className="grid gap-4 sm:grid-cols-2">
						{(catalog.data?.items ?? []).map((s) => (
							<Card key={s.slug}>
								<CardContent>
									{s.heroImageUrl ? (
										<img
											src={mediaUrl(s.heroImageUrl)}
											alt=""
											className="mb-3 h-40 w-full rounded-2xl object-cover"
										/>
									) : null}
									<div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										{s.slug}
									</div>
									<h3 className="mt-1 text-lg font-bold">
										{s.name}
									</h3>
									<p className="mt-2 text-sm text-slate-600">
										{s.shortDescription}
									</p>
									<p className="mt-3 text-sm font-semibold">
										From {formatNumber(s.basePrice)} UAH ·{' '}
										{s.priceUnit}
									</p>
									<Link
										className="mt-3 inline-block text-sm font-semibold text-[var(--tds-primary)]"
										to={`/services/${s.slug}`}
									>
										View details
									</Link>
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				<section className="space-y-4">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="text-2xl font-black">Recent work</h2>
							<p className="text-sm text-slate-600">
								Portfolio highlights from the studio.
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							onClick={() => navigate('/portfolio')}
						>
							See portfolio
						</Button>
					</div>
					{portfolioError ? (
						<p className="text-sm text-slate-500">{feedErrorText}</p>
					) : null}
					<div className="grid gap-4 md:grid-cols-3">
						{(portfolio.data?.items ?? []).map((item) => (
							<Link
								key={item.slug}
								to={`/portfolio/${item.slug}`}
								className="group block"
							>
								<Card className="h-full overflow-hidden">
									{item.coverImageUrl ? (
										<img
											src={mediaUrl(item.coverImageUrl)}
											alt=""
											className="h-44 w-full object-cover transition group-hover:opacity-95"
										/>
									) : (
										<div className="h-44 w-full bg-slate-100" />
									)}
									<CardContent>
										<div className="text-xs uppercase text-slate-500">
											{item.category}
										</div>
										<div className="mt-1 text-lg font-bold">
											{item.title}
										</div>
										<p className="mt-2 text-sm text-slate-600">
											{item.summary}
										</p>
									</CardContent>
								</Card>
							</Link>
						))}
					</div>
				</section>

				<section className="space-y-4">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div>
							<h2 className="text-2xl font-black">
								Client voices
							</h2>
							<p className="text-sm text-slate-600">
								Published reviews from the public feed.
							</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							onClick={() => navigate('/reviews')}
						>
							Read reviews
						</Button>
					</div>
					{reviewsError ? (
						<p className="text-sm text-slate-500">{feedErrorText}</p>
					) : null}
					<div className="grid gap-4 md:grid-cols-3">
						{(reviews.data?.items ?? []).map((review) => (
							<Card key={review._id ?? review.title}>
								<CardContent>
									<div className="text-sm font-black text-amber-500">
										{review.rating.toFixed(1)} / 5
									</div>
									<div className="mt-2 text-lg font-bold">
										{review.title}
									</div>
									<p className="mt-2 text-sm text-slate-600">
										{review.body}
									</p>
								</CardContent>
							</Card>
						))}
					</div>
				</section>

				<section className="flex flex-wrap gap-3">
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate('/portfolio')}
					>
						Portfolio
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate('/reviews')}
					>
						Reviews
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate('/team')}
					>
						Team
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate('/contact')}
					>
						Contact
					</Button>
				</section>

				<section className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h2 className="text-2xl font-black">Ready to start a project?</h2>
							<p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
								Send a brief and the studio team will turn it into a managed request with scope, estimate and next steps.
							</p>
						</div>
						<Button type="button" onClick={() => navigate('/register')}>
							Start client request
						</Button>
					</div>
				</section>
			</main>
		</div>
	)
}
