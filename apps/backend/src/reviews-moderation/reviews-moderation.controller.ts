import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { ReviewsModerationService } from './reviews-moderation.service'
@ApiTags('moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('moderation/reviews')
export class ReviewsModerationController {
	constructor(
		private readonly reviewsModerationService: ReviewsModerationService
	) {}
	@Get()
	@ApiQuery({
		name: 'status',
		required: false,
		description: 'PENDING | PUBLISHED | HIDDEN | ALL (default PENDING)',
	})
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'perPage', required: false })
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	list(
		@Query('status')
		status?: string,
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
		return this.reviewsModerationService.list({
			status,
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Patch(':id/publish')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	publish(
		@Param('id')
		id: string
	) {
		return this.reviewsModerationService.publish(id)
	}
	@Patch(':id/hide')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	hide(
		@Param('id')
		id: string
	) {
		return this.reviewsModerationService.hide(id)
	}
}
