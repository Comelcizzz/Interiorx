import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type UploadedFileDocument = HydratedDocument<UploadedFileEntity>
@Schema({ collection: 'uploaded_files', timestamps: true })
export class UploadedFileEntity {
	@Prop({ required: true })
	originalName: string
	@Prop({ required: true })
	storagePath: string
	@Prop({ required: true })
	mimeType: string
	@Prop({ required: true })
	size: number
	@Prop({ required: true })
	sha256: string
	@Prop({ type: Buffer })
	data?: Buffer
	@Prop({ type: Types.ObjectId, ref: 'User' })
	uploadedBy?: Types.ObjectId
}
export const UploadedFileSchema =
	SchemaFactory.createForClass(UploadedFileEntity)
UploadedFileSchema.index({ sha256: 1 }, { unique: true })
