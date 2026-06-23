import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { Response } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AuthenticatedRequest } from '../auth/request-user'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { MockPaymentDto } from './dto/mock-payment.dto'
import { PaymentsService } from './payments.service'
@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
	constructor(private readonly paymentsService: PaymentsService) {}
	@Get('payments')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	list(
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string,
		@Query('status')
		status?: string,
		@Query('projectId')
		projectId?: string,
		@Query('from')
		from?: string,
		@Query('to')
		to?: string,
		@Query('sort')
		sort?: string
	) {
		return this.paymentsService.list({
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			status: status?.trim() || undefined,
			projectId: projectId?.trim() || undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Patch('payments/:id/refund')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	refundPayment(
		@Param('id')
		id: string,
		@Req()
		req: AuthenticatedRequest
	) {
		return this.paymentsService.refundPayment(id, req.user)
	}
	@Post('payments/mock')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
	mockPayment(
		@Body()
		dto: MockPaymentDto,
		@Req()
		req: AuthenticatedRequest
	) {
		return this.paymentsService.mockPayment(dto, req.user)
	}
	@Get('receipts')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
	receipts(
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
		return this.paymentsService.receipts(req.user, {
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			status: status?.trim() || undefined,
			q: q?.trim() || undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('receipts/:id/pdf')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
	async receiptPdf(
		@Param('id')
		id: string,
		@Req()
		req: AuthenticatedRequest,
		@Res()
		response: Response
	) {
		const { fileName, buffer } = await this.paymentsService.receiptPdf(
			id,
			req.user
		)
		response.setHeader('Content-Type', 'application/pdf')
		response.setHeader(
			'Content-Disposition',
			`attachment; filename="${fileName}"`
		)
		response.send(buffer)
	}
}
