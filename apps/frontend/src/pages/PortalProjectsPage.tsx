import { Button, PageHeader } from '@tailored/ui'
import {
	projectStatusLabels,
	type ProjectStatusCode,
} from '@tailored/shared'
import { Link, useNavigate } from 'react-router-dom'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { portalApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

type PortalProject = {
	id: string
	code: string
	title: string
	clientStatusLabel: string
	clientStatusKey?: string
	status: string
}

const statusFilterOptions: Array<{ value: string; label: string }> = (
	Object.keys(projectStatusLabels) as ProjectStatusCode[]
).map((code) => ({
	value: code,
	label: projectStatusLabels[code],
}))

export function PortalProjectsPage() {
	const navigate = useNavigate()
	const { page, perPage, status, q, from, to, sort, queryString, patchParams } =
		useListQuery(10)
	const filtersActive = !!(status || q || from || to || sort !== 'latest')

	const { data, loading, error } = useLoad(
		() =>
			portalApi
				.get<Paginated<PortalProject>>(`/projects?${queryString}`)
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

	const lastPage = data
		? Math.max(1, Math.ceil(data.total / data.perPage))
		: 1

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<PageHeader
					title="Мої проєкти"
					description="Статус етапів і дії, які потребують вашої уваги."
				/>
				<Button
					type="button"
					variant="secondary"
					onClick={() => navigate('/portal/orders/new')}
				>
					Нова заявка
				</Button>
			</div>

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={statusFilterOptions}
				showSearch
				searchPlaceholder="Код або назва"
			/>

			{loading ? (
				<p className="text-sm text-slate-500">Завантаження...</p>
			) : null}
			{error ? <p className="text-sm text-rose-600">{error}</p> : null}
			{!loading && !error && data?.items.length === 0 ? (
				<p className="text-sm text-slate-600">
					{filtersActive
						? 'Нічого не знайдено за обраними фільтрами'
						: 'Проєктів ще немає.'}
				</p>
			) : null}
			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
				<table className="w-full text-left text-sm">
					<thead className="bg-slate-50 text-xs uppercase text-slate-500">
						<tr>
							<th className="px-4 py-3">Код</th>
							<th className="px-4 py-3">Назва</th>
							<th className="px-4 py-3">Статус для вас</th>
							<th className="px-4 py-3">Дія</th>
						</tr>
					</thead>
					<tbody>
						{data?.items.map((project) => (
							<tr key={project.id} className="border-t border-slate-100">
								<td className="px-4 py-3 font-mono text-xs">{project.code}</td>
								<td className="px-4 py-3">{project.title}</td>
								<td className="px-4 py-3">
									{project.clientStatusLabel ?? project.status}
								</td>
								<td className="px-4 py-3">
									<Link
										className="text-[var(--tds-primary)]"
										to={`/portal/projects/${project.code}`}
									>
										Відкрити
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{data ? (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<Button
						type="button"
						variant="ghost"
						disabled={page <= 1}
						onClick={() => patchParams({ page: String(page - 1) })}
					>
						Назад
					</Button>
					<span className="text-sm text-slate-500">
						Сторінка {data.page} з {lastPage}
					</span>
					<Button
						type="button"
						variant="ghost"
						disabled={page >= lastPage}
						onClick={() => patchParams({ page: String(page + 1) })}
					>
						Далі
					</Button>
				</div>
			) : null}
		</div>
	)
}
