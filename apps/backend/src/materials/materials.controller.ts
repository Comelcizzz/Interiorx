import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateMaterialMovementDto } from './dto/create-material-movement.dto'
import { MaterialsService } from './materials.service'
@ApiTags('materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialsController {
	constructor(private readonly materialsService: MaterialsService) {}
	@Get()
	@ApiQuery({ name: 'search', required: false })
	@ApiQuery({ name: 'category', required: false })
	@ApiQuery({ name: 'lowStock', required: false })
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	list(
		@Query('search')
		search?: string,
		@Query('category')
		category?: string,
		@Query('lowStock')
		lowStock?: string,
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
		return this.materialsService.list({
			search,
			q: q?.trim() || undefined,
			category,
			lowStock: lowStock === 'true',
			page: page ? Number(page) : undefined,
			perPage: perPage ? Number(perPage) : undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('overview')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
	)
	overview() {
		return this.materialsService.overview()
	}
	@Get('by-sku/:sku')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	detailBySku(
		@Param('sku')
		sku: string
	) {
		return this.materialsService.detailBySku(sku)
	}
	@Post(':id/movements')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	createMovement(
		@Param('id')
		id: string,
		@Body()
		dto: CreateMaterialMovementDto
	) {
		return this.materialsService.createMovement(id, dto)
	}
}
