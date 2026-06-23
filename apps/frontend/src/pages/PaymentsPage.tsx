import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
	Input,
	PageHeader,
	SkeletonTable,
} from '@tailored/ui'
import { SearchableSelect } from '@/components/SearchableSelect'
import { formatNumber, paymentStatusLabels, sortLabels } from '@tailored/shared'
import { Download, Receipt } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { downloadFile, getApi, patchApi } from '@/lib/api'
import type { Paginated, PaymentRow, ProjectListItem } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
import { useAuthStore } from '@/lib/auth-store'

const toneByStatus = {
	PENDING: 'amber',
	PAID: 'green',
	FAILED: 'red',
	REFUNDED: 'neutral',
} as const

function paymentMethodLabel(method?: string) {
	const key = (method ?? '').toLowerCase()
	if (key.includes('card')) return 'Картка'
	if (key.includes('bank')) return 'Банківський переказ'
	if (key.includes('cash')) return 'Готівка'
	return method || 'Платіж'
}

type PaymentRowWithReceipt = PaymentRow & {
	receipt?: { id: string; number: string; status?: string } | null
}

export function PaymentsPage() {
	const role = useAuthStore((s) => s.user?.role)
	const canRefund = role === 'ADMIN' || role === 'PROJECT_MANAGER'

	const [searchParams, setSearchParams] = useSearchParams()
	const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
	const perPageRaw = Number(searchParams.get('perPage') ?? '20') || 20
	const perPage = Math.min(100, Math.max(5, perPageRaw))
	const status = (searchParams.get('status') ?? '').trim()
	const projectId = (searchParams.get('projectId') ?? '').trim()
	const from = (searchParams.get('from') ?? '').trim()
	const to = (searchParams.get('to') ?? '').trim()
	const sortRaw = searchParams.get('sort') ?? 'latest'
	const sort = sortRaw === 'oldest' ? 'oldest' : 'latest'

	const [statusDraft, setStatusDraft] = useState(status)
	const [projectDraft, setProjectDraft] = useState(projectId)
	const [fromDraft, setFromDraft] = useState(from)
	const [toDraft, setToDraft] = useState(to)
	const [sortDraft, setSortDraft] = useState(sort)
	useEffect(() => setStatusDraft(status), [status])
	useEffect(() => setProjectDraft(projectId), [projectId])
	useEffect(() => setFromDraft(from), [from])
	useEffect(() => setToDraft(to), [to])
	useEffect(() => setSortDraft(sort), [sort])

	function patchParams(next: Record<string, string | null>) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev)
				for (const [k, v] of Object.entries(next)) {
					if (v === null || v === '') n.delete(k)
					else n.set(k, v)
				}
				return n
			},
			{ replace: true }
		)
	}

	const qs = new URLSearchParams()
	qs.set('page', String(page))
	qs.set('perPage', String(perPage))
	if (status) qs.set('status', status)
	if (projectId) qs.set('projectId', projectId)
	if (from) qs.set('from', from)
	if (to) qs.set('to', to)
	if (sort) qs.set('sort', sort)
	const queryString = qs.toString()

	const payments = useLoad(
		() =>
			getApi<Paginated<PaymentRowWithReceipt>>(`/payments?${queryString}`),
		[queryString]
	)

	const projects = useLoad(
		() =>
			getApi<Paginated<ProjectListItem>>(
				'/projects?page=1&perPage=200'
			).then((r) => r.items),
		[]
	)

	async function refund(id: string) {
		if (!window.confirm('Позначити платіж як повернений і анулювати чек?')) return
		try {
			await patchApi(`/payments/${encodeURIComponent(id)}/refund`, {})
			payments.reload()
		} catch {
			window.alert('Не вдалося виконати повернення.')
		}
	}

	const paidTotal =
		payments.data?.items
			?.filter((p) => p.status === 'PAID')
			.reduce((s, p) => s + Number(p.amount), 0) ?? 0
	const pendingTotal =
		payments.data?.items
			?.filter((p) => p.status === 'PENDING')
			.reduce((s, p) => s + Number(p.amount), 0) ?? 0
	const loadError = payments.error ?? projects.error
	if (loadError) {
		return (
			<div className="space-y-6">
				<PageHeader
					title="Платежі"
					description="Історія транзакцій і проведення оплат по проєктах."
				/>
				<ErrorState message={loadError} />
			</div>
		)
	}

	const lastPage = payments.data
		? Math.max(1, Math.ceil(payments.data.total / payments.data.perPage))
		: 1

	return (
		<div className="space-y-6">
			<PageHeader
				title="Платежі"
				description="Історія транзакцій по проєктах, фільтри та керування статусами."
			/>

			<div className="grid gap-4 sm:grid-cols-3">
				{[
					{
						label: 'Записів на сторінці',
						value: payments.data?.items.length ?? '—',
						color: 'text-[var(--tds-ink)]',
					},
					{
						label: 'Оплачено (вибірка)',
						value: `${formatNumber(paidTotal)} грн`,
						color: 'text-emerald-700',
					},
					{
						label: 'Очікує (вибірка)',
						value: `${formatNumber(pendingTotal)} грн`,
						color: 'text-amber-700',
					},
				].map((s) => (
					<Card key={s.label}>
						<CardContent className="py-4">
							<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								{s.label}
							</div>
							<div className={`mt-2 text-2xl font-black ${s.color}`}>
								{s.value}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardContent className="space-y-4 py-5">
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Фільтри
					</div>
					<form
						className="flex flex-wrap items-end gap-3"
						onSubmit={(e) => {
							e.preventDefault()
							patchParams({
								status: statusDraft || null,
								projectId: projectDraft || null,
								from: fromDraft || null,
								to: toDraft || null,
								sort: sortDraft,
								page: '1',
							})
						}}
					>
						<label className="block min-w-[140px]">
							<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Статус
							</span>
							<SearchableSelect
								value={statusDraft}
								onChange={setStatusDraft}
								options={[
									{ value: '', label: 'Усі' },
									...Object.keys(paymentStatusLabels).map(
										(k) => ({
											value: k,
											label:
												paymentStatusLabels[
													k as keyof typeof paymentStatusLabels
												],
										})
									),
								]}
							/>
						</label>
						<label className="block min-w-[200px] flex-1">
							<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Проєкт
							</span>
							<SearchableSelect
								value={projectDraft}
								onChange={setProjectDraft}
								placeholder="Усі проєкти"
								options={[
									{ value: '', label: 'Усі проєкти' },
									...(projects.data?.map((p) => ({
										value: p.id,
										label: `${p.code} — ${p.title}`,
										searchText: `${p.code} ${p.title}`,
									})) ?? []),
								]}
							/>
						</label>
						<label className="block min-w-[140px]">
							<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Від (дата)
							</span>
							<Input
								type="date"
								value={fromDraft}
								onChange={(e) => setFromDraft(e.target.value)}
							/>
						</label>
						<label className="block min-w-[140px]">
							<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								До (дата)
							</span>
							<Input
								type="date"
								value={toDraft}
								onChange={(e) => setToDraft(e.target.value)}
							/>
						</label>
						<label className="block min-w-[160px]">
							<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Сортування
							</span>
							<SearchableSelect
								value={sortDraft}
								onChange={(v) =>
									setSortDraft(v === 'oldest' ? 'oldest' : 'latest')
								}
								options={[
									{ value: 'latest', label: sortLabels.latest },
									{ value: 'oldest', label: sortLabels.oldest },
								]}
							/>
						</label>
						<Button type="submit">Застосувати</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => {
								setStatusDraft('')
								setProjectDraft('')
								setFromDraft('')
								setToDraft('')
								setSortDraft('latest')
								patchParams({
									status: null,
									projectId: null,
									from: null,
									to: null,
									sort: null,
									page: '1',
								})
							}}
						>
							Скинути
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
					<CardHeader>
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Історія операцій
						</div>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						{payments.loading ? (
							<SkeletonTable rows={6} cols={6} />
						) : !payments.data?.items.length ? (
							<EmptyState
								icon={<Receipt />}
								title="Платежів не знайдено"
								description="Змініть фільтри або дочекайтесь оплати від клієнта в порталі."
							/>
						) : (
							<table className="w-full min-w-[720px] text-sm">
								<thead>
									<tr className="border-b border-white/50">
										{[
											'Проєкт',
											'Сума',
											'Метод',
											'Статус',
											'Чек',
											'Дії',
										].map((h) => (
											<th
												key={h}
												className="py-3 pr-4 text-left text-[11px] font-black uppercase tracking-[0.12em] text-[var(--tds-muted)]"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{payments.data.items.map((pay) => (
										<tr
											key={pay.id}
											className="border-b border-white/30 transition hover:bg-white/30"
										>
											<td className="py-3 pr-4">
												<div className="font-semibold text-[var(--tds-ink)]">
													{pay.projectCode}
												</div>
												<div className="text-xs text-[var(--tds-muted)]">
													{pay.projectTitle}
												</div>
											</td>
											<td className="py-3 pr-4 font-bold text-[var(--tds-ink)]">
												{formatNumber(pay.amount)} грн
											</td>
											<td className="py-3 pr-4 text-xs font-semibold text-[var(--tds-muted)]">
												{paymentMethodLabel(pay.method)}
											</td>
											<td className="py-3 pr-4">
												<Badge
													tone={
														toneByStatus[
															pay.status as keyof typeof toneByStatus
														] ?? 'neutral'
													}
												>
													{paymentStatusLabels[
														pay.status as keyof typeof paymentStatusLabels
													] ?? pay.status}
												</Badge>
											</td>
											<td className="py-3 pr-4">
												{pay.receipt?.id ? (
													<div className="flex flex-col gap-1">
														<button
															className="flex w-fit items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-2.5 py-1 text-xs font-semibold text-[var(--tds-ink)] transition hover:bg-white"
															type="button"
															onClick={() =>
																downloadFile(
																	`/receipts/${pay.receipt?.id}/pdf`,
																	`receipt-${pay.receipt?.id}.pdf`
																)
															}
														>
															<Download className="h-3 w-3" />
															PDF
														</button>
														{pay.receipt?.status === 'VOIDED' ? (
															<span className="text-[10px] text-rose-600">
																Анульовано
															</span>
														) : null}
													</div>
												) : (
													<span className="text-xs text-[var(--tds-muted)]">
														—
													</span>
												)}
											</td>
											<td className="py-3 pr-4">
												{canRefund && pay.status === 'PAID' ? (
													<Button
														type="button"
														variant="ghost"
														className="px-2 text-rose-700"
														onClick={() => void refund(pay.id)}
													>
														Повернення
													</Button>
												) : (
													<span className="text-xs text-[var(--tds-muted)]">—</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
						{payments.data ? (
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<p className="text-sm text-slate-500">
									Сторінка {payments.data.page} з {lastPage} · усього{' '}
									{payments.data.total}
								</p>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="ghost"
										disabled={page <= 1}
										onClick={() =>
											patchParams({ page: String(Math.max(1, page - 1)) })
										}
									>
										Назад
									</Button>
									<Button
										type="button"
										variant="ghost"
										disabled={page >= lastPage}
										onClick={() =>
											patchParams({
												page: String(Math.min(lastPage, page + 1)),
											})
										}
									>
										Далі
									</Button>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
		</div>
	)
}
