import { Badge, Card, CardContent, CardHeader } from '@tailored/ui'
import { formatNumber, projectStatusLabels } from '@tailored/shared'
import { AlertTriangle, Banknote, BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import {
	Bar,
	BarChart,
	CartesianGrid,
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
export function ReportsPage() {
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
		return <div className="text-sm text-slate-500">Завантажуємо звіти...</div>
	}
	if (error || !data) {
		return (
			<div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{error}
			</div>
		)
	}
	const metrics = [
		{
			label: 'Оплачений дохід',
			value: `${formatNumber(data.finance.paidRevenue)} грн`,
			icon: Banknote,
		},
		{
			label: 'Очікує оплату',
			value: `${formatNumber(data.finance.outstanding)} грн`,
			icon: AlertTriangle,
		},
		{
			label: 'Проєктів у роботі',
			value: data.projectHealth.filter(
				(p) => !['COMPLETED', 'CANCELLED', 'WARRANTY'].includes(p.status)
			).length,
			icon: BarChart3,
		},
		{
			label: 'Кількість платежів',
			value: data.finance.paymentsCount,
			icon: BarChart3,
		},
	]
	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold text-slate-950">
					Звіти
				</h1>
				<p className="mt-1 text-sm text-slate-500">
					Огляд фінансів і виконання проєктів.
				</p>
			</div>

			<ListQueryBar
				values={{ status: '', q: '', from, to, sort: 'latest' }}
				onApply={applyFilters}
				onReset={resetFilters}
				showSearch={false}
				showSort={false}
			/>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<Card key={metric.label}>
						<CardContent>
							<div className="flex items-center justify-between">
								<div>
									<div className="text-sm text-slate-500">
										{metric.label}
									</div>
									<div className="mt-2 text-xl font-semibold text-slate-950">
										{metric.value}
									</div>
								</div>
								<metric.icon className="h-6 w-6 text-slate-500" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-[1fr_420px]">
				<Card>
					<CardHeader>
						<div className="font-medium text-slate-950">
							Розподіл статусів проєктів
						</div>
					</CardHeader>
					<CardContent>
						<div className="h-72">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={data.statusMix}>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
									/>
									<XAxis
										dataKey="status"
										tickFormatter={(value) =>
											projectStatusLabels[
												value as keyof typeof projectStatusLabels
											]
										}
									/>
									<YAxis allowDecimals={false} />
									<Tooltip />
									<Bar
										dataKey="count"
										fill="#172033"
										radius={[4, 4, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="font-medium text-slate-950">
							Проєкти з простроченими задачами
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{data.projectHealth
							.filter((p) => p.overdueTasks > 0)
							.slice(0, 8)
							.map((project) => (
								<div
									key={project.id}
									className="rounded-md border border-amber-100 bg-amber-50 p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="font-medium text-amber-950">
												{project.code}
											</div>
											<div className="text-sm text-amber-800">
												{project.title}
											</div>
										</div>
										<Badge tone="amber">
											{project.overdueTasks} простр.
										</Badge>
									</div>
								</div>
							))}
						{data.projectHealth.every(
							(p) => p.overdueTasks === 0
						) ? (
							<p className="text-sm text-slate-500">
								Прострочених задач немає.
							</p>
						) : null}
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
