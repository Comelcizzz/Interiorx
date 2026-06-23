import { IsInt, Max, Min } from 'class-validator'
export class UpdateQualityDto {
	@IsInt()
	@Min(0)
	@Max(100)
	score!: number
}
