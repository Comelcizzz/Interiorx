import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type EstimateItemDocument = HydratedDocument<EstimateItem>
@Schema({ collection: 'estimate_items', timestamps: true })
export class EstimateItem {
	@Prop({ type: Types.ObjectId, ref: 'Estimate', required: true })
	estimateId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Material' })
	materialId?: Types.ObjectId
	@Prop({ required: true })
	category: string
	@Prop({ required: true })
	title: string
	@Prop({ required: true })
	unit: string
	@Prop({ required: true })
	quantity: string
	@Prop({ required: true })
	unitPrice: string
	@Prop({ required: true })
	total: string
	@Prop({ default: 0 })
	sortOrder: number
}
export const EstimateItemSchema = SchemaFactory.createForClass(EstimateItem)
