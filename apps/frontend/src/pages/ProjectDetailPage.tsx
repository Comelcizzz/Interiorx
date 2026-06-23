import { Badge, Button, Card, CardContent, CardHeader } from '@tailored/ui'
import {
	formatAuditAction,
	formatEntityType,
	formatNumber,
	paymentStatusLabels,
	projectStatusLabels,
	taskStatusLabels,
} from '@tailored/shared'
import {
	ArrowLeft,
	ClipboardList,
	CircleAlert,
	MapPin,
	Receipt,
	WalletCards,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProjectDocumentsSection } from '@/components/ProjectDocumentsSection'
import { ProjectEstimateSection } from '@/components/ProjectEstimateSection'
import { ProjectMeasurementsSection } from '@/components/ProjectMeasurementsSection'
import { ProjectStatusActions } from '@/components/ProjectStatusActions'
import { ProjectTeamSection } from '@/components/ProjectTeamSection'
import {
	formatApprovedEstimatesBudget,
	formatClientRequestedBudget,
} from '@/lib/estimate-display'
import { getApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { ProjectDetail } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
const taskTone = {
	BACKLOG: 'neutral',
	READY: 'blue',
	IN_PROGRESS: 'blue',
	BLOCKED: 'red',
	REVIEW: 'amber',
	DONE: 'green',
} as const
const entityLabels: Record<string, string> = {
	Project: 'Проєкт',
	Estimate: 'Кошторис',
	Payment: 'Платіж',
	Receipt: 'Чек',
	Task: 'Задача',
	Review: 'Відгук',
	Invoice: 'Рахунок',
}
function methodLabel(method?: string) {
	const key = (method ?? '').toLowerCase()
	if (key.includes('card')) return 'Картка'
	if (key.includes('bank')) return 'Банківський переказ'
	return method || 'Платіж'
}
function priorityLabel(priority: number) {
	if (priority <= 1) return 'високий пріоритет'
	if (priority === 2) return 'середній пріоритет'
	return 'плановий пріоритет'
}
export function ProjectDetailPage() {
	const { id } = useParams()
	const role = useAuthStore((s) => s.user?.role)
	const isBrigadir = role === 'BRIGADIR'
	const canEdit = role === 'ADMIN' || role === 'PROJECT_MANAGER'
	const { data, loading, error, reload } = useLoad(
		() => getApi<ProjectDetail>(`/projects/${id}`),
		[id]
	)
	const [auditExtra, setAuditExtra] = useState<ProjectDetail['auditLogs']>([])
	const [auditPage, setAuditPage] = useState(1)
	const [auditTotal, setAuditTotal] = useState<number | null>(null)
	const [auditLoading, setAuditLoading] = useState(false)
	useEffect(() => {
		setAuditExtra([])
		setAuditPage(1)
		setAuditTotal(null)
	}, [id, data?.id])
	const auditMerged = data ? [...data.auditLogs, ...auditExtra] : []
	const canLoadMoreAudit =
		Boolean(data) &&
		(auditTotal != null
			? auditMerged.length < auditTotal
			: (data?.auditLogs.length ?? 0) >= 12)
	async function loadMoreAudit() {
		if (!id || !data) return
		setAuditLoading(true)
		try {
			const next = auditPage + 1
			const res = await getApi<{
				items: ProjectDetail['auditLogs']
				total: number
			}>(`/projects/${id}/audit?page=${next}&perPage=12`)
			setAuditExtra((prev) => [...prev, ...res.items])
			setAuditPage(next)
			setAuditTotal(res.total)
		} finally {
			setAuditLoading(false)
		}
	}
	if (loading) {
		return (
			<div className="text-sm text-slate-500">
				Завантажуємо проєкт...
			</div>
		)
	}
	if (error || !data) {
		return (
			<div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{error}
			</div>
		)
	}
	const latestEstimate = data.estimates[0]
	const approvedEstimate = data.estimates.find((e) => e.status === 'APPROVED') ?? null
	const approvedEstimateTotal = approvedEstimate
		? parseFloat(String(approvedEstimate.total))
		: null
	const paidSum = (data.payments ?? [])
		.filter((p) => p.status === 'PAID')
		.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0)
	return (
		<div className="space-y-5">
			<Link
				to="/workspace/projects"
				className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-950"
			>
				<ArrowLeft className="mr-2 h-4 w-4" />
				Назад до проєктів
			</Link>

			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="font-mono text-xs text-slate-500">
						{data.code}
					</div>
					<h1 className="mt-1 text-2xl font-semibold text-slate-950">
						{data.title}
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600">
						{data.description}
					</p>
				</div>
				<Badge>{projectStatusLabels[data.status]}</Badge>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardContent className="space-y-4">
						<div>
							<div className="text-sm text-slate-500">
								Бюджет від клієнта (заявка)
							</div>
							<div className="mt-2 text-xl font-semibold text-slate-950">
								{formatClientRequestedBudget(
									data.clientRequestedBudget,
									data.budgetPlanned
								) ?? '—'}
							</div>
						</div>
						<div className="border-t border-slate-100 pt-4">
							<div className="text-sm text-slate-500">
								Погоджений бюджет (сума кошторисів)
							</div>
							<div className="mt-2 text-xl font-semibold text-emerald-800">
								{formatApprovedEstimatesBudget(
									data.estimates,
									data.approvedEstimatesTotal ??
										data.budgetApproved
								) ?? '—'}
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-sm text-slate-500">Клієнт</div>
						<div className="mt-2 font-semibold text-slate-950">
							{data.client.user.fullName}
						</div>
						<div className="truncate text-xs text-slate-500">
							{data.client.user.email}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="flex items-start gap-2">
							<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
							<div className="min-w-0">
								<div className="text-sm text-slate-500">
									Локація
								</div>
								<div className="mt-2 font-semibold text-slate-950">
									{data.location?.city ?? 'Локацію не додано'}
								</div>
								<div className="truncate text-xs text-slate-500">
									{data.location?.addressLine ?? '—'}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<ProjectTeamSection
				projectId={data.id}
				manager={data.manager}
				designer={data.designer}
				brigadir={data.brigadir}
				managerStaffId={data.manager?.id}
				designerStaffId={data.designer?.id}
				brigadirStaffId={data.brigadir?.id}
				onSaved={() => reload()}
			/>

			<Card className="border-sky-200/80 bg-sky-50/50">
				<CardContent className="flex gap-3 py-4">
					<CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
					<div className="text-sm text-slate-700">
						<div className="font-semibold text-slate-900">
							Підказки для команди
						</div>
						<ul className="mt-2 list-disc space-y-1.5 pl-5">
							<li>
								<strong>Кошторис</strong> створюється тут (кнопка
								«Створити кошторис»); знижку й податки можна
								додати в розділі{' '}
								<Link
									className="font-semibold text-slate-900 underline"
									to="/workspace/estimates"
								>
									«Кошториси»
								</Link>
								.
							</li>
							<li>
								<strong>Заміри</strong> додаються на цій
								сторінці (кнопка «Додати замір») — дизайнер,
								менеджер або кошторисник.
							</li>
						</ul>
					</div>
				</CardContent>
			</Card>

			<ProjectStatusActions
				projectId={data.id}
				projectCode={data.code}
				status={data.status}
				approvedEstimateTotal={approvedEstimateTotal}
				paidSum={paidSum}
				onChanged={() => reload()}
			/>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-4">
					<ProjectMeasurementsSection
						projectId={data.id}
						projectCode={data.code}
						measurements={data.measurements}
						onChanged={() => reload()}
					/>

					<ProjectDocumentsSection projectId={data.id} />

					<ProjectEstimateSection
						projectId={data.id}
						projectCode={data.code}
						estimates={data.estimates}
						canEdit={canEdit}
						onChanged={() => reload()}
					/>

					<Card>
						<CardHeader>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-2 font-medium text-slate-950">
									<ClipboardList className="h-4 w-4" />
									Задачі
								</div>
								<Link
									to="/workspace/kanban"
									className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
								>
									{canEdit ? 'Додати задачу →' : 'Канбан →'}
								</Link>
							</div>
						</CardHeader>
						<CardContent>
							{data.tasks.length === 0 ? (
								<p className="text-sm text-slate-500">
									Задач ще немає. Створіть у канбані.
								</p>
							) : (
								<ul className="divide-y divide-slate-100">
									{data.tasks.map((task) => (
										<li
											key={task.id}
											className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
										>
											<div className="min-w-0">
												<div className="font-medium text-slate-950">
													{task.title}
												</div>
												<div className="mt-0.5 text-xs text-slate-500">
													{task.assignee?.user.fullName ??
														'без виконавця'}{' '}
													· {priorityLabel(task.priority)}
												</div>
											</div>
											<Badge tone={taskTone[task.status]}>
												{taskStatusLabels[task.status] ??
													task.status}
											</Badge>
										</li>
									))}
								</ul>
							)}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-5">
					{!isBrigadir && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2 font-medium text-slate-950">
									<WalletCards className="h-4 w-4" />
									Фінанси
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								{data.payments.map((payment) => (
									<div
										key={payment.id}
										className="rounded-md border border-slate-100 p-3"
									>
										<div className="flex items-center justify-between gap-3">
											<div>
												<div className="font-medium text-slate-950">
													{formatNumber(payment.amount)}{' '}
													{payment.currency}
												</div>
												<div className="text-xs text-slate-500">
													{methodLabel(payment.method)}
												</div>
											</div>
											<Badge>
												{
													paymentStatusLabels[
														payment.status
													]
												}
											</Badge>
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					)}

					{!isBrigadir && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-2 font-medium text-slate-950">
									<MapPin className="h-4 w-4" />
									Останні дії
								</div>
							</CardHeader>
							<CardContent className="space-y-3">
								{auditMerged.map((event) => (
									<div
										key={event.id}
										className="border-b border-slate-100 pb-2 text-sm"
									>
										<div className="font-medium text-slate-900">
											{formatAuditAction(event.action)}
										</div>
										<div className="text-xs text-slate-500">
											{formatEntityType(event.entityType)}
										</div>
									</div>
								))}
								{canLoadMoreAudit ? (
									<Button
										type="button"
										variant="secondary"
										className="text-sm"
										disabled={auditLoading}
										onClick={() => void loadMoreAudit()}
									>
										{auditLoading ? 'Завантажуємо...' : 'Показати ще'}
									</Button>
								) : null}
							</CardContent>
						</Card>
					)}
				</div>
			</div>

		</div>
	)
}
