import {
	Card,
	CardContent,
	CardHeader,
	ErrorState,
	PageHeader,
	SkeletonCard,
} from '@tailored/ui'
import { formatNumber, projectStatusLabels } from '@tailored/shared'
import {
	AlertTriangle,
	Banknote,
	BarChart3,
} from 'lucide-react'
import { useMemo } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { ReportsRevenueCharts } from '@/components/ReportsRevenueCharts'
import { getApi } from '@/lib/api'
import { ReportsOverview } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'
const STATUS_COLORS: Record<string, string> = {
	DRAFT: '#94a3b8',
	ESTIMATION: '#f59e0b',
	DESIGN: '#3b82f6',
	APPROVED: '#22c55e',
	IN_PROGRESS: '#0ea5e9',
	PAUSED: '#f97316',
	COMPLETED: '#16a34a',
	CANCELLED: '#ef4444',
	WARRANTY: '#8b5cf6',
}
const fmtUah = (v: string | number) => `${formatNumber(v)} грн`
export function AnalyticsPage() {
	const { from, to, patchParams } = useListQuery(10)
	const apiQs = useMemo(() => {
		const p = new URLSearchParams()
		if (from) p.set('from', from)
		if (to) p.set('to', to)
		return p.toString()
	}, [from, to])
	const { data, loading, error } = useLoad(
		() =>
			getApi<ReportsOverview>(
				`/reports/overview${apiQs ? `?${apiQs}` : ''}`
			),
		[apiQs]
	)

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			from: values.from || null,
			to: values.to || null,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			from: null,
			to: null,
		})
	}

	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader
					title="Аналітика"
					description="Фінансовий та операційний огляд."
				/>
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<SkeletonCard key={i} />
					))}
				</div>
				<div className="grid gap-5 xl:grid-cols-2">
					<SkeletonCard className="h-80" />
					<SkeletonCard className="h-80" />
				</div>
			</div>
		)
	}
	if (error || !data)
		return (
			<div className="space-y-6">
				<PageHeader title="Аналітика" />
				<ErrorState message={error ?? undefined} />
			</div>
		)
	const kpis = [
		{
			label: 'Оплачений дохід',
			value: fmtUah(data.finance.paidRevenue),
			icon: Banknote,
			color: 'text-emerald-600',
			bg: 'bg-emerald-50',
		},
		{
			label: 'Очікує оплату',
			value: fmtUah(data.finance.outstanding),
			icon: AlertTriangle,
			color: 'text-amber-600',
			bg: 'bg-amber-50',
		},
		{
			label: 'Проєктів у роботі',
			value: data.projectHealth.filter(
				(p) => !['COMPLETED', 'CANCELLED', 'WARRANTY'].includes(p.status)
			).length,
			icon: BarChart3,
			color: 'text-blue-600',
			bg: 'bg-blue-50',
		},
		{
			label: 'Кількість платежів',
			value: data.finance.paymentsCount,
			icon: BarChart3,
			color: 'text-purple-600',
			bg: 'bg-purple-50',
		},
	]
	const statusDist = data.projectHealth.reduce<Record<string, number>>(
		(acc, p) => {
			acc[p.status] = (acc[p.status] ?? 0) + 1
			return acc
		},
		{}
	)
	const pieData = Object.entries(statusDist).map(([status, count]) => ({
		name:
			projectStatusLabels[status as keyof typeof projectStatusLabels] ??
			status,
		value: count,
		color: STATUS_COLORS[status] ?? '#94a3b8',
	}))
	const taskBar = data.projectHealth.map((p) => ({
		name: p.code,
		open: p.openTasks,
		overdue: p.overdueTasks,
	}))
	return (
		<div className="space-y-6">
			<PageHeader
				title="Аналітика"
				description="Фінансовий та операційний огляд по всіх проєктах."
			/>

			<ListQueryBar
				values={{ status: '', q: '', from, to, sort: 'latest' }}
				onApply={applyFilters}
				onReset={resetFilters}
				showSearch={false}
				showSort={false}
			/>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{kpis.map((kpi) => (
					<Card key={kpi.label}>
						<CardContent className="py-4">
							<div className="flex items-start justify-between gap-2">
								<div>
									<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
										{kpi.label}
									</div>
									<div className="mt-2 text-xl font-black text-[var(--tds-ink)]">
										{kpi.value}
									</div>
								</div>
								<div
									className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${kpi.bg} ${kpi.color}`}
								>
									<kpi.icon className="h-5 w-5" />
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Навантаження задач по проєктах
						</div>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={260}>
							<BarChart
								data={taskBar}
								margin={{
									top: 4,
									right: 4,
									left: -20,
									bottom: 0,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="rgba(17,24,39,0.06)"
								/>
								<XAxis
									dataKey="name"
									tick={{ fontSize: 11, fill: '#747b87' }}
								/>
								<YAxis
									tick={{ fontSize: 11, fill: '#747b87' }}
								/>
								<Tooltip
									contentStyle={{
										borderRadius: 12,
										border: '1px solid rgba(255,255,255,0.8)',
										background: 'rgba(255,255,255,0.95)',
										fontSize: 12,
									}}
								/>
								<Bar
									dataKey="open"
									name="Відкриті"
									fill="#26845b"
									radius={[4, 4, 0, 0]}
								/>
								<Bar
									dataKey="overdue"
									name="Прострочені"
									fill="#ef4444"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Розподіл статусів проєктів
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-6">
							<ResponsiveContainer width="50%" height={200}>
								<PieChart>
									<Pie
										data={pieData}
										cx="50%"
										cy="50%"
										innerRadius={50}
										outerRadius={80}
										paddingAngle={3}
										dataKey="value"
									>
										{pieData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={entry.color}
											/>
										))}
									</Pie>
									<Tooltip
										contentStyle={{
											borderRadius: 12,
											fontSize: 12,
										}}
									/>
								</PieChart>
							</ResponsiveContainer>
							<div className="flex flex-col gap-2">
								{pieData.map((entry) => (
									<div
										key={entry.name}
										className="flex items-center gap-2 text-xs"
									>
										<span
											className="h-2.5 w-2.5 shrink-0 rounded-full"
											style={{ background: entry.color }}
										/>
										<span className="text-[var(--tds-muted)]">
											{entry.name}
										</span>
										<span className="ml-auto font-bold text-[var(--tds-ink)]">
											{entry.value}
										</span>
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<ReportsRevenueCharts
				revenueTimeSeries={data.revenueTimeSeries}
				revenueByProject={data.revenueByProject}
			/>
		</div>
	)
}
