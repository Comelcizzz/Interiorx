import { Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable, type DataTableColumn } from '@/components/DataTable'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { portalApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import {
	SearchableSelect,
	perPageSelectOptions,
} from '@/components/SearchableSelect'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

type PortalOrder = {
	id: string
	code: string
	title: string
	status: string
	clientStatusLabel: string
	project?: {
		code: string
	} | null
}

export function PortalOrdersPage() {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const { page, perPage, status, q, from, to, sort, queryString, patchParams } =
		useListQuery(10)
	const showNewHint = searchParams.get('new') === '1'
	const filtersActive = !!(status || q || from || to || sort !== 'latest')

	const { data, loading, error } = useLoad(
		() =>
			portalApi
				.get<Paginated<PortalOrder>>(`/orders?${queryString}`)
				.then((r) => r.data),
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

	const columns: DataTableColumn<PortalOrder>[] = [
		{
			id: 'code',
			header: 'Код',
			cell: (o) => <span className="font-mono text-xs">{o.code}</span>,
		},
		{ id: 'title', header: 'Назва', cell: (o) => o.title },
		{
			id: 'status',
			header: 'Статус',
			cell: (o) => <span>{o.clientStatusLabel ?? o.status}</span>,
		},
		{
			id: 'action',
			header: '',
			className: 'w-28 text-right',
			cell: (o) => (
				<Link
					className="text-sm font-medium text-[var(--tds-primary)]"
					to={`/portal/orders/${o.code}`}
				>
					Відкрити
				</Link>
			),
		},
	]

	const lastPage = data
		? Math.max(1, Math.ceil(data.total / data.perPage))
		: 1

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<PageHeader
					title="Мої заявки"
					description="Відстежуйте статус заявки та перетворення на проєкт."
				/>
				<Button type="button" onClick={() => navigate('/portal/orders/new')}>
					Нова заявка
				</Button>
			</div>

			{showNewHint ? (
				<Card className="border-[rgba(38,132,91,0.35)] bg-[rgba(38,132,91,0.06)]">
					<CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
						<p className="text-sm text-slate-700">
							Заповніть форму заявки — це перший крок до старту проєкту.
						</p>
						<div className="flex flex-wrap gap-2">
							<Button type="button" onClick={() => navigate('/portal/orders/new')}>
								Перейти до форми
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={() => patchParams({ new: null })}
							>
								Закрити
							</Button>
						</div>
					</CardContent>
				</Card>
			) : null}

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				showSearch
				searchPlaceholder="Код або назва"
			/>

			{loading ? (
				<p className="text-sm text-slate-500">Завантаження…</p>
			) : null}
			{error ? <p className="text-sm text-rose-600">{error}</p> : null}
			<DataTable
				columns={columns}
				rows={data?.items ?? []}
				getRowId={(o) => o.id}
				emptyLabel={
					filtersActive
						? 'Нічого не знайдено за обраними фільтрами'
						: 'Заявок ще немає.'
				}
			/>
			{data ? (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-slate-500">
						Сторінка {data.page} з {lastPage} · усього {data.total}
					</p>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-2 text-sm text-slate-600">
							На сторінці
							<SearchableSelect
								className="w-[100px]"
								value={String(perPage)}
								onChange={(v) =>
									patchParams({
										perPage: v,
										page: '1',
									})
								}
								options={perPageSelectOptions([5, 10, 20, 50])}
							/>
						</label>
						<Button
							type="button"
							variant="ghost"
							disabled={page <= 1}
							onClick={() => patchParams({ page: String(page - 1) })}
						>
							Назад
						</Button>
						<Button
							type="button"
							variant="ghost"
							disabled={page >= lastPage}
							onClick={() => patchParams({ page: String(page + 1) })}
						>
							Далі
						</Button>
					</div>
				</div>
			) : null}
		</div>
	)
}
