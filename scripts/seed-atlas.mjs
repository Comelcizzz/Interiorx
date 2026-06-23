/**
 * One-off seed against remote MongoDB (Atlas).
 *
 * PowerShell:
 *   $env:MONGODB_URI="mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/test"
 *   $env:FORCE_SEED="true"
 *   node scripts/seed-atlas.mjs
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

if (!process.env.MONGODB_URI) {
	console.error('Set MONGODB_URI before running (include database name, e.g. .../test)')
	process.exit(1)
}

const result = spawnSync(
	'npm',
	['run', 'seed', '--workspace=@tailored/backend'],
	{
		cwd: root,
		stdio: 'inherit',
		shell: true,
		env: {
			...process.env,
			FORCE_SEED: process.env.FORCE_SEED ?? 'true',
			JWT_ACCESS_SECRET:
				process.env.JWT_ACCESS_SECRET ??
				'local-seed-secret-minimum-32-characters-long',
			JWT_REFRESH_SECRET:
				process.env.JWT_REFRESH_SECRET ??
				'local-seed-refresh-secret-32-chars-min',
		},
	}
)

process.exit(result.status ?? 1)
