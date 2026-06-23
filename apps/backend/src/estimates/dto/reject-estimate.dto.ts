import { IsOptional, IsString, MaxLength } from 'class-validator'
export class RejectEstimateDto {
	@IsOptional()
	@IsString()
	@MaxLength(4000)
	comment?: string
}
