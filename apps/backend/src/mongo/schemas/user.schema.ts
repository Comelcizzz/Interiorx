import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
import { UploadedFileEntity } from './uploaded-file.schema'
export type UserDocument = HydratedDocument<User>
@Schema({ collection: 'users', timestamps: true })
export class User {
	@Prop({ required: true, unique: true, lowercase: true, trim: true })
	email: string
	@Prop({ required: true })
	passwordHash: string
	@Prop({ required: true })
	fullName: string
	@Prop()
	phone?: string
	@Prop({ type: Types.ObjectId, ref: UploadedFileEntity.name })
	avatarFileId?: Types.ObjectId
	@Prop()
	title?: string
	@Prop({ default: true })
	isActive: boolean
	@Prop({ type: Types.ObjectId, ref: 'Role', required: true })
	roleId: Types.ObjectId
	createdAt?: Date
	updatedAt?: Date
}
export const UserSchema = SchemaFactory.createForClass(User)
