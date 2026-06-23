import {
	IsEmail,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator'
export class PublicContactDto {
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	fullName!: string
	@IsEmail()
	email!: string
	@IsOptional()
	@IsString()
	@MaxLength(40)
	phone?: string
	@IsString()
	@MinLength(10)
	@MaxLength(4000)
	message!: string
	@IsOptional()
	@IsString()
	@MaxLength(2048)
	attachmentUrl?: string
}
