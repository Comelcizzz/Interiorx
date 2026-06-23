import {
	Badge,
	Button,
	Card,
	CardContent,
	EmptyState,
	ErrorState,
	PageHeader,
	SkeletonTable,
} from '@tailored/ui'
import { ConfirmWarningModal } from '@/components/ConfirmWarningModal'
import { CreateEstimateModal } from '@/components/CreateEstimateModal'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import {
	estimateStatusLabels,
	formatDate,
	formatNumber,
} from '@tailored/shared'
import {
	CheckCircle,
	ChevronDown,
	ChevronUp,
	FileText,
	PlusCircle,
	XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { estimateSendConfirm } from '@/lib/estimate-send-confirm'
import { getApi, patchApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { useAuthStore } from '@/lib/auth-store'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'
type EstimateItem = {
	id: string
	category: string
	title: string
	unit: string
	quantity: string
	unitPrice: string
	total: string
	sortOrder: number
}
type Estimate = {
	id: string
	version: number
	status: string
	subtotal: string
	discount: string
	tax: string
	margin: string
	total: string
	validUntil?: string | null
	createdAt: string
	project: {
		id: string
		code: string
		title: string
		status: string
	}
	items: EstimateItem[]
	_count: {
		items: number
		approvals: number
	}
	clientChangeComment?: string
	estimateCommentSource?: 'changes_requested' | 'estimate_rejected'
}
const statusTone: Record<
	string,
	'neutral' | 'amber' | 'green' | 'red' | 'blue'
> = {
	DRAFT: 'neutral',
	PRICING: 'amber',
	PENDING_REVIEW: 'amber',
	SENT: 'blue',
	APPROVED: 'green',
	REJECTED: 'red',
	EXPIRED: 'amber',
}
const estimateStatusOptions = Object.entries(estimateStatusLabels).map(
	([value, label]) => ({ value, label })
)
export function EstimatesPage() {
	const user = useAuthStore((s) => s.user)
	const [searchParams] = useSearchParams()
	const { page, perPage, status, q, from, to, sort, queryString, patchParams } =
		useListQuery(20)
	const projectIdFromUrl = searchParams.get('projectId') ?? ''
	const filtersActive = !!(status || q || from || to || sort !== 'latest')
	const { data, loading, error, reload } = useLoad(
		() => getApi<Paginated<Estimate>>(`/estimates?${queryString}`),
		[queryString]
	)

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			status: values.status || null,
			q: values.q || null,
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			status: null,
			q: null,
			from: null,
			to: null,
			sort: null,
		})
	}
	const items = data?.items ?? []
	const totalPages = data
		? Math.max(1, Math.ceil(data.total / data.perPage))
		: 1
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [showModal, setShowModal] = useState(false)
	const [sendConfirm, setSendConfirm] = useState<{
		id: string
		projectCode: string
		version: number
		total: string
	} | null>(null)
	const [sendBusy, setSendBusy] = useState(false)

	function openCreateModal() {
		setShowModal(true)
	}

	async function handleToPricing(id: string) {
		await patchApi(`/estimates/${id}/stage/pricing`, {})
		reload()
	}
	async function handleToReview(id: string) {
		await patchApi(`/estimates/${id}/stage/review`, {})
		reload()
	}
	async function handleApprove(id: string) {
		await patchApi(`/estimates/${id}/approve`, {})
		reload()
	}
	async function handleReject(id: string) {
		await patchApi(`/estimates/${id}/reject`, {})
		reload()
	}
	async function confirmSend() {
		if (!sendConfirm) return
		setSendBusy(true)
		try {
			await patchApi(`/estimates/${sendConfirm.id}/send`, {})
			setSendConfirm(null)
			reload()
		} finally {
			setSendBusy(false)
		}
	}
	const fmtUah = (v: string | number) => `${formatNumber(v)} ₴`
	return (
		<div className="space-y-6">
			<PageHeader
				title="Кошториси"
				description="Кошториси по проєктах, версії та погодження."
				actions={
					<Button onClick={openCreateModal} icon={<PlusCircle />}>
						Новий кошторис
					</Button>
				}
			/>
			<Card className="border-emerald-200/80 bg-emerald-50/40">
				<CardContent className="py-4 text-sm text-slate-700">
					<strong className="text-slate-900">Знижка та підсумок.</strong>{' '}
					Якщо у кошторису задано знижку, вона з’являється в
					розгорнутій таблиці окремим рядком після підсумку позицій.
					Підсумкова сума відповідає тому, що бачить клієнт після етапу
					«Надіслано».
				</CardContent>
			</Card>

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={estimateStatusOptions}
				showSearch
				searchPlaceholder="Код проєкту або назва…"
			/>

			{loading ? (
				<Card>
					<CardContent>
						<SkeletonTable rows={6} cols={5} />
					</CardContent>
				</Card>
			) : error ? (
				<ErrorState message={error} />
			) : items.length === 0 ? (
				<EmptyState
					icon={<FileText />}
					title={
						filtersActive
							? 'Нічого не знайдено за обраними фільтрами'
							: 'Кошторисів ще немає'
					}
					description={
						filtersActive ? undefined : 'Створіть перший кошторис.'
					}
				/>
			) : (
				<div className="space-y-3">
					{items.map((est) => (
						<Card key={est.id}>
							<CardContent>
								{est.clientChangeComment ? (
									<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
										<span className="font-semibold">
											{est.estimateCommentSource ===
											'estimate_rejected'
												? 'Причина відхилення: '
												: 'Запит на зміни від клієнта: '}
										</span>
										{est.clientChangeComment}
									</div>
								) : null}
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-xs font-bold text-[var(--tds-muted)]">
												{est.project.code}
											</span>
											<Badge
												tone={
													statusTone[est.status] ??
													'neutral'
												}
											>
												{estimateStatusLabels[
													est.status
												] ?? est.status}
											</Badge>
											<span className="text-xs text-[var(--tds-muted)]">
												v{est.version}
											</span>
										</div>
										<div className="mt-1.5 text-base font-black text-[var(--tds-ink)]">
											{est.project.title}
										</div>
										<div className="mt-1 text-sm text-[var(--tds-muted)]">
											{est._count.items} поз. ·{' '}
											{est._count.approvals} погодж.
											{est.validUntil
												? ` · дійсний до ${formatDate(est.validUntil)}`
												: ''}
										</div>
									</div>

									<div className="flex flex-col items-end gap-2">
										<div className="text-2xl font-black text-[var(--tds-ink)]">
											{fmtUah(est.total)}
										</div>
										<div className="flex flex-wrap gap-2">
											{est.status === 'DRAFT' && (
												<>
													<Button
														variant="secondary"
														className="h-8 px-3 text-xs"
														onClick={() =>
															handleToPricing(
																est.id
															)
														}
													>
														На оцінку
													</Button>
													<Button
														variant="secondary"
														className="h-8 px-3 text-xs"
														onClick={() =>
															setSendConfirm({
																id: est.id,
																projectCode:
																	est.project.code,
																version: est.version,
																total: est.total,
															})
														}
													>
														Надіслати
													</Button>
												</>
											)}
											{est.status === 'PRICING' && (
												<Button
													variant="secondary"
													className="h-8 px-3 text-xs"
													onClick={() =>
														handleToReview(est.id)
													}
												>
													На перевірку
												</Button>
											)}
											{est.status ===
												'PENDING_REVIEW' && (
												<Button
													variant="secondary"
													className="h-8 px-3 text-xs"
													onClick={() =>
														setSendConfirm({
															id: est.id,
															projectCode:
																est.project.code,
															version: est.version,
															total: est.total,
														})
													}
												>
													Надіслати
												</Button>
											)}
											{est.status === 'SENT' && (
												<>
													<Button
														variant="secondary"
														className="h-8 px-3 text-xs"
														onClick={() =>
															handleApprove(
																est.id
															)
														}
													>
														<CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
														Погодити
													</Button>
													<Button
														variant="secondary"
														className="h-8 px-3 text-xs"
														onClick={() =>
															handleReject(est.id)
														}
													>
														<XCircle className="h-3.5 w-3.5 text-rose-600" />
														Відхилити
													</Button>
												</>
											)}
											<button
												onClick={() =>
													setExpandedId(
														expandedId === est.id
															? null
															: est.id
													)
												}
												className="flex h-8 items-center gap-1 rounded-full border border-white/60 bg-white/50 px-3 text-xs font-semibold text-[var(--tds-muted)] transition hover:bg-white"
											>
												{expandedId === est.id ? (
													<ChevronUp className="h-3.5 w-3.5" />
												) : (
													<ChevronDown className="h-3.5 w-3.5" />
												)}
												Позиції
											</button>
										</div>
									</div>
								</div>

								{expandedId === est.id && (
									<div className="mt-4 overflow-x-auto border-t border-white/50 pt-4">
										<table className="w-full min-w-[520px] text-sm">
											<thead>
												<tr className="border-b border-white/40">
													{[
														'Категорія',
														'Назва',
														'Од.',
														'К-сть',
														'Ціна',
														'Сума',
													].map((h) => (
														<th
															key={h}
															className="py-2 pr-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[var(--tds-muted)]"
														>
															{h}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{est.items.map((item) => (
													<tr
														key={item.id}
														className="border-b border-white/20 hover:bg-white/20"
													>
														<td className="py-2 pr-3 text-xs text-[var(--tds-muted)]">
															{item.category}
														</td>
														<td className="py-2 pr-3 font-medium text-[var(--tds-ink)]">
															{item.title}
														</td>
														<td className="py-2 pr-3 text-xs text-[var(--tds-muted)]">
															{item.unit}
														</td>
														<td className="py-2 pr-3 text-[var(--tds-dark)]">
															{formatNumber(
																item.quantity
															)}
														</td>
														<td className="py-2 pr-3 text-[var(--tds-dark)]">
															{formatNumber(
																item.unitPrice
															)}
														</td>
														<td className="py-2 pr-3 font-bold text-[var(--tds-ink)]">
															{fmtUah(item.total)}
														</td>
													</tr>
												))}
											</tbody>
											<tfoot>
												<tr>
													<td
														colSpan={5}
														className="pt-3 text-right text-xs font-bold text-[var(--tds-muted)]"
													>
														Підсумок
													</td>
													<td className="pt-3 font-bold text-[var(--tds-ink)]">
														{fmtUah(est.subtotal)}
													</td>
												</tr>
												{Number(est.discount) > 0 && (
													<tr>
														<td
															colSpan={5}
															className="text-right text-xs text-[var(--tds-muted)]"
														>
															Знижка
														</td>
														<td className="font-semibold text-rose-600">
															-
															{fmtUah(
																est.discount
															)}
														</td>
													</tr>
												)}
												<tr>
													<td
														colSpan={5}
														className="pt-1 text-right text-sm font-black text-[var(--tds-ink)]"
													>
														Разом
													</td>
													<td className="pt-1 text-lg font-black text-[var(--tds-ink)]">
														{fmtUah(est.total)}
													</td>
												</tr>
											</tfoot>
										</table>
									</div>
								)}
							</CardContent>
						</Card>
					))}
					{data && data.total > data.perPage ? (
						<div className="flex flex-wrap items-center justify-between gap-3 pt-2">
							<span className="text-sm text-slate-600">
								Сторінка {data.page} з {totalPages} · показано{' '}
								{items.length} з {data.total}
							</span>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="secondary"
									disabled={page <= 1 || loading}
									onClick={() =>
										patchParams({
											page: String(Math.max(1, page - 1)),
										})
									}
								>
									Назад
								</Button>
								<Button
									type="button"
									variant="secondary"
									disabled={page >= totalPages || loading}
									onClick={() =>
										patchParams({ page: String(page + 1) })
									}
								>
									Далі
								</Button>
							</div>
						</div>
					) : null}
				</div>
			)}

			<CreateEstimateModal
				open={showModal}
				onClose={() => setShowModal(false)}
				onCreated={() => reload()}
				projectId={projectIdFromUrl || undefined}
			/>

			<ConfirmWarningModal
				open={sendConfirm != null}
				onClose={() => setSendConfirm(null)}
				busy={sendBusy}
				onConfirm={() => void confirmSend()}
				{...(sendConfirm
					? estimateSendConfirm({
							projectCode: sendConfirm.projectCode,
							version: sendConfirm.version,
							total: sendConfirm.total,
						})
					: estimateSendConfirm({}))}
			/>
		</div>
	)
}
