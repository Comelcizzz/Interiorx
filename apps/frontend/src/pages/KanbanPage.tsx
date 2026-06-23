import {
	Badge,
	Button,
	EmptyState,
	ErrorState,
	Input,
	Modal,
	ModalFooter,
	PageHeader,
	Skeleton,
} from '@tailored/ui'
import { taskStatusLabels } from '@tailored/shared'
import { ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { getApi, patchApi, postApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { BoardData } from '@/lib/types'
import { useLoad } from '@/lib/use-load'
const colConfig: Record<
	string,
	{
		accent: string
		bg: string
		dot: string
		tone: 'neutral' | 'amber' | 'blue' | 'red' | 'green'
	}
> = {
	BACKLOG: {
		accent: '#8892a4',
		bg: 'rgba(136,146,164,0.08)',
		dot: '#8892a4',
		tone: 'neutral',
	},
	READY: {
		accent: '#bd7b3a',
		bg: 'rgba(189,123,58,0.08)',
		dot: '#bd7b3a',
		tone: 'amber',
	},
	IN_PROGRESS: {
		accent: '#2563eb',
		bg: 'rgba(37,99,235,0.08)',
		dot: '#2563eb',
		tone: 'blue',
	},
	BLOCKED: {
		accent: '#dc2626',
		bg: 'rgba(220,38,38,0.08)',
		dot: '#dc2626',
		tone: 'red',
	},
	REVIEW: {
		accent: '#7c3aed',
		bg: 'rgba(124,58,237,0.08)',
		dot: '#7c3aed',
		tone: 'neutral',
	},
	DONE: {
		accent: '#16a34a',
		bg: 'rgba(22,163,74,0.08)',
		dot: '#16a34a',
		tone: 'green',
	},
}
const cols = [
	'BACKLOG',
	'READY',
	'IN_PROGRESS',
	'BLOCKED',
	'REVIEW',
	'DONE',
] as const
const priorityColors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#94a3b8']
const priorityLabels = [
	'Критично',
	'Високий',
	'Середній',
	'Низький',
	'Без пріоритету',
]
export function KanbanPage() {
	const user = useAuthStore((s) => s.user)
	const [message, setMessage] = useState('')
	const { data, loading, error, reload } = useLoad(
		() => getApi<BoardData>('/operations/board'),
		[]
	)

	const [showCreate, setShowCreate] = useState(false)
	const [createForm, setCreateForm] = useState({
		projectId: '',
		title: '',
		description: '',
		priority: '3',
		dueDate: '',
	})
	const [createMsg, setCreateMsg] = useState('')
	const [createBusy, setCreateBusy] = useState(false)

	const projects = useLoad(
		() => getApi<{ items: Array<{ id: string; code: string; title: string }> }>('/projects?perPage=100'),
		[],
	)
	async function moveTask(id: string, status: string) {
		setMessage('')
		try {
			await patchApi(`/operations/tasks/${id}/status`, { status })
			reload()
		} catch (err: unknown) {
			const maybeError = err as {
				response?: { data?: { message?: string } }
				message?: string
			}
			setMessage(
				maybeError.response?.data?.message ??
					maybeError.message ??
					'Не вдалося оновити статус задачі'
			)
		}
	}

	async function createTask(e: React.FormEvent) {
		e.preventDefault()
		if (!createForm.title.trim() || !createForm.projectId) {
			setCreateMsg('Заповніть назву і проєкт')
			return
		}
		setCreateBusy(true)
		setCreateMsg('')
		try {
			await postApi('/operations/tasks', {
				projectId: createForm.projectId,
				title: createForm.title.trim(),
				description: createForm.description.trim() || undefined,
				priority: Number(createForm.priority),
				dueDate: createForm.dueDate || undefined,
			})
			setShowCreate(false)
			setCreateForm({ projectId: '', title: '', description: '', priority: '3', dueDate: '' })
			reload()
		} catch (err: unknown) {
			const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
			setCreateMsg(m ?? 'Не вдалося створити задачу')
		} finally {
			setCreateBusy(false)
		}
	}
	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader
					title="Канбан задач"
					description="Завантажуємо задачі..."
				/>
				<div className="flex gap-4 overflow-x-auto pb-2">
					{cols.map((col) => (
						<div
							key={col}
							className="w-[260px] shrink-0 rounded-[20px] border border-white/55 bg-white/30 p-4"
						>
							<Skeleton className="mb-4 h-5 w-28" />
							{Array.from({ length: 3 }).map((_, i) => (
								<div
									key={i}
									className="mb-2 rounded-[14px] border border-white/50 bg-white/40 p-3"
								>
									<Skeleton className="h-4 w-full" />
									<Skeleton className="mt-2 h-3 w-3/4" />
									<Skeleton className="mt-2 h-3 w-1/2" />
								</div>
							))}
						</div>
					))}
				</div>
			</div>
		)
	}
	if (error || !data)
		return (
			<div className="space-y-6">
				<PageHeader title="Канбан задач" />
				<ErrorState message={error ?? undefined} />
			</div>
		)
	return (
		<div className="space-y-6">
			<PageHeader
				title="Канбан задач"
				description={`${data.total} задач по всіх проєктах`}
				actions={
					<div className="flex items-center gap-2">
						<Button type="button" onClick={() => setShowCreate(true)}>
							+ Нова задача
						</Button>
						<div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-[var(--tds-muted)]">
							<ClipboardList className="h-3.5 w-3.5" />
							Кнопки переміщують задачі між колонками
						</div>
					</div>
				}
			/>

			<Modal
				open={showCreate}
				onClose={() => setShowCreate(false)}
				title="Нова задача"
			>
				<form onSubmit={(e) => void createTask(e)} className="space-y-3 p-4">
					<div>
						<label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
							Проєкт *
						</label>
						<select
							className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
							value={createForm.projectId}
							onChange={(e) => setCreateForm((f) => ({ ...f, projectId: e.target.value }))}
							required
						>
							<option value="">Оберіть проєкт…</option>
							{(projects.data?.items ?? []).map((p) => (
								<option key={p.id} value={p.id}>
									{p.code} — {p.title}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
							Назва задачі *
						</label>
						<Input
							value={createForm.title}
							onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
							placeholder="Наприклад: Встановити підвісну стелю"
							required
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
							Опис
						</label>
						<textarea
							className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-20"
							value={createForm.description}
							onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
							placeholder="Деталі задачі…"
						/>
					</div>
					<div className="flex gap-3">
						<div className="flex-1">
							<label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
								Пріоритет
							</label>
							<select
								className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
								value={createForm.priority}
								onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
							>
								<option value="1">Критично</option>
								<option value="2">Високий</option>
								<option value="3">Середній</option>
								<option value="4">Низький</option>
								<option value="5">Без пріоритету</option>
							</select>
						</div>
						<div className="flex-1">
							<label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
								Дедлайн
							</label>
							<Input
								type="date"
								value={createForm.dueDate}
								onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
							/>
						</div>
					</div>
					{createMsg && <p className="text-sm text-rose-600">{createMsg}</p>}
					<ModalFooter>
						<Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
							Скасувати
						</Button>
						<Button type="submit" disabled={createBusy}>
							{createBusy ? 'Створюємо…' : 'Створити задачу'}
						</Button>
					</ModalFooter>
				</form>
			</Modal>

			{message ? (
				<div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{message}
				</div>
			) : null}

			<div className="flex gap-3 overflow-x-auto pb-4">
				{cols.map((col) => {
					const cfg = colConfig[col]
					const tasks = (data.byStatus[col] ?? []) as Array<{
						id: string
						title: string
						description?: string
						status: string
						priority: number
						dueDate?: string
						project: {
							code: string
							title: string
						}
						teamName?: string
						assigneeName?: string
					}>
					return (
						<div
							key={col}
							className="flex w-[270px] shrink-0 flex-col rounded-[20px] border border-white/55 bg-white/25 backdrop-blur-sm"
							style={{ borderTopColor: cfg.accent + '60' }}
						>
							<div className="flex items-center justify-between px-4 py-3">
								<div className="flex items-center gap-2">
									<span
										className="h-2 w-2 rounded-full"
										style={{ background: cfg.dot }}
									/>
									<span className="text-sm font-black text-[var(--tds-ink)]">
										{taskStatusLabels[col]}
									</span>
								</div>
								<Badge tone={cfg.tone}>{tasks.length}</Badge>
							</div>

							<div
								className="flex flex-col gap-2 overflow-y-auto px-3 pb-4"
								style={{ maxHeight: '65vh' }}
							>
								{tasks.length === 0 ? (
									<EmptyState
										title="Порожньо"
										description="Тут немає задач"
										className="min-h-[120px] border-dashed border-white/40 bg-transparent"
									/>
								) : (
									tasks.map((t) => {
										const pColor =
											priorityColors[
												(t.priority - 1) % 5
											] ?? '#94a3b8'
										const pLabel =
											priorityLabels[
												(t.priority - 1) % 5
											] ?? 'None'
										const canMove = true
										return (
											<div
												key={t.id}
												className="rounded-[16px] border border-white/65 bg-white/70 p-3 shadow-[0_2px_12px_rgba(76,76,76,0.08)] transition hover:shadow-[0_4px_20px_rgba(76,76,76,0.13)] hover:-translate-y-0.5"
											>
												<div className="flex items-start justify-between gap-2">
													<div className="min-w-0 text-sm font-semibold leading-snug text-[var(--tds-ink)]">
														{t.title}
													</div>
													<span
														className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
														style={{
															background: pColor,
														}}
														title={pLabel}
													/>
												</div>
												{t.description && (
													<div className="mt-1.5 line-clamp-2 text-xs text-[var(--tds-muted)]">
														{t.description}
													</div>
												)}
												<div className="mt-2 text-[11px] text-[var(--tds-muted)]">
													<span className="font-bold text-[var(--tds-dark)]">
														{t.project.code}
													</span>
													{t.assigneeName && (
														<span>
															{' '}
															· {t.assigneeName}
														</span>
													)}
												</div>
												{t.dueDate && (
													<div className="mt-1 text-[11px] text-[var(--tds-muted)]">
														Дедлайн{' '}
														{t.dueDate.slice(0, 10)}
													</div>
												)}
												{canMove ? (
													<div className="mt-2.5 flex flex-wrap gap-1">
														{cols
															.filter(
																(c) => c !== col
															)
															.slice(0, 3)
															.map((c) => (
																<button
																	key={c}
																	onClick={() =>
																		moveTask(
																			t.id,
																			c
																		)
																	}
																	className="rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--tds-muted)] transition hover:border-[var(--tds-primary)] hover:text-[var(--tds-primary)]"
																>
																	→{' '}
																	{
																		taskStatusLabels[
																			c
																		]
																	}
																</button>
															))}
													</div>
												) : (
													<div className="mt-2.5 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
														Майстер може змінювати
														тільки свої задачі
													</div>
												)}
											</div>
										)
									})
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
