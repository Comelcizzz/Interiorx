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
import { CreateChangeRequestDto } from './dto/create-change-request.dto'
import { CreateTaskDto } from './dto/create-task.dto'
import { DecideApprovalDto } from './dto/decide-approval.dto'
import { UpdateQualityDto } from './dto/update-quality.dto'
import { UpdateTaskStatusDto } from './dto/update-task-status.dto'
import { OperationsService } from './operations.service'

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get('board')
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
  )
  board(@Req() req: AuthenticatedRequest) {
    return this.operationsService.board(req.user)
  }

  @Post('tasks')
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
  )
  createTask(@Body() dto: CreateTaskDto, @Req() req: AuthenticatedRequest) {
    return this.operationsService.createTask(dto, req.user)
  }

  @Patch('tasks/:id/status')
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
  )
  updateTaskStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.operationsService.updateTaskStatus(id, dto, req.user)
  }

  @Get('approvals')
  @Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
  approvals(@Req() req: AuthenticatedRequest) {
    return this.operationsService.approvals(req.user)
  }

  @Patch('approvals/:id/decision')
  @Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
  decideApproval(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.operationsService.decideApproval(id, dto, req.user)
  }

  @Get('change-requests')
  @Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
  changeRequests(@Req() req: AuthenticatedRequest) {
    return this.operationsService.changeRequests(req.user)
  }

  @Post('change-requests')
  @Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.CLIENT)
  createChangeRequest(
    @Body() dto: CreateChangeRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.operationsService.createChangeRequest(dto, req.user)
  }

  @Get('quality')
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
  )
  quality() {
    return this.operationsService.quality()
  }

  @Patch('quality/:id')
  @Roles(RoleCode.ADMIN, RoleCode.PROJECT_MANAGER, RoleCode.BRIGADIR)
  updateQuality(
    @Param('id') id: string,
    @Body() dto: UpdateQualityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.operationsService.updateQuality(id, dto, req.user)
  }

  @Get('calendar')
  @Roles(
    RoleCode.ADMIN,
    RoleCode.PROJECT_MANAGER,
    RoleCode.DESIGNER,
    RoleCode.BRIGADIR,
    RoleCode.CLIENT,
  )
  calendar(
    @Req() req: AuthenticatedRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const f = from ?? new Date().toISOString().slice(0, 10)
    const t =
      to ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    return this.operationsService.calendar(f, t, req.user)
  }
}
