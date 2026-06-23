import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type OrderDocument = HydratedDocument<Order>
@Schema({ collection: 'orders', timestamps: true })
export class Order {
	@Prop({ required: true, unique: true })
	code: string
	@Prop({ required: true })
	title: string
	@Prop({ required: true })
	description: string
	@Prop({ required: true })
	status: string
	@Prop()
	requestedBudget?: string
	@Prop()
	preferredStart?: Date
	@Prop({ type: Types.ObjectId, ref: 'ClientProfile', required: true })
	clientId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Project' })
	projectId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'CatalogService' })
	serviceCatalogId?: Types.ObjectId
	@Prop()
	serviceSlug?: string
	@Prop()
	style?: string
	@Prop()
	source?: string
	@Prop()
	estimatedPrice?: string
	@Prop({ type: [String], default: [] })
	referencePhotoUrls: string[]
	@Prop()
	portfolioReferenceSlug?: string
	@Prop({ required: true })
	addressLine: string
	@Prop({ required: true })
	city: string
	@Prop({ required: true })
	phone: string
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	designerId?: Types.ObjectId
	@Prop({
		type: [{ type: Types.ObjectId, ref: 'StaffProfile' }],
		default: [],
	})
	workerIds: Types.ObjectId[]
	createdAt?: Date
	updatedAt?: Date
}
export const OrderSchema = SchemaFactory.createForClass(Order)
