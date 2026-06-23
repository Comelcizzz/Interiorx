import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { DashboardService } from './dashboard.service'
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
	constructor(private readonly dashboardService: DashboardService) {}
	@Get('summary')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	getSummary() {
		return this.dashboardService.getSummary()
	}
}
