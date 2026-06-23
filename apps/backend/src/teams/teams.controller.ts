import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateTeamDto } from './dto/create-team.dto'
import { TeamsService } from './teams.service'
@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
	constructor(private readonly svc: TeamsService) {}
	@Get()
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.BRIGADIR,
		RoleCode.DESIGNER,
	)
	list() {
		return this.svc.list()
	}
	@Get(':id')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.BRIGADIR)
	detail(
		@Param('id')
		id: string
	) {
		return this.svc.detail(id)
	}
	@Post()
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	create(
		@Body()
		dto: CreateTeamDto
	) {
		return this.svc.create(dto)
	}
	@Post(':id/members')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	addMember(
		@Param('id')
		teamId: string,
		@Body()
		body: {
			staffId: string
			isLead?: boolean
		}
	) {
		return this.svc.addMember(teamId, body.staffId, body.isLead)
	}
	@Delete(':id/members/:staffId')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	removeMember(
		@Param('id')
		teamId: string,
		@Param('staffId')
		staffId: string
	) {
		return this.svc.removeMember(teamId, staffId)
	}
}
