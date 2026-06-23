import {
	Button,
	Card,
	CardContent,
	ErrorState,
	PageHeader,
	SkeletonCard,
} from '@tailored/ui'
import {
	formatDate,
	projectStatusLabels,
	type ProjectStatusCode,
} from '@tailored/shared'
import { Link, useNavigate } from 'react-router-dom'
import { portalApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { useLoad } from '@/lib/use-load'

type PortalOrderRow = {
	id: string
	code: string
	title: string
	status: string
	clientStatusLabel: string
	createdAt?: string
}
type PortalProjectRow = {
	id: string
	code: string
	title: string
	status: string
	clientStatusLabel: string
	clientStatusKey?: string
	dueDate?: string | null
}

export function PortalDashboardPage() {
	const navigate = useNavigate()
	const orders = useLoad(
		() =>
			portalApi
				.get<Paginated<PortalOrderRow>>('/orders?page=1&perPage=5')
				.then((r) => r.data),
		[]
	)
	const projects = useLoad(
		() =>
			portalApi
				.get<Paginated<PortalProjectRow>>('/projects?page=1&perPage=5')
				.then((r) => r.data),
		[]
	)
	const err = orders.error ?? projects.error
	const loading = orders.loading || projects.loading

	if (loading) {
		return (
			<div className="space-y-6 p-6">
				<PageHeader
					title="Панель клієнта"
					description="Останні заявки та активні проєкти."
				/>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<SkeletonCard key={i} />
					))}
				</div>
			</div>
		)
	}
	if (err) {
		return (
			<div className="space-y-6 p-6">
				<PageHeader title="Панель клієнта" />
				<ErrorState message={err} />
			</div>
		)
	}
	const pendingOrders =
		orders.data?.items.filter(
			(o) => o.status === 'NEW' || o.status === 'QUALIFIED'
		).length ?? 0
	const activeProjects =
		projects.data?.items.filter(
			(p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED'
		).length ?? 0
	const actionProjects =
		projects.data?.items.filter(
			(p) =>
				p.clientStatusKey === 'estimate_action_required' ||
				p.clientStatusLabel.toLowerCase().includes('estimate') ||
				p.clientStatusLabel.includes('Кошторис')
		) ?? []

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<PageHeader
					title="Панель клієнта"
					description="Заявки, проєкти, рахунки та швидкі дії в одному місці."
				/>
				<div className="flex flex-wrap gap-2">
					<Button type="button" onClick={() => navigate('/portal/orders/new')}>
						Нова заявка
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={() => navigate('/portal/invoices')}
					>
						Рахунки
					</Button>
				</div>
			</div>


			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardContent>
						<div className="text-sm text-slate-500">Усього заявок</div>
						<div className="mt-2 text-3xl font-black">
							{orders.data?.total ?? 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-sm text-slate-500">На розгляді</div>
						<div className="mt-2 text-3xl font-black">{pendingOrders}</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-sm text-slate-500">Проєктів</div>
						<div className="mt-2 text-3xl font-black">
							{projects.data?.total ?? 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-sm text-slate-500">Активні проєкти</div>
						<div className="mt-2 text-3xl font-black">{activeProjects}</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="text-sm font-bold">Потрібні дії</div>
							<Link
								to="/portal/projects"
								className="text-xs font-semibold text-[var(--tds-primary)]"
							>
								Усі проєкти
							</Link>
						</div>
						<div className="mt-3 space-y-3">
							{actionProjects.length === 0 ? (
								<p className="text-sm text-slate-600">Наразі все зроблено.</p>
							) : (
								actionProjects.map((project) => (
									<div
										key={project.id}
										className="rounded-2xl border border-slate-100 p-3 text-sm"
									>
										<div className="font-semibold">{project.title}</div>
										<div className="text-xs text-slate-500">
											{project.clientStatusLabel}
										</div>
										<Link
											className="mt-2 inline-flex text-xs font-semibold text-[var(--tds-primary)]"
											to={`/portal/projects/${project.code}`}
										>
											Відкрити проєкт
										</Link>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="text-sm font-bold">Швидкі дії</div>
						<div className="mt-3 flex flex-wrap gap-2">
							<Button
								type="button"
								variant="secondary"
								onClick={() => navigate('/portal/orders/new')}
							>
								Нова заявка
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => navigate('/services')}
							>
								Каталог послуг
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={() => navigate('/portal/invoices')}
							>
								Оплата рахунків
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="text-sm font-bold">Останні заявки</div>
							<Link
								to="/portal/orders"
								className="text-xs font-semibold text-[var(--tds-primary)]"
							>
								Усі заявки
							</Link>
						</div>
						<div className="mt-3 space-y-3">
							{(orders.data?.items ?? []).map((order) => (
								<div
									key={order.id}
									className="flex items-start justify-between gap-3 text-sm"
								>
									<div>
										<div className="font-semibold">{order.code}</div>
										<div className="text-xs text-slate-500">{order.title}</div>
									</div>
									<Link
										className="text-xs font-semibold text-[var(--tds-primary)]"
										to={`/portal/orders/${order.code}`}
									>
										Відкрити
									</Link>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent>
						<div className="flex items-center justify-between">
							<div className="text-sm font-bold">Проєкти</div>
							<Link
								to="/portal/projects"
								className="text-xs font-semibold text-[var(--tds-primary)]"
							>
								Усі проєкти
							</Link>
						</div>
						<div className="mt-3 space-y-3">
							{(projects.data?.items ?? []).map((project) => (
								<div key={project.id} className="text-sm">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-semibold">{project.code}</span>
										<span className="text-xs text-slate-500">
											{projectStatusLabels[
												project.status as ProjectStatusCode
											] ?? project.status}
										</span>
									</div>
									<div className="text-xs text-slate-600">{project.title}</div>
									{project.dueDate ? (
										<div className="text-xs text-slate-400">
											Дедлайн {formatDate(project.dueDate)}
										</div>
									) : null}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
