import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateMeasurementDto } from './dto/create-measurement.dto'
import { MeasurementsService } from './measurements.service'
@ApiTags('measurements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('measurements')
export class MeasurementsController {
	constructor(private readonly measurementsService: MeasurementsService) {}
	@Get()
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.CLIENT,
	)
	list(
		@Query('projectId')
		projectId?: string,
		@Query('q')
		q?: string,
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
		const p = page ? Number(page) : undefined
		const pp = perPage ? Number(perPage) : undefined
		return this.measurementsService.list({
			projectId,
			q: q?.trim() || undefined,
			page: Number.isFinite(p) ? p : undefined,
			perPage: Number.isFinite(pp) ? pp : undefined,
			from: from?.trim() || undefined,
			to: to?.trim() || undefined,
			sort: sort?.trim() || undefined,
		})
	}
	@Get('summary/:projectId')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	summary(
		@Param('projectId')
		projectId: string
	) {
		return this.measurementsService.summary(projectId)
	}
	@Get(':id')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
	)
	findOne(
		@Param('id')
		id: string
	) {
		return this.measurementsService.findOne(id)
	}
	@Post()
	@Roles(
		RoleCode.ADMIN,
		RoleCode.DESIGNER,
		RoleCode.PROJECT_MANAGER,
	)
	create(
		@Body()
		dto: CreateMeasurementDto
	) {
		return this.measurementsService.create(dto)
	}
	@Patch(':id')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.DESIGNER,
		RoleCode.PROJECT_MANAGER,
	)
	update(
		@Param('id')
		id: string,
		@Body()
		dto: Partial<CreateMeasurementDto>
	) {
		return this.measurementsService.update(id, dto)
	}
	@Delete(':id')
	@Roles(RoleCode.ADMIN, RoleCode.DESIGNER)
	remove(
		@Param('id')
		id: string
	) {
		return this.measurementsService.remove(id)
	}
}
