import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CrmModule } from '../crm/crm.module'
import { PaymentsModule } from '../payments/payments.module'
import { PhotoReportsModule } from '../photo-reports/photo-reports.module'
import { ProjectsModule } from '../projects/projects.module'
import { PortalController } from './portal.controller'
import { PortalReviewsService } from './portal-reviews.service'
@Module({
	imports: [
		AuthModule,
		ProjectsModule,
		CrmModule,
		PhotoReportsModule,
		PaymentsModule,
	],
	controllers: [PortalController],
	providers: [PortalReviewsService],
})
export class PortalModule {}
