import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
export type TeamDocument = HydratedDocument<Team>
@Schema({ collection: 'teams', timestamps: true })
export class Team {
	@Prop({ required: true, unique: true })
	name: string
	@Prop({ required: true })
	city: string
	@Prop({ required: true })
	speciality: string
}
export const TeamSchema = SchemaFactory.createForClass(Team)
