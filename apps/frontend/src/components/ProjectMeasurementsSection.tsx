import { Button, Card, CardContent, CardHeader, Input, Modal, ModalFooter } from '@tailored/ui'
import { FormModalSteps } from '@/components/FormModalSteps'
import { PlusCircle, Ruler } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { postApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

export type ProjectMeasurementItem = {
	id: string
	zoneName: string
	floorArea: string
	wallArea: string
	ceilingHeight: string
	notes?: string | null
}

export function ProjectMeasurementsSection({
	projectId,
	projectCode,
	measurements,
	onChanged,
}: {
	projectId: string
	projectCode: string
	measurements: ProjectMeasurementItem[]
	onChanged: () => void
}) {
	const role = useAuthStore((s) => s.user?.role)
	const canAdd =
		role === 'ADMIN' ||
		role === 'PROJECT_MANAGER' ||
		role === 'DESIGNER'

	const [open, setOpen] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	const [form, setForm] = useState({
		zoneName: '',
		floorArea: '',
		wallArea: '',
		ceilingHeight: '2.7',
		notes: '',
	})

	async function submit(e: FormEvent) {
		e.preventDefault()
		if (!form.zoneName.trim()) return
		setBusy(true)
		setError('')
		try {
			await postApi('/measurements', {
				projectId,
				zoneName: form.zoneName.trim(),
				floorArea: Number(form.floorArea) || 0,
				wallArea: Number(form.wallArea) || 0,
				ceilingHeight: Number(form.ceilingHeight) || 0,
				notes: form.notes.trim() || undefined,
			})
			setOpen(false)
			setForm({
				zoneName: '',
				floorArea: '',
				wallArea: '',
				ceilingHeight: '2.7',
				notes: '',
			})
			onChanged()
		} catch (err: unknown) {
			const maybe = err as { message?: string }
			setError(maybe.message ?? 'Не вдалося зберегти замір')
		} finally {
			setBusy(false)
		}
	}

	return (
		<>
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-2 font-medium text-slate-950">
							<Ruler className="h-4 w-4 text-[var(--tds-primary)]" />
							Заміри
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Link
								to={`/workspace/measurements?projectId=${encodeURIComponent(projectId)}`}
								className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
							>
								Усі заміри →
							</Link>
							{canAdd ? (
								<Button
									type="button"
									variant="secondary"
									className="h-8 px-3 text-xs"
									icon={<PlusCircle className="h-3.5 w-3.5" />}
									onClick={() => setOpen(true)}
								>
									Додати замір
								</Button>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent>
			{measurements.length === 0 ? (
				<p className="text-sm text-slate-500">
					Замірів ще немає.{' '}
					{canAdd
						? 'Додайте зони (кухня, вітальня…) прямо тут — вони підуть у кошторис.'
						: 'Дизайнер або менеджер додасть заміри для кошторису.'}
				</p>
			) : (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{measurements.map((item) => (
						<div
							key={item.id}
							className="rounded-md border border-slate-100 p-3"
						>
							<div className="font-medium text-slate-950">
								{item.zoneName}
							</div>
							<div className="mt-2 grid grid-cols-3 gap-2 text-sm">
								<div>
									<div className="text-slate-500">Підлога</div>
									<div className="font-medium">
										{item.floorArea} м²
									</div>
								</div>
								<div>
									<div className="text-slate-500">Стіни</div>
									<div className="font-medium">
										{item.wallArea} м²
									</div>
								</div>
								<div>
									<div className="text-slate-500">Висота</div>
									<div className="font-medium">
										{item.ceilingHeight} м
									</div>
								</div>
							</div>
							{item.notes ? (
								<p className="mt-2 text-xs text-slate-500">
									{item.notes}
								</p>
							) : null}
						</div>
					))}
				</div>
			)}
				</CardContent>
			</Card>

			<Modal
				open={open}
				onClose={() => setOpen(false)}
				title={`Додати замір — ${projectCode}`}
				className="max-w-lg"
			>
				<FormModalSteps
					steps={[
						'Проєкт уже обраний — додайте зону (кухня, вітальня…).',
						'Вкажіть площі підлоги та стін (м²) і висоту стелі (м).',
						'Далі на сторінці «Кошториси» ці дані допоможуть порахувати роботи та матеріали.',
					]}
				/>
				<form onSubmit={submit} className="space-y-4">
					<div>
						<label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
							Зона / приміщення
						</label>
						<Input
							value={form.zoneName}
							onChange={(e) =>
								setForm((f) => ({
									...f,
									zoneName: e.target.value,
								}))
							}
							placeholder="Напр. Кухня-їдальня"
							required
						/>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
								Підлога м²
							</label>
							<Input
								type="number"
								min={0}
								step="0.01"
								value={form.floorArea}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										floorArea: e.target.value,
									}))
								}
								required
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
								Стіни м²
							</label>
							<Input
								type="number"
								min={0}
								step="0.01"
								value={form.wallArea}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										wallArea: e.target.value,
									}))
								}
								required
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
								Висота м
							</label>
							<Input
								type="number"
								min={0}
								step="0.01"
								value={form.ceilingHeight}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										ceilingHeight: e.target.value,
									}))
								}
								required
							/>
						</div>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
							Нотатки
						</label>
						<Input
							value={form.notes}
							onChange={(e) =>
								setForm((f) => ({ ...f, notes: e.target.value }))
							}
							placeholder="Ніша, балкон, особливості…"
						/>
					</div>
					{error ? (
						<p className="text-sm text-rose-600">{error}</p>
					) : null}
					<ModalFooter>
						<Button
							type="button"
							variant="secondary"
							onClick={() => setOpen(false)}
						>
							Скасувати
						</Button>
						<Button type="submit" disabled={busy}>
							{busy ? 'Зберігаємо…' : 'Зберегти замір'}
						</Button>
					</ModalFooter>
				</form>
			</Modal>
		</>
	)
}
