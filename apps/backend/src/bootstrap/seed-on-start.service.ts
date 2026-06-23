import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { join } from 'node:path'
import { register } from 'ts-node'
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
			this.logger.log('Running demo seed in-process...')
			register({
				project: join(process.cwd(), 'apps/backend/tsconfig.json'),
				transpileOnly: true,
			})
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { runMongoSeed } = require(
				join(process.cwd(), 'apps/backend/scripts/seed-mongo.ts')
			) as { runMongoSeed: () => Promise<void> }
			await runMongoSeed()
			this.logger.log('Demo seed completed.')
		} catch (error) {
			this.logger.error('Demo seed failed', error)
		}
	}
}
