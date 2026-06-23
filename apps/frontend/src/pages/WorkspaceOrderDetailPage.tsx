import { Badge, Button, Card, CardContent, PageHeader } from '@tailored/ui'
import {
	formatAuditAction,
	formatDateTime,
	formatNumber,
	orderStatusLabels,
} from '@tailored/shared'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmWarningModal } from '@/components/ConfirmWarningModal'
import { mediaUrl, getApi, patchApi, postApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import {
	orderActionConfirm,
	type OrderWorkspaceAction,
} from '@/lib/order-action-confirm'
import { useLoad } from '@/lib/use-load'
import { workspaceOrderTone } from '@/features/crm/WorkspaceOrderPipeline'

type WorkspaceOrderDetail = {
	id: string
	code: string
	title: string
	description: string
	status: string
	requestedBudget?: string | null
	preferredStart?: string
	addressLine?: string
	city?: string
	phone?: string
	serviceSlug?: string | null
	serviceName?: string | null
	style?: string | null
	source?: string | null
	estimatedPrice?: string | null
	referencePhotoUrls?: string[]
	portfolioReferenceSlug?: string | null
	portfolioReferenceTitle?: string | null
	createdAt?: string
	updatedAt?: string
	clientName: string
	clientEmail: string
	companyName?: string | null
	leadSource?: string | null
	designerName?: string | null
	timeline?: Array<{ at: string; kind: string; label: string }>
	auditTrail?: Array<{
		at?: string
		action: string
		metadata?: Record<string, unknown>
	}>
	project?: {
		id: string
		code: string
		title: string
		status: string
	} | null
}

export function WorkspaceOrderDetailPage() {
	const { code = '' } = useParams()
	const navigate = useNavigate()
	const user = useAuthStore((s) => s.user)
	const canManage =
		user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER'
	const isDesigner = user?.role === 'DESIGNER'

	const { data, loading, error, reload } = useLoad(
		() => getApi<WorkspaceOrderDetail>(`/crm/orders/${encodeURIComponent(code)}`),
		[code]
	)
	const [busy, setBusy] = useState(false)
	const [actionError, setActionError] = useState('')
	const [confirmAction, setConfirmAction] =
		useState<OrderWorkspaceAction | null>(null)

	async function executeConfirmedAction() {
		if (!data || !confirmAction) return
		setBusy(true)
		setActionError('')
		const encoded = encodeURIComponent(data.code)
		try {
			let result: { project?: { id: string; code: string } } = {}
			switch (confirmAction) {
				case 'qualify':
					result = await patchApi(`/crm/orders/${encoded}/qualify`, {})
					break
				case 'convert':
					result = await patchApi(`/crm/orders/${encoded}/convert`, {})
					break
				case 'reject':
					result = await patchApi(`/crm/orders/${encoded}/reject`, {})
					break
				case 'claim':
					result = await postApi(`/crm/orders/${encoded}/claim`, {})
					break
			}
			setConfirmAction(null)
			if (result.project?.id) {
				navigate(`/workspace/projects/${result.project.id}`)
				return
			}
			reload()
		} catch (err: unknown) {
			const maybe = err as { message?: string }
			setActionError(maybe.message ?? 'Не вдалося виконати дію')
		} finally {
			setBusy(false)
		}
	}

	const confirmCopy =
		data && confirmAction
			? orderActionConfirm(confirmAction, data.code)
			: null

	const sourceLabel =
		data?.source === 'portal'
			? 'Портал клієнта'
			: data?.source === 'crm'
				? 'CRM (менеджер)'
				: data?.source ?? '—'

	return (
		<div className="space-y-6">
			<PageHeader
				title={data?.code ?? 'Заявка'}
				description={
					data?.title ??
					'Деталі заявки, клієнт, адреса, фото та зміна статусу.'
				}
				actions={
					data ? (
						<Badge
							tone={
								workspaceOrderTone[data.status] ?? 'neutral'
							}
						>
							{orderStatusLabels[data.status] ?? data.status}
						</Badge>
					) : null
				}
			/>

			{loading ? (
				<p className="text-sm text-slate-500">Завантажуємо заявку…</p>
			) : null}
			{error ? (
				<p className="text-sm text-rose-600">{error}</p>
			) : null}

			{data ? (
				<>
					<div className="flex flex-wrap gap-2">
						{data.status === 'NEW' && canManage ? (
							<Button
								type="button"
								variant="secondary"
								disabled={busy}
								onClick={() => setConfirmAction('qualify')}
							>
								Кваліфікувати
							</Button>
						) : null}
						{data.status === 'QUALIFIED' && canManage ? (
							<>
								<Button
									type="button"
									disabled={busy}
									onClick={() => setConfirmAction('convert')}
								>
									Конвертувати в проєкт
								</Button>
								<Button
									type="button"
									variant="ghost"
									disabled={busy}
									onClick={() => setConfirmAction('reject')}
								>
									Відхилити
								</Button>
							</>
						) : null}
						{isDesigner &&
						(data.status === 'NEW' || data.status === 'QUALIFIED') ? (
							<Button
								type="button"
								variant="secondary"
								disabled={busy}
								onClick={() => setConfirmAction('claim')}
							>
								Закріпити за собою
							</Button>
						) : null}
						{data.project ? (
							<Link
								to={`/workspace/projects/${data.project.id}`}
								className="inline-flex items-center rounded-full border border-[var(--tds-primary)] px-4 py-2 text-sm font-bold text-[var(--tds-primary)]"
							>
								Проєкт {data.project.code}
							</Link>
						) : null}
					</div>

					<div className="grid gap-4 lg:grid-cols-2">
						<Card>
							<CardContent className="space-y-3 pt-5">
								<h2 className="text-lg font-black text-[var(--tds-ink)]">
									{data.title}
								</h2>
								<p className="text-sm leading-6 text-[var(--tds-muted)]">
									{data.description}
								</p>
								<dl className="grid gap-2 text-sm sm:grid-cols-2">
									<div>
										<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
											Клієнт
										</dt>
										<dd className="font-semibold">
											{data.clientName}
										</dd>
										<dd className="text-[var(--tds-muted)]">
											{data.clientEmail}
										</dd>
									</div>
									<div>
										<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
											Телефон
										</dt>
										<dd>{data.phone}</dd>
									</div>
									<div>
										<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
											Адреса
										</dt>
										<dd>
											{data.city}, {data.addressLine}
										</dd>
									</div>
									<div>
										<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
											Джерело
										</dt>
										<dd>{sourceLabel}</dd>
									</div>
									{data.serviceName ? (
										<div>
											<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
												Послуга
											</dt>
											<dd>{data.serviceName}</dd>
										</div>
									) : null}
									{data.style ? (
										<div>
											<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
												Стиль
											</dt>
											<dd>{data.style}</dd>
										</div>
									) : null}
									<div>
										<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
											Бюджет клієнта
										</dt>
										<dd>
											{formatNumber(
												data.requestedBudget ?? 0
											)}{' '}
											₴
										</dd>
									</div>
									{data.estimatedPrice ? (
										<div>
											<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
												Орієнтовна ціна каталогу
											</dt>
											<dd>
												{formatNumber(
													data.estimatedPrice
												)}{' '}
												₴
											</dd>
										</div>
									) : null}
									{data.preferredStart ? (
										<div>
											<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
												Бажаний старт
											</dt>
											<dd>
												{formatDateTime(
													data.preferredStart
												)}
											</dd>
										</div>
									) : null}
									{data.designerName ? (
										<div>
											<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
												Дизайнер
											</dt>
											<dd>{data.designerName}</dd>
										</div>
									) : null}
									{data.createdAt ? (
										<div>
											<dt className="text-xs font-bold uppercase tracking-wide text-[var(--tds-muted)]">
												Створено
											</dt>
											<dd>
												{formatDateTime(data.createdAt)}
											</dd>
										</div>
									) : null}
								</dl>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="pt-5">
								<div className="text-sm font-black text-[var(--tds-ink)]">
									Хронологія
								</div>
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
									{(data.auditTrail ?? []).map((row, idx) => (
										<li
											key={`audit-${idx}`}
											className="text-sm"
										>
											<div className="font-semibold">
												{formatAuditAction(row.action)}
											</div>
											<div className="text-xs text-slate-500">
												{row.at
													? formatDateTime(row.at)
													: ''}
											</div>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					</div>

					{data.portfolioReferenceSlug ? (
						<Card>
							<CardContent className="pt-5">
								<div className="text-sm font-black">
									Референс з портфоліо
								</div>
								<p className="mt-2 text-sm text-slate-700">
									{data.portfolioReferenceTitle ?? data.portfolioReferenceSlug}
								</p>
								<Link
									to={`/portfolio/${encodeURIComponent(data.portfolioReferenceSlug)}`}
									className="mt-2 inline-flex text-sm font-semibold text-[var(--tds-primary)] hover:underline"
									target="_blank"
									rel="noreferrer"
								>
									Відкрити кейс на сайті
								</Link>
							</CardContent>
						</Card>
					) : null}

					{(data.referencePhotoUrls ?? []).length > 0 ? (
						<Card>
							<CardContent className="pt-5">
								<div className="text-sm font-black">
									Референсні фото
								</div>
								<div className="mt-4 grid gap-3 sm:grid-cols-3">
									{(data.referencePhotoUrls ?? []).map((url) => (
										<a
											key={url}
											href={mediaUrl(url)}
											target="_blank"
											rel="noreferrer"
										>
											<img
												src={mediaUrl(url)}
												alt=""
												className="h-40 w-full rounded-2xl object-cover"
											/>
										</a>
									))}
								</div>
							</CardContent>
						</Card>
					) : null}
				</>
			) : null}

			{actionError ? (
				<p className="text-sm text-rose-600">{actionError}</p>
			) : null}

			<Link
				to="/workspace/orders"
				className="inline-flex text-sm font-semibold text-[var(--tds-primary)]"
			>
				← До списку заявок
			</Link>

			{confirmCopy ? (
				<ConfirmWarningModal
					open={confirmAction !== null}
					onClose={() => setConfirmAction(null)}
					onConfirm={() => void executeConfirmedAction()}
					title={confirmCopy.title}
					description={confirmCopy.description}
					confirmLabel={confirmCopy.confirmLabel}
					tone={confirmCopy.tone}
					busy={busy}
				/>
			) : null}
		</div>
	)
}
