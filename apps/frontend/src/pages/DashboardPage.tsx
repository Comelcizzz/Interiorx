import { CSSProperties } from 'react'
import { Badge, Card, CardContent, CardHeader, MetricCard } from '@tailored/ui'
import {
	formatAuditAction,
	projectStatusLabels,
	FORMAT_DEFAULT_LOCALE,
	type ProjectStatusCode,
} from '@tailored/shared'
import {
	AlertTriangle,
	Banknote,
	Boxes,
	ClipboardCheck,
	FolderKanban,
	Layers3,
	TimerReset,
} from 'lucide-react'
import { PageHeader } from '@tailored/ui'
import { Link } from 'react-router-dom'
import { getApi } from '@/lib/api'
import { DashboardSummary } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
const statusOrder: ProjectStatusCode[] = [
	'DRAFT',
	'ESTIMATION',
	'DESIGN',
	'APPROVED',
	'IN_PROGRESS',
	'PAUSED',
	'COMPLETED',
	'WARRANTY',
	'CANCELLED',
]
const statusTone: Record<
	ProjectStatusCode,
	{
		accent: string
		soft: string
	}
> = {
	DRAFT: { accent: '#7f8792', soft: 'rgba(127,135,146,.14)' },
	ESTIMATION: { accent: '#bd7b3a', soft: 'rgba(189,123,58,.16)' },
	DESIGN: { accent: '#1d7a56', soft: 'rgba(29,122,86,.16)' },
	APPROVED: { accent: '#236db0', soft: 'rgba(35,109,176,.14)' },
	IN_PROGRESS: { accent: '#172033', soft: 'rgba(23,32,51,.12)' },
	PAUSED: { accent: '#9a6a39', soft: 'rgba(154,106,57,.15)' },
	COMPLETED: { accent: '#23966d', soft: 'rgba(35,150,109,.15)' },
	CANCELLED: { accent: '#b44646', soft: 'rgba(180,70,70,.14)' },
	WARRANTY: { accent: '#6b5bc6', soft: 'rgba(107,91,198,.14)' },
}
const money = new Intl.NumberFormat(FORMAT_DEFAULT_LOCALE)
export function DashboardPage() {
	const { data, loading, error } = useLoad(
		() => getApi<DashboardSummary>('/dashboard/summary'),
		[]
	)
	const auditEntityLabels: Record<string, string> = {
		Project: 'Проєкт',
		Estimate: 'Кошторис',
		Payment: 'Платіж',
		Receipt: 'Чек',
		Task: 'Задача',
		SignedDocument: 'Документ',
		Review: 'Відгук',
		Order: 'Заявка',
		Invoice: 'Рахунок',
	}
	if (loading) {
		return (
			<div className="text-sm text-slate-500">Завантажуємо огляд…</div>
		)
	}
	if (error || !data) {
		return (
			<div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{error}
			</div>
		)
	}
	const sortedStatuses = [...data.statusDistribution].sort(
		(a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
	)
	const totalStatusCount = sortedStatuses.reduce(
		(sum, item) => sum + item.count,
		0
	)
	const maxStatusCount = Math.max(
		...sortedStatuses.map((item) => item.count),
		1
	)
	const activeShare = Math.round(
		(data.activeProjects / Math.max(data.totalProjects, 1)) * 100
	)
	const metrics = [
		{
			label: 'Проєкти',
			value: data.totalProjects,
			detail: 'усі активні та завершені роботи',
			icon: <FolderKanban />,
			tone: 'primary' as const,
		},
		{
			label: 'У роботі',
			value: data.activeProjects,
			detail: 'проєкти на етапах дизайну або виконання',
			icon: <TimerReset />,
			tone: 'blue' as const,
		},
		{
			label: 'Оплачено',
			value: (
				<span className="text-[25px]">
					{money.format(Number(data.revenuePaid))} грн
				</span>
			),
			detail: 'підтверджені платежі за рахунками',
			icon: <Banknote />,
			tone: 'copper' as const,
		},
		{
			label: 'Складські ризики',
			value: data.lowStockMaterials,
			detail: 'матеріали нижче мінімального залишку',
			icon: <Boxes />,
			tone: 'neutral' as const,
		},
	]
	return (
		<div className="tds-dashboard space-y-5">
			<PageHeader
				title="Огляд"
				description="Ключові показники по проєктах, оплатах і матеріалах."
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<Badge tone={data.pendingPayments ? 'amber' : 'green'}>
							{data.pendingPayments} очікують оплату
						</Badge>
						<Badge tone="blue">{activeShare}% портфеля активні</Badge>
						<Badge tone={data.overdueTasks ? 'red' : 'green'}>
							{data.overdueTasks} прострочених задач
						</Badge>
						<Link
							to="/workspace/orders"
							className="text-sm font-bold text-[var(--tds-primary)] hover:underline"
						>
							Відкрити заявки →
						</Link>
					</div>
				}
			/>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<MetricCard
						key={metric.label}
						{...metric}
						className="tds-dashboard-metric min-h-[150px]"
					/>
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
				<Card className="tds-chart-card">
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-2 font-black text-[var(--tds-ink)]">
								<Layers3 className="h-5 w-5 text-[var(--tds-primary)]" />
								Статуси проєктів
							</div>
							<div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tds-muted)]">
								{totalStatusCount} проєктів
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<StatusMixChart
							max={maxStatusCount}
							rows={sortedStatuses}
							total={totalStatusCount}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center gap-2 font-black text-[var(--tds-ink)]">
							<AlertTriangle className="h-5 w-5 text-[var(--tds-copper)]" />
							Операційний контроль
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<Link to="/workspace/kanban" className="block tds-review-ticket border-amber-200/70 bg-amber-50/82 text-amber-950 hover:opacity-90 transition">
							<div className="flex items-center justify-between">
								<div className="font-black">{data.overdueTasks} прострочених задач</div>
								<span className="text-xs font-semibold text-amber-700">Канбан →</span>
							</div>
						</Link>
						{data.pausedProjects > 0 ? (
							<Link to="/workspace/projects?status=PAUSED" className="block tds-review-ticket border-white/70 bg-white/55 text-[var(--tds-muted)] hover:opacity-90 transition">
								<div className="flex items-center justify-between">
									<div className="font-black text-[var(--tds-ink)]">{data.pausedProjects} проєкт на паузі</div>
									<span className="text-xs font-semibold text-[var(--tds-primary)]">Проєкти →</span>
								</div>
							</Link>
						) : null}
						<div className="space-y-2 pt-2">
							{data.recentAudit.map((event) => (
								<div
									key={event.id}
									className="flex items-start gap-3 border-b border-white/60 pb-3 text-sm last:border-0"
								>
									<div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/62 text-[var(--tds-primary)]">
										<ClipboardCheck className="h-4 w-4" />
									</div>
									<div>
										<div className="font-black text-[var(--tds-ink)]">
											{formatAuditAction(event.action)}
										</div>
										<div className="text-xs text-[var(--tds-muted)]">
											{auditEntityLabels[event.entityType] ??
												event.entityType}
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

		</div>
	)
}
function StatusMixChart({
	rows,
	total,
	max,
}: {
	rows: DashboardSummary['statusDistribution']
	total: number
	max: number
}) {
	return (
		<div className="tds-status-board">
			<div className="grid grid-cols-[minmax(120px,180px)_1fr_70px] gap-3 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--tds-muted)]">
				<span>Статус</span>
				<span>Обсяг</span>
				<span className="text-right">Частка</span>
			</div>
			<div className="mt-3 space-y-2.5">
				{rows.map((row) => {
					const tone = statusTone[row.status]
					const percentOfTotal = total
						? Math.round((row.count / total) * 100)
						: 0
					const width = Math.max(
						8,
						Math.round((row.count / max) * 100)
					)
					return (
						<div
							key={row.status}
							className="tds-status-row grid grid-cols-[minmax(120px,180px)_1fr_70px] items-center gap-3 rounded-[16px] px-3 py-2.5"
							style={
								{
									'--status-accent': tone.accent,
									'--status-soft': tone.soft,
								} as CSSProperties
							}
						>
							<div className="min-w-0">
								<div className="truncate text-sm font-black text-[var(--tds-ink)]">
									{projectStatusLabels[row.status]}
								</div>
								<div className="mt-0.5 text-[11px] font-semibold text-[var(--tds-muted)]">
									{row.count} проєктів
								</div>
							</div>
							<div className="tds-status-track">
								<div
									className="tds-status-fill"
									style={{ width: `${width}%` }}
								/>
							</div>
							<div className="text-right text-sm font-black text-[var(--tds-ink)]">
								{percentOfTotal}%
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
