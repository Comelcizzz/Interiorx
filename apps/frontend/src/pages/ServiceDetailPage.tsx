import {
	Button,
	Card,
	CardContent,
	Modal,
	ModalFooter,
	PageHeader,
} from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { OrderIntakeModal } from '@/components/OrderIntakeModal'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicImage } from '@/components/PublicImage'
import { publicApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { portfolioImage, serviceImage } from '@/lib/public-visuals'
import type { PublicServiceRow } from '@/lib/types'
import { clientAuthHref } from '@/lib/client-auth'
import { useLoad } from '@/lib/use-load'

function priceUnitLabel(unit: string) {
	return unit === 'project' ? 'проєкт' : unit
}

export function ServiceDetailPage() {
	const { slug = '' } = useParams()
	const [searchParams, setSearchParams] = useSearchParams()
	const user = useAuthStore((s) => s.user)
	const [intakeOpen, setIntakeOpen] = useState(false)
	const [authPromptOpen, setAuthPromptOpen] = useState(false)
	const orderReturnPath = useMemo(
		() => `/services/${slug}?action=order`,
		[slug]
	)
	const { data, loading, error } = useLoad(
		() =>
			publicApi
				.get<PublicServiceRow>(`/catalog/services/${slug}`)
				.then((r) => r.data),
		[slug]
	)

	useEffect(() => {
		if (!data || searchParams.get('action') !== 'order') return
		if (user?.role === 'CLIENT') {
			setIntakeOpen(true)
		} else {
			setAuthPromptOpen(true)
		}
		const next = new URLSearchParams(searchParams)
		next.delete('action')
		setSearchParams(next, { replace: true })
	}, [data, searchParams, setSearchParams, user?.role])

	function openOrderFlow() {
		if (!data) return
		if (user?.role === 'CLIENT') {
			setIntakeOpen(true)
			return
		}
		setAuthPromptOpen(true)
	}

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader />
			<main className="relative mx-auto max-w-4xl space-y-6 px-6 py-8 pb-32">
				<PageHeader
					title={data?.name ?? 'Послуга'}
					description="Деталі пакета, вартість і наступні кроки."
				/>
				{loading ? (
					<p className="text-sm text-slate-500">Завантажуємо послугу...</p>
				) : null}
				{error ? <p className="text-sm text-rose-600">{error}</p> : null}
				{data?.heroImageUrl ? (
					<div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
						<PublicImage
							src={data.heroImageUrl}
							fallback={serviceImage(data.slug)}
							alt={data.name}
							className="h-64 w-full object-cover sm:h-80"
						/>
					</div>
				) : null}
				{data ? (
					<Card>
						<CardContent>
							<p className="text-sm text-slate-700">{data.longDescription}</p>
							<div className="mt-4 flex flex-wrap gap-2">
								{data.style.map((style) => (
									<span
										key={style}
										className="rounded-full border px-2 py-0.5 text-xs text-slate-600"
									>
										{style}
									</span>
								))}
							</div>
							<p className="mt-4 text-lg font-bold">
								Від {formatNumber(data.basePrice)} грн / {priceUnitLabel(data.priceUnit)}
							</p>
							<p className="mt-3 text-sm text-slate-500">
								Оформити заявку можна через панель внизу екрана.
							</p>
							<Link
								to="/services"
								className="mt-4 inline-block text-sm font-semibold text-[var(--tds-primary)] underline"
							>
								← Назад до каталогу
							</Link>
						</CardContent>
					</Card>
				) : null}
				{data?.galleryImageUrls && data.galleryImageUrls.length > 0 ? (
					<div>
						<h2 className="mb-3 text-lg font-bold text-slate-900">Галерея</h2>
						<div className="grid gap-3 sm:grid-cols-2">
							{data.galleryImageUrls.map((url) => (
								<PublicImage
									key={url}
									src={url}
									fallback={serviceImage(data.slug)}
									alt={data.name}
									className="h-48 w-full rounded-2xl border border-slate-200 object-cover"
								/>
							))}
						</div>
					</div>
				) : null}
				{data?.relatedPortfolio && data.relatedPortfolio.length > 0 ? (
					<div>
						<h2 className="mb-3 text-lg font-bold text-slate-900">Схожі роботи</h2>
						<p className="mb-4 text-sm text-slate-600">
							Проєкти у схожій категорії або стилі.
						</p>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{data.relatedPortfolio.map((item) => (
								<Link
									key={item.slug}
									to={`/portfolio/${item.slug}`}
									className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
								>
									{item.coverImageUrl ? (
										<PublicImage
											src={item.coverImageUrl}
											fallback={portfolioImage(item.slug)}
											alt={item.title}
											className="h-36 w-full object-cover transition group-hover:scale-[1.02]"
										/>
									) : (
										<div className="flex h-36 items-center justify-center bg-slate-100 text-xs text-slate-400">
											Без обкладинки
										</div>
									)}
									<div className="p-3">
										<div className="font-semibold text-slate-900">{item.title}</div>
										{item.summary ? (
											<p className="mt-1 line-clamp-2 text-xs text-slate-600">
												{item.summary}
											</p>
										) : null}
									</div>
								</Link>
							))}
						</div>
					</div>
				) : null}
				{data && user?.role === 'CLIENT' ? (
					<OrderIntakeModal
						open={intakeOpen}
						onClose={() => setIntakeOpen(false)}
						service={data}
					/>
				) : null}
				{data ? (
					<Modal
						open={authPromptOpen}
						onClose={() => setAuthPromptOpen(false)}
						title="Увійдіть, щоб замовити послугу"
					>
						<p className="text-sm text-slate-600">
							Заявка створюється у клієнтському кабінеті. Увійдіть
							як клієнт або створіть профіль, і ми повернемо вас до
							цієї послуги.
						</p>
						<ModalFooter>
							<Link
								to={clientAuthHref('/login', { next: orderReturnPath })}
								className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
							>
								Увійти
							</Link>
							<Link
								to={clientAuthHref('/register', { next: orderReturnPath })}
								className="inline-flex h-10 items-center rounded-full bg-[var(--tds-primary)] px-4 text-sm font-semibold text-white"
							>
								Створити акаунт
							</Link>
						</ModalFooter>
					</Modal>
				) : null}
				{data ? (
					<div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md md:py-4">
						<div className="pointer-events-auto mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
							<div>
								<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
									{data.name}
								</div>
								<div className="text-base font-bold text-slate-900">
									Від {formatNumber(data.basePrice)} грн / {priceUnitLabel(data.priceUnit)}
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button type="button" onClick={openOrderFlow}>
									Замовити послугу
								</Button>
								<Link
									to={clientAuthHref('/login', { next: orderReturnPath })}
									className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
								>
									Увійти
								</Link>
								<Link
									to={clientAuthHref('/register', { next: orderReturnPath })}
									className="inline-flex h-10 items-center rounded-full bg-[var(--tds-primary)] px-4 text-sm font-semibold text-white"
								>
									Створити акаунт
								</Link>
							</div>
						</div>
					</div>
				) : null}
			</main>
		</div>
	)
}
