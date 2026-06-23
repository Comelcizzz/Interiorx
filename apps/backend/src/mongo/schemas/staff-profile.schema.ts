import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type StaffProfileDocument = HydratedDocument<StaffProfile>
@Schema({ collection: 'staff_profiles', timestamps: true })
export class StaffProfile {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
	userId: Types.ObjectId
	@Prop({ required: true })
	specialization: string
	@Prop({ default: 40 })
	capacityHours: number
}
export const StaffProfileSchema = SchemaFactory.createForClass(StaffProfile)
