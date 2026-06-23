import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
export class UpdateSupplierDto {
	@IsOptional()
	@IsString()
	contactName?: string
	@IsOptional()
	@IsString()
	email?: string
	@IsOptional()
	@IsString()
	phone?: string
	@IsOptional()
	@IsString()
	city?: string
	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(100)
	reliability?: number
}
