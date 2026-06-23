import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type MaterialDocument = HydratedDocument<Material>
@Schema({ collection: 'materials', timestamps: true })
export class Material {
	@Prop({ required: true, unique: true })
	sku: string
	@Prop({ required: true })
	name: string
	@Prop({ required: true })
	category: string
	@Prop({ required: true })
	unit: string
	@Prop({ required: true })
	purchasePrice: string
	@Prop({ required: true })
	salePrice: string
	@Prop({ default: '0' })
	stockQty: string
	@Prop({ default: '0' })
	minStockQty: string
	@Prop({ type: Types.ObjectId, ref: 'Supplier' })
	supplierId?: Types.ObjectId
}
export const MaterialSchema = SchemaFactory.createForClass(Material)
