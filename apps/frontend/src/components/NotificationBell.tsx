import { Button } from '@tailored/ui'
import { Bell } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

type NotificationRow = {
	id: string
	title: string
	body: string
	isRead: boolean
	link?: string | null
}
type NotificationsPage = {
	items: NotificationRow[]
	total: number
	page: number
	perPage: number
}

export function NotificationBell() {
	const anchorRef = useRef<HTMLDivElement | null>(null)
	const panelRef = useRef<HTMLDivElement | null>(null)
	const [open, setOpen] = useState(false)
	const [count, setCount] = useState(0)
	const [items, setItems] = useState<NotificationRow[]>([])
	const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

	async function refresh() {
		try {
			const [unread, list] = await Promise.all([
				api
					.get<{
						count: number
					}>('/notifications/unread-count')
					.then((r) => r.data),
				api
					.get<NotificationsPage>('/notifications?page=1&perPage=8')
					.then((r) => r.data),
			])
			setCount(unread.count)
			setItems(list.items.slice(0, 8))
		} catch {
			setCount(0)
		}
	}

	useEffect(() => {
		void refresh()
		const id = window.setInterval(() => void refresh(), 20000)
		const onFocus = () => void refresh()
		const onVisibility = () => {
			if (document.visibilityState === 'visible') void refresh()
		}
		window.addEventListener('focus', onFocus)
		document.addEventListener('visibilitychange', onVisibility)
		return () => {
			window.clearInterval(id)
			window.removeEventListener('focus', onFocus)
			document.removeEventListener('visibilitychange', onVisibility)
		}
	}, [])

	useEffect(() => {
		if (open) void refresh()
	}, [open])

	useLayoutEffect(() => {
		if (!open) return
		const anchor = anchorRef.current
		if (!anchor) return

		function compute() {
			const rect = anchor!.getBoundingClientRect()
			const panelWidth = Math.min(360, window.innerWidth - 16)
			const margin = 8
			const maxH = Math.min(420, window.innerHeight - margin * 2)

			// Відкриваємо панель праворуч від сайдбару (якщо є місце), інакше — від правого краю вікна.
			let left = rect.right + margin
			if (left + panelWidth > window.innerWidth - margin) {
				left = window.innerWidth - panelWidth - margin
			}
			left = Math.max(margin, left)

			const spaceBelow = window.innerHeight - rect.bottom - margin
			const spaceAbove = rect.top - margin
			let top: number
			// Якір знизу екрана: відкриваємо вгору, щоб панель не «тікала» під тач.
			if (spaceBelow < 140 && spaceAbove > spaceBelow) {
				top = rect.top - maxH - margin
			} else {
				top = rect.bottom + margin
			}
			top = Math.max(margin, Math.min(top, window.innerHeight - maxH - margin))

			setPanelStyle({
				position: 'fixed',
				left,
				top,
				width: panelWidth,
				maxHeight: maxH,
				zIndex: 5000,
				boxSizing: 'border-box',
				touchAction: 'manipulation',
			})
		}

		compute()
		window.addEventListener('resize', compute)
		window.addEventListener('scroll', compute, true)
		return () => {
			window.removeEventListener('resize', compute)
			window.removeEventListener('scroll', compute, true)
		}
	}, [open, count, items.length])

	useEffect(() => {
		if (!open) return
		function onDocMouseDown(e: MouseEvent) {
			const t = e.target as Node
			if (anchorRef.current?.contains(t)) return
			if (panelRef.current?.contains(t)) return
			setOpen(false)
		}
		function onKey(e: KeyboardEvent) {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', onDocMouseDown)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('mousedown', onDocMouseDown)
			document.removeEventListener('keydown', onKey)
		}
	}, [open])

	const portalHost =
		typeof document !== 'undefined' ? document.body : null

	const inboxHref =
		typeof window !== 'undefined' &&
		window.location.pathname.startsWith('/portal')
			? '/portal/notifications'
			: '/workspace/notifications'

	const inboxActionClass =
		'inline-flex shrink-0 items-center rounded-md py-1 text-xs font-semibold leading-tight text-[var(--tds-primary)] transition hover:text-[var(--tds-ink)] hover:underline'

	return (
		<div className="relative" ref={anchorRef}>
			<Button
				variant="ghost"
				className="relative px-2 text-[var(--tds-muted)] hover:text-[var(--tds-ink)]"
				onClick={() => setOpen((v) => !v)}
				icon={<Bell />}
				aria-label="Сповіщення"
			/>
			{count > 0 ? (
				<span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
					{count > 9 ? '9+' : count}
				</span>
			) : null}
			{open && portalHost
				? createPortal(
						<div
							ref={panelRef}
							className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur-xl"
							style={panelStyle}
						>
							<div className="mb-3 border-b border-slate-100 pb-2">
								<p className="text-xs font-bold uppercase tracking-wide text-slate-500">
									Вхідні
								</p>
								<div className="mt-2 flex items-center justify-between gap-3">
									<Link
										to={inboxHref}
										className={inboxActionClass}
										onClick={() => setOpen(false)}
									>
										Усі
									</Link>
									<button
										type="button"
										className={inboxActionClass}
										onClick={() =>
											api
												.patch('/notifications/read-all', {})
												.then(refresh)
										}
									>
										Позначити прочитаним
									</button>
								</div>
							</div>
							<div className="max-h-80 space-y-2 overflow-y-auto">
								{items.length === 0 ? (
									<p className="text-sm text-slate-500">Немає нових сповіщень.</p>
								) : null}
								{items.map((n) => (
									<button
										key={n.id}
										type="button"
										className="w-full rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left text-sm transition hover:bg-white"
										onClick={() => {
											if (!n.isRead) {
												void api
													.patch(`/notifications/${n.id}/read`, {})
													.then(refresh)
											}
											if (n.link) {
												window.location.href = n.link
											}
										}}
									>
										<div className="flex items-center justify-between gap-2">
											<div className="font-semibold text-slate-900">
												{n.title}
											</div>
											{!n.isRead ? (
												<span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />
											) : null}
										</div>
										<p className="mt-1 text-xs text-slate-600">{n.body}</p>
									</button>
								))}
							</div>
						</div>,
						portalHost
					)
				: null}
		</div>
	)
}
