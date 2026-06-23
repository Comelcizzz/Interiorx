import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type TeamMemberDocument = HydratedDocument<TeamMember>
@Schema({ collection: 'team_members', timestamps: true })
export class TeamMember {
	@Prop({ type: Types.ObjectId, ref: 'Team', required: true })
	teamId: Types.ObjectId
	@Prop({ type: Types.ObjectId, ref: 'StaffProfile', required: true })
	staffId: Types.ObjectId
	@Prop({ default: false })
	isLead: boolean
}
export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember)
TeamMemberSchema.index({ teamId: 1, staffId: 1 }, { unique: true })
