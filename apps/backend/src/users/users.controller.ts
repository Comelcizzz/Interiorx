import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UsersService } from './users.service'
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}
	@Get()
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	users(
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('q')
		q?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('sort')
		sort?: string
	) {
		return this.usersService.users({
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			q: q?.trim() || undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('roles')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	roles() {
		return this.usersService.roles()
	}
}
