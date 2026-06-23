import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: number

  @IsDateString()
  @IsOptional()
  dueDate?: string

  @IsString()
  @IsOptional()
  assigneeId?: string
}
