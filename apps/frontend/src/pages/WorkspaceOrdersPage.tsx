import {
	Button,
	ErrorState,
	Input,
	Modal,
	ModalFooter,
	PageHeader,
	SkeletonCard,
} from '@tailored/ui'
import { SearchableSelect } from '@/components/SearchableSelect'
import { PlusCircle } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { ClientRow } from '@/lib/types'
import { getApi, postApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'
import { WorkspaceOrderPipeline } from '@/features/crm/WorkspaceOrderPipeline'

export function WorkspaceOrdersPage() {
	const [pipelineRefresh, setPipelineRefresh] = useState(0)
	const [showModal, setShowModal] = useState(false)
	const clients = useLoad(
		() => (showModal ? getApi<ClientRow[]>('/crm/clients') : Promise.resolve([])),
		[showModal]
	)
	const [clientId, setClientId] = useState('')
	const [title, setTitle] = useState('Консультація з дизайну квартири')
	const [description, setDescription] = useState(
		'Потрібні заміри, концепція та поетапна пропозиція реалізації.'
	)
	const [requestedBudget, setRequestedBudget] = useState('250000')
	const [city, setCity] = useState('Тернопіль')
	const [addressLine, setAddressLine] = useState('вул. Шевченка, 12')
	const [phone, setPhone] = useState('+380 67 777 88 99')
	const [submitting, setSubmitting] = useState(false)
	const currentClientId = useMemo(
		() => clientId || clients.data?.[0]?.id || '',
		[clientId, clients.data]
	)

	async function submit(e: FormEvent) {
		e.preventDefault()
		setSubmitting(true)
		try {
			await postApi('/crm/orders', {
				clientId: currentClientId,
				title,
				description,
				requestedBudget,
				city,
				addressLine,
				phone,
			})
			setShowModal(false)
			setPipelineRefresh((n) => n + 1)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Заявки"
				description="Список вхідних заявок. Відкрийте деталі, перевірте дані, змініть статус."
				actions={
					<Button
						onClick={() => setShowModal(true)}
						icon={<PlusCircle />}
					>
						Нова заявка
					</Button>
				}
			/>

			<WorkspaceOrderPipeline refreshKey={pipelineRefresh} />

			<Modal
				open={showModal}
				onClose={() => setShowModal(false)}
				title="Нова заявка"
			>
				{clients.loading ? (
					<p className="text-sm text-slate-500">Завантажуємо клієнтів…</p>
				) : clients.error ? (
					<ErrorState message={clients.error} />
				) : (
					<form onSubmit={submit} className="space-y-4">
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								Клієнт
							</label>
							<SearchableSelect
								value={currentClientId}
								onChange={setClientId}
								placeholder="Оберіть клієнта"
								options={(clients.data ?? []).map((c) => ({
									value: c.id,
									label: c.fullName,
									searchText: c.email ?? '',
								}))}
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								Назва
							</label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								Опис
							</label>
							<Input
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Місто
								</label>
								<Input
									value={city}
									onChange={(e) => setCity(e.target.value)}
								/>
							</div>
							<div>
								<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
									Бюджет ₴
								</label>
								<Input
									value={requestedBudget}
									onChange={(e) =>
										setRequestedBudget(e.target.value)
									}
								/>
							</div>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								Адреса
							</label>
							<Input
								value={addressLine}
								onChange={(e) => setAddressLine(e.target.value)}
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								Телефон
							</label>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
							/>
						</div>
						<ModalFooter>
							<Button
								variant="secondary"
								type="button"
								onClick={() => setShowModal(false)}
							>
								Скасувати
							</Button>
							<Button type="submit" disabled={submitting}>
								{submitting ? 'Зберігаємо...' : 'Створити заявку'}
							</Button>
						</ModalFooter>
					</form>
				)}
			</Modal>
		</div>
	)
}
