import { Button, Input, Modal, ModalFooter } from '@tailored/ui'
import { formatNumber } from '@tailored/shared'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { FormModalSteps } from '@/components/FormModalSteps'
import { SearchableSelect } from '@/components/SearchableSelect'
import { getApi, postApi } from '@/lib/api'
import type { Paginated } from '@/lib/types'
import { useLoad } from '@/lib/use-load'

type ProjectOption = { id: string; code: string; title: string }

type FormItem = {
	category: string
	title: string
	unit: string
	quantity: number
	unitPrice: number
}

const emptyItem = (): FormItem => ({
	category: '',
	title: '',
	unit: 'м²',
	quantity: 1,
	unitPrice: 0,
})

type Props = {
	open: boolean
	onClose: () => void
	onCreated: () => void
	/** Якщо задано — проєкт фіксований (форма на картці проєкту). */
	projectId?: string
	projectLabel?: string
	modalTitle?: string
}

export function CreateEstimateModal({
	open,
	onClose,
	onCreated,
	projectId: fixedProjectId,
	projectLabel,
	modalTitle = 'Новий кошторис',
}: Props) {
	const lockedProject = Boolean(fixedProjectId?.trim())
	const projects = useLoad(
		() =>
			lockedProject
				? Promise.resolve([])
				: getApi<Paginated<ProjectOption>>(
						'/projects?page=1&perPage=200'
					).then((r) => r.items),
		[lockedProject, open]
	)
	const projectOptions = useMemo(
		() =>
			(projects.data ?? []).map((p) => ({
				value: p.id,
				label: `${p.code} — ${p.title}`,
				searchText: `${p.code} ${p.title}`,
			})),
		[projects.data]
	)

	const [formProjectId, setFormProjectId] = useState('')
	const [formItems, setFormItems] = useState<FormItem[]>([emptyItem()])
	const [submitting, setSubmitting] = useState(false)
	const [formError, setFormError] = useState<string | null>(null)

	const draftTotal = useMemo(
		() =>
			formItems.reduce(
				(sum, item) =>
					sum +
					(Number(item.quantity) || 0) *
						(Number(item.unitPrice) || 0),
				0
			),
		[formItems]
	)

	useEffect(() => {
		if (!open) return
		setFormError(null)
		setFormItems([emptyItem()])
		setFormProjectId(fixedProjectId?.trim() ?? '')
	}, [open, fixedProjectId])

	function handleClose() {
		if (submitting) return
		onClose()
	}

	async function handleCreate() {
		setFormError(null)
		const pid = (fixedProjectId ?? formProjectId).trim()
		if (!pid) {
			setFormError('Оберіть проєкт.')
			return
		}
		const items = formItems.filter((i) => i.title.trim())
		if (items.length === 0) {
			setFormError('Додайте хоча б одну позицію з назвою.')
			return
		}
		const badPrice = items.find(
			(i) => !(Number(i.unitPrice) > 0) || !(Number(i.quantity) > 0)
		)
		if (badPrice) {
			setFormError('У кожної позиції мають бути кількість і ціна більше 0.')
			return
		}
		setSubmitting(true)
		try {
			await postApi('/estimates', {
				projectId: pid,
				items: items.map((i, idx) => ({
					category: i.category.trim() || 'Роботи',
					title: i.title.trim(),
					unit: i.unit.trim() || 'шт',
					quantity: Number(i.quantity) || 0,
					unitPrice: Number(i.unitPrice) || 0,
					sortOrder: idx,
				})),
			})
			handleClose()
			onCreated()
		} catch (err: unknown) {
			const msg = (
				err as { response?: { data?: { message?: string } } }
			)?.response?.data?.message
			setFormError(msg ?? 'Не вдалося створити кошторис')
		} finally {
			setSubmitting(false)
		}
	}

	const isAdditional = modalTitle.includes('Додатков')
	const steps = lockedProject
		? [
				isAdditional
					? `Додатковий кошторис для ${projectLabel ?? 'проєкту'} — допрацювання або нові роботи після основного.`
					: `Основний кошторис для ${projectLabel ?? 'проєкту'}.`,
				'Додайте позиції: що робите, скільки (кількість) і ціна за одиницю в гривнях.',
				'Після збереження — «Чернетка». Далі надішліть клієнту — у кабінеті буде «Додатковий кошторис», не «версія».',
			]
		: [
				'Оберіть проєкт — для якого готуєте розрахунок.',
				'Додайте позиції: що робите, скільки (кількість) і ціна за одиницю в гривнях.',
				'Після збереження кошторис буде у статусі «Чернетка». Далі: На оцінку → На перевірку → Надіслати клієнту в портал.',
			]

	return (
		<Modal
			open={open}
			onClose={handleClose}
			title={modalTitle}
			className="max-w-2xl"
		>
			<FormModalSteps steps={steps} />

			{formError ? (
				<p className="mb-4 text-sm text-rose-600">{formError}</p>
			) : null}

			<div className="space-y-5">
				{lockedProject ? (
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Проєкт
						</div>
						<p className="mt-1.5 text-sm font-semibold text-slate-900">
							{projectLabel ?? fixedProjectId}
						</p>
					</div>
				) : (
					<div>
						<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Крок 1 · Проєкт
						</label>
						<SearchableSelect
							value={formProjectId}
							onChange={setFormProjectId}
							placeholder="Оберіть проєкт…"
							searchPlaceholder="Пошук за кодом або назвою…"
							emptyLabel="Проєктів не знайдено"
							options={projectOptions}
						/>
					</div>
				)}

				<div>
					<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
						<label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							{lockedProject ? 'Позиції' : 'Крок 2 · Позиції робіт / матеріалів'}
						</label>
						<span className="text-sm font-bold text-[var(--tds-ink)]">
							Орієнтовно: {formatNumber(draftTotal)} ₴
						</span>
					</div>
					<div className="mb-2 grid grid-cols-[minmax(0,1fr)_72px_88px_36px] gap-2 px-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
						<span>Назва позиції</span>
						<span>Кількість</span>
						<span>Ціна, ₴</span>
						<span />
					</div>
					{formItems.map((item, i) => (
						<div
							key={i}
							className="mb-2 grid grid-cols-[minmax(0,1fr)_72px_88px_36px] gap-2"
						>
							<Input
								placeholder="Напр. штукатурка стін"
								value={item.title}
								onChange={(e) =>
									setFormItems((prev) =>
										prev.map((it, idx) =>
											idx === i
												? { ...it, title: e.target.value }
												: it
										)
									)
								}
							/>
							<Input
								type="number"
								min={0}
								step="0.01"
								value={item.quantity}
								onChange={(e) =>
									setFormItems((prev) =>
										prev.map((it, idx) =>
											idx === i
												? {
														...it,
														quantity: Number(
															e.target.value
														),
													}
												: it
										)
									)
								}
							/>
							<Input
								type="number"
								min={0}
								step="1"
								value={item.unitPrice}
								onChange={(e) =>
									setFormItems((prev) =>
										prev.map((it, idx) =>
											idx === i
												? {
														...it,
														unitPrice: Number(
															e.target.value
														),
													}
												: it
										)
									)
								}
							/>
							{formItems.length > 1 ? (
								<button
									type="button"
									className="flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
									onClick={() =>
										setFormItems((prev) =>
											prev.filter((_, idx) => idx !== i)
										)
									}
									aria-label="Видалити позицію"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							) : (
								<span />
							)}
						</div>
					))}
					<button
						type="button"
						onClick={() =>
							setFormItems((prev) => [...prev, emptyItem()])
						}
						className="text-xs font-semibold text-[var(--tds-primary)] hover:underline"
					>
						+ Ще одна позиція
					</button>
				</div>
			</div>

			<ModalFooter>
				<Button variant="secondary" onClick={handleClose} disabled={submitting}>
					Скасувати
				</Button>
				<Button onClick={() => void handleCreate()} disabled={submitting}>
					{submitting ? 'Зберігаємо…' : 'Зберегти кошторис'}
				</Button>
			</ModalFooter>
		</Modal>
	)
}
