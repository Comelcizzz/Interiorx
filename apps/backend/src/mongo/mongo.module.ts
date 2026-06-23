import { Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { Approval, ApprovalSchema } from './schemas/approval.schema'
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema'
import {
	CatalogService,
	CatalogServiceSchema,
} from './schemas/catalog-service.schema'
import {
	ContactSubmission,
	ContactSubmissionSchema,
} from './schemas/contact-submission.schema'
import {
	ClientProfile,
	ClientProfileSchema,
} from './schemas/client-profile.schema'
import {
	ChangeRequest,
	ChangeRequestSchema,
} from './schemas/change-request.schema'
import {
	DesignMeasurement,
	DesignMeasurementSchema,
} from './schemas/design-measurement.schema'
import {
	EstimateItem,
	EstimateItemSchema,
} from './schemas/estimate-item.schema'
import { Estimate, EstimateSchema } from './schemas/estimate.schema'
import {
	InventoryMovement,
	InventoryMovementSchema,
} from './schemas/inventory-movement.schema'
import { Invoice, InvoiceSchema } from './schemas/invoice.schema'
import { Material, MaterialSchema } from './schemas/material.schema'
import { Notification, NotificationSchema } from './schemas/notification.schema'
import { Order, OrderSchema } from './schemas/order.schema'
import { Payment, PaymentSchema } from './schemas/payment.schema'
import { PhotoReport, PhotoReportSchema } from './schemas/photo-report.schema'
import {
	PortfolioItem,
	PortfolioItemSchema,
} from './schemas/portfolio-item.schema'
import {
	ProjectLocation,
	ProjectLocationSchema,
} from './schemas/project-location.schema'
import { Project, ProjectSchema } from './schemas/project.schema'
import {
	QualityChecklist,
	QualityChecklistSchema,
} from './schemas/quality-checklist.schema'
import { Receipt, ReceiptSchema } from './schemas/receipt.schema'
import { Review, ReviewSchema } from './schemas/review.schema'
import { Role, RoleSchema } from './schemas/role.schema'
import {
	StaffProfile,
	StaffProfileSchema,
} from './schemas/staff-profile.schema'
import { Supplier, SupplierSchema } from './schemas/supplier.schema'
import { TaskComment, TaskCommentSchema } from './schemas/task-comment.schema'
import { Task, TaskSchema } from './schemas/task.schema'
import { TeamMember, TeamMemberSchema } from './schemas/team-member.schema'
import { Team, TeamSchema } from './schemas/team.schema'
import {
	UploadedFileEntity,
	UploadedFileSchema,
} from './schemas/uploaded-file.schema'
import { User, UserSchema } from './schemas/user.schema'
const REGISTER_MODELS = [
	{ name: Role.name, schema: RoleSchema },
	{ name: User.name, schema: UserSchema },
	{ name: ClientProfile.name, schema: ClientProfileSchema },
	{ name: ContactSubmission.name, schema: ContactSubmissionSchema },
	{ name: StaffProfile.name, schema: StaffProfileSchema },
	{ name: Project.name, schema: ProjectSchema },
	{ name: ProjectLocation.name, schema: ProjectLocationSchema },
	{ name: Order.name, schema: OrderSchema },
	{ name: DesignMeasurement.name, schema: DesignMeasurementSchema },
	{ name: Estimate.name, schema: EstimateSchema },
	{ name: EstimateItem.name, schema: EstimateItemSchema },
	{ name: Supplier.name, schema: SupplierSchema },
	{ name: Material.name, schema: MaterialSchema },
	{ name: InventoryMovement.name, schema: InventoryMovementSchema },
	{ name: Team.name, schema: TeamSchema },
	{ name: TeamMember.name, schema: TeamMemberSchema },
	{ name: Task.name, schema: TaskSchema },
	{ name: TaskComment.name, schema: TaskCommentSchema },
	{ name: Payment.name, schema: PaymentSchema },
	{ name: PhotoReport.name, schema: PhotoReportSchema },
	{ name: Invoice.name, schema: InvoiceSchema },
	{ name: Receipt.name, schema: ReceiptSchema },
	{ name: Review.name, schema: ReviewSchema },
	{ name: Approval.name, schema: ApprovalSchema },
	{ name: ChangeRequest.name, schema: ChangeRequestSchema },
	{ name: QualityChecklist.name, schema: QualityChecklistSchema },
	{ name: AuditLog.name, schema: AuditLogSchema },
	{ name: Notification.name, schema: NotificationSchema },
	{ name: CatalogService.name, schema: CatalogServiceSchema },
	{ name: PortfolioItem.name, schema: PortfolioItemSchema },
	{ name: UploadedFileEntity.name, schema: UploadedFileSchema },
]
@Global()
@Module({
	imports: [
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (config: ConfigService) => ({
				uri:
					config.get<string>('MONGODB_URI') ??
					'mongodb://127.0.0.1:27017/tailored',
			}),
			inject: [ConfigService],
		}),
		MongooseModule.forFeature(REGISTER_MODELS),
	],
	exports: [MongooseModule],
})
export class MongoModule {}
