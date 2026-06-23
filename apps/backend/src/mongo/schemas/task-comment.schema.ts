import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type TaskCommentDocument = HydratedDocument<TaskComment>
@Schema({ collection: 'task_comments', timestamps: true })
export class TaskComment {
	@Prop({ type: Types.ObjectId, ref: 'Task', required: true })
	taskId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'User', required: true })
	authorId: Types.ObjectId
	@Prop({ required: true })
	body: string
}
export const TaskCommentSchema = SchemaFactory.createForClass(TaskComment)
