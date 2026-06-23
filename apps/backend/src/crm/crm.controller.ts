import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import { AuthenticatedRequest } from '../auth/request-user'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CrmService } from './crm.service'
import { CreateOrderDto } from './dto/create-order.dto'
@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm')
export class CrmController {
	constructor(private readonly crmService: CrmService) {}
	@Get('clients')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	clients() {
		return this.crmService.clients()
	}
	@Get('orders/:code')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	orderDetail(
		@Param('code')
		code: string
	) {
		return this.crmService.orderByCodeForWorkspace(code)
	}
	@Get('orders')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	orders(
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('q')
		q?: string,
		@Query('status')
		status?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('sort')
		sort?: string
	) {
		return this.crmService.orders({
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			q,
			status,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Post('orders')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	createOrder(
		@Body()
		dto: CreateOrderDto
	) {
		return this.crmService.createOrder(dto)
	}
	@Patch('orders/:code/qualify')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	qualifyOrder(
		@Param('code')
		code: string
	) {
		return this.crmService.qualifyCrmOrder(code)
	}
	@Patch('orders/:code/convert')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	convertOrder(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string
	) {
		return this.crmService.convertCrmOrder(code, req.user.id)
	}
	@Patch('orders/:code/reject')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	rejectOrder(
		@Param('code')
		code: string
	) {
		return this.crmService.rejectCrmOrder(code)
	}
	@Post('orders/:code/claim')
	@Roles(RoleCode.DESIGNER)
	claimOrder(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string
	) {
		return this.crmService.claimOrderForDesigner(req.user.id, code)
	}
	@Get('funnel')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	funnel() {
		return this.crmService.funnel()
	}
	@Get('stats')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	stats() {
		return this.crmService.stats()
	}
}
