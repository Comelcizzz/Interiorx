import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { spawnSync } from 'node:child_process'
import { Model } from 'mongoose'
import { User } from '../mongo/schemas/user.schema'

@Injectable()
export class SeedOnStartService {
	private readonly logger = new Logger(SeedOnStartService.name)

	constructor(
		@InjectModel(User.name)
		private readonly userModel: Model<User>
	) {}

	async runAfterListen() {
		try {
			const forceSeed = process.env.FORCE_SEED === 'true'
			const count = await this.userModel.countDocuments()
			if (!forceSeed && count > 0) {
				this.logger.log(`Database ready (${count} users) — seed skipped.`)
				return
			}
			this.logger.log('Running demo seed...')
			const result = spawnSync(
				'npm',
				['run', 'seed', '--workspace=@tailored/backend'],
				{
					cwd: process.cwd(),
					env: process.env,
					stdio: 'inherit',
					shell: true,
					timeout: 600_000,
				}
			)
			if (result.error) {
				this.logger.error('Seed process error', result.error)
				return
			}
			if (result.status !== 0) {
				this.logger.error(
					`Demo seed failed with exit code ${result.status ?? 1}.`
				)
				if (result.signal) {
					this.logger.error(`Seed terminated by signal ${result.signal}`)
				}
				return
			}
			this.logger.log('Demo seed completed.')
		} catch (error) {
			this.logger.error('Failed to run demo seed', error)
		}
	}
}
