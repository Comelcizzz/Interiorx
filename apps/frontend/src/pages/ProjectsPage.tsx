import {
	Badge,
	Button,
	Card,
	CardContent,
	EmptyState,
	ErrorState,
	PageHeader,
	SkeletonRow,
} from '@tailored/ui'
import { SearchableSelect } from '@/components/SearchableSelect'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { formatNumber, projectStatusLabels } from '@tailored/shared'
import {
	CalendarClock,
	Eye,
	FolderOpen,
	MapPin,
	WalletCards,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getApi } from '@/lib/api'
import { Paginated, ProjectListItem } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'
const toneByStatus = {
	DRAFT: 'neutral',
	ESTIMATION: 'amber',
	DESIGN: 'blue',
	APPROVED: 'green',
	IN_PROGRESS: 'blue',
	PAUSED: 'amber',
	COMPLETED: 'green',
	CANCELLED: 'red',
	WARRANTY: 'neutral',
} as const
const progressByStatus: Record<string, number> = {
	DRAFT: 5,
	ESTIMATION: 20,
	DESIGN: 35,
	APPROVED: 50,
	IN_PROGRESS: 70,
	PAUSED: 70,
	COMPLETED: 100,
	CANCELLED: 0,
	WARRANTY: 100,
}
export function ProjectsPage() {
	const { page, perPage, status, q, from, to, sort, queryString, patchParams, searchParams } =
		useListQuery(20)
	const city = searchParams.get('city') ?? ''
	const apiQs = useMemo(() => {
		const p = new URLSearchParams(queryString)
		if (city) p.set('city', city)
		return p.toString()
	}, [queryString, city])
	const filtersActive = !!(status || q || from || to || sort !== 'latest' || city)
	const { data, loading, error } = useLoad(
		() => getApi<Paginated<ProjectListItem>>(`/projects?${apiQs}`),
		[apiQs]
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
			city: null,
		})
	}

	const projectStatusOptions = Object.keys(toneByStatus).map((s) => ({
		value: s,
		label:
			projectStatusLabels[s as keyof typeof projectStatusLabels] ?? s,
	}))
	if (error)
		return (
			<div className="space-y-5">
				<PageHeader title="Проєкти" />
				<ErrorState message={error} />
			</div>
		)
	const totalPages = data
		? Math.max(1, Math.ceil(data.total / data.perPage))
		: 1
	return (
		<div className="space-y-6">
			<PageHeader
				title="Проєкти"
				description="Дизайн, кошториси, команди, платежі та стан виконання."
			/>

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				statusOptions={projectStatusOptions}
				showSearch
				searchPlaceholder="Код, назва або клієнт…"
				extraFields={
					<label className="block min-w-[140px]">
						<span className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
							Місто
						</span>
						<SearchableSelect
							value={city}
							onChange={(v) =>
								patchParams({ page: '1', city: v || null })
							}
							options={[
								{ value: '', label: 'Усі' },
								{ value: 'Київ', label: 'Київ' },
								{ value: 'Львів', label: 'Львів' },
								{ value: 'Одеса', label: 'Одеса' },
								{ value: 'Харків', label: 'Харків' },
								{ value: 'Дніпро', label: 'Дніпро' },
							]}
						/>
					</label>
				}
			/>

			{loading ? (
				<Card>
					<CardContent>
						{Array.from({ length: 5 }).map((_, i) => (
							<SkeletonRow key={i} />
						))}
					</CardContent>
				</Card>
			) : !data?.items.length ? (
				<EmptyState
					icon={<FolderOpen />}
					title={
						filtersActive
							? 'Нічого не знайдено за обраними фільтрами'
							: 'Проєктів ще немає'
					}
					description={
						filtersActive
							? undefined
							: 'Створіть перший проєкт, щоб почати роботу.'
					}
				/>
			) : (
				<div className="space-y-4">
					{data.items.map((project) => {
						const progress = progressByStatus[project.status] ?? 0
						return (
							<Card key={project.id}>
								<CardContent>
									<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="rounded-full border border-white/60 bg-white/50 px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--tds-muted)]">
													{project.code}
												</span>
												<Badge
													tone={
														toneByStatus[
															project.status
														]
													}
												>
													{
														projectStatusLabels[
															project.status
														]
													}
												</Badge>
											</div>
											<h2 className="mt-2.5 text-lg font-black text-[var(--tds-ink)]">
												{project.title}
											</h2>
											<div className="mt-1 flex flex-wrap gap-3 text-sm text-[var(--tds-muted)]">
												<span>
													Клієнт:{' '}
													<span className="font-semibold text-[var(--tds-dark)]">
														{project.clientName}
													</span>
												</span>
												<span>
													Менеджер:{' '}
													<span className="font-semibold text-[var(--tds-dark)]">
														{project.managerName ??
															'—'}
													</span>
												</span>
											</div>

											<div className="mt-3 flex items-center gap-3">
												<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
													<div
														className="h-full rounded-full bg-[var(--tds-primary)] transition-all duration-500"
														style={{
															width: `${progress}%`,
														}}
													/>
												</div>
												<span className="text-xs font-bold text-[var(--tds-muted)]">
													{progress}%
												</span>
											</div>

											<div className="mt-4">
												<Link
													to={`/workspace/projects/${project.id}`}
													className="inline-flex h-9 items-center gap-2 rounded-full border border-white/72 bg-white/62 px-4 text-sm font-semibold text-[var(--tds-ink)] transition hover:bg-white hover:shadow-sm"
												>
													<Eye className="h-3.5 w-3.5" />
													Відкрити проєкт
												</Link>
											</div>
										</div>

										<div className="grid gap-3 text-sm sm:grid-cols-3 lg:w-[480px] lg:shrink-0">
											<div className="rounded-[14px] border border-white/60 bg-white/40 px-3 py-2.5">
												<div className="flex items-center gap-1.5 text-[var(--tds-muted)]">
													<MapPin className="h-3.5 w-3.5" />
													<span className="text-[11px] font-bold uppercase tracking-[0.12em]">
														Місто
													</span>
												</div>
												<div className="mt-1.5 font-bold text-[var(--tds-ink)]">
													{project.city ?? '—'}
												</div>
											</div>
											<div className="rounded-[14px] border border-white/60 bg-white/40 px-3 py-2.5">
												<div className="flex items-center gap-1.5 text-[var(--tds-muted)]">
													<WalletCards className="h-3.5 w-3.5" />
													<span className="text-[11px] font-bold uppercase tracking-[0.12em]">
														Бюджет
													</span>
												</div>
												<div className="mt-1.5 font-bold text-[var(--tds-ink)]">
													{formatNumber(
														project.budgetApproved ??
															project.budgetPlanned
													)}{' '}
													₴
												</div>
											</div>
											<div className="rounded-[14px] border border-white/60 bg-white/40 px-3 py-2.5">
												<div className="flex items-center gap-1.5 text-[var(--tds-muted)]">
													<CalendarClock className="h-3.5 w-3.5" />
													<span className="text-[11px] font-bold uppercase tracking-[0.12em]">
														Робота
													</span>
												</div>
												<div className="mt-1.5 font-bold text-[var(--tds-ink)]">
													{project.counters.tasks} задач ·{' '}
													{
														project.counters
															.changeRequests
													}
													змін
												</div>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						)
					})}
				</div>
			)}
			{data && totalPages > 1 ? (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/70 bg-white/55 px-4 py-3">
					<span className="text-sm text-slate-600">
						Сторінка {data.page} з {totalPages} · показано{' '}
						{data.items.length} з {data.total}
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
			) : null}
		</div>
	)
}
