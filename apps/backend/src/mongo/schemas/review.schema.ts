import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ReviewDocument = HydratedDocument<Review>
export enum ReviewStatus {
	PENDING = 'PENDING',
	PUBLISHED = 'PUBLISHED',
	HIDDEN = 'HIDDEN',
}
@Schema({ collection: 'reviews', timestamps: true })
export class Review {
	@Prop({ type: Types.ObjectId, required: true, index: true })
	clientId!: Types.ObjectId
	@Prop({ type: Types.ObjectId, required: false, index: true })
	projectId?: Types.ObjectId
	@Prop({ required: true, min: 1, max: 5 })
	rating!: number
	@Prop({ required: true, trim: true })
	title!: string
	@Prop({ required: true, trim: true })
	body!: string
	@Prop({ enum: ReviewStatus, default: ReviewStatus.PENDING, index: true })
	status!: ReviewStatus
	@Prop()
	publishedAt?: Date
	@Prop()
	reviewerName?: string
	@Prop({ type: [String], default: [] })
	photoUrls: string[]
	createdAt?: Date
	updatedAt?: Date
}
export const ReviewSchema = SchemaFactory.createForClass(Review)
ReviewSchema.index({ status: 1, publishedAt: -1 })
