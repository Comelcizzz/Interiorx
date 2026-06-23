import { Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { Camera } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getApi, mediaUrl, postApi } from '@/lib/api'
import {
	revokeUploadedPreviews,
	uploadFilesWithPreview,
	uploadThumbFrameClass,
	uploadThumbImgClass,
	type UploadedPreview,
} from '@/lib/upload-preview'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'

type PhotoReportRow = {
	id: string
	caption: string
	photoUrls: string[]
	category: string
	missingCount?: number
	createdAt?: string
}
type ListResp = { items: PhotoReportRow[] }

function parsePhotoUrls(text: string) {
	return text
		.split(/[\n,]+/)
		.map((u) => u.trim())
		.filter(Boolean)
		.filter((u) => /^https?:\/\//i.test(u))
		.slice(0, 12)
}

export function ProjectPhotoReportsSection({
	projectId,
	category = 'SITE',
	title = 'Фото з обʼєкта',
	embedded = false,
}: {
	projectId: string
	category?: 'SITE' | 'DESIGN'
	title?: string
	/** Без окремої картки — для вкладок на сторінці проєкту. */
	embedded?: boolean
}) {
	const role = useAuthStore((s) => s.user?.role)
	const canCreate =
		role != null && ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR'].includes(role)

	const list = useLoad(
		() =>
			getApi<ListResp>(
				`/projects/${projectId}/photo-reports?page=1&perPage=24&category=${category}`,
			),
		[projectId, category],
	)

	const [mode, setMode] = useState<'url' | 'file'>('url')
	const [caption, setCaption] = useState('')
	const [photoUrlsText, setPhotoUrlsText] = useState('')
	const [uploadedFiles, setUploadedFiles] = useState<UploadedPreview[]>([])
	const uploadedFilesRef = useRef(uploadedFiles)
	uploadedFilesRef.current = uploadedFiles
	const [uploadingFiles, setUploadingFiles] = useState(false)
	const [uploadErrors, setUploadErrors] = useState<string[]>([])
	const [saving, setSaving] = useState(false)
	const [msg, setMsg] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	useEffect(
		() => () => {
			revokeUploadedPreviews(uploadedFilesRef.current)
		},
		[],
	)

	async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(e.target.files ?? [])
		if (!files.length) return
		setUploadingFiles(true)
		setMsg('')
		setUploadErrors([])
		const { uploaded, errors } = await uploadFilesWithPreview(files)
		if (uploaded.length) {
			setUploadedFiles((prev) => [...prev, ...uploaded])
		}
		if (errors.length) {
			setUploadErrors(errors)
		}
		setUploadingFiles(false)
		if (fileInputRef.current) fileInputRef.current.value = ''
	}

	async function saveReport(e: FormEvent) {
		e.preventDefault()
		if (!canCreate) return
		const photoUrls = mode === 'url' ? parsePhotoUrls(photoUrlsText) : []
		const fileIds =
			mode === 'file' ? uploadedFiles.map((item) => item.id) : undefined
		if (mode === 'url' ? !photoUrls.length : !fileIds?.length) {
			setMsg(
				mode === 'url'
					? 'Додайте хоча б одне посилання на фото.'
					: 'Завантажте хоча б одне фото.',
			)
			return
		}
		setSaving(true)
		setMsg('')
		try {
			await postApi('/photo-reports', {
				projectId,
				...(photoUrls.length ? { photoUrls } : {}),
				...(fileIds?.length ? { fileIds } : {}),
				caption: caption.trim() || undefined,
				category,
			})
			setCaption('')
			setPhotoUrlsText('')
			revokeUploadedPreviews(uploadedFilesRef.current)
			setUploadedFiles([])
			setMsg('Фотозвіт збережено.')
			list.reload()
		} catch {
			setMsg('Не вдалося зберегти фотозвіт.')
		} finally {
			setSaving(false)
		}
	}

	const isDesign = category === 'DESIGN'
	const captionPlaceholder = isDesign
		? 'Підпис до файлу (напр. План 1 поверх)'
		: 'Підпис до фотозвіту'
	const submitLabel = isDesign ? 'Додати файли' : 'Додати фотозвіт'

	const body = (
		<div className="space-y-4">
				{canCreate ? (
					<form
						onSubmit={(e) => void saveReport(e)}
						className="rounded-lg border border-dashed border-slate-200 p-4"
					>
						<div className="mb-3 flex gap-2">
							<button
								type="button"
								onClick={() => setMode('url')}
								className={`rounded-full px-3 py-1 text-xs font-semibold transition ${mode === 'url' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
							>
								Посилання
							</button>
							<button
								type="button"
								onClick={() => setMode('file')}
								className={`rounded-full px-3 py-1 text-xs font-semibold transition ${mode === 'file' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
							>
								Завантажити файл
							</button>
						</div>

						{mode === 'url' ? (
							<textarea
								className="mt-2 min-h-24 w-full rounded border border-slate-200 px-3 py-2 text-sm"
								placeholder="https://..."
								value={photoUrlsText}
								onChange={(e) => setPhotoUrlsText(e.target.value)}
							/>
						) : (
							<div className="mt-2">
								<input
									ref={fileInputRef}
									type="file"
									multiple
									accept="image/*"
									className="hidden"
									onChange={(e) => void handleFiles(e)}
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploadingFiles}
									className="w-full rounded border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
								>
									{uploadingFiles
										? 'Завантажуємо…'
										: 'Натисніть щоб обрати фото (JPG, PNG, WebP — до 2MB)'}
								</button>
								{uploadedFiles.length > 0 && (
									<div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
										{uploadedFiles.map((item, i) => (
											<div key={item.id} className="relative">
												<div className={uploadThumbFrameClass}>
													<img
														src={
															item.previewUrl ?? mediaUrl(item.url)
														}
														alt=""
														className={uploadThumbImgClass}
													/>
												</div>
												<button
													type="button"
													onClick={() =>
														setUploadedFiles((prev) => {
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
								)}
								{uploadErrors.length > 0 ? (
									<ul className="mt-2 space-y-1">
										{uploadErrors.map((line) => (
											<li key={line} className="text-xs text-rose-600">
												{line}
											</li>
										))}
									</ul>
								) : null}
							</div>
						)}

						<input
							className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
							placeholder={captionPlaceholder}
							value={caption}
							onChange={(e) => setCaption(e.target.value)}
						/>
						<div className="mt-3 flex flex-wrap items-center gap-3">
							<Button type="submit" disabled={saving || uploadingFiles}>
								{saving ? 'Зберігаємо...' : submitLabel}
							</Button>
							{msg ? <p className="text-xs text-slate-600">{msg}</p> : null}
						</div>
					</form>
				) : null}

				{list.error ? (
					<p className="text-sm text-rose-600">{list.error}</p>
				) : null}
				{list.loading ? (
					<p className="text-sm text-slate-500">Завантажуємо фото...</p>
				) : null}

				<div className="grid gap-4 sm:grid-cols-2">
					{(list.data?.items ?? []).map((row) => (
						<div key={row.id} className="rounded-lg border border-slate-100 p-3">
							<div className="grid grid-cols-2 gap-1">
								{row.photoUrls.map((u) => (
									<a key={u} href={mediaUrl(u)} target="_blank" rel="noreferrer">
										<img
											src={mediaUrl(u)}
											alt=""
											className="h-28 w-full rounded object-cover"
										/>
									</a>
								))}
							</div>
							{row.caption ? (
								<p className="mt-2 text-sm text-slate-700">{row.caption}</p>
							) : null}
							{row.missingCount && row.missingCount > 0 ? (
								<p className="mt-1 text-xs text-amber-700">
									{row.missingCount} фото недоступно
								</p>
							) : null}
						</div>
					))}
				</div>
		</div>
	)

	if (embedded) return body

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-2 font-medium text-slate-950">
					<Camera className="h-4 w-4" />
					{title}
				</div>
			</CardHeader>
			<CardContent>{body}</CardContent>
		</Card>
	)
}
