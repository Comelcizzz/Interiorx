import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { CrmModule } from '../crm/crm.module'
import { DashboardModule } from '../dashboard/dashboard.module'
import { EstimatesModule } from '../estimates/estimates.module'
import { FilesModule } from '../files/files.module'
import { MarketingWorkspaceModule } from '../marketing-workspace/marketing-workspace.module'
import { MaterialsModule } from '../materials/materials.module'
import { MeasurementsModule } from '../measurements/measurements.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { OperationsModule } from '../operations/operations.module'
import { PaymentsModule } from '../payments/payments.module'
import { ProjectsModule } from '../projects/projects.module'
import { PhotoReportsModule } from '../photo-reports/photo-reports.module'
import { ReportsModule } from '../reports/reports.module'
import { ReviewsModerationModule } from '../reviews-moderation/reviews-moderation.module'
import { SuppliersModule } from '../suppliers/suppliers.module'
import { TeamsModule } from '../teams/teams.module'
import { UsersModule } from '../users/users.module'
@Module({
	imports: [
		DashboardModule,
		ProjectsModule,
		PaymentsModule,
		PhotoReportsModule,
		MaterialsModule,
		OperationsModule,
		CrmModule,
		ReportsModule,
		UsersModule,
		SuppliersModule,
		TeamsModule,
		NotificationsModule,
		EstimatesModule,
		MeasurementsModule,
		AuditModule,
		FilesModule,
		ReviewsModerationModule,
		MarketingWorkspaceModule,
	],
})
export class WorkspaceShellModule {}
