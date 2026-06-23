import { uploadFile } from '@/lib/api'

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024
export const UPLOAD_ACCEPTED_MIME = [
	'image/jpeg',
	'image/png',
	'image/webp',
] as const

export type UploadedPreview = {
	id: string
	url: string
	previewUrl?: string
}

export function validateUploadFile(file: File): string | null {
	if (
		!UPLOAD_ACCEPTED_MIME.includes(
			file.type as (typeof UPLOAD_ACCEPTED_MIME)[number],
		)
	) {
		return `«${file.name}»: дозволені лише JPG, PNG або WebP.`
	}
	if (file.size > UPLOAD_MAX_BYTES) {
		const mb = (file.size / (1024 * 1024)).toFixed(1)
		return `«${file.name}»: ${mb} MB — максимум 2 MB.`
	}
	return null
}

export function formatUploadError(error: unknown, fileName?: string): string {
	const prefix = fileName ? `«${fileName}»: ` : ''
	const data = (
		error as {
			response?: { status?: number; data?: { message?: string | string[] } }
		}
	)?.response
	const raw = data?.data?.message
	if (Array.isArray(raw)) {
		return prefix + raw.join(' ')
	}
	if (typeof raw === 'string' && raw.trim()) {
		return prefix + raw
	}
	if (data?.status === 413) {
		return `${prefix}файл занадто великий (максимум 2 MB).`
	}
	return `${prefix}не вдалося завантажити. Перевірте формат і розмір.`
}

export type UploadBatchResult = {
	uploaded: UploadedPreview[]
	errors: string[]
}

export async function uploadFilesWithPreview(
	files: File[],
): Promise<UploadBatchResult> {
	const uploaded: UploadedPreview[] = []
	const errors: string[] = []

	for (const file of files) {
		const validation = validateUploadFile(file)
		if (validation) {
			errors.push(validation)
			continue
		}
		const previewUrl = URL.createObjectURL(file)
		try {
			const item = await uploadFile(file)
			uploaded.push({ id: item.id, url: item.url, previewUrl })
		} catch (error) {
			URL.revokeObjectURL(previewUrl)
			errors.push(formatUploadError(error, file.name))
		}
	}

	return { uploaded, errors }
}

export function revokeUploadedPreviews(items: UploadedPreview[]) {
	for (const item of items) {
		if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
	}
}

/** Контейнер превʼю — зберігає пропорції, не обрізає смугою. */
export const uploadPreviewFrameClass =
	'flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50'

export const uploadPreviewImgClass = 'max-h-full max-w-full object-contain'

export const uploadThumbFrameClass =
	'flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50'

export const uploadThumbImgClass = 'max-h-full max-w-full object-contain'
