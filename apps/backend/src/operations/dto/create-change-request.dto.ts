import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator'
export class CreateChangeRequestDto {
	@IsMongoId()
	projectId!: string
	@IsString()
	@MinLength(3)
	title!: string
	@IsString()
	@MinLength(8)
	description!: string
	@IsOptional()
	@IsString()
	impactCost?: string
	@IsOptional()
	@IsString()
	impactDays?: string
}
