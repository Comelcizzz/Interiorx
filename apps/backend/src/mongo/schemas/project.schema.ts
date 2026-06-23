import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ProjectDocument = HydratedDocument<Project>
@Schema({ collection: 'projects', timestamps: true })
export class Project {
	@Prop({ required: true, unique: true })
	code: string
	@Prop({ required: true })
	title: string
	@Prop({ required: true })
	description: string
	@Prop({ required: true })
	status: string
	@Prop({ type: Types.ObjectId, ref: 'ClientProfile', required: true })
	clientId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	managerId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	designerId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	brigadirId?: Types.ObjectId
	@Prop({ required: true })
	budgetPlanned: string
	@Prop()
	budgetApproved?: string
	@Prop()
	startDate?: Date
	@Prop()
	dueDate?: Date
}
export const ProjectSchema = SchemaFactory.createForClass(Project)
