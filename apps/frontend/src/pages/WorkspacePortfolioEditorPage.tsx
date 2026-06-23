import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	Input,
	PageHeader,
} from '@tailored/ui'
import { SearchableSelect } from '@/components/SearchableSelect'
import { FormEvent, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getApi, patchApi, postApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'
type PortfolioRow = {
	id: string
	slug: string
	title: string
	summary: string
	category: string
	style: string
	isPublished: boolean
	sortOrder: number
	coverImageUrl: string
	galleryImageUrls: string[]
	projectId: string | null
	ownerStaffId: string | null
}
type ListResp = {
	items: PortfolioRow[]
	total: number
}
const emptyForm = () => ({
	slug: '',
	title: '',
	summary: '',
	category: '',
	style: '',
	isPublished: false,
	sortOrder: '0',
	coverImageUrl: '',
	gallery: '',
	completedAt: '',
	projectId: '',
	ownerStaffId: '',
})
export function WorkspacePortfolioEditorPage() {
	const role = useAuthStore((s) => s.user?.role)
	const isAdmin = role === 'ADMIN'
	const [selected, setSelected] = useState<PortfolioRow | null>(null)
	const [creating, setCreating] = useState(false)
	const [form, setForm] = useState(emptyForm)
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)
	const [searchParams, setSearchParams] = useSearchParams()
	const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
	const perPage = Math.min(
		50,
		Math.max(5, Number(searchParams.get('perPage') ?? '20') || 20)
	)
	const listQs = useMemo(() => {
		const p = new URLSearchParams()
		p.set('page', String(page))
		p.set('perPage', String(perPage))
		return p.toString()
	}, [page, perPage])
	const list = useLoad(
		() => getApi<ListResp>(`/portfolio-items?${listQs}`),
		[listQs]
	)
	const totalPages = list.data
		? Math.max(1, Math.ceil(list.data.total / perPage))
		: 1
	function patchListParams(next: Record<string, string | null>) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev)
				for (const [k, v] of Object.entries(next)) {
					if (v === null || v === '') n.delete(k)
					else n.set(k, v)
				}
				return n
			},
			{ replace: true }
		)
	}
	const galleryArray = useMemo(
		() =>
			form.gallery
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean),
		[form.gallery]
	)
	function loadRow(r: PortfolioRow | null, isNew: boolean) {
		setCreating(isNew)
		setSelected(isNew ? null : r)
		if (!r || isNew) {
			setForm(emptyForm())
			return
		}
		setForm({
			slug: r.slug,
			title: r.title,
			summary: r.summary,
			category: r.category,
			style: r.style,
			isPublished: r.isPublished,
			sortOrder: String(r.sortOrder ?? 0),
			coverImageUrl: r.coverImageUrl ?? '',
			gallery: (r.galleryImageUrls ?? []).join(', '),
			completedAt: '',
			projectId: r.projectId ?? '',
			ownerStaffId: r.ownerStaffId ?? '',
		})
	}
	async function onSubmit(e: FormEvent) {
		e.preventDefault()
		setBusy(true)
		setMsg('')
		try {
			const body: Record<string, unknown> = {
				slug: form.slug.trim(),
				title: form.title.trim(),
				summary: form.summary.trim(),
				category: form.category.trim(),
				style: form.style.trim(),
				isPublished: form.isPublished,
				sortOrder: Number(form.sortOrder) || 0,
				coverImageUrl: form.coverImageUrl.trim(),
				galleryImageUrls: galleryArray,
			}
			if (form.completedAt.trim())
				body.completedAt = form.completedAt.trim()
			if (form.projectId.trim()) body.projectId = form.projectId.trim()
			if (isAdmin && form.ownerStaffId.trim())
				body.ownerStaffId = form.ownerStaffId.trim()
			if (creating || !selected) {
				await postApi('/portfolio-items', body)
				setMsg('Роботу створено.')
			} else {
				await patchApi(`/portfolio-items/${selected.id}`, body)
				setMsg('Зміни збережено.')
			}
			list.reload()
			loadRow(null, true)
		} catch (err: unknown) {
			const m =
				err && typeof err === 'object' && 'response' in err
					? (
							err as {
								response?: {
									data?: {
										message?: string
									}
								}
							}
						).response?.data?.message
					: null
			setMsg(m ?? 'Request failed')
		} finally {
			setBusy(false)
		}
	}
	async function onUnpublish() {
		if (!selected || creating) return
		if (
			!window.confirm(
				'Зняти роботу з публічного портфоліо? Її можна буде повернути, увімкнувши публікацію.'
			)
		)
			return
		setBusy(true)
		setMsg('')
		try {
			await patchApi(`/portfolio-items/${selected.id}`, {
				isPublished: false,
			})
			setMsg('Роботу знято з публічного портфоліо.')
			list.reload()
			loadRow(null, true)
		} catch (err: unknown) {
			const m =
				err && typeof err === 'object' && 'response' in err
					? (
							err as {
								response?: {
									data?: {
										message?: string
									}
								}
							}
						).response?.data?.message
					: null
			setMsg(m ?? 'Не вдалося виконати дію')
		} finally {
			setBusy(false)
		}
	}
	return (
		<div className="space-y-6">
			<PageHeader
				title="Портфоліо (CMS)"
				description="Опубліковані роботи зʼявляються в публічному портфоліо. Дизайнери керують тільки своїми записами."
			/>

			{list.error ? (
				<p className="text-sm text-rose-600">{list.error}</p>
			) : null}

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-sm font-bold text-[var(--tds-ink)]">
								Записи
							</span>
							<Button
								variant="secondary"
								className="text-sm"
								onClick={() => loadRow(null, true)}
							>
								Нова робота
							</Button>
						</div>
					</CardHeader>
					<CardContent className="max-h-[480px] overflow-auto">
						{list.loading ? (
							<p className="text-sm text-[var(--tds-muted)]">
								Loading…
							</p>
						) : null}
						<ul className="space-y-1">
							{(list.data?.items ?? []).map((r) => (
								<li key={r.id}>
									<button
										type="button"
										onClick={() => loadRow(r, false)}
										className={`flex w-full flex-col rounded-xl border px-3 py-2 text-left text-sm transition ${
											selected?.id === r.id && !creating
												? 'border-[var(--tds-primary)] bg-white/90'
												: 'border-white/50 bg-white/40 hover:bg-white/70'
										}`}
									>
										<span className="font-semibold text-[var(--tds-ink)]">
											{r.title}
										</span>
										<span className="font-mono text-xs text-[var(--tds-muted)]">
											{r.slug}
										</span>
										<div className="mt-1 flex flex-wrap gap-1">
											<Badge
												tone={
													r.isPublished
														? 'green'
														: 'amber'
												}
											>
												{r.isPublished
													? 'опубліковано'
													: 'чернетка'}
											</Badge>
											{isAdmin && r.ownerStaffId ? (
												<Badge tone="neutral">
													власник{' '}
													{r.ownerStaffId.slice(-6)}
												</Badge>
											) : null}
										</div>
									</button>
								</li>
							))}
						</ul>
						{list.data && list.data.total > perPage ? (
							<div className="mt-3 flex items-center justify-between gap-2 border-t border-white/60 pt-3 text-xs text-slate-600">
								<span>
									Стор. {page}/{totalPages} · {list.data.total}{' '}
									усього
								</span>
								<div className="flex gap-1">
									<Button
										type="button"
										variant="secondary"
										className="h-7 px-2 text-[11px]"
										disabled={page <= 1}
										onClick={() =>
											patchListParams({
												page: String(page - 1),
											})
										}
									>
										Назад
									</Button>
									<Button
										type="button"
										variant="secondary"
										className="h-7 px-2 text-[11px]"
										disabled={page >= totalPages}
										onClick={() =>
											patchListParams({
												page: String(page + 1),
											})
										}
									>
										Далі
									</Button>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<span className="text-sm font-bold text-[var(--tds-ink)]">
							{creating
								? 'Нова робота'
								: selected
									? 'Редагувати роботу'
									: 'Оберіть або створіть'}
						</span>
					</CardHeader>
					<CardContent>
						<form className="space-y-3" onSubmit={onSubmit}>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									Slug
								</label>
								<Input
									value={form.slug}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											slug: e.target.value,
										}))
									}
									required
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									Назва
								</label>
								<Input
									value={form.title}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											title: e.target.value,
										}))
									}
									required
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									Опис
								</label>
								<Input
									value={form.summary}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											summary: e.target.value,
										}))
									}
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
										Категорія
									</label>
									<Input
										value={form.category}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												category: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
										Стиль
									</label>
									<Input
										value={form.style}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												style: e.target.value,
											}))
										}
									/>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
										Порядок сортування
									</label>
									<Input
										value={form.sortOrder}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												sortOrder: e.target.value,
											}))
										}
									/>
								</div>
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
										Опубліковано
									</label>
									<SearchableSelect
										value={form.isPublished ? 'yes' : 'no'}
										onChange={(v) =>
											setForm((f) => ({
												...f,
												isPublished: v === 'yes',
											}))
										}
										options={[
											{ value: 'no', label: 'Ні' },
											{ value: 'yes', label: 'Так' },
										]}
									/>
								</div>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									Cover image URL
								</label>
								<Input
									value={form.coverImageUrl}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											coverImageUrl: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									Gallery URLs (через кому)
								</label>
								<Input
									value={form.gallery}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											gallery: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									Дата завершення (ISO, необовʼязково)
								</label>
								<Input
									value={form.completedAt}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											completedAt: e.target.value,
										}))
									}
									placeholder="2025-01-15"
								/>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
									ID повʼязаного проєкту (необовʼязково)
								</label>
								<Input
									value={form.projectId}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											projectId: e.target.value,
										}))
									}
								/>
							</div>
							{isAdmin ? (
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-[var(--tds-muted)]">
										ID відповідального staff (необовʼязково)
									</label>
									<Input
										value={form.ownerStaffId}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												ownerStaffId: e.target.value,
											}))
										}
									placeholder="Mongo ObjectId профілю staff"
									/>
								</div>
							) : null}
							<div className="flex flex-wrap gap-2 pt-2">
								<Button type="submit" disabled={busy}>
									{creating || !selected ? 'Створити' : 'Зберегти'}
								</Button>
								{selected && !creating ? (
									<Button
										type="button"
										variant="secondary"
										disabled={busy}
										onClick={onUnpublish}
									>
										Зняти з публікації
									</Button>
								) : null}
							</div>
							{msg ? (
								<p className="text-sm text-[var(--tds-muted)]">
									{msg}
								</p>
							) : null}
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
