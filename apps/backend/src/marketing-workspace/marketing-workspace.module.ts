import { Module } from '@nestjs/common'
import { MarketingWorkspaceController } from './marketing-workspace.controller'
import { MarketingWorkspaceService } from './marketing-workspace.service'
@Module({
	controllers: [MarketingWorkspaceController],
	providers: [MarketingWorkspaceService],
})
export class MarketingWorkspaceModule {}
