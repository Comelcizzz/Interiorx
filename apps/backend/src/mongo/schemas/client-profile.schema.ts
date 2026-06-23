import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ClientProfileDocument = HydratedDocument<ClientProfile>
@Schema({ collection: 'client_profiles', timestamps: true })
export class ClientProfile {
	@Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
	userId: Types.ObjectId
	@Prop()
	companyName?: string
	@Prop({ required: true })
	leadSource: string
	createdAt?: Date
	updatedAt?: Date
}
export const ClientProfileSchema = SchemaFactory.createForClass(ClientProfile)
