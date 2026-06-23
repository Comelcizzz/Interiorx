import { Type } from 'class-transformer'
import {
	IsArray,
	IsBoolean,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator'
import { optionalToObjectId } from '../../lib/object-id'
export class CreateWorkspacePortfolioDto {
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	slug!: string
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title!: string
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	summary?: string
	@IsOptional()
	@IsString()
	@MaxLength(20000)
	description?: string
	@IsOptional()
	@IsString()
	@MaxLength(120)
	category?: string
	@IsOptional()
	@IsString()
	@MaxLength(120)
	style?: string
	@IsOptional()
	@IsString()
	completedAt?: string
	@IsOptional()
	@IsBoolean()
	isPublished?: boolean
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	sortOrder?: number
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	coverImageUrl?: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	galleryImageUrls?: string[]
	@IsOptional()
	@IsString()
	projectId?: string
	@IsOptional()
	@IsString()
	ownerStaffId?: string
	resolveProjectOid(): ReturnType<typeof optionalToObjectId> {
		return optionalToObjectId(this.projectId, 'projectId')
	}
	resolveOwnerStaffOid(): ReturnType<typeof optionalToObjectId> {
		return optionalToObjectId(this.ownerStaffId, 'ownerStaffId')
	}
}
export class UpdateWorkspacePortfolioDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	slug?: string
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title?: string
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	summary?: string
	@IsOptional()
	@IsString()
	@MaxLength(20000)
	description?: string
	@IsOptional()
	@IsString()
	@MaxLength(120)
	category?: string
	@IsOptional()
	@IsString()
	@MaxLength(120)
	style?: string
	@IsOptional()
	@IsString()
	completedAt?: string | null
	@IsOptional()
	@IsBoolean()
	isPublished?: boolean
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	sortOrder?: number
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	coverImageUrl?: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	galleryImageUrls?: string[]
	@IsOptional()
	@IsString()
	projectId?: string | null
	@IsOptional()
	@IsString()
	ownerStaffId?: string | null
	resolveProjectOid():
		| ReturnType<typeof optionalToObjectId>
		| null
		| undefined {
		if (this.projectId === null) return null
		if (this.projectId === undefined) return undefined
		return optionalToObjectId(this.projectId, 'projectId')
	}
	resolveOwnerStaffOid():
		| ReturnType<typeof optionalToObjectId>
		| null
		| undefined {
		if (this.ownerStaffId === null) return null
		if (this.ownerStaffId === undefined) return undefined
		return optionalToObjectId(this.ownerStaffId, 'ownerStaffId')
	}
}
