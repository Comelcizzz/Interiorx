import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
export class PatchMeDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	fullName?: string
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string
}
