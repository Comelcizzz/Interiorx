import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
export type SupplierDocument = HydratedDocument<Supplier>
@Schema({ collection: 'suppliers', timestamps: true })
export class Supplier {
	@Prop({ required: true, unique: true })
	name: string
	@Prop({ required: true })
	contactName: string
	@Prop({ required: true })
	email: string
	@Prop({ required: true })
	phone: string
	@Prop({ required: true })
	city: string
	@Prop({ default: 80 })
	reliability: number
}
export const SupplierSchema = SchemaFactory.createForClass(Supplier)
