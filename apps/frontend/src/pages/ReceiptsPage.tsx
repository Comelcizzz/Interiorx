import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
	PageHeader,
	SkeletonTable,
} from '@tailored/ui'
import { formatNumber, receiptStatusLabels } from '@tailored/shared'
import { Download, Receipt } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { useListQuery } from '@/lib/use-list-query'
import {
	SearchableSelect,
	perPageSelectOptions,
} from '@/components/SearchableSelect'
import { downloadFile, getApi } from '@/lib/api'
import { Paginated, ReceiptRow } from '@/lib/types'
import { useLoad } from '@/lib/use-load'

const receiptStatusOptions = [
	{ value: 'ISSUED', label: 'Видано' },
	{ value: 'VOIDED', label: 'Анульовано' },
]

export function ReceiptsPage() {
	const location = useLocation()
	const portal = location.pathname.startsWith('/portal')
	const { page, perPage, status, q, from, to, sort, queryString, patchParams } =
		useListQuery(10)
	const { data, loading, error } = useLoad(
		() => getApi<Paginated<ReceiptRow>>(`/receipts?${queryString}`),
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
	return (
		<div className="space-y-6">
			<PageHeader
				title="Онлайн-чеки"
				description="Чеки для завантаження після успішних оплат."
			/>

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={receiptStatusOptions}
				showSearch
				searchPlaceholder="Номер чека…"
			/>

			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Архів чеків
						</div>
						{data ? (
							<span className="text-sm text-slate-600">
								{items.length} з {data.total}
							</span>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					<div className="mb-3 flex justify-end">
						<label className="mr-auto flex items-center gap-2 text-sm text-slate-600">
							На сторінці
							<SearchableSelect
								className="w-[100px]"
								value={String(perPage)}
								onChange={(v) =>
									patchParams({
										page: '1',
										perPage: v,
									})
								}
								options={perPageSelectOptions([5, 10, 20, 50])}
							/>
						</label>
					</div>
					{loading ? (
						<SkeletonTable rows={5} cols={6} />
					) : error ? (
						<ErrorState message={error} />
					) : items.length === 0 ? (
						<EmptyState
							icon={<Receipt />}
							title={
								status || q || from || to
									? 'Нічого не знайдено за обраними фільтрами'
									: 'Чеків ще немає'
							}
							description={
								status || q || from || to
									? 'Спробуйте змінити фільтри або скинути їх.'
									: 'Чеки створюються після успішної оплати рахунку.'
							}
						/>
					) : (
						<table className="w-full min-w-[720px] text-sm">
							<thead>
								<tr className="border-b border-white/50">
									{[
										'Номер',
										'Проєкт',
										'Клієнт',
										'Рахунок',
										'Сума',
										'Статус',
										'PDF',
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
								{items.map((receipt) => (
									<tr
										key={receipt.id}
										className="border-b border-white/30 transition hover:bg-white/30"
									>
										<td className="py-3 pr-4 font-mono text-xs font-bold text-[var(--tds-ink)]">
											{receipt.number}
										</td>
										<td className="py-3 pr-4">
											<div className="font-semibold text-[var(--tds-ink)]">
												{receipt.projectCode}
											</div>
											<div className="text-xs text-[var(--tds-muted)]">
												{receipt.projectTitle}
											</div>
										</td>
										<td className="py-3 pr-4 text-[var(--tds-dark)]">
											{receipt.clientName}
										</td>
										<td className="py-3 pr-4 text-sm text-[var(--tds-dark)]">
											{receipt.invoiceNumber ? (
												portal &&
												receipt.invoiceId &&
												receipt.invoiceStatus ===
													'SENT' ? (
													<Link
														to={`/portal/invoices/pay?invoiceId=${encodeURIComponent(receipt.invoiceId)}`}
														className="font-semibold text-[var(--tds-primary)] underline"
													>
														{receipt.invoiceNumber}{' '}
														(оплатити)
													</Link>
												) : portal ? (
													<Link
														to="/portal/invoices"
														className="font-semibold text-[var(--tds-primary)] underline"
													>
														{receipt.invoiceNumber}
													</Link>
												) : (
													<span className="font-mono text-xs font-semibold">
														{receipt.invoiceNumber}
													</span>
												)
											) : (
												<span className="text-[var(--tds-muted)]">
													—
												</span>
											)}
										</td>
										<td className="py-3 pr-4 font-bold text-[var(--tds-ink)]">
											{formatNumber(receipt.amount)}{' '}
											{receipt.currency}
										</td>
										<td className="py-3 pr-4">
											<Badge tone="green">
												{receiptStatusLabels[
													receipt.status
												] ?? receipt.status}
											</Badge>
										</td>
										<td className="py-3 pr-4">
											<button
												type="button"
												className="flex items-center gap-1.5 rounded-full border border-white/60 bg-white/50 px-2.5 py-1 text-xs font-semibold text-[var(--tds-ink)] transition hover:bg-white"
												onClick={() =>
													downloadFile(
														`/receipts/${receipt.id}/pdf`,
														`${receipt.number}.pdf`
													)
												}
											>
												<Download className="h-3 w-3" />
												Завантажити
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
					{data && data.total > data.perPage ? (
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-3">
							<span className="text-sm text-slate-600">
								Сторінка {data.page} з {totalPages}
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
				</CardContent>
			</Card>
		</div>
	)
}
