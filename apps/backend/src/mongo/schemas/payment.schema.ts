import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type PaymentDocument = HydratedDocument<Payment>
@Schema({ collection: 'payments', timestamps: true })
export class Payment {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Invoice' })
	invoiceId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'ClientProfile', required: true })
	clientId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'User' })
	createdById?: Types.ObjectId
	@Prop({ required: true })
	status: string
	@Prop({ required: true })
	method: string
	@Prop({ required: true })
	amount: string
	@Prop({ default: 'UAH' })
	currency: string
	@Prop({ unique: true, sparse: true })
	providerRef?: string
	@Prop()
	paidAt?: Date
}
export const PaymentSchema = SchemaFactory.createForClass(Payment)
PaymentSchema.index(
	{ invoiceId: 1 },
	{
		unique: true,
		partialFilterExpression: {
			invoiceId: { $exists: true, $ne: null },
			status: 'PAID',
		},
	}
)
