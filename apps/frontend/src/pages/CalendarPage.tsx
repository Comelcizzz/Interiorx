import {
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
	PageHeader,
	Skeleton,
} from '@tailored/ui'
import { formatDate, taskStatusLabels } from '@tailored/shared'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { getApi } from '@/lib/api'
import { CalendarData } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
function isoDate(d: Date) {
	return d.toISOString().slice(0, 10)
}
function startOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), 1)
}
function daysInMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
}
const statusDot: Record<string, string> = {
	DONE: 'bg-emerald-500',
	IN_PROGRESS: 'bg-blue-500',
	BLOCKED: 'bg-red-500',
	REVIEW: 'bg-purple-500',
	READY: 'bg-amber-500',
	BACKLOG: 'bg-slate-400',
}
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']
export function CalendarPage() {
	const [current, setCurrent] = useState(() => startOfMonth(new Date()))
	const from = isoDate(current)
	const to = isoDate(
		new Date(current.getFullYear(), current.getMonth() + 1, 0)
	)
	const { data, loading, error } = useLoad(
		() =>
			getApi<CalendarData>(`/operations/calendar?from=${from}&to=${to}`),
		[from, to]
	)
	const days = daysInMonth(current)
	const firstDow = (current.getDay() + 6) % 7
	function prev() {
		setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))
	}
	function next() {
		setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))
	}
	const tasksByDay = new Map<string, CalendarData['tasks']>()
	const projectsByDay = new Map<string, CalendarData['projects']>()
	if (data) {
		for (const t of data.tasks) {
			if (!t.dueDate) continue
			const k = t.dueDate.slice(0, 10)
			tasksByDay.set(k, [...(tasksByDay.get(k) ?? []), t])
		}
		for (const p of data.projects) {
			if (p.dueDate) {
				const k = p.dueDate.slice(0, 10)
				projectsByDay.set(k, [...(projectsByDay.get(k) ?? []), p])
			}
		}
	}
	const monthLabel = formatDate(current, { month: 'long', year: 'numeric' }, 'uk-UA')
	const today = isoDate(new Date())
	const allEvents = data
		? [
				...data.tasks.filter((t) => t.dueDate),
				...data.projects.filter((p) => p.dueDate),
			].sort((a, b) => ((a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : 1))
		: []
	return (
		<div className="space-y-6">
			<PageHeader
				title={<span className="capitalize">{monthLabel}</span>}
				description="Задачі та дедлайни проєктів."
				actions={
					<div className="flex items-center gap-1">
						<button
							onClick={prev}
							className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/60 bg-white/50 text-[var(--tds-muted)] transition hover:bg-white hover:text-[var(--tds-ink)]"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							onClick={next}
							className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/60 bg-white/50 text-[var(--tds-muted)] transition hover:bg-white hover:text-[var(--tds-ink)]"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				}
			/>

			<div className="grid gap-5 xl:grid-cols-[1fr_280px]">
				<Card>
					<CardContent className="p-4">
						<div className="mb-1 grid grid-cols-7 gap-1">
							{DOW.map((d) => (
								<div
									key={d}
									className="py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[var(--tds-muted)]"
								>
									{d}
								</div>
							))}
						</div>
						{loading ? (
							<div className="grid grid-cols-7 gap-1">
								{Array.from({ length: 35 }).map((_, i) => (
									<Skeleton
										key={i}
										className="aspect-square rounded-[10px]"
									/>
								))}
							</div>
						) : (
							<div className="grid grid-cols-7 gap-1">
								{Array.from({ length: firstDow }).map(
									(_, i) => (
										<div key={`empty-${i}`} />
									)
								)}
								{Array.from({ length: days }).map((_, i) => {
									const day = i + 1
									const dateKey = `${isoDate(current).slice(0, 7)}-${String(day).padStart(2, '0')}`
									const tasks = tasksByDay.get(dateKey) ?? []
									const projects =
										projectsByDay.get(dateKey) ?? []
									const isToday = dateKey === today
									const hasEvents =
										tasks.length > 0 || projects.length > 0
									return (
										<div
											key={day}
											className={`group relative min-h-[52px] rounded-[10px] p-1.5 transition ${
												isToday
													? 'bg-[var(--tds-primary)] text-white shadow-[0_4px_16px_rgba(38,132,91,0.3)]'
													: hasEvents
														? 'border border-white/70 bg-white/50 hover:bg-white'
														: 'border border-transparent hover:border-white/50 hover:bg-white/30'
											}`}
										>
											<div
												className={`text-xs font-black ${isToday ? 'text-white' : 'text-[var(--tds-ink)]'}`}
											>
												{day}
											</div>
											<div className="mt-0.5 flex flex-wrap gap-0.5">
												{tasks.slice(0, 3).map((t) => (
													<span
														key={t.id}
														className={`h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white/70' : (statusDot[t.status] ?? 'bg-slate-400')}`}
														title={t.title}
													/>
												))}
												{projects
													.slice(0, 2)
													.map((p) => (
														<span
															key={p.id}
															className={`h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white/50' : 'bg-[var(--tds-copper)]'}`}
															title={p.title}
														/>
													))}
												{tasks.length +
													projects.length >
													5 && (
													<span
														className={`text-[9px] font-bold ${isToday ? 'text-white/80' : 'text-[var(--tds-muted)]'}`}
													>
														+
														{tasks.length +
															projects.length -
															5}
													</span>
												)}
											</div>
										</div>
									)
								})}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Найближчі дедлайни
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="space-y-3">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex gap-3">
										<Skeleton className="h-8 w-8 shrink-0 rounded-[8px]" />
										<div className="flex-1 space-y-1.5">
											<Skeleton className="h-3 w-full" />
											<Skeleton className="h-2.5 w-3/4" />
										</div>
									</div>
								))}
							</div>
						) : error ? (
							<ErrorState
								message={error}
								className="min-h-[160px]"
							/>
						) : allEvents.length === 0 ? (
							<EmptyState
								title="Дедлайнів немає"
								description="Цього місяця немає задач або контрольних дат."
								className="min-h-[160px]"
							/>
						) : (
							<div className="space-y-2">
								{allEvents.slice(0, 12).map((ev) => {
									const isTask =
										'status' in ev && !('code' in ev)
									const dateStr = ev.dueDate
										? formatDate(
												ev.dueDate,
												{
													day: '2-digit',
													month: 'short',
												},
												'uk-UA'
											)
										: ''
									return (
										<div
											key={ev.id}
											className="flex items-start gap-3 rounded-[12px] border border-white/55 bg-white/38 p-2.5"
										>
											<div
												className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[10px] font-black ${isTask ? 'bg-[rgba(38,132,91,0.12)] text-[var(--tds-primary)]' : 'bg-[rgba(183,121,76,0.12)] text-[var(--tds-copper)]'}`}
											>
												{dateStr.split(' ')[0]}
											</div>
											<div className="min-w-0 flex-1">
												<div className="truncate text-xs font-semibold text-[var(--tds-ink)]">
													{ev.title}
												</div>
												<div className="mt-0.5 text-[10px] text-[var(--tds-muted)]">
													{'status' in ev
														? (taskStatusLabels[
																ev.status as keyof typeof taskStatusLabels
															] ?? ev.status)
														: 'code' in ev
															? (
																	ev as {
																		code: string
																	}
																).code
															: ''}
												</div>
											</div>
										</div>
									)
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
