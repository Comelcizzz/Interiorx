import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
} from '@tailored/ui'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { formatNumber, orderStatusLabels, type ListSort } from '@tailored/shared'
import { Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmWarningModal } from '@/components/ConfirmWarningModal'
import {
	orderActionConfirm,
	type OrderWorkspaceAction,
} from '@/lib/order-action-confirm'
import type { OrderRow, Paginated } from '@/lib/types'
import { getApi, patchApi, postApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'
export const workspaceOrderTone: Record<
	string,
	'neutral' | 'green' | 'amber' | 'red' | 'blue'
> = {
	NEW: 'blue',
	QUALIFIED: 'amber',
	CONVERTED: 'green',
	REJECTED: 'red',
}
export function WorkspaceOrderPipeline({
	refreshKey = 0,
}: {
	refreshKey?: number
}) {
	const user = useAuthStore((s) => s.user)
	const [searchParams, setSearchParams] = useSearchParams()
	const page = Math.max(1, Number(searchParams.get('ordersPage') ?? '1') || 1)
	const status = searchParams.get('ordersStatus') ?? ''
	const q = searchParams.get('ordersQ') ?? ''
	const from = searchParams.get('ordersFrom') ?? ''
	const to = searchParams.get('ordersTo') ?? ''
	const sortRaw = searchParams.get('ordersSort') ?? 'latest'
	const sort: ListSort = sortRaw === 'oldest' ? 'oldest' : 'latest'
	const orderStatusOptions = useMemo(
		() =>
			Object.entries(orderStatusLabels).map(([value, label]) => ({
				value,
				label,
			})),
		[]
	)
	const filtersActive = !!(
		status ||
		q.trim() ||
		from ||
		to ||
		sort !== 'latest'
	)
	const qs = useMemo(() => {
		const params = new URLSearchParams()
		params.set('page', String(page))
		params.set('perPage', '10')
		if (status) params.set('status', status)
		if (q.trim()) params.set('q', q.trim())
		if (from) params.set('from', from)
		if (to) params.set('to', to)
		if (sort) params.set('sort', sort)
		return params.toString()
	}, [page, q, status, from, to, sort])
	const orders = useLoad(
		() => getApi<Paginated<OrderRow>>(`/crm/orders?${qs}`),
		[qs, refreshKey]
	)
	const [confirm, setConfirm] = useState<{
		code: string
		action: OrderWorkspaceAction
	} | null>(null)
	const [actionBusy, setActionBusy] = useState(false)
	function patchSearchParams(next: Record<string, string | null>) {
		setSearchParams(
			(prev) => {
				const n = new URLSearchParams(prev)
				for (const [key, value] of Object.entries(next)) {
					if (!value) n.delete(key)
					else n.set(key, value)
				}
				return n
			},
			{ replace: true }
		)
	}
	function applyFilters(v: ListQueryBarValues) {
		patchSearchParams({
			ordersPage: '1',
			ordersStatus: v.status || null,
			ordersQ: v.q || null,
			ordersFrom: v.from || null,
			ordersTo: v.to || null,
			ordersSort: v.sort,
		})
	}
	function resetFilters() {
		patchSearchParams({
			ordersPage: '1',
			ordersStatus: null,
			ordersQ: null,
			ordersFrom: null,
			ordersTo: null,
			ordersSort: null,
		})
	}
	async function executeConfirmedAction() {
		if (!confirm) return
		const encoded = encodeURIComponent(confirm.code)
		setActionBusy(true)
		try {
			switch (confirm.action) {
				case 'qualify':
					await patchApi(`/crm/orders/${encoded}/qualify`, {})
					break
				case 'convert':
					await patchApi(`/crm/orders/${encoded}/convert`, {})
					break
				case 'reject':
					await patchApi(`/crm/orders/${encoded}/reject`, {})
					break
				case 'claim':
					await postApi(`/crm/orders/${encoded}/claim`, {})
					break
			}
			setConfirm(null)
			orders.reload()
		} finally {
			setActionBusy(false)
		}
	}

	const confirmCopy = confirm
		? orderActionConfirm(confirm.action, confirm.code)
		: null
	if (orders.loading) {
		return (
			<Card>
				<CardHeader>
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Пайплайн заявок
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-slate-500">Завантажуємо заявки…</p>
				</CardContent>
			</Card>
		)
	}
	if (orders.error || !orders.data) {
		return (
			<Card>
				<CardHeader>
					<div className="text-sm font-black text-[var(--tds-ink)]">
						Пайплайн заявок
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-rose-600">
						{orders.error ?? 'Не вдалося завантажити заявки'}
					</p>
				</CardContent>
			</Card>
		)
	}
	return (
		<>
			<Card>
			<CardHeader>
				<div className="text-sm font-black text-[var(--tds-ink)]">
					Пайплайн заявок
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<ListQueryBar
					values={{ status, q, from, to, sort }}
					onApply={applyFilters}
					onReset={resetFilters}
					statusOptions={orderStatusOptions}
					showSearch
					searchPlaceholder="Код, назва або місто"
				/>
				{orders.data.items.length === 0 ? (
					<EmptyState
						icon={<Filter />}
						title={
							filtersActive
								? 'Нічого не знайдено за обраними фільтрами'
								: 'Заявок не знайдено'
						}
						description={
							filtersActive
								? undefined
								: 'Змініть фільтри або створіть нову заявку кнопкою «Нова заявка».'
						}
					/>
				) : (
					<div className="space-y-3">
						{orders.data.items.map((order) => (
							<div
								key={order.id}
								className="flex flex-col gap-3 rounded-[16px] border border-white/60 bg-white/40 px-4 py-3 sm:flex-row sm:items-center sm:gap-5"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<Link
											to={`/workspace/orders/${encodeURIComponent(order.code)}`}
											className="text-sm font-black text-[var(--tds-ink)] hover:text-[var(--tds-primary)] hover:underline"
										>
											{order.title}
										</Link>
										<Badge
											tone={
												workspaceOrderTone[
													order.status
												] ?? 'neutral'
											}
										>
											{orderStatusLabels[order.status] ??
												order.status}
										</Badge>
									</div>
									<div className="mt-1 text-xs text-[var(--tds-muted)]">
										{order.code} · {order.clientName} ·{' '}
										{order.city} ·{' '}
										{formatNumber(
											order.requestedBudget ?? 0
										)}{' '}
										₴
										{order.phone ? (
											<>
												{' '}
												·{' '}
												<span className="text-[var(--tds-ink)]">
													{order.phone}
												</span>
											</>
										) : null}
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:pl-2">
									<Link
										to={`/workspace/orders/${encodeURIComponent(order.code)}`}
										className="inline-flex h-8 items-center rounded-full border border-[var(--tds-primary)]/25 bg-white/80 px-3 text-xs font-bold text-[var(--tds-primary)] hover:bg-[var(--tds-primary)]/5"
									>
										Деталі
									</Link>
									{order.status === 'NEW' ? (
										<Button
											type="button"
											variant="secondary"
											className="h-8 px-3 text-xs"
											onClick={() =>
												setConfirm({
													code: order.code,
													action: 'qualify',
												})
											}
										>
											Кваліфікувати
										</Button>
									) : null}
									{order.status === 'QUALIFIED' ? (
										<>
											<Button
												type="button"
												variant="secondary"
												className="h-8 px-3 text-xs"
												onClick={() =>
													setConfirm({
														code: order.code,
														action: 'convert',
													})
												}
											>
												Конвертувати
											</Button>
											<Button
												type="button"
												variant="ghost"
												className="h-8 px-3 text-xs"
												onClick={() =>
													setConfirm({
														code: order.code,
														action: 'reject',
													})
												}
											>
												Відхилити
											</Button>
										</>
									) : null}
									{order.project ? (
										<Link
											to={`/workspace/projects/${order.project.id}`}
											className="inline-flex h-8 items-center rounded-full px-3 text-xs font-bold text-emerald-800 hover:underline"
										>
											{order.project.code}
										</Link>
									) : null}
									{user?.role === 'DESIGNER' &&
									(order.status === 'NEW' ||
										order.status === 'QUALIFIED') ? (
										<Button
											type="button"
											className="h-8 px-3 text-xs"
											onClick={() =>
												setConfirm({
													code: order.code,
													action: 'claim',
												})
											}
										>
											Закріпити
										</Button>
									) : null}
								</div>
							</div>
						))}
					</div>
				)}
				{orders.data.total > orders.data.perPage ? (
					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-3">
						<span className="text-sm text-slate-600">
							Сторінка {orders.data.page} з{' '}
							{Math.ceil(orders.data.total / orders.data.perPage)} ·
							показано {orders.data.items.length} з{' '}
							{orders.data.total}
						</span>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="secondary"
								disabled={page <= 1 || orders.loading}
								onClick={() =>
									patchSearchParams({
										ordersPage: String(Math.max(1, page - 1)),
									})
								}
							>
								Назад
							</Button>
							<Button
								type="button"
								variant="secondary"
								disabled={
									page >=
										Math.ceil(
											orders.data.total /
												orders.data.perPage
										) || orders.loading
								}
								onClick={() =>
									patchSearchParams({
										ordersPage: String(page + 1),
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
			{confirmCopy ? (
				<ConfirmWarningModal
					open={confirm !== null}
					onClose={() => setConfirm(null)}
					onConfirm={() => void executeConfirmedAction()}
					title={confirmCopy.title}
					description={confirmCopy.description}
					confirmLabel={confirmCopy.confirmLabel}
					tone={confirmCopy.tone}
					busy={actionBusy}
				/>
			) : null}
		</>
	)
}
