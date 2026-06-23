import { Type } from 'class-transformer'
import {
	ArrayMaxSize,
	IsArray,
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator'
export class PortalCreateReviewDto {
	@IsString()
	projectId!: string
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(5)
	rating!: number
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title!: string
	@IsString()
	@MinLength(4)
	@MaxLength(8000)
	body!: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@ArrayMaxSize(5)
	photoUrls?: string[]
}
