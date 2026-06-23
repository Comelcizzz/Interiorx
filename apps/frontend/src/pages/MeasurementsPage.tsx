import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
	Input,
	Modal,
	ModalFooter,
	PageHeader,
	SkeletonCard,
} from '@tailored/ui'
import { FormModalSteps } from '@/components/FormModalSteps'
import {
	SearchableSelect,
	perPageSelectOptions,
} from '@/components/SearchableSelect'
import { PlusCircle, Ruler } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApi, postApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

type MeasurementRow = {
	id: string
	zoneName: string
	floorArea: string
	wallArea: string
	ceilingHeight: string
	notes?: string | null
	createdAt: string
	project: {
		id: string
		code: string
		title: string
	}
}

type MeasurementsListResponse = {
	items: MeasurementRow[]
	total: number
	page: number
	perPage: number
	totalFloor: number
	totalWall: number
}

export function MeasurementsPage() {
	const [searchParams, setSearchParams] = useSearchParams()
	const { page, perPage, q, from, to, sort, patchParams } = useListQuery(25)
	const projectId = searchParams.get('projectId') ?? ''
	const filtersActive = !!(projectId || q || from || to || sort !== 'latest')

	const openAddFromUrl = searchParams.get('add') === '1'

	const apiQs = useMemo(() => {
		const p = new URLSearchParams()
		p.set('page', String(page))
		p.set('perPage', String(perPage))
		if (projectId) p.set('projectId', projectId)
		if (q.trim()) p.set('q', q.trim())
		if (from) p.set('from', from)
		if (to) p.set('to', to)
		if (sort && sort !== 'latest') p.set('sort', sort)
		else p.set('sort', 'latest')
		return p.toString()
	}, [page, perPage, projectId, q, from, to, sort])

	const { data, loading, error, reload } = useLoad(
		() => getApi<MeasurementsListResponse>(`/measurements?${apiQs}`),
		[apiQs]
	)

	function resetFilters() {
		patchParams({
			page: '1',
			projectId: null,
			q: null,
			from: null,
			to: null,
			sort: null,
			perPage: '25',
		})
	}

	const projects = useLoad(
		() =>
			getApi<
				Paginated<{
					id: string
					code: string
					title: string
				}>
			>('/projects?page=1&perPage=200').then((r) => r.items),
		[]
	)

	const projectOptions = useMemo(
		() =>
			(projects.data ?? []).map((p) => ({
				value: p.id,
				label: `${p.code} — ${p.title}`,
				searchText: `${p.code} ${p.title}`,
			})),
		[projects.data]
	)

	const [showModal, setShowModal] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const [form, setForm] = useState({
		projectId: '',
		zoneName: '',
		floorArea: '',
		wallArea: '',
		ceilingHeight: '',
		notes: '',
	})

	function patchSearchParams(
		next: Record<string, string | null | undefined>
	) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev)
				for (const [k, v] of Object.entries(next)) {
					if (v === null || v === undefined || v === '') n.delete(k)
					else n.set(k, v)
				}
				return n
			},
			{ replace: true }
		)
	}

	function openAddModal() {
		setFormError(null)
		setForm((f) => ({
			...f,
			projectId: projectId || f.projectId,
		}))
		setShowModal(true)
	}

	function closeAddModal() {
		setShowModal(false)
		setFormError(null)
	}

	useEffect(() => {
		if (!openAddFromUrl) return
		openAddModal()
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev)
				n.delete('add')
				return n
			},
			{ replace: true }
		)
		// eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot from URL
	}, [openAddFromUrl])

	async function handleSubmit() {
		setFormError(null)
		if (!form.projectId.trim()) {
			setFormError('Оберіть проєкт.')
			return
		}
		if (!form.zoneName.trim()) {
			setFormError('Вкажіть назву зони (приміщення).')
			return
		}
		setSubmitting(true)
		try {
			await postApi('/measurements', {
				projectId: form.projectId.trim(),
				zoneName: form.zoneName.trim(),
				floorArea: Number(form.floorArea) || 0,
				wallArea: Number(form.wallArea) || 0,
				ceilingHeight: Number(form.ceilingHeight) || 0,
				notes: form.notes.trim() || undefined,
			})
			closeAddModal()
			setForm({
				projectId: projectId || '',
				zoneName: '',
				floorArea: '',
				wallArea: '',
				ceilingHeight: '2.7',
				notes: '',
			})
			reload()
		} catch (err: unknown) {
			const msg = (
				err as { response?: { data?: { message?: string } } }
			)?.response?.data?.message
			setFormError(msg ?? 'Не вдалося зберегти замір')
		} finally {
			setSubmitting(false)
		}
	}

	const items = data?.items ?? []
	const total = data?.total ?? 0
	const totalPages = data
		? Math.max(1, Math.ceil(data.total / data.perPage))
		: 1

	const byProject: Record<string, MeasurementRow[]> = {}
	for (const m of items) {
		if (!byProject[m.project.code]) byProject[m.project.code] = []
		byProject[m.project.code].push(m)
	}

	const aggFloor = data?.totalFloor ?? 0
	const aggWall = data?.totalWall ?? 0

	return (
		<div className="space-y-6">
			<PageHeader
				title="Заміри"
				description="Заміри по зонах для розрахунку кошторисів. Фільтри та пагінація працюють через API (проєкт, текстовий пошук по зоні/нотатках)."
				actions={
					<Button onClick={openAddModal} icon={<PlusCircle />}>
						Додати замір
					</Button>
				}
			/>

			<Card className="border-slate-200 bg-slate-50/80">
				<CardContent className="space-y-4 py-4">
					<div className="flex flex-wrap gap-3">
						<div className="min-w-[200px] flex-1">
							<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Пошук
							</label>
							<Input
								value={q}
								onChange={(e) => {
									patchParams({ q: e.target.value || null, page: '1' })
								}}
								placeholder="Напр. вітальня, ніша…"
							/>
						</div>
						<div className="min-w-[240px] flex-1">
							<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Проєкт
							</label>
							<SearchableSelect
								value={projectId}
								onChange={(id) => patchParams({ page: '1', projectId: id || null })}
								placeholder="Усі проєкти"
								searchPlaceholder="Пошук проєкту…"
								emptyLabel="Проєктів не знайдено"
								options={[
									{ value: '', label: 'Усі проєкти', searchText: 'усі' },
									...projectOptions,
								]}
							/>
						</div>
						<div className="min-w-[120px]">
							<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								Сортування
							</label>
							<SearchableSelect
								value={sort || 'latest'}
								onChange={(v) => patchParams({ page: '1', sort: v })}
								options={[
									{ value: 'latest', label: 'Найновіші' },
									{ value: 'oldest', label: 'Найстаріші' },
								]}
							/>
						</div>
						<div className="min-w-[100px]">
							<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
								На сторінці
							</label>
							<SearchableSelect
								value={String(perPage)}
								onChange={(v) => patchParams({ page: '1', perPage: v })}
								options={perPageSelectOptions([10, 25, 50, 100])}
							/>
						</div>
					</div>
					{filtersActive && (
						<button
							type="button"
							onClick={resetFilters}
							className="text-xs font-semibold text-slate-500 hover:text-slate-800"
						>
							Скинути фільтри
						</button>
					)}
				</CardContent>
			</Card>

			{loading && !data ? (
				<div className="grid gap-4 sm:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<SkeletonCard key={i} />
					))}
				</div>
			) : error ? (
				<ErrorState message={error} />
			) : !data || data.total === 0 ? (
				<EmptyState
					icon={<Ruler />}
					title={
						filtersActive
							? 'Нічого не знайдено за обраними фільтрами'
							: 'Заміри не знайдені'
					}
					description={
						filtersActive
							? undefined
							: 'Змініть фільтри або додайте перший замір для обраного проєкту.'
					}
				/>
			) : (
				<>
					<div className="grid gap-4 sm:grid-cols-3">
						<Card>
							<CardContent className="py-4">
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Зон за фільтром (усього)
								</div>
								<div className="mt-2 text-3xl font-black text-[var(--tds-ink)]">
									{total}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="py-4">
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Підлога за фільтром (м²)
								</div>
								<div className="mt-2 text-3xl font-black text-[var(--tds-ink)]">
									{aggFloor.toFixed(1)} м²
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="py-4">
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Стіни за фільтром (м²)
								</div>
								<div className="mt-2 text-3xl font-black text-[var(--tds-ink)]">
									{aggWall.toFixed(1)} м²
								</div>
							</CardContent>
						</Card>
					</div>

					{items.length === 0 ? (
						<p className="text-sm text-slate-600">
							На цій сторінці немає рядків. Перейдіть на іншу сторінку або змініть фільтр.
						</p>
					) : null}

					{Object.entries(byProject).map(([code, zones]) => (
						<Card key={`${code}-${page}`}>
							<CardHeader>
								<div className="flex items-center gap-2">
									<span className="font-mono text-sm font-black text-[var(--tds-ink)]">
										{code}
									</span>
									<Badge tone="neutral">{zones.length} зон на сторінці</Badge>
									<span className="text-xs text-[var(--tds-muted)]">
										{zones[0]?.project.title}
									</span>
								</div>
							</CardHeader>
							<CardContent className="overflow-x-auto">
								<table className="w-full min-w-[480px] text-sm">
									<thead>
										<tr className="border-b border-white/50">
											{[
												'Зона',
												'Підлога м²',
												'Стіни м²',
												'Висота м',
												'Нотатки',
											].map((h) => (
												<th
													key={h}
													className="py-2.5 pr-4 text-left text-[11px] font-black uppercase tracking-[0.12em] text-[var(--tds-muted)]"
												>
													{h}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{zones.map((m) => (
											<tr
												key={m.id}
												className="border-b border-white/30 transition hover:bg-white/30"
											>
												<td className="py-2.5 pr-4 font-semibold text-[var(--tds-ink)]">
													{m.zoneName}
												</td>
												<td className="py-2.5 pr-4 text-[var(--tds-dark)]">
													{Number(m.floorArea).toFixed(1)}
												</td>
												<td className="py-2.5 pr-4 text-[var(--tds-dark)]">
													{Number(m.wallArea).toFixed(1)}
												</td>
												<td className="py-2.5 pr-4 text-[var(--tds-dark)]">
													{Number(m.ceilingHeight).toFixed(2)}
												</td>
												<td className="py-2.5 pr-4 text-xs text-[var(--tds-muted)]">
													{m.notes ?? '—'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</CardContent>
						</Card>
					))}

					{totalPages > 1 ? (
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-white/70 bg-white/55 px-4 py-3">
							<span className="text-sm text-slate-600">
								Сторінка {page} з {totalPages} · показано {items.length} з {total}
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
											page: String(Math.min(totalPages, page + 1)),
										})
									}
								>
									Далі
								</Button>
							</div>
						</div>
					) : null}
				</>
			)}

			<Modal
				open={showModal}
				onClose={closeAddModal}
				title="Додати замір"
				className="max-w-lg"
			>
				<FormModalSteps
					steps={[
						'Оберіть проєкт — для якого фіксуєте площі.',
						'Вкажіть зону (кухня, вітальня…) і розміри: підлога та стіни в м², висота стелі в метрах.',
						'Після збереження заміри з’являться у списку; їх використають при складанні кошторису на сторінці «Кошториси».',
					]}
				/>

				{formError ? (
					<p className="mb-4 text-sm text-rose-600">{formError}</p>
				) : null}

				<div className="space-y-5">
					<div>
						<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Крок 1 · Проєкт
						</label>
						<SearchableSelect
							value={form.projectId}
							onChange={(id) =>
								setForm((f) => ({ ...f, projectId: id }))
							}
							placeholder="Оберіть проєкт…"
							searchPlaceholder="Пошук за кодом або назвою…"
							emptyLabel="Проєктів не знайдено"
							options={projectOptions}
						/>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Крок 2 · Зона (приміщення)
						</label>
						<Input
							value={form.zoneName}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									zoneName: e.target.value,
								}))
							}
							placeholder="Напр. вітальня, кухня"
							required
						/>
					</div>
					<div>
						<label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Крок 3 · Розміри
						</label>
						<div className="grid grid-cols-3 gap-3">
							{[
								['floorArea', 'Підлога, м²', '0'],
								['wallArea', 'Стіни, м²', '0'],
								['ceilingHeight', 'Висота, м', '2.7'],
							].map(([key, label, placeholder]) => (
								<div key={key}>
									<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
										{label}
									</label>
									<Input
										value={form[key as keyof typeof form]}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												[key]: e.target.value,
											}))
										}
										type="number"
										min={0}
										step="0.01"
										placeholder={placeholder}
									/>
								</div>
							))}
						</div>
						<p className="mt-2 text-xs text-slate-500">
							Площі потрібні для розрахунку матеріалів і робіт у
							кошторисі.
						</p>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Нотатки (необовʼязково)
						</label>
						<Input
							value={form.notes}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									notes: e.target.value,
								}))
							}
							placeholder="Ніша, нестандартна стеля…"
						/>
					</div>
				</div>

				<ModalFooter>
					<Button variant="secondary" onClick={closeAddModal}>
						Скасувати
					</Button>
					<Button
						onClick={() => void handleSubmit()}
						disabled={submitting}
					>
						{submitting ? 'Зберігаємо…' : 'Зберегти замір'}
					</Button>
				</ModalFooter>
			</Modal>
		</div>
	)
}
