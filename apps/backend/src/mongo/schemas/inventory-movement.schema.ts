import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type InventoryMovementDocument = HydratedDocument<InventoryMovement>
@Schema({ collection: 'inventory_movements', timestamps: true })
export class InventoryMovement {
	@Prop({ type: Types.ObjectId, ref: 'Material', required: true })
	materialId: Types.ObjectId
	@Prop({ required: true })
	type: string
	@Prop({ required: true })
	quantity: string
	@Prop({ required: true })
	reason: string
	@Prop({ type: Types.ObjectId, ref: 'Project' })
	projectId?: Types.ObjectId
	createdAt?: Date
	updatedAt?: Date
}
export const InventoryMovementSchema =
	SchemaFactory.createForClass(InventoryMovement)
