import {
	IsEnum,
	IsMongoId,
	IsOptional,
	IsString,
	MinLength,
} from 'class-validator'
import { InventoryMovementType } from '../../domain/enums'
export class CreateMaterialMovementDto {
	@IsEnum(InventoryMovementType)
	type!: InventoryMovementType
	@IsString()
	@MinLength(1)
	quantity!: string
	@IsString()
	@MinLength(3)
	reason!: string
	@IsOptional()
	@IsMongoId()
	projectId?: string
}
