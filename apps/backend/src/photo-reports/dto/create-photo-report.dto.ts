import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
export class CreatePhotoReportDto {
  @IsString()
  projectId!: string
  @IsOptional()
  @IsString()
  taskId?: string
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  fileIds?: string[]
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photoUrls?: string[]
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string
  @IsOptional()
  @IsIn(['SITE', 'DESIGN'])
  category?: 'SITE' | 'DESIGN'
}
