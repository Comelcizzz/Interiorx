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
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import {
	formatAuditAction,
	formatDateTime,
	formatEntityType,
} from '@tailored/shared'
import { Activity } from 'lucide-react'
import { useMemo } from 'react'
import { getApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

type AuditEntry = {
	id: string
	action: string
	entityType: string
	entityId: string
	metadata?: Record<string, unknown> | null
	createdAt: string
	user?: {
		fullName: string
		email: string
	} | null
	project?: {
		code: string
		title: string
	} | null
}

const entityTone: Record<
	string,
	'neutral' | 'blue' | 'green' | 'amber' | 'red'
> = {
	Payment: 'green',
	Receipt: 'green',
	Project: 'blue',
	Estimate: 'amber',
	Task: 'neutral',
	Review: 'amber',
	Order: 'blue',
}

const entityLabels: Record<string, string> = {
	Payment: 'Платіж',
	Receipt: 'Чек',
	Project: 'Проєкт',
	Estimate: 'Кошторис',
	Task: 'Задача',
	SignedDocument: 'Документ',
	Review: 'Відгук',
	Order: 'Заявка',
	Approval: 'Погодження',
	ChangeRequest: 'Запит на зміну',
	QualityChecklist: 'Якість',
	Invoice: 'Рахунок',
}

function actionColor(action: string) {
	if (
		action.includes('approved') ||
		action.includes('paid') ||
		action.includes('completed') ||
		action.includes('signed')
	)
		return 'text-emerald-700'
	if (
		action.includes('rejected') ||
		action.includes('failed') ||
		action.includes('deleted') ||
		action.includes('cancelled')
	)
		return 'text-rose-700'
	if (action.includes('created') || action.includes('submitted'))
		return 'text-sky-700'
	return 'text-[var(--tds-dark)]'
}

export function AuditLogPage() {
	const { page, perPage, status, from, to, sort, patchParams } =
		useListQuery(15)
	const apiQs = useMemo(() => {
		const p = new URLSearchParams()
		p.set('page', String(page))
		p.set('perPage', String(perPage))
		if (status) p.set('entityType', status)
		if (from) p.set('from', from)
		if (to) p.set('to', to)
		if (sort) p.set('sort', sort)
		return p.toString()
	}, [page, perPage, status, from, to, sort])
	const filtersActive = !!(status || from || to || sort !== 'latest')

	const { data, loading, error } = useLoad(
		() => getApi<Paginated<AuditEntry>>(`/audit?${apiQs}`),
		[apiQs]
	)
	const { data: types } = useLoad(
		() =>
			getApi<
				{
					entityType: string
					count: number
				}[]
			>('/audit/entity-types'),
		[]
	)
	const entityTypeOptions = useMemo(
		() =>
			(types ?? []).map((t) => ({
				value: t.entityType,
				label: `${formatEntityType(t.entityType)} (${t.count})`,
			})),
		[types]
	)
	const totalPages = data ? Math.max(1, Math.ceil(data.total / perPage)) : 1

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			status: values.status || null,
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			status: null,
			from: null,
			to: null,
			sort: null,
		})
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Журнал дій"
				description="Події по проєктах, кошторисах, платежах, документах, задачах і клієнтських заявках."
			/>

			<ListQueryBar
				values={{ status, q: '', from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={entityTypeOptions}
				showSearch={false}
			/>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
							<Activity className="h-4 w-4 text-[var(--tds-primary)]" />
							Системні події
						</div>
						<Badge tone="neutral">{data?.total ?? 0} записів</Badge>
					</div>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					{loading ? (
						<SkeletonTable rows={8} cols={5} />
					) : error ? (
						<ErrorState message={error} />
					) : !data?.items.length ? (
						<EmptyState
							icon={<Activity />}
							title={
								filtersActive
									? 'Нічого не знайдено за обраними фільтрами'
									: 'Подій не знайдено'
							}
							description={
								filtersActive ? undefined : 'Спробуйте змінити фільтри.'
							}
						/>
					) : (
						<>
							<table className="w-full min-w-[760px] text-sm">
								<thead>
									<tr className="border-b border-white/50">
										{[
											'Час',
											'Користувач',
											'Дія',
											'Сутність',
											'Проєкт',
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
									{data.items.map((entry) => (
										<tr
											key={entry.id}
											className="border-b border-white/30 transition hover:bg-white/30"
										>
											<td className="py-3 pr-4 font-mono text-[11px] text-[var(--tds-muted)]">
												{formatDateTime(entry.createdAt)}
											</td>
											<td className="py-3 pr-4">
												<div className="font-semibold text-[var(--tds-ink)]">
													{entry.user?.fullName ??
														'Система'}
												</div>
												<div className="text-[11px] text-[var(--tds-muted)]">
													{entry.user?.email ?? '—'}
												</div>
											</td>
											<td className="py-3 pr-4">
												<span
													className={`text-sm font-semibold ${actionColor(entry.action)}`}
												>
													{formatAuditAction(
														entry.action
													)}
												</span>
												{typeof entry.metadata
													?.comment === 'string' &&
												entry.metadata.comment.trim() ? (
													<div className="mt-1 max-w-md text-xs text-slate-600">
														Коментар:{' '}
														{entry.metadata.comment}
													</div>
												) : null}
											</td>
											<td className="py-3 pr-4">
												<Badge
													tone={
														entityTone[
															entry.entityType
														] ?? 'neutral'
													}
												>
													{formatEntityType(
														entry.entityType
													)}
												</Badge>
											</td>
											<td className="py-3 pr-4">
												{entry.project ? (
													<div>
														<div className="font-mono text-xs font-bold text-[var(--tds-dark)]">
															{entry.project.code}
														</div>
														<div className="max-w-56 truncate text-xs text-slate-500">
															{entry.project.title}
														</div>
													</div>
												) : (
													<span className="text-xs text-[var(--tds-muted)]">
														—
													</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
								<span className="text-sm text-slate-500">
									Сторінка {page} з {totalPages}
								</span>
								<div className="flex gap-2">
									<Button
										type="button"
										variant="secondary"
										disabled={page <= 1}
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
										disabled={page >= totalPages}
										onClick={() =>
											patchParams({
												page: String(
													Math.min(totalPages, page + 1)
												),
											})
										}
									>
										Далі
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
