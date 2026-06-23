import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type PortfolioItemDocument = HydratedDocument<PortfolioItem>
@Schema({ collection: 'portfolio_items', timestamps: true })
export class PortfolioItem {
	@Prop({ required: true, unique: true })
	slug: string
	@Prop({ required: true })
	title: string
	@Prop({ default: '' })
	summary: string
	@Prop({ default: '' })
	description: string
	@Prop({ default: '' })
	category: string
	@Prop({ default: '' })
	style: string
	@Prop()
	completedAt?: Date
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	ownerStaffId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Project' })
	projectId?: Types.ObjectId
	@Prop({ default: false })
	isPublished: boolean
	@Prop({ default: 0 })
	sortOrder: number
	@Prop({ default: '' })
	coverImageUrl: string
	@Prop({ type: [String], default: [] })
	galleryImageUrls: string[]
}
export const PortfolioItemSchema = SchemaFactory.createForClass(PortfolioItem)
