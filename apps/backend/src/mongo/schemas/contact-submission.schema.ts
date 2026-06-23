import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
export type ContactSubmissionDocument = HydratedDocument<ContactSubmission>
@Schema({ collection: 'contact_submissions', timestamps: true })
export class ContactSubmission {
	@Prop({ required: true })
	fullName: string
	@Prop({ required: true, lowercase: true, trim: true })
	email: string
	@Prop()
	phone?: string
	@Prop({ required: true })
	message: string
	@Prop()
	attachmentUrl?: string
}
export const ContactSubmissionSchema =
	SchemaFactory.createForClass(ContactSubmission)
