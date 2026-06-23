import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import mongoose from 'mongoose'

function runNpm(script) {
	const result = spawnSync(
		'npm',
		['run', script, '--workspace=@tailored/backend'],
		{
			cwd: '/app',
			stdio: 'inherit',
			shell: true,
			env: process.env,
		}
	)
	if (result.status !== 0) {
		console.error(`[render-boot] "${script}" failed with code ${result.status ?? 1}`)
		process.exit(result.status ?? 1)
	}
}

async function needsSeed() {
	if (process.env.FORCE_SEED === 'true') return true
	const uri = process.env.MONGODB_URI
	if (!uri) {
		console.error('[render-boot] MONGODB_URI is not set')
		process.exit(1)
	}
	await mongoose.connect(uri)
	const count = await mongoose.connection.db.collection('users').countDocuments()
	await mongoose.disconnect()
	console.log(`[render-boot] users in database: ${count}`)
	return count === 0
}

mkdirSync(process.env.UPLOAD_DIR ?? '/app/uploads', { recursive: true })
runNpm('ensure:demo-assets')

if (await needsSeed()) {
	console.log('[render-boot] Running full demo seed...')
	runNpm('seed')
} else {
	console.log('[render-boot] Database already has users — seed skipped.')
}

runNpm('start:prod')
