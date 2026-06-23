import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ReportsService } from './reports.service'
@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}
	@Get('overview')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	overview(
		@Query('from')
		from?: string,
		@Query('to')
		to?: string
	) {
		return this.reportsService.overview({
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
		})
	}
}
