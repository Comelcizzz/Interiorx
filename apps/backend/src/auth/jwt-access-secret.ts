import { ConfigService } from '@nestjs/config'
export function getJwtAccessSecret(config: ConfigService): string {
	const nodeEnv = process.env.NODE_ENV ?? 'development'
	const secret = config.get<string>('JWT_ACCESS_SECRET')
	if (nodeEnv === 'production') {
		if (!secret || secret.length < 32) {
			throw new Error(
				'JWT_ACCESS_SECRET must be set to a strong value (min 32 chars) when NODE_ENV=production'
			)
		}
		return secret
	}
	return secret ?? 'local-access-secret'
}
