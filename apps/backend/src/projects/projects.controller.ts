import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { AuthenticatedRequest } from '../auth/request-user'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UpdateProjectTeamDto } from './dto/update-project-team.dto'
import { UpdateProjectStatusDto } from './dto/update-project-status.dto'
import { ProjectsService } from './projects.service'
@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) {}
	@Get()
	@ApiQuery({ name: 'status', required: false })
	@ApiQuery({ name: 'city', required: false })
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'perPage', required: false })
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.BRIGADIR,
	)
	list(
		@Req()
		req: AuthenticatedRequest,
		@Query('status')
		status?: string,
		@Query('city')
		city?: string,
		@Query('q')
		q?: string,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('sort')
		sort?: string
	) {
		return this.projectsService.list({
			status,
			city,
			q: q?.trim() || undefined,
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
			requestingUserId: req.user.id,
			requestingRole: req.user.role,
		})
	}
	@Get('mine')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.BRIGADIR,
	)
	listMine(
		@Req()
		req: AuthenticatedRequest
	) {
		return this.projectsService.listMine(req.user.id, req.user.role)
	}
	@Get('mine/brigadir')
	@Roles(RoleCode.BRIGADIR)
	listMineBrigadir(@Req() req: AuthenticatedRequest) {
		return this.projectsService.listForBrigadir(req.user.id)
	}
	@Get('map')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER
	)
	map() {
		return this.projectsService.mapMarkers()
	}
	@Patch(':id/status')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	transitionStatus(
		@Param('id')
		id: string,
		@Body()
		dto: UpdateProjectStatusDto
	) {
		return this.projectsService.transitionStatus(id, dto.status)
	}
	@Patch(':id/team')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	updateTeam(
		@Param('id')
		id: string,
		@Body()
		dto: UpdateProjectTeamDto,
		@Req()
		req: AuthenticatedRequest
	) {
		return this.projectsService.updateTeam(id, req.user.role, dto)
	}
	@Get(':id/audit')
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'perPage', required: false })
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.BRIGADIR,
	)
	listAudit(
		@Param('id')
		id: string,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string
	) {
		return this.projectsService.listAuditForProject(
			id,
			page ? Number(page) : undefined,
			perPage ? Number(perPage) : undefined
		)
	}
	@Get(':id')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.BRIGADIR,
	)
	detail(
		@Param('id')
		id: string
	) {
		return this.projectsService.detail(id)
	}
}
