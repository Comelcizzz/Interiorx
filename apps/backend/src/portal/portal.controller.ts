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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AuthenticatedRequest } from '../auth/request-user'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CrmService } from '../crm/crm.service'
import { PaymentsService } from '../payments/payments.service'
import { ProjectsService } from '../projects/projects.service'
import { PortalCreateOrderDto } from './dto/portal-create-order.dto'
import { PortalCreateReviewDto } from './dto/portal-create-review.dto'
import { PortalPatchReviewDto } from './dto/portal-patch-review.dto'
import { PortalPatchOrderDto } from './dto/portal-patch-order.dto'
import { PortalReviewsService } from './portal-reviews.service'
import { PhotoReportsService } from '../photo-reports/photo-reports.service'
@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PortalController {
	constructor(
		private readonly projectsService: ProjectsService,
		private readonly crmService: CrmService,
		private readonly portalReviewsService: PortalReviewsService,
		private readonly photoReportsService: PhotoReportsService,
		private readonly paymentsService: PaymentsService
	) {}
	@Get('reviews/eligible-projects')
	@Roles(RoleCode.CLIENT)
	clientReviewEligible(
		@Req()
		req: AuthenticatedRequest
	) {
		return this.portalReviewsService.eligibleProjects(req.user.id)
	}
	@Get('reviews')
	@Roles(RoleCode.CLIENT)
	clientReviews(
		@Req()
		req: AuthenticatedRequest,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('status')
		status?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('sort')
		sort?: string
	) {
		return this.portalReviewsService.listForClientUser(req.user.id, {
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			status,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Post('reviews')
	@Roles(RoleCode.CLIENT)
	createClientReview(
		@Req()
		req: AuthenticatedRequest,
		@Body()
		body: PortalCreateReviewDto
	) {
		return this.portalReviewsService.createForClientUser(req.user.id, body)
	}
	@Patch('reviews/:id')
	@Roles(RoleCode.CLIENT)
	patchClientReview(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string,
		@Body()
		body: PortalPatchReviewDto
	) {
		return this.portalReviewsService.updatePendingForClientUser(
			req.user.id,
			id,
			body
		)
	}
	@Get('projects')
	@Roles(RoleCode.CLIENT)
	clientProjects(
		@Req()
		req: AuthenticatedRequest,
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
		return this.projectsService.listForClientUserPaginated(req.user.id, {
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			q,
			status,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('projects/:code/photo-reports')
	@Roles(RoleCode.CLIENT)
	clientProjectPhotoReports(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('category')
		category?: string
	) {
		return this.photoReportsService.listForPortalByCode(
			req.user.id,
			code,
			page ? Number(page) : undefined,
			perPage ? Number(perPage) : undefined,
			category as 'SITE' | 'DESIGN' | undefined
		)
	}
	@Get('projects/:code/audit')
	@Roles(RoleCode.CLIENT)
	clientProjectAudit(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string
	) {
		return this.projectsService.listAuditForClientProjectByCode(
			req.user.id,
			code,
			page ? Number(page) : undefined,
			perPage ? Number(perPage) : undefined
		)
	}
	@Get('projects/:code')
	@Roles(RoleCode.CLIENT)
	clientProjectDetail(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string
	) {
		return this.projectsService.detailByCodeForClientUser(req.user.id, code)
	}
	@Get('invoices')
	@Roles(RoleCode.CLIENT)
	clientInvoices(
		@Req()
		req: AuthenticatedRequest,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('status')
		status?: string,
		@Query('q')
		q?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('sort')
		sort?: string
	) {
		return this.paymentsService.listInvoicesForPortalUser(req.user.id, {
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			status: status?.trim() || undefined,
			q: q?.trim() || undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('invoices/:id')
	@Roles(RoleCode.CLIENT)
	clientInvoice(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.paymentsService.getInvoiceForPortalUser(req.user.id, id)
	}
	@Get('orders')
	@Roles(RoleCode.CLIENT)
	clientOrders(
		@Req()
		req: AuthenticatedRequest,
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
		return this.crmService.ordersForClientUserPaginated(req.user.id, {
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
	@Roles(RoleCode.CLIENT)
	createClientOrder(
		@Req()
		req: AuthenticatedRequest,
		@Body()
		body: PortalCreateOrderDto
	) {
		return this.crmService.createOrderForPortalClient(req.user.id, body)
	}
	@Patch('orders/:code/cancel')
	@Roles(RoleCode.CLIENT)
	cancelClientOrder(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string
	) {
		return this.crmService.cancelOrderForClientUser(req.user.id, code)
	}
	@Patch('orders/:code')
	@Roles(RoleCode.CLIENT)
	patchClientOrder(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string,
		@Body()
		body: PortalPatchOrderDto
	) {
		if (body.referencePhotoUrls?.length) {
			return this.crmService.appendReferencePhotosForClientUser(
				req.user.id,
				code,
				body.referencePhotoUrls
			)
		}
		return { ok: true, code, unchanged: true }
	}
	@Get('orders/:code')
	@Roles(RoleCode.CLIENT)
	clientOrderDetail(
		@Req()
		req: AuthenticatedRequest,
		@Param('code')
		code: string
	) {
		return this.crmService.orderByCodeForClientUser(req.user.id, code)
	}
}
