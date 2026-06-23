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
export class CreateWorkspaceCatalogDto {
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	slug!: string
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	name!: string
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	shortDescription?: string
	@IsOptional()
	@IsString()
	@MaxLength(20000)
	longDescription?: string
	@IsOptional()
	@IsString()
	@MaxLength(40)
	basePrice?: string
	@IsOptional()
	@IsString()
	@MaxLength(40)
	priceUnit?: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	style?: string[]
	@IsOptional()
	@IsBoolean()
	isActive?: boolean
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	sortOrder?: number
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	heroImageUrl?: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	galleryImageUrls?: string[]
	@IsOptional()
	@IsString()
	ownerStaffId?: string
	resolveOwnerStaffOid(): ReturnType<typeof optionalToObjectId> {
		return optionalToObjectId(this.ownerStaffId, 'ownerStaffId')
	}
}
export class UpdateWorkspaceCatalogDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	slug?: string
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	name?: string
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	shortDescription?: string
	@IsOptional()
	@IsString()
	@MaxLength(20000)
	longDescription?: string
	@IsOptional()
	@IsString()
	@MaxLength(40)
	basePrice?: string
	@IsOptional()
	@IsString()
	@MaxLength(40)
	priceUnit?: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	style?: string[]
	@IsOptional()
	@IsBoolean()
	isActive?: boolean
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	sortOrder?: number
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	heroImageUrl?: string
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	galleryImageUrls?: string[]
	@IsOptional()
	@IsString()
	ownerStaffId?: string | null
	resolveOwnerStaffOid():
		| ReturnType<typeof optionalToObjectId>
		| null
		| undefined {
		if (this.ownerStaffId === null) return null
		if (this.ownerStaffId === undefined) return undefined
		return optionalToObjectId(this.ownerStaffId, 'ownerStaffId')
	}
}
