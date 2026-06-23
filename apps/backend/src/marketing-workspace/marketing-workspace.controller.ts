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
import { AuthenticatedRequest } from '../auth/request-user'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import {
	CreateWorkspaceCatalogDto,
	UpdateWorkspaceCatalogDto,
} from './dto/workspace-catalog.dto'
import {
	CreateWorkspacePortfolioDto,
	UpdateWorkspacePortfolioDto,
} from './dto/workspace-portfolio.dto'
import { MarketingWorkspaceService } from './marketing-workspace.service'
@ApiTags('marketing-workspace')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MarketingWorkspaceController {
	constructor(
		private readonly marketingWorkspaceService: MarketingWorkspaceService
	) {}
	@Get('catalog-services')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	listCatalog(
		@Req()
		req: AuthenticatedRequest,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string
	) {
		return this.marketingWorkspaceService.listCatalog(
			req.user.id,
			req.user.role,
			page ? Number(page) : undefined,
			perPage ? Number(perPage) : undefined
		)
	}
	@Get('catalog-services/:id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	getCatalog(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.marketingWorkspaceService.getCatalog(
			id,
			req.user.id,
			req.user.role
		)
	}
	@Post('catalog-services')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	createCatalog(
		@Req()
		req: AuthenticatedRequest,
		@Body()
		dto: CreateWorkspaceCatalogDto
	) {
		return this.marketingWorkspaceService.createCatalog(
			req.user.id,
			req.user.role,
			dto
		)
	}
	@Patch('catalog-services/:id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	updateCatalog(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string,
		@Body()
		dto: UpdateWorkspaceCatalogDto
	) {
		return this.marketingWorkspaceService.updateCatalog(
			id,
			req.user.id,
			req.user.role,
			dto
		)
	}
	@Delete('catalog-services/:id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	deleteCatalog(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.marketingWorkspaceService.deleteCatalog(
			id,
			req.user.id,
			req.user.role
		)
	}
	@Get('portfolio-items')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	listPortfolio(
		@Req()
		req: AuthenticatedRequest,
		@Query('page')
		page?: string,
		@Query('perPage')
		perPage?: string
	) {
		return this.marketingWorkspaceService.listPortfolio(
			req.user.id,
			req.user.role,
			page ? Number(page) : undefined,
			perPage ? Number(perPage) : undefined
		)
	}
	@Get('portfolio-items/:id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	getPortfolio(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.marketingWorkspaceService.getPortfolio(
			id,
			req.user.id,
			req.user.role
		)
	}
	@Post('portfolio-items')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	createPortfolio(
		@Req()
		req: AuthenticatedRequest,
		@Body()
		dto: CreateWorkspacePortfolioDto
	) {
		return this.marketingWorkspaceService.createPortfolio(
			req.user.id,
			req.user.role,
			dto
		)
	}
	@Patch('portfolio-items/:id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	updatePortfolio(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string,
		@Body()
		dto: UpdateWorkspacePortfolioDto
	) {
		return this.marketingWorkspaceService.updatePortfolio(
			id,
			req.user.id,
			req.user.role,
			dto
		)
	}
	@Delete('portfolio-items/:id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	deletePortfolio(
		@Req()
		req: AuthenticatedRequest,
		@Param('id')
		id: string
	) {
		return this.marketingWorkspaceService.deletePortfolio(
			id,
			req.user.id,
			req.user.role
		)
	}
}
