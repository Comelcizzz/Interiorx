import { Module } from '@nestjs/common'
import { PaymentsModule } from '../payments/payments.module'
import { ProjectsModule } from '../projects/projects.module'
import { EstimatesController } from './estimates.controller'
import { EstimatesService } from './estimates.service'
@Module({
	imports: [PaymentsModule, ProjectsModule],
	controllers: [EstimatesController],
	providers: [EstimatesService],
	exports: [EstimatesService],
})
export class EstimatesModule {}
