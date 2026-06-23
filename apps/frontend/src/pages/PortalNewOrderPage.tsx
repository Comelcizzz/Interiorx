import {
	Button,
	Card,
	CardContent,
	Input,
	PageHeader,
} from '@tailored/ui'
import {
	hasValidationErrors,
	minPreferredStartInputValue,
	parseOrderPhotoUrls,
	validatePortalOrderIntake,
	validateRequestedBudget,
	validateContactPhone,
} from '@tailored/shared'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PublicImage } from '@/components/PublicImage'
import { SearchableSelect } from '@/components/SearchableSelect'
import { mediaUrl, portalApi, publicApi } from '@/lib/api'
import {
	revokeUploadedPreviews,
	uploadFilesWithPreview,
	uploadPreviewFrameClass,
	uploadPreviewImgClass,
	uploadThumbFrameClass,
	uploadThumbImgClass,
	type UploadedPreview,
} from '@/lib/upload-preview'
import { portfolioImage } from '@/lib/public-visuals'
import type { Paginated, PortfolioItemRow, PublicServiceRow } from '@/lib/types'
import { useLoad } from '@/lib/use-load'

const minPreferredStart = minPreferredStartInputValue()

function portfolioPhotoUrls(item: PortfolioItemRow) {
	const urls = [item.coverImageUrl, ...(item.galleryImageUrls ?? [])].filter(
		Boolean
	) as string[]
	return [...new Set(urls)].slice(0, 12)
}

