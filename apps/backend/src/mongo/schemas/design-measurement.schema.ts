import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type DesignMeasurementDocument = HydratedDocument<DesignMeasurement>
@Schema({ collection: 'design_measurements', timestamps: true })
export class DesignMeasurement {
	@Prop({ type: Types.ObjectId, ref: 'Project', required: true })
	projectId: Types.ObjectId
	@Prop({ required: true })
	zoneName: string
	@Prop({ required: true })
	floorArea: string
	@Prop({ required: true })
	wallArea: string
	@Prop({ required: true })
	ceilingHeight: string
	@Prop()
	notes?: string
}
export const DesignMeasurementSchema =
	SchemaFactory.createForClass(DesignMeasurement)
