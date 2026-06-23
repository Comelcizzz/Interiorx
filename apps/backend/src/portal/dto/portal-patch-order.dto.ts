import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator'
export class PortalPatchOrderDto {
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(24)
	@Type(() => String)
	@IsString({ each: true })
	referencePhotoUrls?: string[]
}
