import { IsEnum } from 'class-validator'
import { TaskStatus } from '../../domain/enums'
export class UpdateTaskStatusDto {
	@IsEnum(TaskStatus)
	status!: TaskStatus
}
