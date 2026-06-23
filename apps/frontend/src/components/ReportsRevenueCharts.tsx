import { Card, CardContent, CardHeader } from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'
import type { ReportsOverview } from '@/lib/types'

const UK_MONTHS = [
	'січ',
	'лют',
	'бер',
	'квіт',
	'трав',
	'черв',
	'лип',
	'сер',
	'вер',
	'жовт',
	'лист',
	'груд',
]

function periodLabel(period: string) {
	const [y, m] = period.split('-')
	const mi = Number(m)
	if (!y || !mi) return period
	return `${UK_MONTHS[mi - 1] ?? m} ${y}`
}

const fmtUah = (v: number) => `${formatNumber(v)} грн`

type Props = {
	revenueTimeSeries: ReportsOverview['revenueTimeSeries']
	revenueByProject: ReportsOverview['revenueByProject']
	variant?: 'default' | 'compact'
}

export function ReportsRevenueCharts({
	revenueTimeSeries,
	revenueByProject,
	variant = 'default',
}: Props) {
	let cumulative = 0
	const overTime = revenueTimeSeries.map((row) => {
		const paid = Number(row.paid)
		cumulative += paid
		return {
			period: periodLabel(row.period),
			paid,
			cumulative,
			paymentsCount: row.paymentsCount,
		}
	})
	const byProject = revenueByProject.map((row) => ({
		name: row.code,
		paid: Number(row.paid),
		paymentsCount: row.paymentsCount,
		title: row.title,
	}))
	const chartHeight = variant === 'compact' ? 220 : 260

	return (
		<div className="grid gap-5 xl:grid-cols-2">
			<Card>
				<CardHeader>
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Заробіток з часом
					</div>
					<p className="mt-1 text-xs text-[var(--tds-muted)]">
						Оплачені платежі по місяцях і накопичений дохід.
					</p>
				</CardHeader>
				<CardContent>
					{overTime.length === 0 ? (
						<p className="text-sm text-slate-500">
							За обраний період оплат ще немає.
						</p>
					) : (
						<ResponsiveContainer width="100%" height={chartHeight}>
							<AreaChart
								data={overTime}
								margin={{
									top: 4,
									right: 8,
									left: -12,
									bottom: 0,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="rgba(17,24,39,0.06)"
								/>
								<XAxis
									dataKey="period"
									tick={{ fontSize: 11, fill: '#747b87' }}
								/>
								<YAxis
									tick={{ fontSize: 11, fill: '#747b87' }}
									tickFormatter={(v) =>
										v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
									}
								/>
								<Tooltip
									formatter={(value, name) => {
										const n = Number(value)
										if (name === 'paymentsCount')
											return [value, 'Платежів']
										return [fmtUah(n), name === 'cumulative' ? 'Накопичено' : 'За місяць']
									}}
									contentStyle={{
										borderRadius: 12,
										fontSize: 12,
									}}
								/>
								<Area
									type="monotone"
									dataKey="paid"
									name="За місяць"
									stroke="#26845b"
									fill="rgba(38,132,91,0.14)"
									strokeWidth={2}
								/>
								<Line
									type="monotone"
									dataKey="cumulative"
									name="Накопичено"
									stroke="#b7794c"
									strokeWidth={2}
									dot={false}
								/>
							</AreaChart>
						</ResponsiveContainer>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Дохід по проєктах
					</div>
					<p className="mt-1 text-xs text-[var(--tds-muted)]">
						Топ проєктів за сумою оплачених платежів.
					</p>
				</CardHeader>
				<CardContent>
					{byProject.length === 0 ? (
						<p className="text-sm text-slate-500">
							Немає оплат по проєктах за період.
						</p>
					) : (
						<ResponsiveContainer width="100%" height={chartHeight}>
							<BarChart
								data={byProject}
								layout="vertical"
								margin={{
									top: 4,
									right: 8,
									left: 4,
									bottom: 0,
								}}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="rgba(17,24,39,0.06)"
									horizontal={false}
								/>
								<XAxis
									type="number"
									tick={{ fontSize: 11, fill: '#747b87' }}
									tickFormatter={(v) =>
										v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
									}
								/>
								<YAxis
									type="category"
									dataKey="name"
									width={88}
									tick={{ fontSize: 10, fill: '#747b87' }}
								/>
								<Tooltip
									formatter={(value) => [
										fmtUah(Number(value)),
										'Оплачено',
									]}
									labelFormatter={(_, payload) => {
										const row = payload?.[0]?.payload as
											| { title?: string; name?: string }
											| undefined
										return row?.title
											? `${row.name} — ${row.title}`
											: (row?.name ?? '')
									}}
									contentStyle={{
										borderRadius: 12,
										fontSize: 12,
									}}
								/>
								<Bar
									dataKey="paid"
									fill="#172033"
									radius={[0, 4, 4, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
