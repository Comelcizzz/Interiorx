import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
export type RoleDocument = HydratedDocument<Role>
@Schema({
	collection: 'roles',
	timestamps: { createdAt: 'createdAt', updatedAt: false },
})
export class Role {
	@Prop({ required: true, unique: true })
	code: string
	@Prop({ required: true })
	name: string
	@Prop({ required: true })
	description: string
	@Prop({ type: [String], default: [] })
	permissions: string[]
}
export const RoleSchema = SchemaFactory.createForClass(Role)
