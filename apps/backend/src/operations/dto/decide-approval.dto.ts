import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ApprovalStatus } from '../../domain/enums'
export class DecideApprovalDto {
	@IsEnum(ApprovalStatus)
	status!: ApprovalStatus
	@IsOptional()
	@IsString()
	notes?: string
}
