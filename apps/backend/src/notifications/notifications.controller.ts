import {
	Controller,
	Get,
	Param,
	Patch,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthenticatedRequest } from '../auth/request-user'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { NotificationsService } from './notifications.service'
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
	constructor(private readonly svc: NotificationsService) {}
	@Get()
	list(
		@Req()
		req: AuthenticatedRequest,
		@Query('unreadOnly')
		unreadOnly?: string,
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
		return this.svc.list(req.user.id, req.user.role, {
			unreadOnly: unreadOnly === 'true',
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('unread-count')
	unreadCount(
		@Req()
		req: AuthenticatedRequest
	) {
		return this.svc.unreadCount(req.user.id, req.user.role)
	}
	@Patch(':id/read')
	markRead(
		@Param('id')
		id: string,
		@Req()
		req: AuthenticatedRequest
	) {
		return this.svc.markRead(id, req.user.id, req.user.role)
	}
	@Patch('read-all')
	markAllRead(
		@Req()
		req: AuthenticatedRequest
	) {
		return this.svc.markAllRead(req.user.id, req.user.role)
	}
}
