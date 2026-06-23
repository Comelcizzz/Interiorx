import { spawnSync } from 'node:child_process'

const result = spawnSync(
	'npm',
	['run', 'start:prod', '--workspace=@tailored/backend'],
	{
		stdio: 'inherit',
		shell: true,
		env: process.env,
	}
)
process.exit(result.status ?? 1)
