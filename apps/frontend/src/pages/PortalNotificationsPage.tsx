import { Badge, Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { formatDateTime } from '@tailored/shared'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { api } from '@/lib/api'
import { useListQuery } from '@/lib/use-list-query'

type NotificationRow = {
	id: string
	title: string
	body: string
	isRead: boolean
	link?: string | null
	createdAt?: string
}
type NotificationsPage = {
	items: NotificationRow[]
	total: number
	page: number
	perPage: number
}

function isAbsoluteUrl(link: string) {
	return link.startsWith('http://') || link.startsWith('https://')
}

export function PortalNotificationsPage() {
	const { page, perPage, from, to, sort, queryString, patchParams, searchParams } =
		useListQuery(25)
	const unreadOnly = searchParams.get('unreadOnly') === 'true'
	const filtersActive = !!(from || to || sort !== 'latest' || unreadOnly)
	const [items, setItems] = useState<NotificationRow[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const apiQs = useMemo(() => {
		const p = new URLSearchParams(queryString)
		if (unreadOnly) p.set('unreadOnly', 'true')
		return p.toString()
	}, [queryString, unreadOnly])

	useEffect(() => {
		let cancelled = false
		setLoading(true)
		setError(null)
		api
			.get<NotificationsPage>(`/notifications?${apiQs}`)
			.then((r) => {
				if (cancelled) return
				setItems(r.data.items)
				setTotal(r.data.total)
			})
			.catch(() => {
				if (!cancelled) setError('Не вдалося завантажити сповіщення.')
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [apiQs])

	async function reloadCurrentPage() {
		const { data } = await api.get<NotificationsPage>(
			`/notifications?${apiQs}`
		)
		setItems(data.items)
		setTotal(data.total)
	}

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			from: null,
			to: null,
			sort: null,
			unreadOnly: null,
		})
	}

	async function markRead(id: string) {
		await api.patch(`/notifications/${id}/read`, {})
		await reloadCurrentPage()
	}

	async function markAllRead() {
		await api.patch('/notifications/read-all', {})
		await reloadCurrentPage()
	}

	const lastPage = Math.max(1, Math.ceil(total / perPage))

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title="Сповіщення"
				description="Події з вашого кабінету: рахунки, документи, етапи проєкту. Система показує лише те, що стосується вашого акаунта (персональні записи та релевантні нагадування)."
			/>

			<Card className="border-slate-200 bg-slate-50/80">
				<CardContent className="py-4 text-sm text-slate-700">
					<p className="font-semibold text-[var(--tds-ink)]">Звідки беруться записи?</p>
					<p className="mt-2 leading-6">
						Після дій у системі (наприклад, надісланий кошторис або рахунок) бекенд створює
						сповіщення. Демо-сід може додати кілька прикладів — у продакшені тут будуть лише
						реальні події вашого проєкту.
					</p>
				</CardContent>
			</Card>

			<ListQueryBar
				values={{ status: '', q: '', from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				showSearch={false}
				showDateRange
				showSort
				extraFields={
					<label className="flex items-center gap-2 pb-0.5 text-sm">
						<input
							type="checkbox"
							checked={unreadOnly}
							onChange={(e) =>
								patchParams({
									page: '1',
									unreadOnly: e.target.checked ? 'true' : null,
								})
							}
						/>
						<span>Лише непрочитані</span>
					</label>
				}
			/>

			<div className="flex flex-wrap items-center justify-end gap-3">
				<Button
					type="button"
					variant="secondary"
					className="text-sm"
					onClick={() => void markAllRead()}
				>
					Позначити все прочитаним
				</Button>
			</div>

			<Card>
				<CardContent className="pt-6">
					{loading ? <p className="text-sm text-slate-500">Завантажуємо…</p> : null}
					{error ? <p className="text-sm text-rose-600">{error}</p> : null}
					{!loading && !error && items.length === 0 ? (
						<p className="text-sm text-slate-600">
							{filtersActive
								? 'Нічого не знайдено за обраними фільтрами'
								: 'Немає сповіщень за обраним фільтром.'}
						</p>
					) : null}

					<div className="divide-y divide-slate-100">
						{items.map((n) => (
							<div
								key={n.id}
								className="flex flex-wrap items-start justify-between gap-3 py-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-semibold text-[var(--tds-ink)]">{n.title}</span>
										{!n.isRead ? <Badge tone="blue">Нове</Badge> : null}
									</div>
									<p className="mt-1 text-sm text-slate-600">{n.body}</p>
									{n.createdAt ? (
										<p className="mt-1 text-xs text-slate-400">
											{formatDateTime(n.createdAt, { dateStyle: 'medium' })}
										</p>
									) : null}
									{n.link ? (
										isAbsoluteUrl(n.link) ? (
											<a
												href={n.link}
												target="_blank"
												rel="noopener noreferrer"
												className="mt-2 inline-block text-sm font-semibold text-[var(--tds-primary)]"
											>
												Відкрити посилання
											</a>
										) : (
											<Link
												to={n.link}
												className="mt-2 inline-block text-sm font-semibold text-[var(--tds-primary)]"
											>
												Перейти
											</Link>
										)
									) : null}
								</div>
								{!n.isRead ? (
									<Button
										type="button"
										variant="secondary"
										className="shrink-0 text-xs"
										onClick={() => void markRead(n.id)}
									>
										Прочитано
									</Button>
								) : null}
							</div>
						))}
					</div>

					{total > perPage ? (
						<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
							<span className="text-sm text-slate-500">
								Сторінка {page} з {lastPage} · усього {total}
							</span>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="secondary"
									className="text-sm"
									disabled={page <= 1}
									onClick={() =>
										patchParams({ page: String(Math.max(1, page - 1)) })
									}
								>
									Назад
								</Button>
								<Button
									type="button"
									variant="secondary"
									className="text-sm"
									disabled={page >= lastPage}
									onClick={() =>
										patchParams({ page: String(page + 1) })
									}
								>
									Далі
								</Button>
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	)
}
