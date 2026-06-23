import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type NotificationDocument = HydratedDocument<Notification>
@Schema({ collection: 'notifications', timestamps: true })
export class Notification {
	@Prop({ type: Types.ObjectId, ref: 'Project' })
	projectId?: Types.ObjectId
	@Prop({ required: true })
	title: string
	@Prop({ required: true })
	body: string
	@Prop()
	roleCode?: string
	@Prop({ type: Types.ObjectId, ref: 'User' })
	userId?: Types.ObjectId
	@Prop()
	entityType?: string
	@Prop()
	entityId?: string
	@Prop()
	link?: string
	@Prop({ default: false })
	isRead: boolean
	@Prop({ default: 'info' })
	severity?: string
}
export const NotificationSchema = SchemaFactory.createForClass(Notification)
