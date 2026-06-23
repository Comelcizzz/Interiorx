import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type TaskDocument = HydratedDocument<Task>
@Schema({ collection: 'tasks', timestamps: true })
export class Task {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'Team' })
	teamId?: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
	assigneeId?: Types.ObjectId
	@Prop({ required: true })
	title: string
	@Prop()
	description?: string
	@Prop({ required: true })
	status: string
	@Prop({ default: 3 })
	priority: number
	@Prop()
	dueDate?: Date
	@Prop({ type: Object })
	checklist?: Record<string, unknown>
}
export const TaskSchema = SchemaFactory.createForClass(Task)
