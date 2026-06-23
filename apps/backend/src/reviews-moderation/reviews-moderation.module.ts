import { Module } from '@nestjs/common'
import { ReviewsModerationController } from './reviews-moderation.controller'
import { ReviewsModerationService } from './reviews-moderation.service'
@Module({
	controllers: [ReviewsModerationController],
	providers: [ReviewsModerationService],
})
export class ReviewsModerationModule {}
