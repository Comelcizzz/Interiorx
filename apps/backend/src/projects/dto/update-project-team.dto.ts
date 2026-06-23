import { IsOptional, IsString } from 'class-validator'
export class UpdateProjectTeamDto {
	@IsOptional()
	@IsString()
	managerStaffId?: string | null

	@IsOptional()
	@IsString()
	designerStaffId?: string | null

	@IsOptional()
	@IsString()
	brigadirStaffId?: string | null
}
