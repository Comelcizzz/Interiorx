import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type PhotoReportDocument = HydratedDocument<PhotoReport>
@Schema({ collection: 'photo_reports', timestamps: true })
export class PhotoReport {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'Task' })
  taskId?: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy!: Types.ObjectId
  @Prop({ type: [{ type: Types.ObjectId, ref: 'UploadedFileEntity' }], default: [] })
  fileIds!: Types.ObjectId[]
  @Prop({ type: [String], default: [] })
  photoUrls!: string[]
  @Prop({ default: '', trim: true })
  caption!: string
  @Prop({ default: 'SITE', enum: ['SITE', 'DESIGN'] })
  category!: 'SITE' | 'DESIGN'
}
export const PhotoReportSchema = SchemaFactory.createForClass(PhotoReport)
PhotoReportSchema.index({ projectId: 1, createdAt: -1 })
PhotoReportSchema.index({ projectId: 1, category: 1, createdAt: -1 })
