export function parseCorsOrigins(value?: string): string[] {
	if (!value) return []
	return value
		.split(',')
		.map((entry) => entry.trim().replace(/\/+$/, ''))
		.filter(Boolean)
}

export function isAllowedCorsOrigin(
	origin: string | undefined,
	allowedOrigins: string[],
	nodeEnv: string
): boolean {
	if (!origin) return true
	const normalized = origin.replace(/\/+$/, '')
	if (allowedOrigins.includes(normalized)) return true
	if (
		nodeEnv === 'production' &&
		/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(normalized)
	) {
		return true
	}
	return false
}
