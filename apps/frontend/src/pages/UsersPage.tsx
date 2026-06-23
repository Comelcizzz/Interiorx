import {
	Avatar,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	EmptyState,
	ErrorState,
	PageHeader,
	SkeletonRow,
} from '@tailored/ui'
import { roleLabel } from '@tailored/shared'
import { Shield, UserCog, UsersRound } from 'lucide-react'
import { ListQueryBar, type ListQueryBarValues } from '@/components/ListQueryBar'
import { getApi } from '@/lib/api'
import { Paginated, RoleRow, UserRow } from '@/lib/types'
import {
	SearchableSelect,
	perPageSelectOptions,
} from '@/components/SearchableSelect'
import { useListQuery } from '@/lib/use-list-query'
import { useLoad } from '@/lib/use-load'
const roleBadgeTone: Record<
	string,
	'neutral' | 'green' | 'blue' | 'amber' | 'red'
> = {
	ADMIN: 'red',
	PROJECT_MANAGER: 'blue',
	DESIGNER: 'green',
	CLIENT: 'neutral',
}
const roleAvatarTone: Record<
	string,
	'neutral' | 'primary' | 'blue' | 'copper' | 'red'
> = {
	ADMIN: 'red',
	PROJECT_MANAGER: 'blue',
	DESIGNER: 'primary',
	CLIENT: 'neutral',
}
export function UsersPage() {
	const { page, perPage, status, q, from, to, sort, queryString, patchParams } =
		useListQuery(20)
	const filtersActive = !!(status || q || from || to || sort !== 'latest')

	function applyFilters(values: ListQueryBarValues) {
		patchParams({
			page: '1',
			status: values.status || null,
			q: values.q || null,
			from: values.from || null,
			to: values.to || null,
			sort: values.sort,
		})
	}

	function resetFilters() {
		patchParams({
			page: '1',
			status: null,
			q: null,
			from: null,
			to: null,
			sort: null,
		})
	}

	const users = useLoad(
		() => getApi<Paginated<UserRow>>(`/users?${queryString}`),
		[queryString]
	)
	const roles = useLoad(() => getApi<RoleRow[]>('/users/roles'), [])
	const loading = users.loading || roles.loading
	const error = users.error ?? roles.error
	if (loading) {
		return (
			<div className="space-y-6">
				<PageHeader title="Користувачі та ролі" />
				<div className="grid gap-4 md:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={i}>
							<CardContent>
								{Array.from({ length: 3 }).map((_, j) => (
									<SkeletonRow key={j} />
								))}
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		)
	}
	if (error || !users.data || !roles.data) {
		return (
			<div className="space-y-6">
				<PageHeader title="Користувачі та ролі" />
				<ErrorState message={error ?? undefined} />
			</div>
		)
	}
	const activeCount = users.data.items.filter((u) => u.isActive).length
	const lastPage = Math.max(
		1,
		Math.ceil(users.data.total / users.data.perPage)
	)
	return (
		<div className="space-y-6">
			<PageHeader
				title="Користувачі та ролі"
				description="Рівні доступу команди, профілі співробітників і права."
			/>

			<ListQueryBar
				values={{ status, q, from, to, sort }}
				onApply={applyFilters}
				onReset={resetFilters}
				showSearch
				searchPlaceholder="Імʼя або email"
			/>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardContent className="py-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Усього користувачів
								</div>
								<div className="mt-2 text-3xl font-black text-[var(--tds-ink)]">
									{users.data.total}
								</div>
							</div>
							<div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[rgba(38,132,91,0.12)] text-[var(--tds-primary)]">
								<UsersRound className="h-5 w-5" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="py-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Ролей
								</div>
								<div className="mt-2 text-3xl font-black text-[var(--tds-ink)]">
									{roles.data.length}
								</div>
							</div>
							<div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[rgba(57,104,170,0.12)] text-[#3968aa]">
								<Shield className="h-5 w-5" />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="py-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Активні
								</div>
								<div className="mt-2 text-3xl font-black text-[var(--tds-ink)]">
									{activeCount}
								</div>
							</div>
							<div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[rgba(183,121,76,0.12)] text-[var(--tds-copper)]">
								<UserCog className="h-5 w-5" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-5 xl:grid-cols-[1fr_320px]">
				<Card>
					<CardHeader>
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Команда
						</div>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						{users.data.items.length === 0 ? (
							<EmptyState
								icon={<UsersRound />}
								title={
									filtersActive
										? 'Нічого не знайдено за обраними фільтрами'
										: 'Користувачів не знайдено'
								}
							/>
						) : (
							<table className="w-full min-w-[560px] text-sm">
								<thead>
									<tr className="border-b border-white/50">
										{[
											'Користувач',
											'Роль',
											'Email',
											'Статус',
										].map((h) => (
											<th
												key={h}
												className="py-3 pr-4 text-left text-[11px] font-black uppercase tracking-[0.12em] text-[var(--tds-muted)] first:pl-0"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{users.data.items.map((user) => (
										<tr
											key={user.id}
											className="border-b border-white/30 transition hover:bg-white/30"
										>
											<td className="py-3 pr-4">
												<div className="flex items-center gap-3">
													<Avatar
														name={user.fullName}
														size="sm"
														tone={
															roleAvatarTone[
																user.role.code
															] ?? 'neutral'
														}
													/>
													<span className="font-semibold text-[var(--tds-ink)]">
														{user.fullName}
													</span>
												</div>
											</td>
											<td className="py-3 pr-4">
												<Badge
													tone={
														roleBadgeTone[
															user.role.code
														] ?? 'neutral'
													}
												>
													{roleLabel(user.role.code)}
												</Badge>
											</td>
											<td className="py-3 pr-4 text-[var(--tds-muted)]">
												{user.email}
											</td>
											<td className="py-3 pr-4">
												<span
													className={`inline-flex items-center gap-1.5 text-xs font-semibold ${user.isActive ? 'text-emerald-700' : 'text-[var(--tds-muted)]'}`}
												>
													<span
														className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}
													/>
													{user.isActive
														? 'Активний'
														: 'Неактивний'}
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="text-sm font-black text-[var(--tds-ink)]">
							Матриця ролей
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{roles.data.map((role) => (
								<div
									key={role.id}
									className="rounded-[16px] border border-white/60 bg-white/40 p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<Badge
												tone={
													roleBadgeTone[role.code] ??
													'neutral'
												}
											>
												{roleLabel(role.code)}
											</Badge>
											<div className="mt-1.5 text-xs text-[var(--tds-muted)]">
												{role.description}
											</div>
										</div>
										<span className="shrink-0 text-lg font-black text-[var(--tds-ink)]">
											{role.usersCount}
										</span>
									</div>
									<div className="mt-2.5 flex flex-wrap gap-1">
										{role.permissions
											.slice(0, 6)
											.map((p) => (
												<span
													key={p}
													className="rounded-full border border-white/60 bg-white/50 px-2 py-0.5 text-[10px] font-semibold text-[var(--tds-muted)]"
												>
													{p}
												</span>
											))}
										{role.permissions.length > 6 && (
											<span className="rounded-full border border-white/60 bg-white/50 px-2 py-0.5 text-[10px] font-semibold text-[var(--tds-muted)]">
												+{role.permissions.length - 6}
											</span>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-slate-500">
					Сторінка {users.data.page} з {lastPage} · усього {users.data.total}
				</p>
				<div className="flex items-center gap-2">
					<label className="flex items-center gap-2 text-sm text-slate-600">
						На сторінці
						<SearchableSelect
							className="w-[100px]"
							value={String(perPage)}
							onChange={(v) =>
								patchParams({ perPage: v, page: '1' })
							}
							options={perPageSelectOptions([5, 10, 20, 50])}
						/>
					</label>
					<Button
						type="button"
						variant="ghost"
						disabled={page <= 1}
						onClick={() => patchParams({ page: String(page - 1) })}
					>
						Назад
					</Button>
					<Button
						type="button"
						variant="ghost"
						disabled={page >= lastPage}
						onClick={() => patchParams({ page: String(page + 1) })}
					>
						Далі
					</Button>
				</div>
			</div>
		</div>
	)
}
