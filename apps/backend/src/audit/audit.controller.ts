import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AuditService } from './audit.service'
@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
	constructor(private readonly auditService: AuditService) {}
	@Get()
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	list(
		@Query('entityType')
		entityType?: string,
		@Query('userId')
		userId?: string,
		@Query('projectId')
		projectId?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('sort')
		sort?: string
	) {
		return this.auditService.list({
			entityType,
			userId,
			projectId,
			from,
			to,
			sort: sort?.trim() || undefined,
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
		})
	}
	@Get('entity-types')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	entityTypes() {
		return this.auditService.entityTypes()
	}
}
