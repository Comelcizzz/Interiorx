import { Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { projectStatusLabels, projectStatusNext } from '@tailored/shared'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { ConfirmWarningModal } from '@/components/ConfirmWarningModal'
import { patchApi } from '@/lib/api'
import { projectStatusConfirm } from '@/lib/project-status-confirm'
import { useAuthStore } from '@/lib/auth-store'

const primaryNext: Partial<Record<string, string>> = {
	DRAFT: 'ESTIMATION',
	ESTIMATION: 'DESIGN',
	DESIGN: 'APPROVED',
	APPROVED: 'IN_PROGRESS',
	IN_PROGRESS: 'COMPLETED',
	COMPLETED: 'WARRANTY',
}

const GATED_STATUSES = new Set([
	'DESIGN',
	'APPROVED',
	'IN_PROGRESS',
	'COMPLETED',
])

export function ProjectStatusActions({
	projectId,
	projectCode,
	status,
	approvedEstimateTotal,
	paidSum,
	onChanged,
}: {
	projectId: string
	projectCode?: string
	status: string
	approvedEstimateTotal: number | null
	paidSum: number
	onChanged: () => void
}) {
	const role = useAuthStore((s) => s.user?.role)
	const canEdit = role === 'ADMIN' || role === 'PROJECT_MANAGER'
	const [busy, setBusy] = useState<string | null>(null)
	const [msg, setMsg] = useState('')
	const [pendingNext, setPendingNext] = useState<string | null>(null)

	if (!canEdit) return null

	const nextStatuses = projectStatusNext[status] ?? []
	const main = primaryNext[status]
	const others = nextStatuses.filter((s) => s !== main)

	const isGated = GATED_STATUSES.has(status)
	const hasApprovedEstimate = approvedEstimateTotal !== null
	const isFullyPaid =
		approvedEstimateTotal !== null && paidSum >= approvedEstimateTotal
	const blocked = isGated && (!hasApprovedEstimate || !isFullyPaid)

	async function applyTransition(next: string) {
		setBusy(next)
		setMsg('')
		try {
			await patchApi(`/projects/${projectId}/status`, { status: next })
			setMsg(
				`Статус: ${projectStatusLabels[next as keyof typeof projectStatusLabels] ?? next}`
			)
			onChanged()
		} catch (e: unknown) {
			const m = (
				e as { response?: { data?: { message?: string } } }
			)?.response?.data?.message
			setMsg(m ?? 'Не вдалося змінити статус')
		} finally {
			setBusy(null)
			setPendingNext(null)
		}
	}

	const confirmCopy = pendingNext
		? projectStatusConfirm(status, pendingNext, projectCode)
		: null

	if (nextStatuses.length === 0) return null

	return (
		<>
			<Card>
				<CardHeader>
					<div className="font-medium text-slate-950">Етап проєкту</div>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center gap-2">
					{blocked && (
						<div className="flex w-full items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
							<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
							<span>
								{!hasApprovedEstimate
									? 'Потрібен погоджений кошторис для переходу до наступного етапу.'
									: `Кошторис не сплачено повністю. Сплачено: ${paidSum} грн з ${approvedEstimateTotal} грн.`}
							</span>
						</div>
					)}
					{main ? (
						<Button
							type="button"
							disabled={busy !== null || blocked}
							onClick={() => setPendingNext(main)}
						>
							{busy === main
								? 'Зберігаємо…'
								: `→ ${projectStatusLabels[main as keyof typeof projectStatusLabels] ?? main}`}
						</Button>
					) : null}
					{others.map((s) => (
						<Button
							key={s}
							type="button"
							variant={
								s === 'CANCELLED' ? 'danger' : 'secondary'
							}
							disabled={busy !== null}
							onClick={() => setPendingNext(s)}
						>
							{busy === s
								? '…'
								: (projectStatusLabels[
										s as keyof typeof projectStatusLabels
									] ?? s)}
						</Button>
					))}
					{msg ? (
						<p className="w-full text-sm text-slate-600">{msg}</p>
					) : null}
				</CardContent>
			</Card>

			{confirmCopy ? (
				<ConfirmWarningModal
					open={pendingNext !== null}
					onClose={() => setPendingNext(null)}
					onConfirm={() =>
						pendingNext && void applyTransition(pendingNext)
					}
					title={confirmCopy.title}
					description={confirmCopy.description}
					confirmLabel={confirmCopy.confirmLabel}
					tone={confirmCopy.tone}
					busy={busy !== null}
				/>
			) : null}
		</>
	)
}
