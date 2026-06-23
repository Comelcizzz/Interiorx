import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'
import { SuppliersService } from './suppliers.service'
@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
	constructor(private readonly svc: SuppliersService) {}
	@Get()
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
	)
	list() {
		return this.svc.list()
	}
	@Get(':id')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
	)
	detail(
		@Param('id')
		id: string
	) {
		return this.svc.detail(id)
	}
	@Post()
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	create(
		@Body()
		dto: CreateSupplierDto
	) {
		return this.svc.create(dto)
	}
	@Patch(':id')
	@Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER)
	update(
		@Param('id')
		id: string,
		@Body()
		dto: UpdateSupplierDto
	) {
		return this.svc.update(id, dto)
	}
	@Delete(':id')
	@Roles(RoleCode.ADMIN)
	remove(
		@Param('id')
		id: string
	) {
		return this.svc.remove(id)
	}
}
