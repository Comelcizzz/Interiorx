import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type AuditLogDocument = HydratedDocument<AuditLog>
@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
	@Prop({ type: Types.ObjectId, ref: 'Project' })
	projectId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'User' })
	userId?: Types.ObjectId
	@Prop({ required: true })
	action: string
	@Prop({ required: true })
	entityType: string
	@Prop({ required: true })
	entityId: string
	@Prop({ type: Object })
	metadata?: Record<string, unknown>
	createdAt?: Date
	updatedAt?: Date
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog)
AuditLogSchema.index({ entityType: 1, entityId: 1 })
AuditLogSchema.index({ projectId: 1, createdAt: -1 })
