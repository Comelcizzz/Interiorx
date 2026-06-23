import { ApiProperty } from '@nestjs/swagger'
import { IsMongoId, IsString } from 'class-validator'
export class PatchAvatarDto {
	@ApiProperty({ description: 'Uploaded file id (image/*)' })
	@IsString()
	@IsMongoId()
	fileId!: string
}
