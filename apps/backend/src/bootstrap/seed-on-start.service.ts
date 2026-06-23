import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { spawn } from 'node:child_process'
import { Model } from 'mongoose'
import { User } from '../mongo/schemas/user.schema'

@Injectable()
export class SeedOnStartService implements OnApplicationBootstrap {
	private readonly logger = new Logger(SeedOnStartService.name)

	constructor(
		@InjectModel(User.name)
		private readonly userModel: Model<User>
	) {}

	onApplicationBootstrap() {
		setImmediate(() => {
			void this.bootDemoData()
		})
	}

	private spawnNpm(script: string) {
		return spawn('npm', ['run', script, '--workspace=@tailored/backend'], {
			cwd: process.cwd(),
			env: process.env,
			stdio: 'inherit',
			shell: true,
			detached: false,
		})
	}

	private async bootDemoData() {
		try {
			this.spawnNpm('ensure:demo-assets')
			const forceSeed = process.env.FORCE_SEED === 'true'
			const count = await this.userModel.countDocuments()
			if (!forceSeed && count > 0) {
				this.logger.log(`Database ready (${count} users) — seed skipped.`)
				return
			}
			this.logger.log('Running demo seed in background...')
			const child = this.spawnNpm('seed')
			child.on('exit', (code) => {
				if (code === 0) {
					this.logger.log('Demo seed completed.')
					return
				}
				this.logger.error(`Demo seed failed with exit code ${code ?? 1}.`)
			})
		} catch (error) {
			this.logger.error('Failed to start demo seed', error)
		}
	}
}
