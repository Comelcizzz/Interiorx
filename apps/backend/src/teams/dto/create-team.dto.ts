import { IsNotEmpty, IsString } from 'class-validator'
export class CreateTeamDto {
	@IsString()
	@IsNotEmpty()
	name!: string
	@IsString()
	@IsNotEmpty()
	city!: string
	@IsString()
	@IsNotEmpty()
	speciality!: string
}
