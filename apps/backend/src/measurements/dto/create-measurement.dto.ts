import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
export class CreateMeasurementDto {
	@IsString()
	projectId!: string
	@IsString()
	zoneName!: string
	@IsNumber()
	@Min(0)
	floorArea!: number
	@IsNumber()
	@Min(0)
	wallArea!: number
	@IsNumber()
	@Min(0)
	ceilingHeight!: number
	@IsOptional()
	@IsString()
	notes?: string
}
