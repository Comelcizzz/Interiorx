import { Badge, Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { estimateStatusLabels, formatNumber } from '@tailored/shared'
import { CheckCircle, FileText, PlusCircle, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmWarningModal } from '@/components/ConfirmWarningModal'
import { CreateEstimateModal } from '@/components/CreateEstimateModal'
import { estimateSendConfirm } from '@/lib/estimate-send-confirm'
import {
	estimateCountSummary,
	estimateKindLabel,
	estimateKindShort,
} from '@/lib/estimate-display'
import { patchApi } from '@/lib/api'
import type { ProjectDetail } from '@/lib/types'

type Estimate = ProjectDetail['estimates'][number]

const statusTone: Record<
	string,
	'neutral' | 'amber' | 'green' | 'red' | 'blue'
> = {
	DRAFT: 'neutral',
	PRICING: 'amber',
	PENDING_REVIEW: 'amber',
	SENT: 'blue',
	APPROVED: 'green',
	REJECTED: 'red',
	EXPIRED: 'amber',
}

function canStartNewVersion(latest: Estimate | undefined): boolean {
	if (!latest) return true
	return ['APPROVED', 'REJECTED', 'EXPIRED'].includes(latest.status)
}

function EstimateTable({ estimate }: { estimate: Estimate }) {
	return (
		<div className="overflow-x-auto rounded-lg border border-slate-200">
			<table className="w-full min-w-[480px] text-left text-sm">
				<thead className="bg-slate-50 text-xs uppercase text-slate-500">
					<tr>
						<th className="px-3 py-2.5">Позиція</th>
						<th className="px-3 py-2.5 text-right">К-сть</th>
						<th className="px-3 py-2.5">Од.</th>
						<th className="px-3 py-2.5 text-right">Разом</th>
					</tr>
				</thead>
				<tbody>
					{estimate.items.map((item) => (
						<tr key={item.id} className="border-t border-slate-100">
							<td className="px-3 py-3">
								<div className="font-medium text-slate-900">
									{item.title}
								</div>
								<div className="text-xs text-slate-500">
									{item.category}
								</div>
							</td>
							<td className="px-3 py-3 text-right tabular-nums">
								{item.quantity}
							</td>
							<td className="px-3 py-3 text-slate-600">
								{item.unit}
							</td>
							<td className="px-3 py-3 text-right font-medium tabular-nums">
								{formatNumber(item.total)} UAH
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export function ProjectEstimateSection({
	projectId,
	projectCode,
	estimates,
	canEdit,
	onChanged,
}: {
	projectId: string
	projectCode: string
	estimates: Estimate[]
	canEdit: boolean
	onChanged: () => void
}) {
	const sorted = useMemo(
		() => [...estimates].sort((a, b) => b.version - a.version),
		[estimates]
	)
	const latestEstimate = sorted[0]
	const [viewId, setViewId] = useState<string | null>(null)
	const viewed =
		sorted.find((e) => e.id === viewId) ?? latestEstimate ?? null
	const isViewingLatest = viewed?.id === latestEstimate?.id

	useEffect(() => {
		if (!latestEstimate) {
			setViewId(null)
			return
		}
		if (!viewId || !sorted.some((e) => e.id === viewId)) {
			setViewId(latestEstimate.id)
		}
	}, [latestEstimate, sorted, viewId])

	const [estimateBusy, setEstimateBusy] = useState(false)
	const [sendConfirmOpen, setSendConfirmOpen] = useState(false)
	const [showCreateModal, setShowCreateModal] = useState(false)

	const showCreateFirst = canEdit && sorted.length === 0
	const showCreateAdditional =
		canEdit &&
		latestEstimate != null &&
		canStartNewVersion(latestEstimate)

	async function runEstimateAction(fn: () => Promise<unknown>) {
		setEstimateBusy(true)
		try {
			await fn()
			onChanged()
		} finally {
			setEstimateBusy(false)
		}
	}

	const modalTitle = latestEstimate
		? 'Додатковий кошторис'
		: 'Основний кошторис'

	return (
		<>
			<Card
				className={
					viewed?.status === 'APPROVED'
						? 'border-emerald-200/80'
						: undefined
				}
			>
				<CardHeader>
					<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex min-w-0 flex-wrap items-center gap-2">
							<FileText className="h-4 w-4 shrink-0 text-slate-600" />
							<span className="font-medium text-slate-950">
								Кошторис
							</span>
							{viewed ? (
								<Badge
									tone={
										statusTone[viewed.status] ?? 'neutral'
									}
								>
									{estimateStatusLabels[viewed.status] ??
										viewed.status}
								</Badge>
							) : null}
							{sorted.length > 0 ? (
								<span className="text-xs text-slate-500">
									{estimateCountSummary(
										sorted.map((e) => e.version)
									)}
								</span>
							) : null}
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{sorted.length > 0 ? (
								<Link
									to="/workspace/estimates"
									className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
								>
									Всі кошториси →
								</Link>
							) : null}
							{showCreateFirst ? (
								<Button
									type="button"
									className="h-8 px-3 text-xs"
									icon={<PlusCircle className="h-3.5 w-3.5" />}
									onClick={() => setShowCreateModal(true)}
								>
									Створити кошторис
								</Button>
							) : null}
							{showCreateAdditional ? (
								<Button
									type="button"
									variant="secondary"
									className="h-8 px-3 text-xs"
									icon={<PlusCircle className="h-3.5 w-3.5" />}
									onClick={() => setShowCreateModal(true)}
								>
									Додатковий кошторис
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{sorted.length > 1 ? (
						<div className="mb-4 flex flex-wrap gap-2">
							{sorted.map((est) => (
								<button
									key={est.id}
									type="button"
									onClick={() => setViewId(est.id)}
									className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
										viewed?.id === est.id
											? 'border-slate-900 bg-slate-900 text-white'
											: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
									}`}
								>
									<div className="font-semibold">
										{estimateKindShort(est.version)}
									</div>
									<div
										className={
											viewed?.id === est.id
												? 'text-white/80'
												: 'text-slate-500'
										}
									>
										{formatNumber(est.total)} UAH ·{' '}
										{estimateStatusLabels[est.status] ??
											est.status}
									</div>
								</button>
							))}
						</div>
					) : null}

					{viewed ? (
						<div className="space-y-4">
							<div className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
								<div>
									<div className="text-xs font-bold uppercase tracking-wide text-slate-500">
										{isViewingLatest
											? 'Актуальний кошторис'
											: 'Перегляд'}
									</div>
									<div className="mt-1 text-lg font-semibold text-slate-950">
										{estimateKindLabel(viewed.version)}
									</div>
									{!isViewingLatest ? (
										<p className="mt-1 text-xs text-amber-800">
											Архівний перегляд — дії лише для
											актуального кошторису.
										</p>
									) : null}
								</div>
								<div className="text-right">
									<div className="text-xs text-slate-500">
										Разом
									</div>
									<div className="text-2xl font-bold text-slate-950">
										{formatNumber(viewed.total)} UAH
									</div>
								</div>
							</div>

							{canEdit && isViewingLatest ? (
								<div className="flex flex-wrap items-center gap-2">
									{viewed.status === 'DRAFT' ? (
										<>
											<Button
												variant="secondary"
												className="h-8 px-3 text-xs"
												disabled={estimateBusy}
												onClick={() =>
													runEstimateAction(() =>
														patchApi(
															`/estimates/${viewed.id}/stage/pricing`,
															{}
														)
													)
												}
											>
												На оцінку
											</Button>
											<Button
												className="h-8 px-3 text-xs"
												disabled={estimateBusy}
												onClick={() =>
													setSendConfirmOpen(true)
												}
											>
												Надіслати клієнту
											</Button>
										</>
									) : null}
									{viewed.status === 'PRICING' ? (
										<Button
											variant="secondary"
											className="h-8 px-3 text-xs"
											disabled={estimateBusy}
											onClick={() =>
												runEstimateAction(() =>
													patchApi(
														`/estimates/${viewed.id}/stage/review`,
														{}
													)
												)
											}
										>
											На перевірку
										</Button>
									) : null}
									{viewed.status === 'PENDING_REVIEW' ? (
										<Button
											className="h-8 px-3 text-xs"
											disabled={estimateBusy}
											onClick={() =>
												setSendConfirmOpen(true)
											}
										>
											Надіслати клієнту
										</Button>
									) : null}
									{viewed.status === 'SENT' ? (
										<>
											<p className="w-full text-xs text-slate-500">
												Очікує погодження клієнта в
												кабінеті. Рахунок — після його
												підтвердження.
											</p>
											<Button
												variant="secondary"
												className="h-8 px-3 text-xs"
												disabled={estimateBusy}
												onClick={() =>
													runEstimateAction(() =>
														patchApi(
															`/estimates/${viewed.id}/approve`,
															{}
														)
													)
												}
											>
												<CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
												Погодити (внутрішнє)
											</Button>
											<Button
												variant="secondary"
												className="h-8 px-3 text-xs"
												disabled={estimateBusy}
												onClick={() =>
													runEstimateAction(() =>
														patchApi(
															`/estimates/${viewed.id}/reject`,
															{}
														)
													)
												}
											>
												<XCircle className="h-3.5 w-3.5 text-rose-600" />
												Відхилити
											</Button>
										</>
									) : null}
									{viewed.status === 'APPROVED' ? (
										<p className="w-full text-xs text-emerald-800">
											Погоджено клієнтом. Для нових
											робіт — кнопка «Додатковий
											кошторис».
										</p>
									) : null}
								</div>
							) : null}

							<EstimateTable estimate={viewed} />
						</div>
					) : (
						<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
							<p className="text-sm text-slate-600">
								Основний кошторис ще не створено.
							</p>
							{canEdit ? (
								<Button
									type="button"
									className="mt-4"
									icon={<PlusCircle />}
									onClick={() => setShowCreateModal(true)}
								>
									Створити кошторис
								</Button>
							) : null}
						</div>
					)}
				</CardContent>
			</Card>

			<CreateEstimateModal
				open={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onCreated={() => {
					setShowCreateModal(false)
					onChanged()
				}}
				projectId={projectId}
				projectLabel={projectCode}
				modalTitle={modalTitle}
			/>

			{viewed && isViewingLatest ? (
				<ConfirmWarningModal
					open={sendConfirmOpen}
					onClose={() => setSendConfirmOpen(false)}
					busy={estimateBusy}
					onConfirm={() => {
						void runEstimateAction(async () => {
							await patchApi(
								`/estimates/${viewed.id}/send`,
								{}
							)
							setSendConfirmOpen(false)
						})
					}}
					{...estimateSendConfirm({
						projectCode,
						version: viewed.version,
						total: viewed.total,
					})}
				/>
			) : null}
		</>
	)
}
