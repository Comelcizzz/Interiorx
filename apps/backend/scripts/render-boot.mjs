import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

mkdirSync(process.env.UPLOAD_DIR ?? '/app/uploads', { recursive: true })

const result = spawnSync(
	'npm',
	['run', 'start:prod', '--workspace=@tailored/backend'],
	{
		cwd: '/app',
		stdio: 'inherit',
		shell: true,
		env: process.env,
	}
)
process.exit(result.status ?? 1)
