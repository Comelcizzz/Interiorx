import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ProjectLocationDocument = HydratedDocument<ProjectLocation>
@Schema({ collection: 'project_locations', timestamps: true })
export class ProjectLocation {
	@Prop({
		type: Types.ObjectId,
		ref: 'Project',
		required: true,
		unique: true,
	})
	projectId: Types.ObjectId
	@Prop({ required: true })
	addressLine: string
	@Prop({ required: true })
	city: string
	@Prop({ required: true })
	region: string
	@Prop()
	postalCode?: string
	@Prop({ default: 'Україна' })
	country: string
	@Prop({ required: true })
	placeLabel: string
	@Prop({ required: true })
	latitude: string
	@Prop({ required: true })
	longitude: string
}
export const ProjectLocationSchema =
	SchemaFactory.createForClass(ProjectLocation)