export function PortalNewOrderPage() {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const portfolioFromQuery =
		searchParams.get('portfolio')?.trim() ||
		searchParams.get('project')?.trim() ||
		''

	const services = useLoad(
		() =>
			publicApi
				.get<Paginated<PublicServiceRow>>(
					'/catalog/services?page=1&perPage=100'
				)
				.then((r) => r.data),
		[]
	)
	const portfolioList = useLoad(
		() =>
			publicApi
				.get<Paginated<PortfolioItemRow>>('/portfolio?page=1&perPage=20')
				.then((r) => r.data),
		[]
	)

	const [portfolioSlug, setPortfolioSlug] = useState(portfolioFromQuery)
	const [serviceSlug, setServiceSlug] = useState('')
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [style, setStyle] = useState('')
	const [requestedBudget, setRequestedBudget] = useState('')
	const [preferredStart, setPreferredStart] = useState('')
	const [addressLine, setAddressLine] = useState('')
	const [city, setCity] = useState('')
	const [phone, setPhone] = useState('')
	const [photoUrlsText, setPhotoUrlsText] = useState('')
	const [photoMode, setPhotoMode] = useState<'url' | 'file'>('file')
	const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPreview[]>([])
	const [uploadingPhotos, setUploadingPhotos] = useState(false)
	const [photoUploadErrors, setPhotoUploadErrors] = useState<string[]>([])
	const photoInputRef = useRef<HTMLInputElement>(null)
	const uploadedPhotosRef = useRef(uploadedPhotos)
	uploadedPhotosRef.current = uploadedPhotos
	const [busy, setBusy] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
	const prefilledPortfolio = useRef<string | null>(null)

	const portfolioRef = useLoad(
		() =>
			portfolioSlug
				? publicApi
						.get<PortfolioItemRow>(
							`/portfolio/${encodeURIComponent(portfolioSlug)}`
						)
						.then((r) => r.data)
				: Promise.resolve(null),
		[portfolioSlug]
	)

	const serviceOptions = useMemo(
		() => services.data?.items ?? [],
		[services.data]
	)
	const previewUrls = useMemo(() => {
		const fromText = parseOrderPhotoUrls(photoUrlsText)
		return [...fromText, ...uploadedPhotos.map((item) => item.url)].slice(0, 12)
	}, [photoUrlsText, uploadedPhotos])

	useEffect(
		() => () => {
			revokeUploadedPreviews(uploadedPhotosRef.current)
		},
		[],
	)

	function collectReferencePhotoUrls() {
		return [
			...parseOrderPhotoUrls(photoUrlsText),
			...uploadedPhotos.map((item) => item.url),
		].slice(0, 12)
	}

	async function handleReferencePhotos(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? [])
		if (!files.length) return
		setUploadingPhotos(true)
		setPhotoUploadErrors([])
		setErr(null)
		const { uploaded, errors } = await uploadFilesWithPreview(files)
		if (uploaded.length) {
			setUploadedPhotos((prev) => [...prev, ...uploaded].slice(0, 12))
		}
		if (errors.length) {
			setPhotoUploadErrors(errors)
		}
		setUploadingPhotos(false)
		if (photoInputRef.current) photoInputRef.current.value = ''
	}

	useEffect(() => {
		setPortfolioSlug(portfolioFromQuery)
	}, [portfolioFromQuery])

	useEffect(() => {
		const item = portfolioRef.data
		if (!item || prefilledPortfolio.current === item.slug) return
		prefilledPortfolio.current = item.slug
		const urls = portfolioPhotoUrls(item)
		setPhotoUrlsText(urls.join('\n'))
		setTitle((prev) =>
			prev.trim() ? prev : `Схожий проєкт: ${item.title}`
		)
		setDescription((prev) => {
			if (prev.trim()) return prev
			const hint = item.summary?.trim() || item.description?.trim() || ''
			return `Референс з портфоліо «${item.title}».${hint ? ` ${hint}` : ''}`
		})
		setStyle((prev) => (prev.trim() ? prev : item.style ?? ''))
	}, [portfolioRef.data])

	function selectPortfolio(slug: string) {
		setPortfolioSlug(slug)
		prefilledPortfolio.current = null
		if (slug) {
			setSearchParams({ portfolio: slug }, { replace: true })
		} else {
			setSearchParams({}, { replace: true })
		}
	}

	async function submit(e: FormEvent) {
		e.preventDefault()
		setErr(null)
		const photoUrls = collectReferencePhotoUrls()
		const validation = validatePortalOrderIntake({
			serviceSlug,
			title,
			description,
			style,
			requestedBudget,
			preferredStart,
			addressLine,
			city,
			phone,
			referencePhotoUrls: photoUrls,
		})
		setFieldErrors(validation)
		if (hasValidationErrors(validation)) {
			setErr('Перевірте поля форми.')
			return
		}
		setBusy(true)
		try {
			const body: Record<string, unknown> = {
				serviceSlug: serviceSlug.trim(),
				title: title.trim(),
				description: description.trim(),
				addressLine: addressLine.trim(),
				city: city.trim(),
				phone: phone.trim(),
				referencePhotoUrls: photoUrls,
			}
			if (style.trim()) body.style = style.trim()
			if (requestedBudget.trim()) body.requestedBudget = requestedBudget.trim()
			if (preferredStart.trim()) {
				body.preferredStart = preferredStart.trim()
			}
			if (portfolioSlug.trim()) {
				body.portfolioReferenceSlug = portfolioSlug.trim()
			}
			const { data } = await portalApi.post<{ code: string }>('/orders', body)
			navigate(`/portal/orders/${data.code}`)
		} catch (error: unknown) {
			const msg = (
				error as {
					response?: { data?: { message?: string } }
				}
			)?.response?.data?.message
			setErr(msg ?? 'Не вдалося надіслати заявку.')
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title="Нова заявка"
				description="Це запит на роботу студії. Після перевірки менеджер перетворить заявку на проєкт і звʼяжеться з вами."
			/>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
				<Card>
					<CardContent className="space-y-4 pt-6">
						<p className="text-sm text-slate-600">
							Референси — завантажте фото з компʼютера, додайте посилання (URL)
							або оберіть кейс з портфоліо.
						</p>
						{services.loading ? (
							<p className="text-sm text-slate-500">Завантажуємо послуги...</p>
						) : null}
						{services.error ? (
							<p className="text-sm text-rose-600">{services.error}</p>
						) : null}
						{err ? <p className="text-sm text-rose-600">{err}</p> : null}

						<form className="space-y-4" onSubmit={(e) => void submit(e)}>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Кейс з портфоліо (референс)
								</label>
								<SearchableSelect
									value={portfolioSlug}
									onChange={selectPortfolio}
									options={[
										{
											value: '',
											label: 'Без референсу з портфоліо',
										},
										...(portfolioList.data?.items ?? []).map(
											(item) => ({
												value: item.slug,
												label: item.title,
												searchText: item.slug,
											})
										),
									]}
								/>
								{portfolioRef.loading ? (
									<p className="mt-1 text-xs text-slate-500">
										Завантажуємо референс...
									</p>
								) : null}
								{portfolioRef.error ? (
									<p className="mt-1 text-xs text-rose-600">
										{portfolioRef.error}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Послуга
								</label>
								<SearchableSelect
									value={serviceSlug}
									onChange={setServiceSlug}
									placeholder="Оберіть послугу..."
									options={serviceOptions.map((s) => ({
										value: s.slug,
										label: s.name,
										searchText: s.slug,
									}))}
								/>
								{fieldErrors.serviceSlug ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.serviceSlug}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Коротка назва заявки
								</label>
								<Input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									required
									minLength={3}
									maxLength={160}
									placeholder="Напр.: квартира 72 м², приховане світло"
								/>
								{fieldErrors.title ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.title}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Опис задачі
								</label>
								<textarea
									className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									required
									minLength={5}
									maxLength={4000}
									placeholder="Що потрібно зробити, орієнтовні терміни, особливості обʼєкта..."
								/>
								{fieldErrors.description ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.description}
									</p>
								) : null}
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
										Стиль (необовʼязково)
									</label>
									<Input
										value={style}
										onChange={(e) => setStyle(e.target.value)}
										maxLength={80}
										placeholder="Сканді, мінімалізм..."
									/>
									{fieldErrors.style ? (
										<p className="mt-1 text-xs text-rose-600">
											{fieldErrors.style}
										</p>
									) : null}
								</div>
								<div>
									<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
										Орієнтовний бюджет
									</label>
									<Input
										value={requestedBudget}
										onChange={(e) => {
											setRequestedBudget(e.target.value)
											if (fieldErrors.requestedBudget) {
												setFieldErrors((prev) => {
													const next = { ...prev }
													delete next.requestedBudget
													return next
												})
											}
										}}
										onBlur={() => {
											const msg = validateRequestedBudget(
												requestedBudget
											)
											if (msg) {
												setFieldErrors((prev) => ({
													...prev,
													requestedBudget: msg,
												}))
											}
										}}
										maxLength={80}
										inputMode="numeric"
										placeholder="Напр.: 450000 або до 450 000 грн"
									/>
									<p className="mt-1 text-xs text-slate-500">
										Від 1 000 до 50 000 000 грн; відʼємні суми не
										приймаються.
									</p>
									{fieldErrors.requestedBudget ? (
										<p className="mt-1 text-xs text-rose-600">
											{fieldErrors.requestedBudget}
										</p>
									) : null}
								</div>
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Бажаний старт
								</label>
								<Input
									type="date"
									value={preferredStart}
									min={minPreferredStart}
									onChange={(e) => setPreferredStart(e.target.value)}
								/>
								<p className="mt-1 text-xs text-slate-500">
									Не раніше ніж завтра (необовʼязково).
								</p>
								{fieldErrors.preferredStart ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.preferredStart}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Адреса обʼєкта
								</label>
								<Input
									value={addressLine}
									onChange={(e) => setAddressLine(e.target.value)}
									required
									minLength={3}
									maxLength={200}
									placeholder="Вулиця, будинок, квартира"
								/>
								{fieldErrors.addressLine ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.addressLine}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Місто
								</label>
								<Input
									value={city}
									onChange={(e) => setCity(e.target.value)}
									required
									minLength={2}
									maxLength={80}
								/>
								{fieldErrors.city ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.city}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Телефон для звʼязку
								</label>
								<Input
									value={phone}
									onChange={(e) => {
										setPhone(e.target.value)
										if (fieldErrors.phone) {
											setFieldErrors((prev) => {
												const next = { ...prev }
												delete next.phone
												return next
											})
										}
									}}
									onBlur={() => {
										const msg = validateContactPhone(phone)
										if (msg) {
											setFieldErrors((prev) => ({
												...prev,
												phone: msg,
											}))
										}
									}}
									required
									inputMode="tel"
									autoComplete="tel"
									placeholder="+380 67 123 45 67 або +48 123 456 789"
								/>
								<p className="mt-1 text-xs text-slate-500">
									Україна (+380, 067…) або міжнародний номер (+48, +1…).
								</p>
								{fieldErrors.phone ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.phone}
									</p>
								) : null}
							</div>
							<div>
								<label className="mb-1 block text-xs font-bold uppercase text-slate-500">
									Референс-фото
								</label>
								<div className="mb-3 flex gap-2">
									<button
										type="button"
										onClick={() => setPhotoMode('file')}
										className={`rounded-full px-3 py-1 text-xs font-semibold transition ${photoMode === 'file' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
									>
										Завантажити файл
									</button>
									<button
										type="button"
										onClick={() => setPhotoMode('url')}
										className={`rounded-full px-3 py-1 text-xs font-semibold transition ${photoMode === 'url' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
									>
										Посилання (URL)
									</button>
								</div>
								{photoMode === 'url' ? (
									<textarea
										className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
										placeholder="https://..."
										value={photoUrlsText}
										onChange={(e) => setPhotoUrlsText(e.target.value)}
									/>
								) : (
									<div>
										<input
											ref={photoInputRef}
											type="file"
											multiple
											accept="image/jpeg,image/png,image/webp"
											className="hidden"
											onChange={(e) => void handleReferencePhotos(e)}
										/>
										<button
											type="button"
											onClick={() => photoInputRef.current?.click()}
											disabled={uploadingPhotos || uploadedPhotos.length >= 12}
											className="w-full rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition disabled:opacity-60"
										>
											{uploadingPhotos
												? 'Завантажуємо…'
												: 'Натисніть щоб обрати фото (JPG, PNG, WebP — до 2 MB)'}
										</button>
										{uploadedPhotos.length > 0 ? (
											<div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
												{uploadedPhotos.map((item, i) => (
													<div key={item.id} className="relative">
														<div className={uploadThumbFrameClass}>
															<img
																src={
																	item.previewUrl ??
																	mediaUrl(item.url)
																}
																alt=""
																className={uploadThumbImgClass}
															/>
														</div>
														<button
															type="button"
															onClick={() =>
																setUploadedPhotos((prev) => {
																	const next = prev.filter(
																		(_, j) => j !== i,
																	)
																	if (prev[i]?.previewUrl) {
																		URL.revokeObjectURL(
																			prev[i].previewUrl!,
																		)
																	}
																	return next
																})
															}
															className="absolute right-1 top-1 rounded-full bg-white/80 px-1 text-[10px] font-bold text-slate-700"
														>
															✕
														</button>
													</div>
												))}
											</div>
										) : null}
										{photoUploadErrors.length > 0 ? (
											<ul className="mt-2 space-y-1">
												{photoUploadErrors.map((msg) => (
													<li
														key={msg}
														className="text-xs text-rose-600"
													>
														{msg}
													</li>
												))}
											</ul>
										) : null}
									</div>
								)}
								<p className="mt-1 text-xs text-slate-500">
									До 12 фото. Можна комбінувати завантажені файли та URL.
								</p>
								{fieldErrors.referencePhotoUrls ? (
									<p className="mt-1 text-xs text-rose-600">
										{fieldErrors.referencePhotoUrls}
									</p>
								) : null}
							</div>
							<div className="flex flex-wrap gap-3">
								<Button
									type="submit"
									disabled={busy || uploadingPhotos}
								>
									{busy ? 'Надсилаємо...' : 'Надіслати заявку'}
								</Button>
								<Link
									to="/portal/orders"
									className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-[var(--tds-primary)] hover:underline"
								>
									Скасувати
								</Link>
							</div>
						</form>
					</CardContent>
				</Card>

				<aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
					{portfolioRef.data ? (
						<Card>
							<CardContent className="space-y-3 pt-5">
								<div className="text-xs font-bold uppercase text-slate-500">
									Кейс з портфоліо
								</div>
								<PublicImage
									src={portfolioRef.data.coverImageUrl}
									fallback={portfolioImage(portfolioRef.data.slug)}
									alt={portfolioRef.data.title}
									className="h-36 w-full rounded-2xl object-cover"
								/>
								<p className="text-sm font-bold text-slate-900">
									{portfolioRef.data.title}
								</p>
								<p className="text-xs text-slate-600">
									{portfolioRef.data.category} · {portfolioRef.data.style}
								</p>
								<Link
									to={`/portfolio/${encodeURIComponent(portfolioRef.data.slug)}`}
									className="text-xs font-semibold text-[var(--tds-primary)] hover:underline"
									target="_blank"
									rel="noreferrer"
								>
									Відкрити кейс на сайті
								</Link>
							</CardContent>
						</Card>
					) : null}

					<Card>
						<CardContent className="space-y-3 pt-5">
							<div className="text-xs font-bold uppercase text-slate-500">
								Превʼю референсів ({previewUrls.length})
							</div>
							{previewUrls.length === 0 ? (
								<p className="text-sm text-slate-500">
									Додайте фото, URL або оберіть кейс з портфоліо — зображення
									зʼявляться тут.
								</p>
							) : (
								<div className="grid gap-3">
									{parseOrderPhotoUrls(photoUrlsText).map((url) => (
										<div key={`url-${url}`} className={uploadPreviewFrameClass}>
											<PublicImage
												src={url}
												fallback={portfolioImage(portfolioSlug || 'ref')}
												alt=""
												className={uploadPreviewImgClass}
											/>
										</div>
									))}
									{uploadedPhotos.map((item) => (
										<div key={item.id} className={uploadPreviewFrameClass}>
											<img
												src={item.previewUrl ?? mediaUrl(item.url)}
												alt=""
												className={uploadPreviewImgClass}
											/>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	)
}
