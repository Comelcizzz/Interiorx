import { Card, CardContent } from '@tailored/ui'
import { formatCurrency, formatNumber } from '@tailored/shared'
import { CheckCircle2, CreditCard, Loader2, XCircle } from 'lucide-react'
import QRCode from 'qrcode'
import { FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchableSelect } from '@/components/SearchableSelect'
import { getApi, portalApi, postApi } from '@/lib/api'
import { Paginated, ProjectListItem } from '@/lib/types'
import { useLoad } from '@/lib/use-load'

type PayResult = {
	status: string
	receiptId?: string
	receiptNumber?: string
	receiptVerifyUrl?: string
	message?: string
	invoiceId?: string
}

function CardWidget({
	number,
	expiry,
	name,
}: {
	number: string
	expiry: string
	name: string
}) {
	return (
		<div className="relative h-44 w-full max-w-xs overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-5 text-white shadow-xl">
			<div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
			<div className="absolute -bottom-8 right-8 h-32 w-32 rounded-full bg-white/5" />
			<div className="relative">
				<div className="mb-4 flex items-center justify-between">
					<div className="text-xs font-medium tracking-widest text-white/60 uppercase">
						INTERIORIX Pay
					</div>
					<CreditCard className="h-5 w-5 text-white/50" />
				</div>
				<div className="mb-4 font-mono text-lg tracking-widest">
					{number || '•••• •••• •••• ••••'}
				</div>
				<div className="flex items-end justify-between">
					<div>
						<div className="text-xs text-white/50">Власник</div>
						<div className="text-sm font-medium">
							{name || 'ІМʼЯ КЛІЄНТА'}
						</div>
					</div>
					<div className="text-right">
						<div className="text-xs text-white/50">Діє до</div>
						<div className="text-sm">{expiry || 'MM/YY'}</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function PaymentMockPage({
	usePortalProjects = false,
	checkoutMode = false,
	invoiceCheckout = false,
}: {
	usePortalProjects?: boolean
	checkoutMode?: boolean
	invoiceCheckout?: boolean
}) {
	const [searchParams] = useSearchParams()
	const invoiceId = invoiceCheckout
		? (searchParams.get('invoiceId')?.trim() ?? '')
		: ''
	const projectIdFromUrl = !invoiceCheckout
		? (searchParams.get('projectId')?.trim() ?? '')
		: ''
	const amountFromUrl = !invoiceCheckout
		? (searchParams.get('amount')?.trim() ?? '')
		: ''
	const invoiceRow = useLoad(
		() =>
			invoiceId
				? portalApi
						.get<{
							id: string
							amount: string
							currency: string
							number: string
							status: string
							projectCode: string
						}>(`/invoices/${encodeURIComponent(invoiceId)}`)
						.then((r) => r.data)
				: Promise.resolve(null),
		[invoiceId]
	)
	const projects = useLoad(() => {
		if (invoiceCheckout) return Promise.resolve([])
		return usePortalProjects
			? portalApi
					.get<Paginated<ProjectListItem>>(
						'/projects?page=1&perPage=100'
					)
					.then((r) => r.data.items)
			: getApi<Paginated<ProjectListItem>>(
					'/projects?page=1&perPage=100'
				).then((r) => r.items)
	}, [usePortalProjects, invoiceCheckout])
	const [projectId, setProjectId] = useState('')
	const [amount, setAmount] = useState('45000')
	const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
	const [expiry, setExpiry] = useState('12/27')
	const [cvv, setCvv] = useState('123')
	const [name, setName] = useState('Юлія Мороз')
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState<PayResult | null>(null)
	const [cvvFocus, setCvvFocus] = useState(false)
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

	useEffect(() => {
		if (invoiceCheckout) return
		if (projectIdFromUrl) setProjectId(projectIdFromUrl)
		if (amountFromUrl) setAmount(amountFromUrl)
	}, [invoiceCheckout, projectIdFromUrl, amountFromUrl])

	function formatCard(v: string) {
		const digits = v.replace(/\D/g, '').slice(0, 16)
		return digits.replace(/(.{4})/g, '$1 ').trim()
	}

	async function submit(e: FormEvent) {
		e.preventDefault()
		if (invoiceCheckout && !invoiceId) return
		if (
			invoiceId &&
			(!invoiceRow.data || invoiceRow.data.status !== 'SENT')
		)
			return
		setLoading(true)
		setResult(null)
		try {
			const res = invoiceId
				? await postApi<PayResult>('/payments/mock', {
						invoiceId,
						cardNumber,
					})
				: await postApi<PayResult>('/payments/mock', {
						projectId,
						amount,
						cardNumber,
					})
			setResult(res)
		} catch {
			setResult({
				status: 'ERROR',
				message:
					'Платіжний сервіс тимчасово недоступний. Спробуйте ще раз.',
			})
		} finally {
			setLoading(false)
		}
	}

	const payAmountLabel = invoiceRow.data?.amount ?? amount
	const ok = result?.status === 'PAID'
	const fail = result && result.status !== 'PAID'

	useEffect(() => {
		if (!ok || !result?.receiptVerifyUrl) {
			setQrDataUrl(null)
			return
		}
		let cancelled = false
		QRCode.toDataURL(result.receiptVerifyUrl, { margin: 1, width: 176 })
			.then((url) => {
				if (!cancelled) setQrDataUrl(url)
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null)
			})
		return () => {
			cancelled = true
		}
	}, [ok, result?.receiptVerifyUrl])

	return (
		<div className="space-y-6">
			{ok && checkoutMode ? (
				<div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
					{Array.from({ length: 20 }).map((_, i) => (
						<span
							key={i}
							className="absolute h-2 w-2 animate-ping rounded-full bg-emerald-400/80"
							style={{
								left: `${(i * 53) % 100}%`,
								top: `${(i * 37) % 100}%`,
								animationDelay: `${i * 0.05}s`,
							}}
						/>
					))}
				</div>
			) : null}

			<div>
				<h1 className="text-2xl font-semibold text-slate-950">
					{invoiceCheckout
						? 'Оплата рахунку'
						: checkoutMode
							? 'Платіжна сторінка'
							: 'Оплата'}
				</h1>
				<p className="mt-1 text-sm text-slate-500">
					{invoiceCheckout
						? 'Сума підтягнута з рахунку. Після успішної оплати система сформує онлайн-чек.'
						: 'Проведіть оплату по проєкту. Результат одразу збережеться у фінансах і чеках.'}
				</p>
			</div>

			{invoiceCheckout && !invoiceId ? (
				<p className="text-sm text-rose-600">
					Не передано рахунок. Відкрийте оплату зі списку рахунків.
				</p>
			) : null}
			{invoiceId && invoiceRow.error ? (
				<p className="text-sm text-rose-600">
					Не вдалося завантажити рахунок.
				</p>
			) : null}
			{invoiceRow.data && invoiceRow.data.status !== 'SENT' ? (
				<p className="text-sm text-amber-700">
					Цей рахунок зараз не відкритий для оплати.
				</p>
			) : null}

			<div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
				<div className="space-y-5">
					<div className="flex justify-center">
						<div
							className="transition duration-500 ease-out"
							style={{
								transform: cvvFocus
									? 'rotateY(12deg) rotateX(6deg) translateY(-4px)'
									: 'none',
								transformStyle: 'preserve-3d',
							}}
						>
							<CardWidget
								number={cardNumber}
								expiry={expiry}
								name={name}
							/>
						</div>
					</div>

					<Card>
						<CardContent className="pt-4">
							<form onSubmit={submit} className="space-y-4">
								{!invoiceId ? (
									<>
										<label className="block">
											<span className="mb-1 block text-sm font-medium text-slate-700">
												Проєкт
											</span>
											<SearchableSelect
												value={projectId}
												onChange={setProjectId}
												placeholder="Оберіть проєкт..."
												options={[
													{
														value: '',
														label: 'Оберіть проєкт...',
													},
													...(projects.data?.map((p) => ({
														value: p.id,
														label: `${p.code} — ${p.title}`,
														searchText: `${p.code} ${p.title}`,
													})) ?? []),
												]}
											/>
										</label>

										<label className="block">
											<span className="mb-1 block text-sm font-medium text-slate-700">
												Сума, грн
											</span>
											<input
												type="number"
												min="1"
												className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
												value={amount}
												onChange={(e) =>
													setAmount(e.target.value)
												}
												required
											/>
										</label>
									</>
								) : (
									<div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
										<div className="font-semibold">
											{invoiceRow.data?.number ??
												'Рахунок'}
										</div>
										<div className="text-slate-600">
											{invoiceRow.data?.projectCode
												? `${invoiceRow.data.projectCode} · `
												: null}
											{invoiceRow.loading
												? 'Завантажуємо суму...'
												: `${formatNumber(payAmountLabel)} ${invoiceRow.data?.currency ?? 'UAH'}`}
										</div>
									</div>
								)}

								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-700">
										Номер картки
									</span>
									<input
										className="h-10 w-full rounded-md border border-slate-200 px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
										value={cardNumber}
										onChange={(e) =>
											setCardNumber(
												formatCard(e.target.value)
											)
										}
										placeholder="1234 5678 9012 3456"
										maxLength={19}
										required
									/>
								</label>

								<div className="grid grid-cols-2 gap-3">
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-700">
											Термін дії
										</span>
										<input
											className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
											value={expiry}
											onChange={(e) =>
												setExpiry(e.target.value)
											}
											placeholder="MM/YY"
											maxLength={5}
										/>
									</label>
									<label className="block">
										<span className="mb-1 block text-sm font-medium text-slate-700">
											CVV
										</span>
										<input
											type="password"
											className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
											value={cvv}
											onChange={(e) =>
												setCvv(
													e.target.value.slice(0, 4)
												)
											}
											onFocus={() => setCvvFocus(true)}
											onBlur={() => setCvvFocus(false)}
											placeholder="•••"
											maxLength={4}
										/>
									</label>
								</div>

								<label className="block">
									<span className="mb-1 block text-sm font-medium text-slate-700">
										Імʼя на картці
									</span>
									<input
										className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
										value={name}
										onChange={(e) =>
											setName(e.target.value)
										}
									/>
								</label>

								<button
									type="submit"
									disabled={
										loading ||
										(Boolean(invoiceId) &&
											(invoiceRow.loading ||
												!invoiceRow.data ||
												invoiceRow.data.status !==
													'SENT'))
									}
									className="flex h-11 w-full items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{loading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
											Проводимо оплату...
										</>
									) : (
										`Оплатити ${formatNumber(payAmountLabel)} грн`
									)}
								</button>
							</form>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-4">
					<Card>
						<CardContent className="space-y-4 pt-5">
							<div>
								<div className="text-sm font-semibold text-slate-950">
									Підтвердження платежу
								</div>
								<p className="mt-1 text-sm text-slate-500">
									Після оплати запис зʼявиться у платежах,
									а чек буде доступний для завантаження.
								</p>
							</div>
							<div className="rounded-xl border border-slate-200 bg-white/70 p-4">
								<div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
									До сплати
								</div>
								<div className="mt-1 text-3xl font-black text-slate-950">
									{formatCurrency(payAmountLabel)}
								</div>
							</div>
						</CardContent>
					</Card>

					{ok && (
						<div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-slate-50 shadow-lg">
							<div className="border-b border-emerald-100 bg-emerald-900 px-5 py-4 text-white">
								<div className="text-[10px] font-semibold tracking-[0.2em] text-white/70">
									INTERIORIX
								</div>
								<div className="mt-1 text-lg font-semibold">
									Оплату прийнято
								</div>
								<div className="text-sm text-white/80">
									{result.receiptNumber ?? 'Чек формується'}
								</div>
							</div>
							<div className="flex flex-wrap gap-6 p-5">
								<div className="min-w-[200px] flex-1 space-y-2">
									<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
										Оплачено
									</div>
									<div className="text-3xl font-bold text-slate-950">
										{formatCurrency(payAmountLabel)}
									</div>
									{result.receiptVerifyUrl ? (
										<a
											href={result.receiptVerifyUrl}
											className="inline-block text-sm font-medium text-emerald-700 underline"
										>
											Відкрити сторінку перевірки
										</a>
									) : null}
									<div className="pt-2 text-sm text-slate-600">
										PDF можна завантажити у розділі{' '}
										<a
											href={
												usePortalProjects
													? '/portal/receipts'
													: '/workspace/receipts'
											}
											className="font-medium text-slate-900 underline"
										>
											чеки
										</a>
										.
									</div>
								</div>
								{qrDataUrl ? (
									<div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
										<img
											src={qrDataUrl}
											alt=""
											width={144}
											height={144}
											className="rounded-md"
										/>
										<span className="mt-2 max-w-[200px] truncate text-center text-[10px] text-slate-500">
											{result.receiptVerifyUrl}
										</span>
									</div>
								) : null}
							</div>
						</div>
					)}

					{fail ? (
						<div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
							<XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
							<div>
								<div className="font-semibold text-red-800">
									Оплату відхилено
								</div>
								<div className="text-sm text-red-700">
									{result.message ??
										'Банк відхилив операцію. Перевірте реквізити або використайте іншу картку.'}
								</div>
							</div>
						</div>
					) : null}

					{ok && !checkoutMode ? (
						<div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
							<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
							<div>
								<div className="font-semibold text-emerald-900">
									Платіж збережено
								</div>
								<div className="mt-1 text-sm text-emerald-700">
									Перейдіть у{' '}
									<a
										href={
											usePortalProjects
												? '/portal/receipts'
												: '/workspace/receipts'
										}
										className="underline"
									>
										чеки
									</a>
									, щоб завантажити PDF.
								</div>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	)
}
