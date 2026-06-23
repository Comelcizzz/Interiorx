import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type CatalogServiceDocument = HydratedDocument<CatalogService>
@Schema({ collection: 'catalog_services', timestamps: true })
export class CatalogService {
	@Prop({ required: true, unique: true })
	slug: string
	@Prop({ required: true })
	name: string
	@Prop({ default: '' })
	shortDescription: string
	@Prop({ default: '' })
	longDescription: string
	@Prop({ default: '0' })
	basePrice: string
	@Prop({ default: '' })
	category: string
	@Prop({ default: 'project' })
	priceUnit: string
	@Prop({ type: [String], default: [] })
	style: string[]
	@Prop({ default: true })
	isActive: boolean
	@Prop({ default: 0 })
	sortOrder: number
	@Prop()
	heroImageUrl?: string
	@Prop({ type: [String], default: [] })
	galleryImageUrls: string[]
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	ownerStaffId?: Types.ObjectId
}
export const CatalogServiceSchema = SchemaFactory.createForClass(CatalogService)
