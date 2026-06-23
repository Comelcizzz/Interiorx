import { defaultHomePath } from '@/app/guards'
import type { RoleCode } from '@tailored/shared'

export function sanitizeNext(raw: string | null): string | null {
	if (!raw) return null
	if (!raw.startsWith('/') || raw.startsWith('//')) return null
	return raw
}

export type ClientAuthQuery = {
	next?: string | null
	project?: string | null
}

export function clientAuthHref(
	path: '/login' | '/register',
	query: ClientAuthQuery = {}
): string {
	const qs = new URLSearchParams()
	const next = sanitizeNext(query.next ?? null)
	if (next) qs.set('next', next)
	const project = query.project?.trim()
	if (project) qs.set('project', project)
	const encoded = qs.toString()
	return encoded ? `${path}?${encoded}` : path
}

export function isClientOrderAuthFlow(next: string | null): boolean {
	const safe = sanitizeNext(next)
	return Boolean(safe?.includes('/portal/orders/new'))
}

export function clientPostAuthPath(
	role: RoleCode | undefined,
	query: ClientAuthQuery = {}
): string {
	const next = sanitizeNext(query.next ?? null)
	const project = query.project?.trim()
	if (role === 'CLIENT' && project) {
		return `/portal/orders/new?portfolio=${encodeURIComponent(project)}`
	}
	if (next) return next
	if (role === 'CLIENT') return '/portal/dashboard?onboarding=1'
	return defaultHomePath(role)
}
