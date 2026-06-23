import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ReceiptDocument = HydratedDocument<Receipt>
@Schema({ collection: 'receipts', timestamps: true })
export class Receipt {
	@Prop({ required: true, unique: true })
	number: string
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'ClientProfile', required: true })
	clientId: Types.ObjectId
	@Prop({
		type: Types.ObjectId,
		ref: 'Payment',
		required: true,
		unique: true,
	})
	paymentId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Invoice' })
	invoiceId?: Types.ObjectId
	@Prop({ required: true })
	status: string
	@Prop({ required: true })
	amount: string
	@Prop({ default: 'UAH' })
	currency: string
	@Prop()
	pdfPath?: string
	@Prop({ default: () => new Date() })
	issuedAt: Date
	createdAt?: Date
	updatedAt?: Date
}
export const ReceiptSchema = SchemaFactory.createForClass(Receipt)
