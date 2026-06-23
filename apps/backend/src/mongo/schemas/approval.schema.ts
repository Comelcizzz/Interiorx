import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ApprovalDocument = HydratedDocument<Approval>
@Schema({ collection: 'approvals', timestamps: true })
export class Approval {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Estimate', required: false })
	estimateId?: Types.ObjectId
	@Prop({ required: true })
	kind: string
	@Prop({ required: true })
	status: string
	@Prop({ required: true })
	requestedBy: string
	@Prop()
	decidedBy?: string
	@Prop()
	notes?: string
	@Prop()
	decidedAt?: Date
	createdAt?: Date
	updatedAt?: Date
}
export const ApprovalSchema = SchemaFactory.createForClass(Approval)
