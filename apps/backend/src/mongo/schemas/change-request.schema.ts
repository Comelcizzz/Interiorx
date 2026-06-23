import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ChangeRequestDocument = HydratedDocument<ChangeRequest>
@Schema({ collection: 'change_requests', timestamps: true })
export class ChangeRequest {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ required: true })
	title: string
	@Prop({ required: true })
	description: string
	@Prop({ required: true })
	status: string
	@Prop({ default: '0' })
	impactCost: string
	@Prop({ default: 0 })
	impactDays: number
	createdAt?: Date
	updatedAt?: Date
}
export const ChangeRequestSchema = SchemaFactory.createForClass(ChangeRequest)
