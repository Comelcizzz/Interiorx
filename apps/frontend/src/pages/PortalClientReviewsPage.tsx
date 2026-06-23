import {
	Badge,
	Button,
	Card,
	CardContent,
	Input,
	PageHeader,
} from '@tailored/ui'
import { formatDateTime } from '@tailored/shared'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { mediaUrl, portalApi } from '@/lib/api'
import type {
	Paginated,
	PortalEligibleProject,
	PortalReviewItem,
} from '@/lib/types'
import { SearchableSelect } from '@/components/SearchableSelect'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'

const statusOptions = [
	{ value: 'all', label: 'Усі статуси' },
	{ value: 'PENDING', label: 'На модерації' },
	{ value: 'PUBLISHED', label: 'Опубліковано' },
	{ value: 'HIDDEN', label: 'Приховано' },
]

const reviewStatusLabel: Record<string, string> = {
	PENDING: 'На модерації',
	PUBLISHED: 'Опубліковано',
	HIDDEN: 'Приховано',
}

function parsePhotoUrls(text: string) {
	return text
		.split(/[\n,]+/)
		.map((u) => u.trim())
		.filter(Boolean)
		.filter((u) => /^https?:\/\//i.test(u))
		.slice(0, 5)
}

const reviewStatusOptions = statusOptions.filter((o) => o.value !== 'all')

export function PortalClientReviewsPage() {
	const [params] = useSearchParams()
	const prefillProjectId = params.get('projectId') ?? ''
	const { page, perPage, status: statusRaw, from, to, sort, patchParams } =
		useListQuery(12)
	const status = statusRaw || 'all'
	const filtersActive = !!(
		statusRaw ||
		from ||
		to ||
		sort !== 'latest'
	)
	const listQs = useMemo(() => {
		const p = new URLSearchParams()
		p.set('page', String(page))
		p.set('perPage', String(perPage))
		p.set('status', status)
		if (from) p.set('from', from)
		if (to) p.set('to', to)
		if (sort) p.set('sort', sort)
		return p.toString()
	}, [page, perPage, status, from, to, sort])
	const list = useLoad(
		() =>
			portalApi
				.get<Paginated<PortalReviewItem>>(`/reviews?${listQs}`)
				.then((r) => r.data),
		[listQs]
	)

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			status: values.status || null,
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			status: null,
			from: null,
			to: null,
			sort: null,
		})
	}
	const eligible = useLoad(
		() =>
			portalApi
				.get<{
					items: PortalEligibleProject[]
				}>('/reviews/eligible-projects')
				.then((r) => r.data),
		[]
	)
	const [formProjectId, setFormProjectId] = useState('')
	const [rating, setRating] = useState(5)
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [photoUrlsText, setPhotoUrlsText] = useState('')
	const [formBusy, setFormBusy] = useState(false)
	const [formErr, setFormErr] = useState<string | null>(null)
	const [formOk, setFormOk] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editRating, setEditRating] = useState(5)
	const [editTitle, setEditTitle] = useState('')
	const [editBody, setEditBody] = useState('')
	const [editPhotoUrlsText, setEditPhotoUrlsText] = useState('')
	const [editBusy, setEditBusy] = useState(false)
	const [editErr, setEditErr] = useState<string | null>(null)
	const completedProjects = useLoad(
		() =>
			portalApi
				.get<
					Paginated<{
						id: string
						code: string
						title: string
					}>
				>('/projects', {
					params: { page: 1, perPage: 50, status: 'COMPLETED' },
				})
				.then((r) => r.data),
		[]
	)
	useEffect(() => {
		if (prefillProjectId) setFormProjectId(prefillProjectId)
	}, [prefillProjectId])

	function openEdit(r: PortalReviewItem) {
		setEditingId(r.id)
		setEditRating(r.rating)
		setEditTitle(r.title)
		setEditBody(r.body)
		setEditPhotoUrlsText((r.photoUrls ?? []).join('\n'))
		setEditErr(null)
	}

	async function saveEdit(e: FormEvent) {
		e.preventDefault()
		if (!editingId) return
		setEditBusy(true)
		setEditErr(null)
		try {
			await portalApi.patch(`/reviews/${editingId}`, {
				rating: editRating,
				title: editTitle.trim(),
				body: editBody.trim(),
				photoUrls: parsePhotoUrls(editPhotoUrlsText),
			})
			setEditingId(null)
			list.reload()
		} catch (err: unknown) {
			const msg = (
				err as {
					response?: {
						data?: {
							message?: string
						}
					}
				}
			)?.response?.data?.message
			setEditErr(msg ?? 'Не вдалося зберегти зміни.')
		} finally {
			setEditBusy(false)
		}
	}

	async function submitReview(e: FormEvent) {
		e.preventDefault()
		setFormErr(null)
		setFormOk(false)
		if (!formProjectId) {
			setFormErr('Оберіть завершений проєкт.')
			return
		}
		setFormBusy(true)
		try {
			await portalApi.post('/reviews', {
				projectId: formProjectId,
				rating,
				title: title.trim(),
				body: body.trim(),
				photoUrls: parsePhotoUrls(photoUrlsText),
			})
			setFormOk(true)
			setTitle('')
			setBody('')
			setPhotoUrlsText('')
			list.reload()
			eligible.reload()
		} catch (err: unknown) {
			const msg = (
				err as {
					response?: {
						data?: {
							message?: string
						}
					}
				}
			)?.response?.data?.message
			setFormErr(msg ?? 'Не вдалося надіслати відгук.')
		} finally {
			setFormBusy(false)
		}
	}

	const totalPages = list.data
		? Math.max(1, Math.ceil(list.data.total / perPage))
		: 1

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title="Мої відгуки"
				description="Відгук можна залишити лише для проєктів зі статусом «Завершено». Поки відгук «На модерації», ви можете оновити текст або оцінку; після публікації зміни робить команда за запитом."
			/>

			<Card className="border-slate-200 bg-slate-50/80">
				<CardContent className="py-4 text-sm text-slate-700">
					<p className="font-semibold text-[var(--tds-ink)]">
						Чому в списку проєктів мало пунктів?
					</p>
					<p className="mt-2 leading-6">
						У дропдауні «Проєкт» показуються лише <strong>завершені</strong> проєкти. Якщо після демо-сіду у
						вас один такий проєкт — у списку буде один рядок. Фото додаються як{' '}
						<strong>посилання (URL)</strong>, без завантаження файлів у кабінет.
					</p>
					<p className="mt-2">
						<Link className="font-semibold text-[var(--tds-primary)] underline" to="/portal/projects">
							Перейти до моїх проєктів
						</Link>
					</p>
				</CardContent>
			</Card>

			{eligible.data?.items.length ? (
				<Card className="border-[rgba(38,132,91,0.25)] bg-[rgba(38,132,91,0.06)]">
					<CardContent className="py-4">
						<div className="text-sm font-bold text-[var(--tds-ink)]">
							Можна залишити відгук
						</div>
						<p className="mt-1 text-sm text-slate-600">
							У вас є завершені проєкти без опублікованого
							відгуку. Після відправки команда перевірить текст
							і відкриє його на публічній сторінці.
						</p>
						<ul className="mt-3 space-y-2 text-sm">
							{eligible.data.items.map((p) => (
								<li key={p.projectId}>
									<Link
										className="font-semibold text-[var(--tds-primary)] hover:underline"
										to={`/portal/reviews?projectId=${encodeURIComponent(p.projectId)}`}
									>
										{p.code}: {p.title}
									</Link>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Новий відгук
					</div>
					{formOk ? (
						<p className="text-sm text-emerald-700">
							Дякуємо. Відгук надіслано на модерацію.
						</p>
					) : null}
					{formErr ? (
						<p className="text-sm text-rose-600">{formErr}</p>
					) : null}
					<form className="space-y-4" onSubmit={submitReview}>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Проєкт
							</label>
							<SearchableSelect
								value={formProjectId}
								onChange={setFormProjectId}
								placeholder="Оберіть проєкт..."
								options={(completedProjects.data?.items ?? []).map(
									(p) => ({
										value: p.id,
										label: `${p.code} — ${p.title}`,
										searchText: `${p.code} ${p.title}`,
									})
								)}
							/>
							{completedProjects.loading ? (
								<p className="mt-1 text-xs text-slate-500">
									Завантажуємо проєкти...
								</p>
							) : null}
							{(completedProjects.data?.items.length ?? 0) ===
								0 && !completedProjects.loading ? (
								<p className="mt-1 text-xs text-amber-700">
									Відгук можна залишити після завершення
									проєкту.
								</p>
							) : null}
						</div>
						<div>
							<div className="mb-1 text-xs font-bold uppercase text-slate-500">
								Оцінка
							</div>
							<div className="flex flex-wrap gap-2">
								{[1, 2, 3, 4, 5].map((n) => (
									<button
										key={n}
										type="button"
										className={`rounded-full px-3 py-1.5 text-sm font-semibold ${rating === n ? 'bg-[var(--tds-primary)] text-white' : 'bg-slate-100 text-slate-700'}`}
										onClick={() => setRating(n)}
									>
										{n}
									</button>
								))}
							</div>
						</div>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Заголовок
							</label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
								minLength={2}
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Ваш досвід
							</label>
							<textarea
								className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
								value={body}
								onChange={(e) => setBody(e.target.value)}
								required
								minLength={4}
							/>
						</div>
						<div>
							<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
								Фото через URL, до 5 посилань
							</label>
							<textarea
								className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
								placeholder="https://..."
								value={photoUrlsText}
								onChange={(e) => setPhotoUrlsText(e.target.value)}
							/>
						</div>
						<Button type="submit" disabled={formBusy}>
							{formBusy ? 'Надсилаємо...' : 'Надіслати відгук'}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="space-y-4 pt-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Мої відправлені відгуки
						</div>
					</div>

					<ListQueryBar
						values={{ status: statusRaw, q: '', from, to, sort }}
						onApply={applyFilters}
						onReset={resetFilters}
						statusOptions={reviewStatusOptions}
						showSearch={false}
					/>

					{list.loading ? (
						<p className="text-sm text-slate-500">
							Завантажуємо...
						</p>
					) : null}
					{list.error ? (
						<p className="text-sm text-rose-600">{list.error}</p>
					) : null}
					{list.data?.items.length === 0 ? (
						<p className="text-sm text-slate-600">
							{filtersActive
								? 'Нічого не знайдено за обраними фільтрами'
								: 'Відгуків ще немає.'}
						</p>
					) : null}

					<div className="space-y-3">
						{list.data?.items.map((r) => (
							<div
								key={r.id}
								className="rounded-2xl border border-slate-100 p-4"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="font-semibold text-[var(--tds-ink)]">
										{r.title}
									</div>
									<Badge tone="neutral">
										{reviewStatusLabel[r.status] ??
											r.status}
									</Badge>
								</div>
								<div className="mt-1 text-xs text-slate-500">
									{r.projectCode
										? `Проєкт ${r.projectCode}`
										: 'Проєкт'}{' '}
									· {r.rating}/5 ·{' '}
									{r.createdAt
										? formatDateTime(r.createdAt, {
												dateStyle: 'medium',
											})
										: ''}
								</div>
								<p className="mt-2 text-sm text-slate-700">
									{r.body}
								</p>
								{r.photoUrls?.length ? (
									<ul className="mt-2 space-y-1.5 text-sm">
										{r.photoUrls.map((u) => {
											const href = mediaUrl(u)
											return (
												<li key={u}>
													<a
														className="break-all font-medium text-[var(--tds-primary)] underline"
														href={href}
														target="_blank"
														rel="noopener noreferrer"
													>
														{u}
													</a>
												</li>
											)
										})}
									</ul>
								) : null}
								{r.status === 'PENDING' ? (
									editingId === r.id ? (
										<form
											className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
											onSubmit={saveEdit}
										>
											{editErr ? (
												<p className="text-sm text-rose-600">
													{editErr}
												</p>
											) : null}
											<div>
												<div className="mb-1 text-xs font-bold uppercase text-slate-500">
													Оцінка
												</div>
												<div className="flex flex-wrap gap-2">
													{[1, 2, 3, 4, 5].map((n) => (
														<button
															key={n}
															type="button"
															className={`rounded-full px-3 py-1.5 text-sm font-semibold ${editRating === n ? 'bg-[var(--tds-primary)] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
															onClick={() =>
																setEditRating(n)
															}
														>
															{n}
														</button>
													))}
												</div>
											</div>
											<div>
												<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
													Заголовок
												</label>
												<Input
													value={editTitle}
													onChange={(e) =>
														setEditTitle(
															e.target.value
														)
													}
													required
													minLength={2}
												/>
											</div>
											<div>
												<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
													Текст
												</label>
												<textarea
													className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
													value={editBody}
													onChange={(e) =>
														setEditBody(
															e.target.value
														)
													}
													required
													minLength={4}
												/>
											</div>
											<div>
												<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
													Фото (URL, до 5)
												</label>
												<textarea
													className="min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
													placeholder="https://..."
													value={editPhotoUrlsText}
													onChange={(e) =>
														setEditPhotoUrlsText(
															e.target.value
														)
													}
												/>
											</div>
											<div className="flex flex-wrap gap-2">
												<Button
													type="submit"
													disabled={editBusy}
												>
													{editBusy
														? 'Зберігаємо...'
														: 'Зберегти'}
												</Button>
												<Button
													type="button"
													variant="secondary"
													disabled={editBusy}
													onClick={() =>
														setEditingId(null)
													}
												>
													Скасувати
												</Button>
											</div>
										</form>
									) : (
										<div className="mt-3 space-y-2">
											<Button
												type="button"
												variant="secondary"
												onClick={() => openEdit(r)}
											>
												Редагувати
											</Button>
											<p className="text-xs text-slate-500">
												Поки статус «На модерації», ви
												можете оновити відгук перед
												публікацією.
											</p>
										</div>
									)
								) : (
									<p className="mt-3 text-xs text-slate-500">
										Після публікації або приховування зміни
										виконує команда за запитом (телефон /
										лист).
									</p>
								)}
							</div>
						))}
					</div>

					{totalPages > 1 ? (
						<div className="flex items-center justify-center gap-2 pt-2">
							<Button
								type="button"
								variant="secondary"
								disabled={page <= 1}
								onClick={() =>
									patchParams({
										page: String(Math.max(1, page - 1)),
									})
								}
							>
								Назад
							</Button>
							<span className="text-sm text-slate-600">
								Сторінка {page} з {totalPages}
							</span>
							<Button
								type="button"
								variant="secondary"
								disabled={page >= totalPages}
								onClick={() =>
									patchParams({
										page: String(Math.min(totalPages, page + 1)),
									})
								}
							>
								Далі
							</Button>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
