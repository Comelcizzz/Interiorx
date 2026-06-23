import { Button, Input, Modal, ModalFooter } from '@tailored/ui'
import {
	hasValidationErrors,
	minPreferredStartInputValue,
	validatePortalOrderIntake,
	validateRequestedBudget,
	validateUaPhone,
} from '@tailored/shared'
import { SearchableSelect } from '@/components/SearchableSelect'
import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { portalApi } from '@/lib/api'
import type { PublicServiceRow } from '@/lib/types'

const minPreferredStart = minPreferredStartInputValue()

type Props = {
	open: boolean
	onClose: () => void
	service: PublicServiceRow
}

export function OrderIntakeModal({ open, onClose, service }: Props) {
	const navigate = useNavigate()
	const [title, setTitle] = useState(service.name)
	const [description, setDescription] = useState('')
	const [style, setStyle] = useState(service.style[0] ?? '')
	const [requestedBudget, setRequestedBudget] = useState('')
	const [preferredStart, setPreferredStart] = useState('')
	const [addressLine, setAddressLine] = useState('')
	const [city, setCity] = useState('')
	const [phone, setPhone] = useState('')
	const [error, setError] = useState('')
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!open) return
		setTitle(service.name)
		setDescription('')
		setStyle(service.style[0] ?? '')
		setRequestedBudget('')
		setPreferredStart('')
		setAddressLine('')
		setCity('')
		setPhone('')
		setError('')
		setFieldErrors({})
	}, [open, service])

	async function submit(e: FormEvent) {
		e.preventDefault()
		setError('')
		const validation = validatePortalOrderIntake({
			serviceSlug: service.slug,
			title,
			description,
			style,
			requestedBudget,
			preferredStart,
			addressLine,
			city,
			phone,
		})
		setFieldErrors(validation)
		if (hasValidationErrors(validation)) {
			setError('Перевірте поля форми.')
			return
		}
		setLoading(true)
		try {
			const { data } = await portalApi.post<{
				code: string
			}>('/orders', {
				serviceSlug: service.slug,
				title: title.trim(),
				description: description.trim(),
				...(style.trim() ? { style: style.trim() } : {}),
				...(requestedBudget.trim()
					? { requestedBudget: requestedBudget.trim() }
					: {}),
				...(preferredStart.trim()
					? { preferredStart: preferredStart.trim() }
					: {}),
				addressLine: addressLine.trim(),
				city: city.trim(),
				phone: phone.trim(),
			})
			onClose()
			navigate(`/portal/orders/${data.code}`)
		} catch (err: unknown) {
			const maybe = err as {
				response?: {
					data?: {
						message?: string | string[]
					}
				}
			}
			const raw = maybe.response?.data?.message
			const msg = Array.isArray(raw) ? raw.join(', ') : raw
			setError(msg ?? 'Не вдалося надіслати заявку')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal
			open={open}
			onClose={onClose}
			title="Заявка на послугу"
			className="max-w-xl"
		>
			<form className="space-y-3" onSubmit={submit}>
				<div>
					<Input
						required
						value={title}
						onChange={(ev) => setTitle(ev.target.value)}
						minLength={3}
						maxLength={160}
						placeholder="Назва заявки"
					/>
					{fieldErrors.title ? (
						<p className="mt-1 text-xs text-rose-600">{fieldErrors.title}</p>
					) : null}
				</div>
				<label className="block text-xs font-semibold text-slate-600">
					Опис
				</label>
				<textarea
					required
					minLength={5}
					maxLength={4000}
					value={description}
					onChange={(ev) => setDescription(ev.target.value)}
					placeholder="Що потрібно зробити, терміни, особливості"
					className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
				/>
				{fieldErrors.description ? (
					<p className="text-xs text-rose-600">{fieldErrors.description}</p>
				) : null}
				{service.style.length ? (
					<label className="block space-y-1 text-xs font-semibold text-slate-600">
						<span>Стиль</span>
						<SearchableSelect
							value={style}
							onChange={setStyle}
							options={service.style.map((s) => ({
								value: s,
								label: s,
							}))}
						/>
					</label>
				) : null}
				{fieldErrors.style ? (
					<p className="text-xs text-rose-600">{fieldErrors.style}</p>
				) : null}
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Input
							value={requestedBudget}
							onChange={(ev) => {
								setRequestedBudget(ev.target.value)
								if (fieldErrors.requestedBudget) {
									setFieldErrors((prev) => {
										const next = { ...prev }
										delete next.requestedBudget
										return next
									})
								}
							}}
							onBlur={() => {
								const msg = validateRequestedBudget(requestedBudget)
								if (msg) {
									setFieldErrors((prev) => ({
										...prev,
										requestedBudget: msg,
									}))
								}
							}}
							maxLength={80}
							inputMode="numeric"
							placeholder="450000 або до 450 000 грн"
						/>
						{fieldErrors.requestedBudget ? (
							<p className="mt-1 text-xs text-rose-600">
								{fieldErrors.requestedBudget}
							</p>
						) : null}
					</div>
					<div>
						<Input
							type="date"
							value={preferredStart}
							min={minPreferredStart}
							onChange={(ev) => setPreferredStart(ev.target.value)}
						/>
						{fieldErrors.preferredStart ? (
							<p className="mt-1 text-xs text-rose-600">
								{fieldErrors.preferredStart}
							</p>
						) : null}
					</div>
				</div>
				<div>
					<Input
						required
						value={addressLine}
						onChange={(ev) => setAddressLine(ev.target.value)}
						minLength={3}
						maxLength={200}
						placeholder="Адреса"
					/>
					{fieldErrors.addressLine ? (
						<p className="mt-1 text-xs text-rose-600">
							{fieldErrors.addressLine}
						</p>
					) : null}
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Input
							required
							value={city}
							onChange={(ev) => setCity(ev.target.value)}
							minLength={2}
							maxLength={80}
							placeholder="Місто"
						/>
						{fieldErrors.city ? (
							<p className="mt-1 text-xs text-rose-600">{fieldErrors.city}</p>
						) : null}
					</div>
					<div>
						<Input
							required
							value={phone}
							onChange={(ev) => {
								setPhone(ev.target.value)
								if (fieldErrors.phone) {
									setFieldErrors((prev) => {
										const next = { ...prev }
										delete next.phone
										return next
									})
								}
							}}
							onBlur={() => {
								const msg = validateUaPhone(phone)
								if (msg) {
									setFieldErrors((prev) => ({
										...prev,
										phone: msg,
									}))
								}
							}}
							inputMode="tel"
							autoComplete="tel"
							placeholder="+380 67 123 45 67"
						/>
						{fieldErrors.phone ? (
							<p className="mt-1 text-xs text-rose-600">{fieldErrors.phone}</p>
						) : null}
					</div>
				</div>
				{error ? (
					<p className="text-sm text-rose-600">{error}</p>
				) : null}
				<ModalFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						Скасувати
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? 'Надсилаємо…' : 'Надіслати заявку'}
					</Button>
				</ModalFooter>
			</form>
		</Modal>
	)
}
