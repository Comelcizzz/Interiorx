import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type QualityChecklistDocument = HydratedDocument<QualityChecklist>
@Schema({ collection: 'quality_checklists', timestamps: true })
export class QualityChecklist {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ required: true })
	title: string
	@Prop({ type: Object, required: true })
	items: Record<string, unknown>
	@Prop({ required: true })
	score: number
	createdAt?: Date
	updatedAt?: Date
}
export const QualityChecklistSchema =
	SchemaFactory.createForClass(QualityChecklist)
