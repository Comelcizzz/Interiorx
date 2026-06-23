import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	Input,
} from '@tailored/ui'
import { formatNumber, taskStatusLabels } from '@tailored/shared'
import {
	ClipboardCheck,
	GitPullRequest,
	ListChecks,
	ShieldCheck,
} from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { SearchableSelect } from '@/components/SearchableSelect'
import { getApi, patchApi, postApi } from '@/lib/api'
import {
	ApprovalRow,
	ChangeRequestRow,
	OperationsBoard,
	Paginated,
	ProjectListItem,
	QualityRow,
	TaskStatusCode,
} from '@/lib/types'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'
const taskColumns: Array<{
	key: TaskStatusCode
	title: string
}> = (
	[
		'BACKLOG',
		'READY',
		'IN_PROGRESS',
		'BLOCKED',
		'REVIEW',
		'DONE',
	] as const
).map((key) => ({
	key,
	title: taskStatusLabels[key] ?? key,
}))
const approvalTone = {
	PENDING: 'amber',
	APPROVED: 'green',
	REJECTED: 'red',
	CHANGES_REQUESTED: 'blue',
} as const
export function OperationsPage() {
	const role = useAuthStore((s) => s.user?.role)
	const canViewApprovals =
		role === 'ADMIN' || role === 'PROJECT_MANAGER'
	const canViewQuality =
		role === 'ADMIN' ||
		role === 'PROJECT_MANAGER' ||
		role === 'DESIGNER' ||
		role === 'BRIGADIR'
	const canCreateChange = role === 'ADMIN' || role === 'PROJECT_MANAGER'
	const board = useLoad(
		() => getApi<OperationsBoard>('/operations/board'),
		[]
	)
	const approvals = useLoad(
		() =>
			canViewApprovals
				? getApi<ApprovalRow[]>('/operations/approvals')
				: Promise.resolve([]),
		[canViewApprovals]
	)
	const changes = useLoad(
		() =>
			canViewApprovals
				? getApi<ChangeRequestRow[]>('/operations/change-requests')
				: Promise.resolve([]),
		[canViewApprovals]
	)
	const quality = useLoad(
		() =>
			canViewQuality
				? getApi<QualityRow[]>('/operations/quality')
				: Promise.resolve([]),
		[canViewQuality]
	)
	const projects = useLoad(
		() =>
			canCreateChange
				? getApi<Paginated<ProjectListItem>>(
						'/projects?page=1&perPage=200'
					).then((r) => r.items)
				: Promise.resolve([]),
		[canCreateChange]
	)
	const [projectId, setProjectId] = useState('')
	const [title, setTitle] = useState(
		'Client changed materials for the hallway'
	)
	const [description, setDescription] = useState(
		'Replace the planned finish with a more durable material and recalculate delivery.'
	)
	const [impactCost, setImpactCost] = useState('18000')
	const [impactDays, setImpactDays] = useState('3')
	const [message, setMessage] = useState('')
	const selectedProjectId = useMemo(
		() => projectId || projects.data?.[0]?.id || '',
		[projectId, projects.data]
	)
	async function updateTask(id: string, status: TaskStatusCode) {
		await patchApi(`/operations/tasks/${id}/status`, { status })
		window.location.reload()
	}
	async function decide(id: string, status: ApprovalRow['status']) {
		await patchApi(`/operations/approvals/${id}/decision`, { status })
		window.location.reload()
	}
	async function createChange(event: FormEvent) {
		event.preventDefault()
		if (!selectedProjectId) return
		try {
			await postApi('/operations/change-requests', {
				projectId: selectedProjectId,
				title,
				description,
				impactCost,
				impactDays,
			})
			setMessage('Change request created')
			changes.reload()
		} catch (err: unknown) {
			const maybeError = err as {
				response?: { data?: { message?: string } }
				message?: string
			}
			setMessage(
				maybeError.response?.data?.message ??
					maybeError.message ??
					'Change request failed'
			)
		}
	}
	if (
		board.loading ||
		(canViewApprovals && (approvals.loading || changes.loading)) ||
		(canViewQuality && quality.loading)
	) {
		return (
			<div className="text-sm text-slate-500">Loading operations...</div>
		)
	}
	if (
		board.error ||
		!board.data ||
		(canViewApprovals && (approvals.error || changes.error)) ||
		(canViewQuality && quality.error)
	) {
		return (
			<div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{board.error ??
					approvals.error ??
					changes.error ??
					quality.error}
			</div>
		)
	}
	const boardData = board.data
	const approvalRows = approvals.data ?? []
	const changeRows = changes.data ?? []
	const qualityRows = quality.data ?? []
	return (
		<div className="space-y-5">
			<div>
				<h1 className="text-2xl font-semibold text-slate-950">
					Операційний центр
				</h1>
				<p className="mt-1 text-sm text-slate-500">
					Дошка задач, погодження, запити на зміни та контроль якості.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-slate-500">
									Задачі
								</div>
								<div className="mt-2 text-2xl font-semibold text-slate-950">
									{board.data.total}
								</div>
							</div>
							<ListChecks className="h-6 w-6 text-slate-500" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-slate-500">
									Очікують погодження
								</div>
								<div className="mt-2 text-2xl font-semibold text-slate-950">
									{
										approvalRows.filter(
											(item) => item.status === 'PENDING'
										).length
									}
								</div>
							</div>
							<ShieldCheck className="h-6 w-6 text-slate-500" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-slate-500">
									Changes
								</div>
								<div className="mt-2 text-2xl font-semibold text-slate-950">
									{changeRows.length}
								</div>
							</div>
							<GitPullRequest className="h-6 w-6 text-slate-500" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-slate-500">
									Avg quality
								</div>
								<div className="mt-2 text-2xl font-semibold text-slate-950">
									{Math.round(
										qualityRows.reduce(
											(sum, item) => sum + item.score,
											0
										) / Math.max(qualityRows.length, 1)
									)}
								</div>
							</div>
							<ClipboardCheck className="h-6 w-6 text-slate-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-3 xl:grid-cols-6">
				{taskColumns.map((column) => (
					<Card key={column.key} className="min-h-64">
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="text-sm font-medium text-slate-950">
									{column.title}
								</div>
								<Badge>
									{boardData.byStatus[column.key]?.length ??
										0}
								</Badge>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{boardData.byStatus[column.key]?.map((task) => (
								<div
									key={task.id}
									className="rounded-md border border-slate-100 bg-slate-50 p-3"
								>
									<div className="font-medium text-slate-950">
										{task.title}
									</div>
									<div className="mt-1 text-xs text-slate-500">
										{task.project.code} -{' '}
										{task.assigneeName ?? 'unassigned'}
									</div>
									<div className="mt-3 flex flex-wrap gap-2">
										{task.status !== 'DONE' ? (
											<Button
												className="h-8 px-3 text-xs"
												variant="secondary"
												onClick={() =>
													updateTask(task.id, 'DONE')
												}
											>
												Done
											</Button>
										) : null}
										{task.status !== 'IN_PROGRESS' ? (
											<Button
												className="h-8 px-3 text-xs"
												variant="ghost"
												onClick={() =>
													updateTask(
														task.id,
														'IN_PROGRESS'
													)
												}
											>
												Start
											</Button>
										) : null}
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-[1fr_420px]">
				<div className="space-y-5">
					<Card>
						<CardHeader>
							<div className="font-medium text-slate-950">
								Approvals
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{approvalRows.map((item) => (
								<div
									key={item.id}
									className="rounded-md border border-slate-100 p-3"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<div className="font-medium text-slate-950">
												{item.project.code} -{' '}
												{item.kind}
											</div>
											<div className="mt-1 text-sm text-slate-500">
												Requested by {item.requestedBy}
												{item.estimate
													? ` - estimate v${item.estimate.version} - ${formatNumber(item.estimate.total)} UAH`
													: ''}
											</div>
										</div>
										<Badge tone={approvalTone[item.status]}>
											{item.status}
										</Badge>
									</div>
									{item.status === 'PENDING' ? (
										<div className="mt-3 flex gap-2">
											<Button
												className="h-8 px-3 text-xs"
												onClick={() =>
													decide(item.id, 'APPROVED')
												}
											>
												Approve
											</Button>
											<Button
												className="h-8 px-3 text-xs"
												variant="danger"
												onClick={() =>
													decide(item.id, 'REJECTED')
												}
											>
												Reject
											</Button>
										</div>
									) : null}
								</div>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="font-medium text-slate-950">
								Quality checks
							</div>
						</CardHeader>
						<CardContent className="grid gap-3 md:grid-cols-2">
							{qualityRows.map((item) => (
								<div
									key={item.id}
									className="rounded-md border border-slate-100 p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="font-medium text-slate-950">
												{item.title}
											</div>
											<div className="mt-1 text-xs text-slate-500">
												{item.project.code}
											</div>
										</div>
										<Badge
											tone={
												item.score >= 80
													? 'green'
													: item.score >= 65
														? 'amber'
														: 'red'
											}
										>
											{item.score}/100
										</Badge>
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>

				<div className="space-y-5">
					<Card>
						<CardHeader>
							<div className="font-medium text-slate-950">
								Create change request
							</div>
						</CardHeader>
						<CardContent>
							<form className="space-y-4" onSubmit={createChange}>
								<SearchableSelect
									value={selectedProjectId}
									onChange={setProjectId}
									placeholder="Оберіть проєкт"
									options={
										projects.data?.map((project) => ({
											value: project.id,
											label: `${project.code} — ${project.title}`,
											searchText: `${project.code} ${project.title}`,
										})) ?? []
									}
								/>
								<Input
									value={title}
									onChange={(event) =>
										setTitle(event.target.value)
									}
								/>
								<Input
									value={description}
									onChange={(event) =>
										setDescription(event.target.value)
									}
								/>
								<div className="grid grid-cols-2 gap-3">
									<Input
										value={impactCost}
										onChange={(event) =>
											setImpactCost(event.target.value)
										}
									/>
									<Input
										value={impactDays}
										onChange={(event) =>
											setImpactDays(event.target.value)
										}
									/>
								</div>
								<Button
									type="submit"
									className="w-full"
									disabled={!canCreateChange || !selectedProjectId}
								>
									Create request
								</Button>
								{message ? (
									<div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
										{message}
									</div>
								) : null}
							</form>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="font-medium text-slate-950">
								Change log
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							{changeRows.map((item) => (
								<div
									key={item.id}
									className="rounded-md border border-slate-100 p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<div className="font-medium text-slate-950">
												{item.title}
											</div>
											<div className="mt-1 text-xs text-slate-500">
												{item.project.code}
											</div>
										</div>
										<Badge>{item.status}</Badge>
									</div>
									<div className="mt-2 text-sm text-slate-600">
										{formatNumber(item.impactCost)} UAH -{' '}
										{item.impactDays} days
									</div>
								</div>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}
