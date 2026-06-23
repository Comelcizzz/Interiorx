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

/** Оновлення відгуку клієнтом — лише поки статус PENDING. Усі поля опційні, але має бути хоча б одне. */
export class PortalPatchReviewDto {
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(5)
	rating?: number

	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title?: string

	@IsOptional()
	@IsString()
	@MinLength(4)
	@MaxLength(8000)
	body?: string

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@ArrayMaxSize(5)
	photoUrls?: string[]
}
