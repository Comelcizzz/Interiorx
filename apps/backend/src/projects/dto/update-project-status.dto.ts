import { IsIn } from 'class-validator'
import { ProjectStatus } from '../../domain/enums'
export class UpdateProjectStatusDto {
	@IsIn(Object.values(ProjectStatus))
	status!: ProjectStatus
}
