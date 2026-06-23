import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type EstimateDocument = HydratedDocument<Estimate>
@Schema({ collection: 'estimates', timestamps: true })
export class Estimate {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ required: true })
	version: number
	@Prop({ required: true })
	status: string
	@Prop({ required: true })
	subtotal: string
	@Prop({ default: '0' })
	discount: string
	@Prop({ default: '0' })
	tax: string
	@Prop({ default: '0' })
	margin: string
	@Prop({ required: true })
	total: string
	@Prop()
	validUntil?: Date
}
export const EstimateSchema = SchemaFactory.createForClass(Estimate)
EstimateSchema.index({ projectId: 1, version: 1 }, { unique: true })
