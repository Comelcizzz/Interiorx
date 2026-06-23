import {
	Badge,
	Button,
	Card,
	CardContent,
	Modal,
	ModalFooter,
	PageHeader,
} from '@tailored/ui'
import {
	estimateStatusLabels,
	formatAuditAction,
	formatEntityType,
	formatCurrency,
	formatDateTime,
	formatNumber,
	invoiceStatusLabels,
	paymentStatusLabels,
	portalProjectTabLabels,
	projectStatusLabels,
	receiptStatusLabels,
	taskStatusLabels,
} from '@tailored/shared'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PortalProjectMediaSection } from '@/components/PortalProjectMediaSection'
import {
	canClientPayEstimate,
	clientInvoicePayState,
	estimateKindLabel,
	findInvoiceForEstimate,
	formatApprovedEstimatesBudget,
	formatClientRequestedBudget,
} from '@/lib/estimate-display'
import { patchApi, portalApi } from '@/lib/api'
import type { ProjectDetail } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
const tabs = [
	'Overview',
	'Estimates',
	'Photos',
	'Payments',
	'Activity',
] as const
export function PortalProjectDetailPage() {
	const { code = '' } = useParams()
	const [tab, setTab] = useState<(typeof tabs)[number]>('Overview')
	const { data, loading, error, reload } = useLoad(
		() =>
			portalApi
				.get<ProjectDetail>(`/projects/${code}`)
				.then((r) => r.data),
		[code]
	)
	const [estimateBusyId, setEstimateBusyId] = useState<string | null>(null)
	const [estimateErr, setEstimateErr] = useState<string | null>(null)
	const [changesModal, setChangesModal] = useState<{
		estimateId: string
	} | null>(null)
	const [changesComment, setChangesComment] = useState('')
	async function approveEstimate(id: string) {
		setEstimateErr(null)
		setEstimateBusyId(id)
		try {
			await patchApi(`/estimates/${encodeURIComponent(id)}/approve`, {})
			reload()
		} catch (e: unknown) {
			const msg = (
				e as {
					response?: {
						data?: {
							message?: string
						}
					}
				}
			)?.response?.data?.message
			setEstimateErr(msg ?? 'Не вдалося погодити кошторис')
		} finally {
			setEstimateBusyId(null)
		}
	}
	async function submitRequestChanges() {
		if (!changesModal) return
		setEstimateErr(null)
		setEstimateBusyId(changesModal.estimateId)
		try {
			await patchApi(
				`/estimates/${encodeURIComponent(changesModal.estimateId)}/reject`,
				{
					comment: changesComment.trim() || undefined,
				}
			)
			setChangesModal(null)
			setChangesComment('')
			reload()
		} catch (e: unknown) {
			const msg = (
				e as {
					response?: {
						data?: {
							message?: string
						}
					}
				}
			)?.response?.data?.message
			setEstimateErr(msg ?? 'Не вдалося надіслати запит на зміни')
		} finally {
			setEstimateBusyId(null)
		}
	}
	const [auditExtra, setAuditExtra] = useState<ProjectDetail['auditLogs']>([])
	const [auditPage, setAuditPage] = useState(1)
	const [auditTotal, setAuditTotal] = useState<number | null>(null)
	const [auditLoading, setAuditLoading] = useState(false)
	useEffect(() => {
		setAuditExtra([])
		setAuditPage(1)
		setAuditTotal(null)
	}, [code, data?.id])
	const auditMerged = data ? [...data.auditLogs, ...auditExtra] : []
	const canLoadMoreAudit =
		Boolean(data) &&
		(auditTotal != null
			? auditMerged.length < auditTotal
			: (data?.auditLogs.length ?? 0) >= 12)
	async function loadMoreAudit() {
		if (!data) return
		setAuditLoading(true)
		try {
			const next = auditPage + 1
			const res = await portalApi
				.get<{
					items: ProjectDetail['auditLogs']
					total: number
				}>(
					`/projects/${encodeURIComponent(data.code)}/audit?page=${next}&perPage=12`
				)
				.then((r) => r.data)
			setAuditExtra((prev) => [...prev, ...res.items])
			setAuditPage(next)
			setAuditTotal(res.total)
		} finally {
			setAuditLoading(false)
		}
	}
	const latestEstimate = useMemo(() => data?.estimates?.[0], [data])
	const clientBudgetLabel = useMemo(
		() =>
			data
				? formatClientRequestedBudget(
						data.clientRequestedBudget,
						data.budgetPlanned
					)
				: null,
		[data]
	)
	const approvedBudgetLabel = useMemo(
		() =>
			data
				? formatApprovedEstimatesBudget(
						data.estimates,
						data.approvedEstimatesTotal ?? data.budgetApproved
					)
				: null,
		[data]
	)

	function payHrefForEstimate(estimate: {
		version: number
		total: string
	}): string {
		if (!data) return '/portal/payment-checkout'
		const inv = findInvoiceForEstimate(
			data.invoices,
			data.code,
			estimate.version
		)
		if (inv && (inv.status === 'SENT' || inv.status === 'OVERDUE')) {
			return `/portal/invoices/pay?invoiceId=${encodeURIComponent(inv.id)}`
		}
		const q = new URLSearchParams({
			projectId: data.id,
			amount: estimate.total,
		})
		return `/portal/payment-checkout?${q.toString()}`
	}

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title={data?.code ?? 'Проєкт'}
				description={
					data?.title ??
					'Кабінет проєкту — статус, кошториси та документи.'
				}
			/>
			{loading ? (
				<p className="text-sm text-slate-500">Завантажуємо проєкт…</p>
			) : null}
			{error ? <p className="text-sm text-rose-600">{error}</p> : null}

			{data ? (
				<div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
					{tabs.map((label) => (
						<button
							key={label}
							type="button"
							onClick={() => setTab(label)}
							className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === label ? 'bg-[var(--tds-primary)] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
						>
							{portalProjectTabLabels[label] ?? label}
						</button>
					))}
				</div>
			) : null}

			{data && tab === 'Overview' ? (
				<div className="grid gap-4 lg:grid-cols-2">
					<Card>
						<CardContent>
							<div className="text-xs font-bold uppercase text-slate-500">
								Статус
							</div>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<Badge tone="blue">
									{projectStatusLabels[data.status]}
								</Badge>
								<span className="text-sm text-slate-600">
									{data.description}
								</span>
							</div>
							<div className="mt-4 space-y-2 text-sm text-slate-700">
								{clientBudgetLabel ? (
									<p>
										Бюджет від клієнта (заявка):{' '}
										<span className="font-semibold text-slate-900">
											{clientBudgetLabel}
										</span>
									</p>
								) : null}
								{approvedBudgetLabel ? (
									<p>
										Погоджений бюджет (сума кошторисів):{' '}
										<span className="font-semibold text-emerald-800">
											{approvedBudgetLabel}
										</span>
									</p>
								) : (
									<p className="text-slate-500">
										Погоджений бюджет зʼявиться після
										погодження кошторисів.
									</p>
								)}
								{data.dueDate ? (
									<p>
										Цільова дата:{' '}
										{formatDateTime(data.dueDate, {
											dateStyle: 'medium',
										})}
									</p>
								) : null}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className="text-xs font-bold uppercase text-slate-500">
								Команда
							</div>
							<div className="mt-3 space-y-2 text-sm">
								<p>
									Менеджер:{' '}
									<span className="font-semibold">
										{data.manager?.user.fullName ??
											'Буде призначено'}
									</span>
								</p>
								<p>
									Дизайнер:{' '}
									<span className="font-semibold">
										{data.designer?.user.fullName ??
											'Буде призначено'}
									</span>
								</p>
								<p className="text-slate-600">
									Ви: {data.client.user.fullName}
								</p>
							</div>
							{data.location ? (
								<p className="mt-4 text-sm text-slate-600">
									{data.location.addressLine},{' '}
									{data.location.city}
								</p>
							) : null}
						</CardContent>
					</Card>
					{latestEstimate ? (
						<Card className="lg:col-span-2">
							<CardContent>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<div className="text-xs font-bold uppercase text-slate-500">
											Актуальний кошторис
										</div>
										<div className="mt-1 text-lg font-black">
											{estimateKindLabel(
												latestEstimate.version
											)}{' '}
											·{' '}
											{estimateStatusLabels[
												latestEstimate.status
											] ?? latestEstimate.status}
										</div>
									</div>
									<div className="text-2xl font-black">
										{formatCurrency(latestEstimate.total)}
									</div>
								</div>
							</CardContent>
						</Card>
					) : null}
				</div>
			) : null}

			{data && tab === 'Estimates' ? (
				<div className="space-y-4">
					{estimateErr ? (
						<p className="text-sm text-rose-600">{estimateErr}</p>
					) : null}
					{data.estimates.map((est) => (
						<Card key={est.id}>
							<CardContent>
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<div className="text-sm font-bold">
											{estimateKindLabel(est.version)} ·{' '}
											{estimateStatusLabels[est.status] ??
												est.status}
										</div>
										<p className="text-xs text-slate-500">
											{est.items.length} позицій
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<div className="text-xl font-black">
											{formatCurrency(est.total)}
										</div>
										{est.status === 'SENT' ? (
											<>
												<Button
													type="button"
													className="min-h-9 px-4 text-xs"
													disabled={
														estimateBusyId ===
														est.id
													}
													onClick={() =>
														void approveEstimate(
															est.id
														)
													}
												>
													Погодити
												</Button>
												<Button
													type="button"
													className="min-h-9 px-4 text-xs"
													variant="secondary"
													disabled={
														estimateBusyId ===
														est.id
													}
													onClick={() => {
														setChangesComment('')
														setChangesModal({
															estimateId: est.id,
														})
													}}
												>
													Запросити зміни
												</Button>
											</>
										) : null}
										{data &&
										canClientPayEstimate(
											est.status,
											est.version,
											data.invoices,
											data.code
										) ? (
											<Link
												to={payHrefForEstimate(est)}
												className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--tds-primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
											>
												Оплатити
											</Link>
										) : null}
										{data &&
										clientInvoicePayState(
											est.status,
											est.version,
											data.invoices,
											data.code
										) === 'paid' ? (
											<Badge tone="green">
												Оплачено
											</Badge>
										) : null}
									</div>
								</div>
								<div className="mt-4 overflow-x-auto">
									<table className="w-full min-w-[520px] text-sm">
										<thead>
											<tr className="text-left text-xs uppercase text-slate-500">
												<th className="py-2">Позиція</th>
												<th className="py-2">К-сть</th>
												<th className="py-2">Од.</th>
												<th className="py-2">Сума</th>
											</tr>
										</thead>
										<tbody>
											{est.items.map((item) => (
												<tr
													key={item.id}
													className="border-t border-slate-100"
												>
													<td className="py-2 pr-3">
														{item.title}
													</td>
													<td className="py-2 pr-3">
														{item.quantity}
													</td>
													<td className="py-2 pr-3">
														{item.unit}
													</td>
													<td className="py-2 font-semibold">
														{formatCurrency(item.total)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : null}


			{data && tab === 'Photos' ? (
				<PortalProjectMediaSection code={data.code} />
			) : null}

			{data && tab === 'Payments' ? (
				<div className="space-y-4">
					<Card>
						<CardContent>
							<div className="text-xs font-bold uppercase text-slate-500">
								Рахунки
							</div>
							<div className="mt-3 divide-y divide-slate-100">
								{data.invoices.length === 0 ? (
									<p className="text-sm text-slate-600">
										Рахунків ще немає.
									</p>
								) : null}
								{data.invoices.map((inv) => (
									<div
										key={inv.id}
										className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
									>
										<div>
											<div className="font-mono text-xs text-slate-500">
												{inv.number}
											</div>
											<div className="font-semibold">
												{formatNumber(inv.amount)}{' '}
												{inv.currency}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge
												tone={
													inv.status === 'SENT'
														? 'amber'
														: 'green'
												}
											>
												{invoiceStatusLabels[inv.status] ??
													inv.status}
											</Badge>
											{inv.status === 'SENT' ? (
												<Link
													to={`/portal/invoices/pay?invoiceId=${encodeURIComponent(inv.id)}`}
													className="font-semibold text-[var(--tds-primary)] hover:underline"
												>
													Оплатити
												</Link>
											) : null}
										</div>
									</div>
								))}
							</div>
							<p className="mt-3 text-xs text-slate-500">
								<Link
									to="/portal/invoices"
									className="font-semibold text-[var(--tds-primary)] hover:underline"
								>
									Усі рахунки в кабінеті
								</Link>
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className="text-xs font-bold uppercase text-slate-500">
								Платежі
							</div>
							<div className="mt-3 divide-y divide-slate-100">
								{data.payments.length === 0 ? (
									<p className="text-sm text-slate-600">
										Платежів ще немає.
									</p>
								) : null}
								{data.payments.map((p) => (
									<div
										key={p.id}
										className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
									>
										<div>
											<div className="font-semibold">
												{formatNumber(p.amount)}{' '}
												{p.currency}
											</div>
											<div className="text-xs text-slate-500">
												{p.method}
											</div>
										</div>
										<Badge tone="neutral">
											{paymentStatusLabels[p.status] ??
												p.status}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent>
							<div className="text-xs font-bold uppercase text-slate-500">
								Чеки
							</div>
							<div className="mt-3 divide-y divide-slate-100">
								{data.receipts.length === 0 ? (
									<p className="text-sm text-slate-600">
										Чеків ще немає.
									</p>
								) : null}
								{data.receipts.map((r) => (
									<div
										key={r.id}
										className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
									>
										<div>
											<div className="font-mono text-xs text-slate-500">
												{r.number}
											</div>
											<div className="font-semibold">
												{formatNumber(r.amount)}{' '}
												{r.currency}
											</div>
											{r.invoiceNumber ? (
												<div className="text-xs text-slate-500">
													Рахунок:{' '}
													{r.invoiceId &&
													r.invoiceStatus ===
														'SENT' ? (
														<Link
															to={`/portal/invoices/pay?invoiceId=${encodeURIComponent(r.invoiceId)}`}
															className="font-semibold text-[var(--tds-primary)] hover:underline"
														>
															{r.invoiceNumber}
														</Link>
													) : (
														<Link
															to="/portal/invoices"
															className="font-semibold text-[var(--tds-primary)] hover:underline"
														>
															{r.invoiceNumber}
														</Link>
													)}
												</div>
											) : null}
										</div>
										<Badge tone="green">
											{receiptStatusLabels[r.status] ??
												r.status}
										</Badge>
									</div>
								))}
							</div>
							<p className="mt-3 text-xs text-slate-500">
								<Link
									to="/portal/receipts"
									className="font-semibold text-[var(--tds-primary)] hover:underline"
								>
									Завантажити PDF у розділі «Чеки»
								</Link>
							</p>
						</CardContent>
					</Card>
				</div>
			) : null}

			{data && tab === 'Activity' ? (
				<Card>
					<CardContent>
						<div className="space-y-3">
							{auditMerged.length === 0 ? (
								<p className="text-sm text-slate-600">
									Недавніх подій немає.
								</p>
							) : null}
							{auditMerged.map((log) => (
								<div key={log.id} className="text-sm">
									<div className="font-semibold">
										{formatAuditAction(log.action)}
									</div>
									<div className="text-xs text-slate-500">
										{formatEntityType(log.entityType)} ·{' '}
										{formatDateTime(log.createdAt)}
									</div>
								</div>
							))}
							{canLoadMoreAudit ? (
								<div className="pt-2">
									<Button
										type="button"
										variant="secondary"
										className="text-sm"
										disabled={auditLoading}
										onClick={() => void loadMoreAudit()}
									>
										{auditLoading
											? 'Завантажуємо…'
											: 'Завантажити ще'}
									</Button>
								</div>
							) : null}
						</div>
					</CardContent>
				</Card>
			) : null}

			<Modal
				open={Boolean(changesModal)}
				onClose={() => {
					setChangesModal(null)
					setChangesComment('')
				}}
				title="Запит на зміни до кошторису"
			>
				<p className="text-sm text-slate-600">
					Опишіть, що потрібно уточнити. Команда підготує оновлену
					версію кошторису.
				</p>
				<textarea
					className="mt-3 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-[var(--tds-primary)] focus:ring-2"
					placeholder="Ваш коментар…"
					value={changesComment}
					onChange={(e) => setChangesComment(e.target.value)}
				/>
				<ModalFooter className="mt-4 flex justify-end gap-2">
					<Button
						type="button"
						variant="secondary"
						onClick={() => {
							setChangesModal(null)
							setChangesComment('')
						}}
					>
						Скасувати
					</Button>
					<Button
						type="button"
						disabled={estimateBusyId !== null}
						onClick={() => void submitRequestChanges()}
					>
						Надіслати
					</Button>
				</ModalFooter>
			</Modal>
		</div>
	)
}
