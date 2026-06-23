import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator'
export class CreateSupplierDto {
	@IsString()
	@IsNotEmpty()
	name!: string
	@IsString()
	@IsNotEmpty()
	contactName!: string
	@IsString()
	@IsNotEmpty()
	email!: string
	@IsString()
	@IsNotEmpty()
	phone!: string
	@IsString()
	@IsNotEmpty()
	city!: string
	@IsInt()
	@Min(0)
	@Max(100)
	reliability!: number
}
