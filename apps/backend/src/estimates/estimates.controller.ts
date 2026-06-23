import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AuthenticatedRequest } from '../auth/request-user'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateEstimateDto } from './dto/create-estimate.dto'
import { RejectEstimateDto } from './dto/reject-estimate.dto'
import { EstimatesService } from './estimates.service'
@ApiTags('estimates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('estimates')
export class EstimatesController {
	constructor(private readonly estimatesService: EstimatesService) {}
	@Get()
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.CLIENT,
	)
	list(
		@Req()
		req: AuthenticatedRequest,
		@Query('projectId')
		projectId?: string,
		@Query('status')
		status?: string,
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
		return this.estimatesService.list(
			{
				projectId,
				status,
				q: q?.trim() || undefined,
				page: page ? Number(page) : undefined,
				perPage: perPage ? Number(perPage) : undefined,
				from: from?.trim() || undefined,
				to: to?.trim() || undefined,
				sort: sort?.trim() || undefined,
			},
			req.user.id,
			req.user.role
		)
	}
	@Get(':id')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.CLIENT,
	)
	findOne(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.estimatesService.findOne(id, req.user.id, req.user.role)
	}
	@Post()
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.DESIGNER)
	create(
		@Body()
		dto: CreateEstimateDto
	) {
		return this.estimatesService.create(dto)
	}
	@Patch(':id/approve')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
	approve(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.estimatesService.approve(id, req.user.id, req.user.role)
	}
	@Patch(':id/reject')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
	reject(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string,
		@Body()
		body: RejectEstimateDto
	) {
		return this.estimatesService.reject(
			id,
			req.user.id,
			req.user.role,
			body
		)
	}
	@Patch(':id/stage/pricing')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	advancePricing(
		@Param('id')
		id: string
	) {
		return this.estimatesService.advanceToPricing(id)
	}
	@Patch(':id/stage/review')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	advanceReview(
		@Param('id')
		id: string
	) {
		return this.estimatesService.advanceToPendingReview(id)
	}
	@Patch(':id/send')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	send(
		@Param('id')
		id: string
	) {
		return this.estimatesService.send(id)
	}
	@Delete(':id')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	remove(
		@Param('id')
		id: string
	) {
		return this.estimatesService.remove(id)
	}
}
