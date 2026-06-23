import { Badge, Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { ConfirmWarningModal } from '@/components/ConfirmWarningModal'
import {
	formatDateTime,
	formatNumber,
	orderStatusLabels,
} from '@tailored/shared'
import { FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mediaUrl, portalApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'
type TimelineEvent = {
	at: string
	kind: string
	label: string
}
type PortalOrderDetail = {
	code: string
	title: string
	description: string
	status: string
	clientStatusLabel: string
	serviceSlug?: string | null
	serviceName?: string | null
	estimatedPrice?: string | null
	referencePhotoUrls?: string[]
	timeline?: TimelineEvent[]
	project?: {
		code: string
		title: string
	} | null
}
export function PortalOrderDetailPage() {
	const { code = '' } = useParams()
	const { data, loading, error, reload } = useLoad(
		() =>
			portalApi
				.get<PortalOrderDetail>(`/orders/${code}`)
				.then((r) => r.data),
		[code]
	)
	const [photoUrl, setPhotoUrl] = useState('')
	const [busy, setBusy] = useState(false)
	const [formError, setFormError] = useState('')
	const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

	async function cancelOrder() {
		if (!data) return
		setBusy(true)
		setFormError('')
		try {
			await portalApi.patch(`/orders/${data.code}/cancel`, {})
			setCancelConfirmOpen(false)
			reload()
		} catch (err: unknown) {
			const maybe = err as {
				response?: {
					data?: {
						message?: string
					}
				}
			}
			setFormError(
				maybe.response?.data?.message ?? 'Не вдалося скасувати заявку'
			)
		} finally {
			setBusy(false)
		}
	}
	async function appendPhoto(e: FormEvent) {
		e.preventDefault()
		if (!data || !photoUrl.trim()) return
		setBusy(true)
		setFormError('')
		try {
			await portalApi.patch(`/orders/${data.code}`, {
				referencePhotoUrls: [photoUrl.trim()],
			})
			setPhotoUrl('')
			reload()
		} catch (err: unknown) {
			const maybe = err as {
				response?: {
					data?: {
						message?: string
					}
				}
			}
			setFormError(
				maybe.response?.data?.message ?? 'Не вдалося додати посилання'
			)
		} finally {
			setBusy(false)
		}
	}
	const cancellable = data?.status === 'NEW' || data?.status === 'QUALIFIED'
	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title={data?.code ?? 'Заявка'}
				description="Статус заявки, історія та референсні фото."
			/>
			{loading ? (
				<p className="text-sm text-slate-500">Завантажуємо заявку…</p>
			) : null}
			{error ? <p className="text-sm text-rose-600">{error}</p> : null}
			{data ? (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardContent>
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="text-lg font-bold">
									{data.title}
								</h2>
								<Badge tone="neutral">
									{orderStatusLabels[data.status] ??
										data.status}
								</Badge>
							</div>
							<p className="mt-2 text-sm text-slate-600">
								{data.description}
							</p>
							<p className="mt-3 text-sm font-semibold">
								{data.clientStatusLabel}
							</p>
							{data.serviceName ? (
								<p className="mt-2 text-sm text-slate-600">
									Послуга: {data.serviceName}
									{data.serviceSlug ? (
										<span className="text-slate-400">
											{' '}
											({data.serviceSlug})
										</span>
									) : null}
								</p>
							) : null}
							{data.estimatedPrice ? (
								<p className="mt-2 text-sm text-slate-600">
									Орієнтовний бюджет:{' '}
									<span className="font-semibold">
										{formatNumber(data.estimatedPrice)} ₴
									</span>
								</p>
							) : null}
							{data.project ? (
								<Link
									className="mt-4 inline-block text-sm font-semibold text-[var(--tds-primary)]"
									to={`/portal/projects/${data.project.code}`}
								>
									Відкрити проєкт {data.project.code}
								</Link>
							) : null}
							<div className="mt-4 flex flex-wrap gap-2">
								<Button
									type="button"
									variant="danger"
									disabled={!cancellable || busy}
									onClick={() => setCancelConfirmOpen(true)}
								>
									Скасувати заявку
								</Button>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className="text-sm font-bold">Хронологія</div>
							<ul className="mt-3 space-y-3">
								{(data.timeline ?? []).map((ev, idx) => (
									<li
										key={`${ev.kind}-${idx}`}
										className="text-sm"
									>
										<div className="font-semibold">
											{ev.label}
										</div>
										<div className="text-xs text-slate-500">
											{formatDateTime(ev.at)}
										</div>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>
				</div>
			) : null}

			{data ? (
				<Card>
					<CardContent>
						<div className="text-sm font-bold">
							Референсні фото
						</div>
						<p className="text-xs text-slate-500">
							Вставте посилання на зображення. Завантаження файлів
							зʼявиться в наступному релізі.
						</p>
						<form
							className="mt-3 flex flex-wrap gap-2"
							onSubmit={appendPhoto}
						>
							<input
								value={photoUrl}
								onChange={(ev) => setPhotoUrl(ev.target.value)}
								placeholder="https://..."
								className="min-w-[240px] flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm"
							/>
							<Button
								type="submit"
								disabled={busy || !photoUrl.trim()}
							>
								Додати посилання
							</Button>
						</form>
						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							{(data.referencePhotoUrls ?? []).map((url) => (
								<img
									key={url}
									src={mediaUrl(url)}
									alt=""
									className="h-36 w-full rounded-2xl object-cover"
								/>
							))}
						</div>
					</CardContent>
				</Card>
			) : null}

			{formError ? (
				<p className="text-sm text-rose-600">{formError}</p>
			) : null}

			<Link
				to="/portal/orders"
				className="inline-flex text-sm font-semibold text-[var(--tds-primary)]"
			>
				← До списку заявок
			</Link>

			<ConfirmWarningModal
				open={cancelConfirmOpen}
				onClose={() => setCancelConfirmOpen(false)}
				onConfirm={() => void cancelOrder()}
				title="Скасувати заявку?"
				description={
					data
						? `Заявку ${data.code} буде закрито. Після скасування продовжити обробку цієї заявки не вийде.`
						: 'Заявку буде закрито без конвертації в проєкт.'
				}
				confirmLabel="Скасувати заявку"
				tone="danger"
				busy={busy}
			/>
		</div>
	)
}
