import { Type } from 'class-transformer'
import {
	IsArray,
	IsDateString,
	IsNumber,
	IsOptional,
	IsString,
	Min,
	ValidateNested,
} from 'class-validator'
export class CreateEstimateItemDto {
	@IsString()
	category!: string
	@IsString()
	title!: string
	@IsString()
	unit!: string
	@IsNumber()
	@Min(0)
	quantity!: number
	@IsNumber()
	@Min(0)
	unitPrice!: number
	@IsOptional()
	@IsNumber()
	sortOrder?: number
}
export class CreateEstimateDto {
	@IsString()
	projectId!: string
	@IsOptional()
	@IsNumber()
	discount?: number
	@IsOptional()
	@IsNumber()
	tax?: number
	@IsOptional()
	@IsNumber()
	margin?: number
	@IsOptional()
	@IsDateString()
	validUntil?: string
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateEstimateItemDto)
	items!: CreateEstimateItemDto[]
}
