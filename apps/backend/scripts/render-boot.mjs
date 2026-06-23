import { mkdirSync } from 'node:fs'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'

const repoRoot = '/app'
const port = Number(process.env.BACKEND_PORT ?? 4000)

mkdirSync(process.env.UPLOAD_DIR ?? '/app/uploads', { recursive: true })

function waitForHealth(maxMs = 120_000) {
	return new Promise((resolve, reject) => {
		const started = Date.now()
		const probe = () => {
			const req = http.get(
				`http://127.0.0.1:${port}/health`,
				(res) => {
					res.resume()
					if (res.statusCode === 200) {
						resolve()
						return
					}
					retry()
				}
			)
			req.on('error', retry)
			function retry() {
				if (Date.now() - started > maxMs) {
					reject(new Error(`Health check timed out after ${maxMs}ms`))
					return
				}
				setTimeout(probe, 1500)
			}
		}
		probe()
	})
}

function shouldRunSeed() {
	return (
		process.env.FORCE_SEED === 'true' ||
		process.env.RUN_SEED_ON_BOOT === 'true'
	)
}

const api = spawn(
	'npm',
	['run', 'start:prod', '--workspace=@tailored/backend'],
	{
		cwd: repoRoot,
		stdio: 'inherit',
		shell: true,
		env: process.env,
	}
)

api.on('exit', (code) => {
	process.exit(code ?? 1)
})

try {
	await waitForHealth()
	if (shouldRunSeed()) {
		console.log('==> Running Mongo seed script (compiled JS)...')
		const seed = spawnSync(
			'npm',
			['run', 'seed:prod', '--workspace=@tailored/backend'],
			{
				cwd: repoRoot,
				stdio: 'inherit',
				shell: true,
				env: process.env,
			}
		)
		if (seed.status !== 0) {
			console.error(`==> Seed script failed (exit ${seed.status ?? 1})`)
		} else {
			console.log('==> Seed script finished successfully')
		}
	}
} catch (error) {
	console.error('==> Boot helper error:', error)
}
