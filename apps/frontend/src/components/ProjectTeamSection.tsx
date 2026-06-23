import { Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SearchableSelect } from '@/components/SearchableSelect'
import { getApi, patchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'

type Person = {
	fullName?: string
	email?: string
} | null | undefined

type UserRow = {
	id: string
	fullName: string
	staffId: string | null
	role: { code: string }
}

function TeamMemberBlock({
	label,
	person,
}: {
	label: string
	person: Person
}) {
	return (
		<div className="min-w-0 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
			<div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
				{label}
			</div>
			<div className="mt-2 truncate font-semibold text-slate-950">
				{person?.fullName?.trim() || 'Не призначено'}
			</div>
			{person?.email ? (
				<a
					href={`mailto:${person.email}`}
					className="mt-1 block truncate text-xs text-slate-500 hover:text-slate-800 hover:underline"
				>
					{person.email}
				</a>
			) : (
				<div className="mt-1 text-xs text-slate-400">—</div>
			)}
		</div>
	)
}

type StaffRef = {
	user: {
		fullName?: string
		email?: string
	}
} | null | undefined

export function ProjectTeamSection({
	projectId,
	manager,
	designer,
	brigadir,
	managerStaffId,
	designerStaffId,
	brigadirStaffId,
	onSaved,
}: {
	projectId: string
	manager: StaffRef
	designer: StaffRef
	brigadir: StaffRef
	managerStaffId: string | null | undefined
	designerStaffId: string | null | undefined
	brigadirStaffId: string | null | undefined
	onSaved: () => void
}) {
	const role = useAuthStore((s) => s.user?.role)
	const canEdit = role === 'ADMIN' || role === 'PROJECT_MANAGER'
	const users = useLoad(
		() =>
			canEdit
				? getApi<{ items: UserRow[] }>('/users?page=1&perPage=200')
				: Promise.resolve({ items: [] }),
		[canEdit]
	)
	const [mgr, setMgr] = useState(managerStaffId ?? '')
	const [des, setDes] = useState(designerStaffId ?? '')
	const [brig, setBrig] = useState(brigadirStaffId ?? '')
	const [msg, setMsg] = useState('')
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		setMgr(managerStaffId ?? '')
		setDes(designerStaffId ?? '')
		setBrig(brigadirStaffId ?? '')
	}, [managerStaffId, designerStaffId, brigadirStaffId])

	const pmOptions = useMemo(
		() =>
			(users.data?.items ?? [])
				.filter(
					(u) =>
						u.staffId &&
						['PROJECT_MANAGER', 'ADMIN'].includes(u.role.code)
				)
				.map((u) => ({ value: u.staffId!, label: u.fullName })),
		[users.data]
	)

	const designerOptions = useMemo(
		() =>
			(users.data?.items ?? [])
				.filter((u) => u.staffId && u.role.code === 'DESIGNER')
				.map((u) => ({ value: u.staffId!, label: u.fullName })),
		[users.data]
	)

	const brigadirOptions = useMemo(
		() =>
			(users.data?.items ?? [])
				.filter((u) => u.staffId && u.role.code === 'BRIGADIR')
				.map((u) => ({ value: u.staffId!, label: u.fullName })),
		[users.data]
	)

	async function save() {
		setBusy(true)
		setMsg('')
		try {
			await patchApi(`/projects/${projectId}/team`, {
				managerStaffId: mgr || null,
				designerStaffId: des || null,
				brigadirStaffId: brig || null,
			})
			setMsg('Команду оновлено.')
			onSaved()
		} catch (e: unknown) {
			const m = (
				e as { response?: { data?: { message?: string } } }
			)?.response?.data?.message
			setMsg(m ?? 'Не вдалося оновити команду')
		} finally {
			setBusy(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2 font-medium text-slate-950">
					<Users className="h-4 w-4 text-slate-600" />
					Команда проєкту
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<TeamMemberBlock
						label="Менеджер проєкту"
						person={manager?.user}
					/>
					<TeamMemberBlock label="Дизайнер" person={designer?.user} />
					<TeamMemberBlock label="Бригадир" person={brigadir?.user} />
				</div>

				{canEdit ? (
					<div className="border-t border-slate-200 pt-4">
						<p className="mb-3 text-xs text-slate-500">
							Призначення або зміна відповідальних за проєкт.
						</p>
						<div className="grid gap-3 lg:grid-cols-3">
							<label className="block min-w-0">
								<span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
									Менеджер
								</span>
								<SearchableSelect
									value={mgr}
									onChange={setMgr}
									placeholder="Не призначено"
									searchPlaceholder="Пошук…"
									options={[
										{ value: '', label: 'Не призначено' },
										...pmOptions,
									]}
								/>
							</label>
							<label className="block min-w-0">
								<span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
									Дизайнер
								</span>
								<SearchableSelect
									value={des}
									onChange={setDes}
									placeholder="Не призначено"
									searchPlaceholder="Пошук…"
									options={[
										{ value: '', label: 'Не призначено' },
										...designerOptions,
									]}
								/>
							</label>
							<label className="block min-w-0">
								<span className="mb-1 block text-xs font-semibold uppercase text-slate-500">
									Бригадир
								</span>
								<SearchableSelect
									value={brig}
									onChange={setBrig}
									placeholder="Не призначено"
									searchPlaceholder="Пошук…"
									options={[
										{ value: '', label: 'Не призначено' },
										...brigadirOptions,
									]}
								/>
							</label>
						</div>
						<div className="mt-4 flex flex-wrap items-center gap-3">
							<Button
								type="button"
								disabled={busy}
								onClick={() => void save()}
							>
								{busy ? 'Зберігаємо…' : 'Зберегти команду'}
							</Button>
							{msg ? (
								<p className="text-sm text-slate-600">{msg}</p>
							) : null}
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}
