import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreatePhotoReportDto } from './dto/create-photo-report.dto'
import { PhotoReportsService } from './photo-reports.service'

@ApiTags('photo-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('photo-reports')
export class PhotoReportsController {
  constructor(private readonly photoReportsService: PhotoReportsService) {}

  @Post()
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
  )
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreatePhotoReportDto) {
    return this.photoReportsService.createForStaff(
      req.user.id,
      req.user.role,
      dto,
    )
  }
}

@ApiTags('photo-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectPhotoReportsController {
  constructor(private readonly photoReportsService: PhotoReportsService) {}

  @Get(':projectId/photo-reports')
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
  )
  listForProject(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('category') category?: string,
  ) {
    return this.photoReportsService.listForStaffProject(
      projectId,
      req.user.role,
      page ? Number(page) : undefined,
      perPage ? Number(perPage) : undefined,
      category as 'SITE' | 'DESIGN' | undefined,
    )
  }
}
