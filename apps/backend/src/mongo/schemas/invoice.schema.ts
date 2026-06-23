import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type InvoiceDocument = HydratedDocument<Invoice>
@Schema({ collection: 'invoices', timestamps: true })
export class Invoice {
	@Prop({ required: true, unique: true })
	number: string
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'ClientProfile', required: true })
	clientId: Types.ObjectId
	@Prop({ required: true })
	status: string
	@Prop({ required: true })
	amount: string
	@Prop({ default: 'UAH' })
	currency: string
	@Prop()
	dueDate?: Date
}
export const InvoiceSchema = SchemaFactory.createForClass(Invoice)
