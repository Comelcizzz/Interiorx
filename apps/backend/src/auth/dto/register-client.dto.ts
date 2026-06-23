import { ApiProperty } from '@nestjs/swagger'
import {
	IsEmail,
	IsOptional,
	IsString,
	MinLength,
	ValidateIf,
} from 'class-validator'
import { IsUaPhone } from '../../common/validators/is-ua-phone.decorator'
export class RegisterClientDto {
	@ApiProperty()
	@IsEmail()
	email!: string
	@ApiProperty({ minLength: 8 })
	@IsString()
	@MinLength(8)
	password!: string
	@ApiProperty()
	@IsString()
	fullName!: string
	@ApiProperty({ required: false })
	@IsOptional()
	@ValidateIf((o: RegisterClientDto) => Boolean(o.phone?.trim()))
	@IsUaPhone()
	phone?: string
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	companyName?: string
}
