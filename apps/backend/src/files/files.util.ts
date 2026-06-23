import { randomUUID } from 'crypto'
import * as path from 'path'

const MIME_EXT: Record<string, string> = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp',
	'application/pdf': '.pdf',
}

export function decodeUploadOriginalName(name: string): string {
	if (!name) return 'upload'
	if (/[\u0400-\u04FF]/.test(name)) return name
	try {
		const decoded = Buffer.from(name, 'latin1').toString('utf8')
		if (/[\u0400-\u04FF]/.test(decoded)) return decoded
	} catch {
		// keep original
	}
	return name
}

export function buildStoredFilename(mimetype: string, originalName?: string) {
	const fromName = path.extname(originalName ?? '').toLowerCase()
	const ext =
		MIME_EXT[mimetype] ??
		(fromName.match(/^\.(jpe?g|png|webp|pdf)$/i) ? fromName : '.bin')
	return `${randomUUID()}${ext}`
}

export function resolveUploadRoot(uploadRoot: string) {
	return path.isAbsolute(uploadRoot)
		? uploadRoot
		: path.join(process.cwd(), uploadRoot)
}

export function resolveStoredFilePath(uploadRoot: string, storagePath: string) {
	const normalized = storagePath.replace(/\\/g, '/')
	if (path.isAbsolute(normalized)) return normalized
	return path.join(resolveUploadRoot(uploadRoot), path.posix.basename(normalized))
}
