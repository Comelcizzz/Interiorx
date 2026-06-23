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
		this.runNpmScript('ensure:demo-assets')
		void this.seedIfEmpty()
	}

	private runNpmScript(script: string) {
		spawn('npm', ['run', script, '--workspace=@tailored/backend'], {
			cwd: process.cwd(),
			env: process.env,
			stdio: 'inherit',
			shell: true,
		})
	}

	private async seedIfEmpty() {
		try {
			const count = await this.userModel.countDocuments()
			if (count > 0) {
				this.logger.log(`Database ready (${count} users) — seed skipped.`)
				return
			}
			this.logger.log('Empty database — running demo seed in background...')
			const child = spawn(
				'npm',
				['run', 'seed', '--workspace=@tailored/backend'],
				{
					cwd: process.cwd(),
					env: process.env,
					stdio: 'inherit',
					shell: true,
				}
			)
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
