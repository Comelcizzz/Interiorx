import { Badge, Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { formatNumber, invoiceStatusLabels } from '@tailored/shared'
import { Link } from 'react-router-dom'
import { portalApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import {
	SearchableSelect,
	perPageSelectOptions,
} from '@/components/SearchableSelect'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

type PortalInvoiceRow = {
	id: string
	number: string
	status: string
	amount: string
	currency: string
	projectId: string
	projectCode: string
	dueDate?: string | null
	createdAt?: string | null
}

const invoiceStatusOptions = [
	{ value: 'SENT', label: 'Очікує оплати' },
	{ value: 'PAID', label: invoiceStatusLabels.PAID },
	{ value: 'DRAFT', label: invoiceStatusLabels.DRAFT },
	{ value: 'OVERDUE', label: invoiceStatusLabels.OVERDUE },
	{ value: 'CANCELLED', label: invoiceStatusLabels.CANCELLED },
]

function invoiceStatusLabel(status: string) {
	if (status === 'SENT') return 'Очікує оплати'
	return (
		invoiceStatusLabels[status as keyof typeof invoiceStatusLabels] ??
		status
	)
}

export function PortalInvoicesPage() {
	const { page, perPage, status, q, from, to, sort, queryString, patchParams } =
		useListQuery(10)
	const { data, loading, error } = useLoad(
		() =>
			portalApi
				.get<Paginated<PortalInvoiceRow>>(`/invoices?${queryString}`)
				.then((r) => r.data),
		[queryString]
	)
	const items = data?.items ?? []
	const totalPages = data
		? Math.max(1, Math.ceil(data.total / data.perPage))
		: 1

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

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title="Рахунки"
				description="Оплачуйте відкриті рахунки карткою та завантажуйте онлайн-чеки після підтвердження платежу."
			/>

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={invoiceStatusOptions}
				showSearch
				searchPlaceholder="Номер рахунку або код проєкту…"
			/>

			<Card>
				<CardContent className="pt-6">
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
						<p className="text-sm text-slate-500">Завантаження…</p>
					) : error ? (
						<p className="text-sm text-red-600">{error}</p>
					) : items.length === 0 ? (
						<p className="text-sm text-slate-500">
							Нічого не знайдено за обраними фільтрами
						</p>
					) : (
						<ul className="divide-y divide-slate-100">
							{items.map((inv) => (
								<li
									key={inv.id}
									className="flex flex-wrap items-center justify-between gap-3 py-4"
								>
									<div>
										<div className="font-bold text-[var(--tds-ink)]">
											{inv.number}
											{inv.projectCode ? (
												<span className="ml-2 text-sm font-normal text-slate-500">
													{inv.projectCode}
												</span>
											) : null}
										</div>
										<div className="text-sm text-slate-600">
											{formatNumber(inv.amount)} {inv.currency}
											{inv.dueDate ? (
												<span className="ml-2">
													· до{' '}
													{new Date(inv.dueDate).toLocaleDateString(
														'uk-UA'
													)}
												</span>
											) : null}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge tone={inv.status === 'PAID' ? 'green' : 'amber'}>
											{invoiceStatusLabel(inv.status)}
										</Badge>
										{inv.status === 'SENT' ? (
											<Link
												to={`/portal/invoices/pay?invoiceId=${encodeURIComponent(inv.id)}`}
												className="inline-flex h-9 items-center justify-center rounded-xl bg-[var(--tds-primary)] px-3 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
											>
												Оплатити
											</Link>
										) : null}
									</div>
								</li>
							))}
						</ul>
					)}
					{data && totalPages > 1 ? (
						<div className="mt-4 flex justify-center gap-2">
							<Button
								variant="secondary"
								disabled={page <= 1}
								onClick={() =>
									patchParams({ page: String(page - 1) })
								}
							>
								Назад
							</Button>
							<span className="self-center text-sm text-slate-600">
								{page} / {totalPages}
							</span>
							<Button
								variant="secondary"
								disabled={page >= totalPages}
								onClick={() =>
									patchParams({ page: String(page + 1) })
								}
							>
								Далі
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
