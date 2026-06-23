# Platform Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove 5 legacy roles, add Brigadir, complete business logic and UI flows for every role, activate Kanban, add file uploads, and implement design files section.

**Architecture:** Full-stack monorepo — NestJS backend + React frontend. All permission changes start in `apps/backend/src/domain/enums.ts` and propagate to controllers, then to `packages/shared/src/workspace-roles.ts`, then to frontend navigation/guards.

**Tech Stack:** NestJS 11 + MongoDB/Mongoose, React 18 + TypeScript + Vite + Tailwind CSS, Zustand, `@tailored/ui` component library, multer for file uploads.

**How to start the project:**
```bat
# From project root:
start.bat
# Or separately:
cd apps/backend && npm run start:dev
cd apps/frontend && npm run dev
```

---

## File Map

| File | Action | Task |
|---|---|---|
| `apps/backend/src/domain/enums.ts` | Modify | 1 |
| `packages/shared/src/workspace-roles.ts` | Modify | 1 |
| `packages/shared/src/index.ts` | Modify | 1 |
| `apps/backend/src/operations/operations.controller.ts` | Modify | 2 |
| `apps/backend/src/photo-reports/photo-reports.controller.ts` | Modify | 2 |
| `apps/backend/src/photo-reports/photo-reports.service.ts` | Modify | 2 |
| `apps/backend/src/mongo/schemas/project.schema.ts` | Modify | 3 |
| `apps/backend/src/projects/dto/update-project-team.dto.ts` | Modify | 3 |
| `apps/backend/src/projects/projects.service.ts` | Modify | 3, 4 |
| `apps/backend/src/projects/projects.controller.ts` | Modify | 3 |
| `apps/backend/src/operations/dto/create-task.dto.ts` | Create | 5 |
| `apps/backend/src/operations/operations.service.ts` | Modify | 5 |
| `apps/backend/src/mongo/schemas/photo-report.schema.ts` | Modify | 6 |
| `apps/backend/src/photo-reports/dto/create-photo-report.dto.ts` | Modify | 6 |
| `apps/frontend/src/pages/WorkspaceReviewsModerationPage.tsx` | Modify | 7 |
| `apps/frontend/src/app/Shell.tsx` | Modify | 8 |
| `apps/frontend/src/app/App.tsx` | Modify | 8 |
| `apps/frontend/src/pages/KanbanPage.tsx` | Modify | 9 |
| `apps/frontend/src/components/ProjectStatusActions.tsx` | Modify | 10 |
| `apps/frontend/src/pages/ProjectDetailPage.tsx` | Modify | 10, 16 |
| `apps/frontend/src/components/ProjectPhotoReportsSection.tsx` | Modify | 11 |
| `apps/frontend/src/components/ProjectDesignFilesSection.tsx` | Create | 12 |
| `apps/frontend/src/pages/DesignerWorkbenchPage.tsx` | Modify | 13 |
| `apps/frontend/src/pages/BrigadirWorkbenchPage.tsx` | Create | 14 |
| `apps/frontend/src/components/ProjectTeamAssignment.tsx` | Modify | 15 |
| `apps/frontend/src/pages/PortalProjectDetailPage.tsx` | Modify | 17 |

---

## Task 1 — Remove 5 legacy roles, add BRIGADIR (shared foundation)

**Files:**
- Modify: `apps/backend/src/domain/enums.ts`
- Modify: `packages/shared/src/workspace-roles.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1.1 — Update backend enum**

Replace the `RoleCode` enum in `apps/backend/src/domain/enums.ts`:

```typescript
export enum RoleCode {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  DESIGNER = 'DESIGNER',
  BRIGADIR = 'BRIGADIR',
  CLIENT = 'CLIENT',
}
```

Remove: `ESTIMATOR`, `WORKER_LEAD`, `WORKER`, `ACCOUNTANT`, `SUPPLIER`.
Keep all other enums (OrderStatus, ProjectStatus, etc.) unchanged.

- [ ] **Step 1.2 — Update shared workspace-roles.ts**

Replace the entire contents of `packages/shared/src/workspace-roles.ts`:

```typescript
/** Активні ролі workspace (основний бізнес-флоу). */
export const WORKSPACE_CORE_ROLES = [
  'ADMIN',
  'PROJECT_MANAGER',
  'DESIGNER',
  'BRIGADIR',
] as const

export type WorkspaceCoreRole = (typeof WORKSPACE_CORE_ROLES)[number]

export type WorkspaceRoleCode = WorkspaceCoreRole | 'CLIENT'

/** Повертає актуальну core-роль або undefined для невідомих кодів. */
export function normalizeWorkspaceRole(
  role: WorkspaceRoleCode | string | undefined
): WorkspaceCoreRole | 'CLIENT' | undefined {
  if (!role) return undefined
  if (role === 'CLIENT') return 'CLIENT'
  if (
    role === 'ADMIN' ||
    role === 'PROJECT_MANAGER' ||
    role === 'DESIGNER' ||
    role === 'BRIGADIR'
  ) {
    return role as WorkspaceCoreRole
  }
  return undefined
}

export function isWorkspaceCoreRole(
  code: string
): code is WorkspaceCoreRole {
  return (WORKSPACE_CORE_ROLES as readonly string[]).includes(code)
}
```

- [ ] **Step 1.3 — Update shared index.ts role labels**

In `packages/shared/src/index.ts`, replace `roleLabels` and `legacyRoleLabels`:

```typescript
export const roleLabels = {
  ADMIN: 'Адміністратор',
  PROJECT_MANAGER: 'Менеджер проєкту',
  DESIGNER: 'Дизайнер',
  BRIGADIR: 'Бригадир',
  CLIENT: 'Клієнт',
} as const
```

Delete the entire `legacyRoleLabels` constant and update `roleLabel()`:

```typescript
export function roleLabel(role: string): string {
  return roleLabels[role as keyof typeof roleLabels] ?? role
}
```

- [ ] **Step 1.4 — Verify TypeScript compiles**

```bash
cd packages/shared && npx tsc --noEmit
cd apps/backend && npx tsc --noEmit
```

Expected: no errors. If errors appear, they will list every file using removed role codes — fix those in subsequent tasks.

- [ ] **Step 1.5 — Commit**

```bash
git add packages/shared/src/workspace-roles.ts packages/shared/src/index.ts apps/backend/src/domain/enums.ts
git commit -m "feat: remove legacy roles, add BRIGADIR to enum and shared package"
```

---

## Task 2 — Clean up backend controllers

**Files:**
- Modify: `apps/backend/src/operations/operations.controller.ts`
- Modify: `apps/backend/src/photo-reports/photo-reports.controller.ts`
- Modify: `apps/backend/src/photo-reports/photo-reports.service.ts`

- [ ] **Step 2.1 — Fix operations.controller.ts**

Replace the entire file `apps/backend/src/operations/operations.controller.ts`:

```typescript
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
```

> Note: `board()` now receives `req.user` — the service method signature changes in Task 5.

- [ ] **Step 2.2 — Fix photo-reports.controller.ts**

Replace entire `apps/backend/src/photo-reports/photo-reports.controller.ts`:

```typescript
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
```

- [ ] **Step 2.3 — Fix photo-reports.service.ts STAFF_PHOTO_VIEW_ROLES**

In `apps/backend/src/photo-reports/photo-reports.service.ts`, replace the constant at the top:

```typescript
const STAFF_PHOTO_VIEW_ROLES: RoleCode[] = [
  RoleCode.ADMIN,
  RoleCode.PROJECT_MANAGER,
  RoleCode.DESIGNER,
  RoleCode.BRIGADIR,
]
```

Also update `allowedCreate` inside `createForStaff()`:

```typescript
const allowedCreate: RoleCode[] = [
  RoleCode.ADMIN,
  RoleCode.PROJECT_MANAGER,
  RoleCode.DESIGNER,
  RoleCode.BRIGADIR,
]
```

- [ ] **Step 2.4 — Scan other controllers for legacy role references**

Run this search to find any remaining references:
```bash
grep -rn "WORKER_LEAD\|WORKER\|ESTIMATOR\|ACCOUNTANT\|SUPPLIER" apps/backend/src --include="*.ts"
```

For each file found: remove the legacy role from the `@Roles()` decorator. If a role array becomes empty, decide the appropriate replacement roles (ADMIN + PROJECT_MANAGER is a safe default for admin-only endpoints).

- [ ] **Step 2.5 — Verify backend compiles**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2.6 — Commit**

```bash
git add apps/backend/src/operations/operations.controller.ts apps/backend/src/photo-reports/
git commit -m "feat: replace legacy role codes with BRIGADIR in backend controllers"
```

---

## Task 3 — Add brigadirId to Project schema + team assignment

**Files:**
- Modify: `apps/backend/src/mongo/schemas/project.schema.ts`
- Modify: `apps/backend/src/projects/dto/update-project-team.dto.ts`
- Modify: `apps/backend/src/projects/projects.service.ts`
- Modify: `apps/backend/src/projects/projects.controller.ts`

- [ ] **Step 3.1 — Add brigadirId to project schema**

In `apps/backend/src/mongo/schemas/project.schema.ts`, add after `designerId`:

```typescript
@Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
brigadirId?: Types.ObjectId
```

Full file after change:
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type ProjectDocument = HydratedDocument<Project>
@Schema({ collection: 'projects', timestamps: true })
export class Project {
  @Prop({ required: true, unique: true })
  code: string
  @Prop({ required: true })
  title: string
  @Prop({ required: true })
  description: string
  @Prop({ required: true })
  status: string
  @Prop({ type: Types.ObjectId, ref: 'ClientProfile', required: true })
  clientId: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
  managerId?: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
  designerId?: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'StaffProfile' })
  brigadirId?: Types.ObjectId
  @Prop({ required: true })
  budgetPlanned: string
  @Prop()
  budgetApproved?: string
  @Prop()
  startDate?: Date
  @Prop()
  dueDate?: Date
}
export const ProjectSchema = SchemaFactory.createForClass(Project)
```

- [ ] **Step 3.2 — Update UpdateProjectTeamDto**

Replace `apps/backend/src/projects/dto/update-project-team.dto.ts`:

```typescript
import { IsOptional, IsString } from 'class-validator'
export class UpdateProjectTeamDto {
  @IsOptional()
  @IsString()
  managerStaffId?: string | null

  @IsOptional()
  @IsString()
  designerStaffId?: string | null

  @IsOptional()
  @IsString()
  brigadirStaffId?: string | null
}
```

- [ ] **Step 3.3 — Update projects.service.ts updateTeam()**

In `apps/backend/src/projects/projects.service.ts`, inside `updateTeam()`, add brigadir assignment after the existing `assign` calls:

```typescript
await assign('brigadirId', dto.brigadirStaffId)
```

The `assign` helper already handles `undefined` (skip), `null`/`''` (clear), and valid ID (set). No other changes needed in that method.

Also add `listForBrigadir()` method before `transitionStatus()`:

```typescript
async listForBrigadir(userId: string) {
  const staff = await this.staffModel
    .findOne({ userId: new Types.ObjectId(userId) })
    .lean()
    .exec()
  if (!staff) return { items: [], total: 0, page: 1, perPage: 50 }
  const projects = await this.projectModel
    .find({ brigadirId: staff._id })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean()
    .exec()
  const items = await Promise.all(
    projects.map(async (project) => {
      const location = await this.locationModel
        .findOne({ projectId: project._id })
        .lean()
        .exec()
      const taskCount = await this.taskModel.countDocuments({
        projectId: project._id,
      })
      return {
        id: project._id.toString(),
        code: project.code,
        title: project.title,
        status: project.status,
        city: location?.city,
        budgetPlanned: project.budgetPlanned,
        dueDate: project.dueDate,
        openTasks: taskCount,
      }
    })
  )
  return { items, total: items.length, page: 1, perPage: 50 }
}
```

Also update `detail()` response to include brigadir: find where `manager` and `designer` are resolved and add `brigadir` in the same parallel fetch:

```typescript
// In the Promise.all at the top of detail(), add:
project.brigadirId
  ? this.staffModel.findById(project.brigadirId).lean().exec()
  : Promise.resolve(null),
```

Then resolve brigadirUser and include in return:

```typescript
const brigadirUser = brigadir
  ? await this.userModel
      .findById(brigadir.userId)
      .select('fullName email')
      .lean()
      .exec()
  : null

// In the return object:
brigadir: brigadir
  ? {
      id: (brigadir._id as Types.ObjectId).toString(),
      user: {
        fullName: brigadirUser?.fullName,
        email: brigadirUser?.email,
      },
    }
  : null,
```

- [ ] **Step 3.4 — Update projects.controller.ts to allow BRIGADIR read access**

Find the `GET /projects` and `GET /projects/:id` endpoints. Add `RoleCode.BRIGADIR` to their `@Roles()` decorators.

Search for these endpoints:
```bash
grep -n "@Get\(\)" apps/backend/src/projects/projects.controller.ts
```

Add `RoleCode.BRIGADIR` to the `@Roles` on `list()` and `detail()` (or the equivalent methods).

Also add a new endpoint for brigadir's own projects:

```typescript
@Get('mine/brigadir')
@Roles(RoleCode.BRIGADIR)
listMineBrigadir(@Req() req: AuthenticatedRequest) {
  return this.projectsService.listForBrigadir(req.user.sub)
}
```

- [ ] **Step 3.5 — Verify and commit**

```bash
cd apps/backend && npx tsc --noEmit
git add apps/backend/src/mongo/schemas/project.schema.ts apps/backend/src/projects/
git commit -m "feat: add brigadirId to project schema, team assignment, and brigadir project list"
```

---

## Task 4 — Payment gate (backend)

**Files:**
- Modify: `apps/backend/src/projects/projects.service.ts`

- [ ] **Step 4.1 — Add payment check to transitionStatus()**

In `apps/backend/src/projects/projects.service.ts`, inside `transitionStatus()`, add this block **before** `project.status = nextStatus`:

```typescript
// Payment gate: all transitions from DESIGN and later require a fully paid approved estimate
const GATED_FROM: ProjectStatus[] = [
  ProjectStatus.DESIGN,
  ProjectStatus.APPROVED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.COMPLETED,
]
if (GATED_FROM.includes(project.status as ProjectStatus)) {
  const approvedEstimate = await this.estimateModel
    .findOne({ projectId: project._id, status: EstimateStatus.APPROVED })
    .sort({ version: -1 })
    .select('total')
    .lean()
    .exec()
  if (!approvedEstimate) {
    throw new BadRequestException(
      'Потрібен погоджений кошторис перед переходом до наступного етапу'
    )
  }
  const paidResult = await this.paymentModel
    .aggregate([
      {
        $match: {
          projectId: project._id,
          status: 'PAID',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
    ])
    .exec()
  const paidSum: number = paidResult[0]?.total ?? 0
  const estimateTotal = parseFloat(String(approvedEstimate.total))
  if (paidSum < estimateTotal) {
    throw new BadRequestException(
      `Кошторис не сплачено повністю. Сплачено: ${paidSum} грн з ${estimateTotal} грн`
    )
  }
}
```

`this.paymentModel` and `this.estimateModel` already exist in the constructor.

- [ ] **Step 4.2 — Verify and commit**

```bash
cd apps/backend && npx tsc --noEmit
git add apps/backend/src/projects/projects.service.ts
git commit -m "feat: add payment gate to project stage transitions (DESIGN+)"
```

---

## Task 5 — Task creation API

**Files:**
- Create: `apps/backend/src/operations/dto/create-task.dto.ts`
- Modify: `apps/backend/src/operations/operations.service.ts`

- [ ] **Step 5.1 — Create CreateTaskDto**

Create `apps/backend/src/operations/dto/create-task.dto.ts`:

```typescript
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: number

  @IsDateString()
  @IsOptional()
  dueDate?: string

  @IsString()
  @IsOptional()
  assigneeId?: string
}
```

- [ ] **Step 5.2 — Add createTask() to OperationsService**

In `apps/backend/src/operations/operations.service.ts`, add these imports if not present:

```typescript
import { CreateTaskDto } from './dto/create-task.dto'
```

Add `createTask()` method. Find a good place to insert it (before or after `updateTaskStatus`):

```typescript
async createTask(dto: CreateTaskDto, user: AuthenticatedUser) {
  const projectOid = toObjectId(dto.projectId, 'Invalid projectId')
  const project = await this.projectModel
    .findById(projectOid)
    .select('_id')
    .lean()
    .exec()
  if (!project) throw new NotFoundException('Project not found')

  let assigneeOid: Types.ObjectId | undefined
  if (dto.assigneeId) {
    assigneeOid = toObjectId(dto.assigneeId, 'Invalid assigneeId')
    const staff = await this.staffModel.findById(assigneeOid).lean().exec()
    if (!staff) throw new NotFoundException('Staff profile not found')
  }

  const task = await this.taskModel.create({
    projectId: projectOid,
    assigneeId: assigneeOid,
    title: dto.title.trim(),
    description: dto.description?.trim(),
    status: TaskStatus.BACKLOG,
    priority: dto.priority ?? 3,
    dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
  })

  await this.auditModel.create({
    projectId: projectOid,
    action: 'task.created',
    entityType: 'Task',
    entityId: task._id.toString(),
    userId: new Types.ObjectId(user.sub),
    metadata: { title: dto.title },
  })

  const assignee = assigneeOid
    ? await this.staffModel.findById(assigneeOid).lean().exec()
    : null
  const assigneeUser = assignee
    ? await this.userModel
        .findById(assignee.userId)
        .select('fullName')
        .lean()
        .exec()
    : null

  const proj = await this.projectModel
    .findById(projectOid)
    .select('code title')
    .lean()
    .exec()

  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    project: { code: proj?.code ?? '', title: proj?.title ?? '' },
    assigneeName: assigneeUser?.fullName ?? null,
  }
}
```

Also update the `board()` method signature to accept `user` and filter for BRIGADIR:

Find the existing `board()` method. Change its signature to:

```typescript
async board(user: AuthenticatedUser) {
```

Then inside, after fetching all tasks, add:

```typescript
// Brigadir sees only tasks from their assigned projects
if (user.role === 'BRIGADIR') {
  const staff = await this.staffModel
    .findOne({ userId: new Types.ObjectId(user.sub) })
    .select('_id')
    .lean()
    .exec()
  if (staff) {
    const brigadirProjects = await this.projectModel
      .find({ brigadirId: staff._id })
      .select('_id')
      .lean()
      .exec()
    const projectIds = brigadirProjects.map((p) => p._id.toString())
    // Filter tasks to only those in brigadir's projects
    allTasks = allTasks.filter((t) =>
      projectIds.includes(t.projectId?.toString() ?? '')
    )
  }
}
```

> Note: The exact variable name for the tasks array depends on the existing `board()` implementation. Read the method and adapt accordingly — find where tasks are collected and apply the filter after that point.

- [ ] **Step 5.3 — Verify and commit**

```bash
cd apps/backend && npx tsc --noEmit
git add apps/backend/src/operations/
git commit -m "feat: add POST /operations/tasks endpoint and brigadir board filter"
```

---

## Task 6 — Photo report category (SITE / DESIGN)

**Files:**
- Modify: `apps/backend/src/mongo/schemas/photo-report.schema.ts`
- Modify: `apps/backend/src/photo-reports/dto/create-photo-report.dto.ts`
- Modify: `apps/backend/src/photo-reports/photo-reports.service.ts`

- [ ] **Step 6.1 — Add category to schema**

Replace `apps/backend/src/mongo/schemas/photo-report.schema.ts`:

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Types } from 'mongoose'
export type PhotoReportDocument = HydratedDocument<PhotoReport>
@Schema({ collection: 'photo_reports', timestamps: true })
export class PhotoReport {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'Task' })
  taskId?: Types.ObjectId
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  uploadedBy!: Types.ObjectId
  @Prop({ type: [{ type: Types.ObjectId, ref: 'UploadedFileEntity' }], default: [] })
  fileIds!: Types.ObjectId[]
  @Prop({ type: [String], default: [] })
  photoUrls!: string[]
  @Prop({ default: '', trim: true })
  caption!: string
  @Prop({ default: 'SITE', enum: ['SITE', 'DESIGN'] })
  category!: 'SITE' | 'DESIGN'
}
export const PhotoReportSchema = SchemaFactory.createForClass(PhotoReport)
PhotoReportSchema.index({ projectId: 1, createdAt: -1 })
PhotoReportSchema.index({ projectId: 1, category: 1, createdAt: -1 })
```

- [ ] **Step 6.2 — Add category to CreatePhotoReportDto**

In `apps/backend/src/photo-reports/dto/create-photo-report.dto.ts`, add after `caption`:

```typescript
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
export class CreatePhotoReportDto {
  @IsString()
  projectId!: string
  @IsOptional()
  @IsString()
  taskId?: string
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  fileIds?: string[]
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photoUrls?: string[]
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  caption?: string
  @IsOptional()
  @IsIn(['SITE', 'DESIGN'])
  category?: 'SITE' | 'DESIGN'
}
```

- [ ] **Step 6.3 — Update listForStaffProject() to filter by category**

In `apps/backend/src/photo-reports/photo-reports.service.ts`, change the `listForStaffProject` signature:

```typescript
async listForStaffProject(
  projectId: string,
  role: RoleCode,
  page = 1,
  perPage = 24,
  category?: 'SITE' | 'DESIGN',
) {
```

Then change the filter:

```typescript
const filter: Record<string, unknown> = { projectId: pid }
if (category) filter.category = category
```

Also update `createForStaff()` to save category:

```typescript
const row = await this.reportModel.create({
  projectId: projectOid,
  taskId: taskOid,
  uploadedBy: new Types.ObjectId(userId),
  fileIds: fileOids,
  photoUrls,
  caption: dto.caption?.trim() ?? '',
  category: dto.category ?? 'SITE',
})
```

Also update `mapRow()` to return category:

```typescript
return {
  id: row._id.toString(),
  projectId: row.projectId.toString(),
  taskId: row.taskId?.toString() ?? null,
  caption: row.caption,
  category: (row.category as string) ?? 'SITE',
  photoUrls: urls,
  missingCount,
  createdAt: (row as { createdAt?: Date }).createdAt,
  updatedAt: (row as { updatedAt?: Date }).updatedAt,
}
```

- [ ] **Step 6.4 — Verify and commit**

```bash
cd apps/backend && npx tsc --noEmit
git add apps/backend/src/mongo/schemas/photo-report.schema.ts apps/backend/src/photo-reports/
git commit -m "feat: add category (SITE|DESIGN) to photo reports"
```

---

## Task 7 — UI translations

**Files:**
- Modify: `apps/frontend/src/pages/WorkspaceReviewsModerationPage.tsx`

- [ ] **Step 7.1 — Fix button labels and status badge**

In `apps/frontend/src/pages/WorkspaceReviewsModerationPage.tsx`:

1. Find line with `Publish` button text and change to `Опублікувати`:
```tsx
// Before:
>Publish</Button>
// After:
>Опублікувати</Button>
```

2. Find line with `Hide` button text and change to `Приховати`:
```tsx
// Before:
>Hide</Button>
// After:
>Приховати</Button>
```

3. Find where the status Badge shows `{r.status}` and replace with a label map:
```tsx
// Before:
<Badge tone={statusTone(r.status)}>
  {r.status}
</Badge>
// After:
<Badge tone={statusTone(r.status)}>
  {{ PENDING: 'На модерації', PUBLISHED: 'Опубліковано', HIDDEN: 'Приховано' }[r.status] ?? r.status}
</Badge>
```

- [ ] **Step 7.2 — Verify and commit**

Start the frontend and navigate to `/workspace/reviews`. Verify buttons show Ukrainian text.

```bash
git add apps/frontend/src/pages/WorkspaceReviewsModerationPage.tsx
git commit -m "fix: translate review moderation buttons and status badges to Ukrainian"
```

---

## Task 8 — Navigation and routing

**Files:**
- Modify: `apps/frontend/src/app/Shell.tsx`
- Modify: `apps/frontend/src/app/App.tsx`

- [ ] **Step 8.1 — Add Задачі nav item to Shell.tsx**

In `apps/frontend/src/app/Shell.tsx`, in the `navItems` array, add after the Проєкти item (around line 83):

```tsx
{
  to: '/workspace/kanban',
  label: 'Задачі',
  group: 'Проєкти',
  icon: <ClipboardList className={iconClass} />,
  roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR'],
},
```

Add `ClipboardList` to the lucide imports at the top of Shell.tsx.

- [ ] **Step 8.2 — Remove Заявки from DESIGNER nav**

In the Заявки nav item, change:
```tsx
// Before:
roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER'],
// After:
roles: ['ADMIN', 'PROJECT_MANAGER'],
```

- [ ] **Step 8.3 — Add BRIGADIR role tone in Shell.tsx**

In the `roleTone` object, add:
```tsx
const roleTone: Record<string, 'neutral' | 'green' | 'blue' | 'amber' | 'red'> = {
  ADMIN: 'red',
  PROJECT_MANAGER: 'blue',
  DESIGNER: 'green',
  BRIGADIR: 'amber',
  CLIENT: 'neutral',
}
```

- [ ] **Step 8.4 — Fix App.tsx routes**

In `apps/frontend/src/app/App.tsx`, make these changes:

**1. Fix kanban route** (replace the redirect):
```tsx
// Before:
<Route path="kanban" element={<Navigate to="/workspace/projects" replace />} />

// After:
<Route
  path="kanban"
  element={
    <RequireWorkspaceRoles
      roles={['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR']}
    >
      <KanbanPage />
    </RequireWorkspaceRoles>
  }
/>
```

Add `KanbanPage` to imports if not already there.

**2. Update my-work route** to include BRIGADIR and conditionally render:
```tsx
// Before:
<Route
  path="my-work"
  element={
    <RequireWorkspaceRoles roles={['DESIGNER', 'ADMIN', 'PROJECT_MANAGER']}>
      <DesignerWorkbenchPage />
    </RequireWorkspaceRoles>
  }
/>

// After:
<Route
  path="my-work"
  element={
    <RequireWorkspaceRoles
      roles={['DESIGNER', 'ADMIN', 'PROJECT_MANAGER', 'BRIGADIR']}
    >
      <WorkbenchRouter />
    </RequireWorkspaceRoles>
  }
/>
```

Add `WorkbenchRouter` component inline in App.tsx (or in a separate file):

```tsx
function WorkbenchRouter() {
  const role = useAuthStore((s) => s.user?.role)
  if (role === 'BRIGADIR') return <BrigadirWorkbenchPage />
  return <DesignerWorkbenchPage />
}
```

Import `useAuthStore` from `@/lib/auth-store` and `BrigadirWorkbenchPage` from `@/pages/BrigadirWorkbenchPage`.

**3. Add BRIGADIR to projects routes:**
```tsx
// projects list: add 'BRIGADIR' to roles
roles={['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR']}

// projects/:id: add 'BRIGADIR' to roles
roles={['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR']}
```

- [ ] **Step 8.5 — Verify and commit**

Start the frontend. Verify:
- "Задачі" appears in nav for ADMIN/PM/DESIGNER
- `/workspace/kanban` loads KanbanPage (not redirect)

```bash
git add apps/frontend/src/app/Shell.tsx apps/frontend/src/app/App.tsx
git commit -m "feat: add Zadachi nav, fix kanban route, add BRIGADIR to workspace routes"
```

---

## Task 9 — KanbanPage: task creation modal

**Files:**
- Modify: `apps/frontend/src/pages/KanbanPage.tsx`

- [ ] **Step 9.1 — Add state and project list fetch**

At the top of `KanbanPage()` function body, after existing state declarations, add:

```tsx
const [showCreate, setShowCreate] = useState(false)
const [createForm, setCreateForm] = useState({
  projectId: '',
  title: '',
  description: '',
  priority: '3',
  dueDate: '',
})
const [createMsg, setCreateMsg] = useState('')
const [createBusy, setCreateBusy] = useState(false)

const projects = useLoad(
  () => getApi<{ items: Array<{ id: string; code: string; title: string }> }>('/projects?perPage=100'),
  []
)
```

Add `Modal, Input, ModalFooter` to the `@tailored/ui` import if not already present.

- [ ] **Step 9.2 — Add createTask function**

Inside `KanbanPage()`, add:

```tsx
async function createTask(e: React.FormEvent) {
  e.preventDefault()
  if (!createForm.title.trim() || !createForm.projectId) {
    setCreateMsg('Заповніть назву і проєкт')
    return
  }
  setCreateBusy(true)
  setCreateMsg('')
  try {
    await postApi('/operations/tasks', {
      projectId: createForm.projectId,
      title: createForm.title.trim(),
      description: createForm.description.trim() || undefined,
      priority: Number(createForm.priority),
      dueDate: createForm.dueDate || undefined,
    })
    setShowCreate(false)
    setCreateForm({ projectId: '', title: '', description: '', priority: '3', dueDate: '' })
    reload()
  } catch (err: unknown) {
    const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    setCreateMsg(m ?? 'Не вдалося створити задачу')
  } finally {
    setCreateBusy(false)
  }
}
```

Add `postApi` to the import from `@/lib/api`.

- [ ] **Step 9.3 — Add button and modal to JSX**

In the `PageHeader` component, add `actions` prop:

```tsx
<PageHeader
  title="Канбан задач"
  description={`${data.total} задач по всіх проєктах`}
  actions={
    <div className="flex items-center gap-2">
      <Button type="button" onClick={() => setShowCreate(true)}>
        + Нова задача
      </Button>
      <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3 py-1.5 text-xs text-[var(--tds-muted)]">
        <ClipboardList className="h-3.5 w-3.5" />
        Кнопки переміщують задачі між колонками
      </div>
    </div>
  }
/>
```

After the `PageHeader`, add the modal:

```tsx
{showCreate && (
  <Modal
    title="Нова задача"
    onClose={() => setShowCreate(false)}
  >
    <form onSubmit={(e) => void createTask(e)} className="space-y-3 p-4">
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
          Проєкт *
        </label>
        <select
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
          value={createForm.projectId}
          onChange={(e) => setCreateForm((f) => ({ ...f, projectId: e.target.value }))}
          required
        >
          <option value="">Оберіть проєкт…</option>
          {(projects.data?.items ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
          Назва задачі *
        </label>
        <Input
          value={createForm.title}
          onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Наприклад: Встановити підвісну стелю"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
          Опис
        </label>
        <textarea
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-20"
          value={createForm.description}
          onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Деталі задачі…"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Пріоритет
          </label>
          <select
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            value={createForm.priority}
            onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="1">Критично</option>
            <option value="2">Високий</option>
            <option value="3">Середній</option>
            <option value="4">Низький</option>
            <option value="5">Без пріоритету</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Дедлайн
          </label>
          <Input
            type="date"
            value={createForm.dueDate}
            onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))}
          />
        </div>
      </div>
      {createMsg && <p className="text-sm text-rose-600">{createMsg}</p>}
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
          Скасувати
        </Button>
        <Button type="submit" disabled={createBusy}>
          {createBusy ? 'Створюємо…' : 'Створити задачу'}
        </Button>
      </ModalFooter>
    </form>
  </Modal>
)}
```

- [ ] **Step 9.4 — Verify and commit**

Start the app. Navigate to `/workspace/kanban`. Click "Нова задача". Fill in the form and submit. The task should appear in the BACKLOG column.

```bash
git add apps/frontend/src/pages/KanbanPage.tsx
git commit -m "feat: add task creation modal to KanbanPage"
```

---

## Task 10 — Payment gate UI warning

**Files:**
- Modify: `apps/frontend/src/components/ProjectStatusActions.tsx`
- Modify: `apps/frontend/src/pages/ProjectDetailPage.tsx`

- [ ] **Step 10.1 — Add payment gate check to ProjectStatusActions**

Replace `apps/frontend/src/components/ProjectStatusActions.tsx`:

```tsx
import { Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { projectStatusLabels, projectStatusNext } from '@tailored/shared'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { patchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

const primaryNext: Partial<Record<string, string>> = {
  DRAFT: 'ESTIMATION',
  ESTIMATION: 'DESIGN',
  DESIGN: 'APPROVED',
  APPROVED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: 'WARRANTY',
}

const GATED_STATUSES = new Set(['DESIGN', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'])

export function ProjectStatusActions({
  projectId,
  status,
  approvedEstimateTotal,
  paidSum,
  onChanged,
}: {
  projectId: string
  status: string
  approvedEstimateTotal: number | null
  paidSum: number
  onChanged: () => void
}) {
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = role === 'ADMIN' || role === 'PROJECT_MANAGER'
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  if (!canEdit) return null

  const nextStatuses = projectStatusNext[status] ?? []
  const main = primaryNext[status]
  const others = nextStatuses.filter((s) => s !== main)

  const isGated = GATED_STATUSES.has(status)
  const hasApprovedEstimate = approvedEstimateTotal !== null
  const isFullyPaid =
    approvedEstimateTotal !== null && paidSum >= approvedEstimateTotal
  const blocked = isGated && (!hasApprovedEstimate || !isFullyPaid)

  async function transition(next: string) {
    setBusy(next)
    setMsg('')
    try {
      await patchApi(`/projects/${projectId}/status`, { status: next })
      setMsg(
        `Статус: ${projectStatusLabels[next as keyof typeof projectStatusLabels] ?? next}`,
      )
      onChanged()
    } catch (e: unknown) {
      const m = (
        e as { response?: { data?: { message?: string } } }
      )?.response?.data?.message
      setMsg(m ?? 'Не вдалося змінити статус')
    } finally {
      setBusy(null)
    }
  }

  if (nextStatuses.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="font-medium text-slate-950">Етап проєкту</div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        {blocked && (
          <div className="flex w-full items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {!hasApprovedEstimate
                ? 'Потрібен погоджений кошторис для переходу до наступного етапу.'
                : `Кошторис не сплачено повністю. Сплачено: ${paidSum} грн з ${approvedEstimateTotal} грн.`}
            </span>
          </div>
        )}
        {main ? (
          <Button
            type="button"
            disabled={busy !== null || blocked}
            onClick={() => void transition(main)}
          >
            {busy === main
              ? 'Зберігаємо…'
              : `→ ${projectStatusLabels[main as keyof typeof projectStatusLabels] ?? main}`}
          </Button>
        ) : null}
        {others.map((s) => (
          <Button
            key={s}
            type="button"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => void transition(s)}
          >
            {busy === s
              ? '…'
              : (projectStatusLabels[s as keyof typeof projectStatusLabels] ?? s)}
          </Button>
        ))}
        {msg ? <p className="w-full text-sm text-slate-600">{msg}</p> : null}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 10.2 — Pass payment data from ProjectDetailPage**

In `apps/frontend/src/pages/ProjectDetailPage.tsx`, compute `approvedEstimateTotal` and `paidSum` from existing data and pass them to `ProjectStatusActions`:

```tsx
// After const latestEstimate = data.estimates[0] line, add:
const approvedEstimate = data.estimates.find((e) => e.status === 'APPROVED') ?? null
const approvedEstimateTotal = approvedEstimate ? parseFloat(String(approvedEstimate.total)) : null
const paidSum = data.payments
  .filter((p) => p.status === 'PAID')
  .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0)
```

Then update the `ProjectStatusActions` usage:

```tsx
<ProjectStatusActions
  projectId={data.id}
  status={data.status}
  approvedEstimateTotal={approvedEstimateTotal}
  paidSum={paidSum}
  onChanged={() => reload()}
/>
```

- [ ] **Step 10.3 — Verify and commit**

In a project at DESIGN stage without a paid estimate, verify the transition button shows a warning. After marking a payment as PAID via the Payments page, verify the button becomes active.

```bash
git add apps/frontend/src/components/ProjectStatusActions.tsx apps/frontend/src/pages/ProjectDetailPage.tsx
git commit -m "feat: show payment gate warning in project status actions"
```

---

## Task 11 — File upload in ProjectPhotoReportsSection

**Files:**
- Modify: `apps/frontend/src/components/ProjectPhotoReportsSection.tsx`

- [ ] **Step 11.1 — Replace the component with file+URL support**

Replace the entire `apps/frontend/src/components/ProjectPhotoReportsSection.tsx`:

```tsx
import { Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { Camera } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { getApi, mediaUrl, postApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'

type PhotoReportRow = {
  id: string
  caption: string
  photoUrls: string[]
  category: string
  missingCount?: number
  createdAt?: string
}
type ListResp = { items: PhotoReportRow[] }

async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
    body: form,
  })
  if (!res.ok) throw new Error('Upload failed')
  const data = (await res.json()) as { url: string }
  return data.url
}

function parsePhotoUrls(text: string) {
  return text
    .split(/[\n,]+/)
    .map((u) => u.trim())
    .filter(Boolean)
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 12)
}

export function ProjectPhotoReportsSection({
  projectId,
  category = 'SITE',
  title = 'Фото з обʼєкта',
}: {
  projectId: string
  category?: 'SITE' | 'DESIGN'
  title?: string
}) {
  const role = useAuthStore((s) => s.user?.role)
  const canCreate =
    role != null && ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR'].includes(role)

  const list = useLoad(
    () =>
      getApi<ListResp>(
        `/projects/${projectId}/photo-reports?page=1&perPage=24&category=${category}`,
      ),
    [projectId, category],
  )

  const [mode, setMode] = useState<'url' | 'file'>('url')
  const [caption, setCaption] = useState('')
  const [photoUrlsText, setPhotoUrlsText] = useState('')
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingFiles(true)
    setMsg('')
    try {
      const urls = await Promise.all(files.map(uploadFile))
      setFileUrls((prev) => [...prev, ...urls])
    } catch {
      setMsg('Помилка завантаження файлу. Перевірте формат (зображення до 2MB).')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function saveReport(e: FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    const photoUrls =
      mode === 'url'
        ? parsePhotoUrls(photoUrlsText)
        : fileUrls
    if (!photoUrls.length) {
      setMsg(mode === 'url' ? 'Додайте хоча б одне посилання на фото.' : 'Завантажте хоча б одне фото.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      await postApi('/photo-reports', {
        projectId,
        photoUrls,
        caption: caption.trim() || undefined,
        category,
      })
      setCaption('')
      setPhotoUrlsText('')
      setFileUrls([])
      setMsg('Фотозвіт збережено.')
      list.reload()
    } catch {
      setMsg('Не вдалося зберегти фотозвіт.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 font-medium text-slate-950">
          <Camera className="h-4 w-4" />
          {title}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canCreate ? (
          <form
            onSubmit={(e) => void saveReport(e)}
            className="rounded-lg border border-dashed border-slate-200 p-4"
          >
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${mode === 'url' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Посилання
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${mode === 'file' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Завантажити файл
              </button>
            </div>

            {mode === 'url' ? (
              <textarea
                className="mt-2 min-h-24 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://..."
                value={photoUrlsText}
                onChange={(e) => setPhotoUrlsText(e.target.value)}
              />
            ) : (
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void handleFiles(e)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                  className="w-full rounded border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
                >
                  {uploadingFiles ? 'Завантажуємо…' : 'Натисніть щоб обрати фото (JPG, PNG, WebP — до 2MB)'}
                </button>
                {fileUrls.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {fileUrls.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={mediaUrl(url)} alt="" className="h-16 w-full rounded object-cover" />
                        <button
                          type="button"
                          onClick={() => setFileUrls((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 rounded-full bg-white/80 px-1 text-[10px] font-bold text-slate-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <input
              className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder="Підпис до фотозвіту"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving || uploadingFiles}>
                {saving ? 'Зберігаємо...' : 'Додати фотозвіт'}
              </Button>
              {msg ? <p className="text-xs text-slate-600">{msg}</p> : null}
            </div>
          </form>
        ) : null}

        {list.error ? <p className="text-sm text-rose-600">{list.error}</p> : null}
        {list.loading ? <p className="text-sm text-slate-500">Завантажуємо фото...</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {(list.data?.items ?? []).map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-100 p-3">
              <div className="grid grid-cols-2 gap-1">
                {row.photoUrls.map((u) => (
                  <a key={u} href={mediaUrl(u)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(u)} alt="" className="h-28 w-full rounded object-cover" />
                  </a>
                ))}
              </div>
              {row.caption ? <p className="mt-2 text-sm text-slate-700">{row.caption}</p> : null}
              {row.missingCount && row.missingCount > 0 ? (
                <p className="mt-1 text-xs text-amber-700">{row.missingCount} фото недоступно</p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

> Note: The `uploadFile` function reads the JWT from `localStorage.getItem('access_token')`. Check what key the project uses by inspecting `lib/auth-store.ts` — if the token key differs, update accordingly.

- [ ] **Step 11.2 — Check token storage key**

```bash
grep -n "access_token\|localStorage" apps/frontend/src/lib/auth-store.ts
```

Update the `Authorization` header in `uploadFile` if the key is different.

- [ ] **Step 11.3 — Verify and commit**

Open a project detail page. In the "Фото з об'єкта" section, switch to "Завантажити файл" tab. Upload an image. Verify it appears in the grid.

```bash
git add apps/frontend/src/components/ProjectPhotoReportsSection.tsx
git commit -m "feat: add file upload support to ProjectPhotoReportsSection (URL + file tabs)"
```

---

## Task 12 — ProjectDesignFilesSection (new component)

**Files:**
- Create: `apps/frontend/src/components/ProjectDesignFilesSection.tsx`

- [ ] **Step 12.1 — Create the component**

Create `apps/frontend/src/components/ProjectDesignFilesSection.tsx`:

```tsx
import { Layers } from 'lucide-react'
import { ProjectPhotoReportsSection } from './ProjectPhotoReportsSection'

export function ProjectDesignFilesSection({ projectId }: { projectId: string }) {
  return (
    <ProjectPhotoReportsSection
      projectId={projectId}
      category="DESIGN"
      title="Дизайн-файли"
    />
  )
}
```

The `ProjectPhotoReportsSection` component now accepts `category` and `title` props (added in Task 11), so this wrapper is minimal.

- [ ] **Step 12.2 — Commit**

```bash
git add apps/frontend/src/components/ProjectDesignFilesSection.tsx
git commit -m "feat: add ProjectDesignFilesSection component (design sketches and renders)"
```

---

## Task 13 — Designer workbench: remove order claiming

**Files:**
- Modify: `apps/frontend/src/pages/DesignerWorkbenchPage.tsx`

- [ ] **Step 13.1 — Remove order claiming logic**

Replace `apps/frontend/src/pages/DesignerWorkbenchPage.tsx`:

```tsx
import { Badge, Card, CardContent, PageHeader } from '@tailored/ui'
import { projectStatusLabels } from '@tailored/shared'
import { Briefcase, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'

type MineProject = {
  id: string
  code: string
  title: string
  status: string
  city?: string
  clientName: string
  openTasks: number
}

export function DesignerWorkbenchPage() {
  const mine = useLoad(
    () => getApi<{ items: MineProject[]; total: number }>('/projects/mine'),
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Моя робота"
        description="Призначені проєкти та задачі."
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
              <Briefcase className="h-4 w-4 text-[var(--tds-primary)]" />
              Мої проєкти
            </div>
            <Link
              to="/workspace/projects"
              className="text-xs font-bold text-[var(--tds-primary)] hover:underline"
            >
              Всі проєкти →
            </Link>
          </div>
          {mine.loading ? (
            <p className="text-sm text-slate-500">Завантажуємо…</p>
          ) : mine.data?.items.length ? (
            <ul className="space-y-2">
              {mine.data.items.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/70 bg-white/45 px-3 py-2"
                >
                  <div>
                    <Link
                      to={`/workspace/projects/${p.id}`}
                      className="font-bold text-[var(--tds-ink)] hover:text-[var(--tds-primary)]"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--tds-muted)]">
                      <span>{p.code}</span>
                      <Badge tone="neutral">
                        {projectStatusLabels[
                          p.status as keyof typeof projectStatusLabels
                        ] ?? p.status}
                      </Badge>
                      {p.city ? <span>{p.city}</span> : null}
                      <span>задач: {p.openTasks}</span>
                    </div>
                  </div>
                  <Link
                    to={`/workspace/projects/${p.id}`}
                    className="text-xs font-bold text-[var(--tds-primary)]"
                  >
                    Відкрити →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Поки немає призначених проєктів. Менеджер призначить вас до проєкту.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to="/workspace/kanban"
          className="flex items-center gap-1 font-bold text-[var(--tds-primary)] hover:underline"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Мої задачі (Канбан) →
        </Link>
        <Link
          to="/workspace/projects"
          className="font-bold text-[var(--tds-primary)] hover:underline"
        >
          Усі проєкти →
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 13.2 — Verify and commit**

Log in as a DESIGNER. The "Моя робота" page should show only assigned projects and a link to Kanban. No "Вхідні заявки" section.

```bash
git add apps/frontend/src/pages/DesignerWorkbenchPage.tsx
git commit -m "feat: remove order claiming from designer workbench, add kanban link"
```

---

## Task 14 — BrigadirWorkbenchPage (new)

**Files:**
- Create: `apps/frontend/src/pages/BrigadirWorkbenchPage.tsx`

- [ ] **Step 14.1 — Create the page**

Create `apps/frontend/src/pages/BrigadirWorkbenchPage.tsx`:

```tsx
import { Badge, Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { projectStatusLabels, taskStatusLabels } from '@tailored/shared'
import { ClipboardList, HardHat } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApi, patchApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'

type MineProject = {
  id: string
  code: string
  title: string
  status: string
  city?: string
  openTasks: number
}

type BoardTask = {
  id: string
  title: string
  status: string
  priority: number
  project: { code: string; title: string }
  assigneeName?: string
  dueDate?: string
}

const priorityColors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#94a3b8']

const NEXT_STATUS: Record<string, string> = {
  BACKLOG: 'IN_PROGRESS',
  READY: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  REVIEW: 'DONE',
}

export function BrigadirWorkbenchPage() {
  const myProjects = useLoad(
    () => getApi<{ items: MineProject[]; total: number }>('/projects/mine/brigadir'),
    [],
  )
  const board = useLoad(
    () =>
      getApi<{ byStatus: Record<string, BoardTask[]>; total: number }>(
        '/operations/board',
      ),
    [],
  )

  const myTasks =
    board.data
      ? Object.values(board.data.byStatus)
          .flat()
          .filter((t) => t.status !== 'DONE')
          .slice(0, 15)
      : []

  async function moveTask(id: string, status: string) {
    await patchApi(`/operations/tasks/${id}/status`, { status })
    board.reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мій робочий стіл"
        description="Задачі та проєкти бригади."
        actions={
          <Link to="/workspace/kanban">
            <Button type="button" variant="secondary">
              <ClipboardList className="mr-2 h-4 w-4" />
              Повний Канбан
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
              <ClipboardList className="h-4 w-4 text-[var(--tds-primary)]" />
              Активні задачі
            </div>
          </div>
          {board.loading ? (
            <p className="text-sm text-slate-500">Завантажуємо…</p>
          ) : myTasks.length ? (
            <ul className="space-y-2">
              {myTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/70 bg-white/45 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: priorityColors[(t.priority - 1) % 5] }}
                      />
                      <span className="font-bold text-[var(--tds-ink)] truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--tds-muted)]">
                      <span>{t.project.code}</span>
                      <Badge tone="neutral">
                        {taskStatusLabels[t.status as keyof typeof taskStatusLabels] ?? t.status}
                      </Badge>
                      {t.dueDate ? <span>до {t.dueDate.slice(0, 10)}</span> : null}
                    </div>
                  </div>
                  {NEXT_STATUS[t.status] ? (
                    <button
                      onClick={() => void moveTask(t.id, NEXT_STATUS[t.status])}
                      className="rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--tds-muted)] transition hover:border-[var(--tds-primary)] hover:text-[var(--tds-primary)]"
                    >
                      →{' '}
                      {taskStatusLabels[NEXT_STATUS[t.status] as keyof typeof taskStatusLabels]}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Активних задач немає.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
              <HardHat className="h-4 w-4 text-[var(--tds-primary)]" />
              Мої об'єкти
            </div>
            <Link
              to="/workspace/projects"
              className="text-xs font-bold text-[var(--tds-primary)] hover:underline"
            >
              Всі проєкти →
            </Link>
          </div>
          {myProjects.loading ? (
            <p className="text-sm text-slate-500">Завантажуємо…</p>
          ) : myProjects.data?.items.length ? (
            <ul className="space-y-2">
              {myProjects.data.items.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/70 bg-white/45 px-3 py-2"
                >
                  <div>
                    <Link
                      to={`/workspace/projects/${p.id}`}
                      className="font-bold text-[var(--tds-ink)] hover:text-[var(--tds-primary)]"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--tds-muted)]">
                      <span>{p.code}</span>
                      <Badge tone="neutral">
                        {projectStatusLabels[p.status as keyof typeof projectStatusLabels] ?? p.status}
                      </Badge>
                      {p.city ? <span>{p.city}</span> : null}
                      <span>задач: {p.openTasks}</span>
                    </div>
                  </div>
                  <Link
                    to={`/workspace/projects/${p.id}`}
                    className="text-xs font-bold text-[var(--tds-primary)]"
                  >
                    Відкрити →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Поки немає призначених об'єктів. Менеджер призначить вас до проєкту.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 14.2 — Verify and commit**

```bash
git add apps/frontend/src/pages/BrigadirWorkbenchPage.tsx
git commit -m "feat: add BrigadirWorkbenchPage with active tasks and assigned projects"
```

---

## Task 15 — ProjectTeamAssignment: add brigadir field

**Files:**
- Modify: `apps/frontend/src/components/ProjectTeamAssignment.tsx`

- [ ] **Step 15.1 — Add brigadirStaffId prop and field**

Replace `apps/frontend/src/components/ProjectTeamAssignment.tsx`:

```tsx
import { Button, Card, CardContent, CardHeader } from '@tailored/ui'
import { SearchableSelect } from '@/components/SearchableSelect'
import { useEffect, useMemo, useState } from 'react'
import { getApi, patchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { useLoad } from '@/lib/use-load'

type UserRow = {
  id: string
  fullName: string
  staffId: string | null
  role: { code: string }
}
type UsersResp = { items: UserRow[] }

export function ProjectTeamAssignment({
  projectId,
  managerStaffId,
  designerStaffId,
  brigadirStaffId,
  onSaved,
}: {
  projectId: string
  managerStaffId: string | null | undefined
  designerStaffId: string | null | undefined
  brigadirStaffId: string | null | undefined
  onSaved: () => void
}) {
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = role === 'ADMIN' || role === 'PROJECT_MANAGER'
  const users = useLoad(
    () =>
      canEdit
        ? getApi<UsersResp>('/users?page=1&perPage=200')
        : Promise.resolve({ items: [] }),
    [canEdit],
  )
  const [mgr, setMgr] = useState(managerStaffId ?? '')
  const [des, setDes] = useState(designerStaffId ?? '')
  const [brig, setBrig] = useState(brigadirStaffId ?? '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMgr(managerStaffId ?? '')
    setDes(designerStaffId ?? '')
    setBrig(brigadirStaffId ?? '')
  }, [managerStaffId, designerStaffId, brigadirStaffId])

  const pmOptions = useMemo(() => {
    return (users.data?.items ?? [])
      .filter((u) => u.staffId && ['PROJECT_MANAGER', 'ADMIN'].includes(u.role.code))
      .map((u) => ({ value: u.staffId!, label: u.fullName }))
  }, [users.data])

  const designerOptions = useMemo(() => {
    return (users.data?.items ?? [])
      .filter((u) => u.staffId && u.role.code === 'DESIGNER')
      .map((u) => ({ value: u.staffId!, label: u.fullName }))
  }, [users.data])

  const brigadirOptions = useMemo(() => {
    return (users.data?.items ?? [])
      .filter((u) => u.staffId && u.role.code === 'BRIGADIR')
      .map((u) => ({ value: u.staffId!, label: u.fullName }))
  }, [users.data])

  async function save() {
    setBusy(true)
    setMsg('')
    try {
      await patchApi(`/projects/${projectId}/team`, {
        managerStaffId: mgr || null,
        designerStaffId: des || null,
        brigadirStaffId: brig || null,
      })
      setMsg('Команду оновлено.')
      onSaved()
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsg(m ?? 'Не вдалося оновити команду')
    } finally {
      setBusy(false)
    }
  }

  if (!canEdit) return null

  return (
    <Card>
      <CardHeader>
        <div className="font-medium text-slate-950">Команда проєкту</div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Менеджер проєкту
          </label>
          <SearchableSelect
            value={mgr}
            onChange={setMgr}
            placeholder="Не призначено"
            searchPlaceholder="Пошук менеджера…"
            options={[{ value: '', label: 'Не призначено' }, ...pmOptions]}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Дизайнер
          </label>
          <SearchableSelect
            value={des}
            onChange={setDes}
            placeholder="Не призначено"
            searchPlaceholder="Пошук дизайнера…"
            options={[{ value: '', label: 'Не призначено' }, ...designerOptions]}
          />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
            Бригадир
          </label>
          <SearchableSelect
            value={brig}
            onChange={setBrig}
            placeholder="Не призначено"
            searchPlaceholder="Пошук бригадира…"
            options={[{ value: '', label: 'Не призначено' }, ...brigadirOptions]}
          />
        </div>
        <Button type="button" disabled={busy} onClick={() => void save()}>
          Зберегти
        </Button>
        {msg ? <p className="w-full text-sm text-slate-600">{msg}</p> : null}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 15.2 — Update ProjectDetailPage to pass brigadirStaffId**

In `apps/frontend/src/pages/ProjectDetailPage.tsx`, the `ProjectTeamAssignment` call now needs `brigadirStaffId`:

```tsx
<ProjectTeamAssignment
  projectId={data.id}
  managerStaffId={data.manager?.id}
  designerStaffId={data.designer?.id}
  brigadirStaffId={data.brigadir?.id}
  onSaved={() => reload()}
/>
```

Also add `brigadir` to the `ProjectDetail` type in `apps/frontend/src/lib/types.ts`. Find the `ProjectDetail` type and add:

```typescript
brigadir: {
  id: string
  user: { fullName?: string; email?: string }
} | null
```

- [ ] **Step 15.3 — Verify and commit**

Open a project as ADMIN. Verify the Brigadir selector appears in the team assignment card. Assign a BRIGADIR user. Verify it saves without error.

```bash
git add apps/frontend/src/components/ProjectTeamAssignment.tsx apps/frontend/src/lib/types.ts
git commit -m "feat: add brigadir field to ProjectTeamAssignment"
```

---

## Task 16 — ProjectDetailPage: quick actions + design files + brigadir view

**Files:**
- Modify: `apps/frontend/src/pages/ProjectDetailPage.tsx`

- [ ] **Step 16.1 — Add createEstimate function and import**

At top of `ProjectDetailPage.tsx`, add `postApi` to the api import and `useNavigate` to react-router-dom:

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApi, postApi } from '@/lib/api'
```

Inside `ProjectDetailPage()`, add:

```tsx
const navigate = useNavigate()
const role = useAuthStore((s) => s.user?.role)
const isBrigadir = role === 'BRIGADIR'
const canEdit = role === 'ADMIN' || role === 'PROJECT_MANAGER'

async function createEstimate() {
  try {
    await postApi('/estimates', { projectId: data!.id })
    navigate('/workspace/estimates')
  } catch {
    // navigate anyway to let user see existing estimates
    navigate('/workspace/estimates')
  }
}
```

- [ ] **Step 16.2 — Update estimate section header**

Find the `CardHeader` that wraps "Кошторис" and replace it:

```tsx
<CardHeader>
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 font-medium text-slate-950">
      <FileText className="h-4 w-4" />
      Кошторис
    </div>
    <div className="flex items-center gap-2">
      {canEdit && !latestEstimate && (
        <Button
          type="button"
          className="h-7 text-xs px-2"
          onClick={() => void createEstimate()}
        >
          + Створити кошторис
        </Button>
      )}
      {latestEstimate && (
        <Link
          to="/workspace/estimates"
          className="text-xs font-bold text-[var(--tds-primary)] hover:underline"
        >
          Всі кошториси →
        </Link>
      )}
    </div>
  </div>
</CardHeader>
```

- [ ] **Step 16.3 — Update tasks section header**

Find the `CardHeader` that wraps "Задачі":

```tsx
<CardHeader>
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 font-medium text-slate-950">
      <ClipboardList className="h-4 w-4" />
      Задачі
    </div>
    <Link
      to="/workspace/kanban"
      className="text-xs font-bold text-[var(--tds-primary)] hover:underline"
    >
      {canEdit ? 'Додати задачу →' : 'Канбан →'}
    </Link>
  </div>
</CardHeader>
```

- [ ] **Step 16.4 — Add design files section**

Import `ProjectDesignFilesSection`:

```tsx
import { ProjectDesignFilesSection } from '@/components/ProjectDesignFilesSection'
```

Add the section between `ProjectPhotoReportsSection` and the Estimate card:

```tsx
<ProjectDesignFilesSection projectId={data.id} />
```

- [ ] **Step 16.5 — Hide financial sections for BRIGADIR**

Wrap the payments card and audit card with visibility check. Find the right-side column cards and wrap the financial ones:

```tsx
{/* Payments — hidden from brigadir */}
{!isBrigadir && (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2 font-medium text-slate-950">
        <WalletCards className="h-4 w-4" />
        Фінанси
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      {/* ... existing payments content ... */}
    </CardContent>
  </Card>
)}
```

Also hide the estimate section's financial total from brigadir (show only items, not total):

In the estimate `<table>`, brigadir can see it but the total can remain visible (they need to know the scope).

- [ ] **Step 16.6 — Hide payment gate actions from brigadir**

`ProjectStatusActions` already returns `null` for non-admin/PM roles (it checks `canEdit`). Nothing to change here.

- [ ] **Step 16.7 — Verify and commit**

1. As PM: verify "Створити кошторис" button appears when no estimate exists.
2. As BRIGADIR: verify payments card is hidden. Verify project info, tasks, measurements, and photo sections are visible.

```bash
git add apps/frontend/src/pages/ProjectDetailPage.tsx
git commit -m "feat: project detail quick actions, design files section, brigadir-restricted view"
```

---

## Task 17 — Portal: design files for CLIENT

**Files:**
- Modify: `apps/frontend/src/pages/PortalProjectDetailPage.tsx`

- [ ] **Step 17.1 — Add design files read-only view**

Find where `ProjectPhotoReportsSection` (or photo reports) is used in `PortalProjectDetailPage.tsx`. If not present, find a logical place (after project progress section, before change requests).

Import and add the design files section:

```tsx
import { ProjectDesignFilesSection } from '@/components/ProjectDesignFilesSection'
```

Add in the JSX (the section shows read-only for CLIENT since `canCreate` check uses role):

```tsx
<ProjectDesignFilesSection projectId={projectCode} />
```

> Note: `PortalProjectDetailPage` may use a project code instead of ID. Check the page's props/params and use `data.id` if available, or the code as a string. The API `GET /projects/:projectId/photo-reports` accepts the MongoDB ID. If the portal page only has a code, check if there's a `data.id` field available in the portal project detail response.

- [ ] **Step 17.2 — Verify and commit**

Log in as CLIENT. Navigate to a project. Verify design files section is visible (read-only — no upload form since CLIENT role is not in `canCreate`).

```bash
git add apps/frontend/src/pages/PortalProjectDetailPage.tsx
git commit -m "feat: show design files section in client portal project detail"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Remove 5 legacy roles | 1 |
| Add BRIGADIR enum + label | 1 |
| Translate Publish/Hide/PENDING | 7 |
| Payment gate (DESIGN+ transitions) | 4, 10 |
| Kanban route activation | 8 |
| Kanban nav item | 8 |
| Task creation API (POST /operations/tasks) | 5 |
| Task creation UI modal | 9 |
| brigadirId on project schema | 3 |
| Team assignment brigadir field | 3, 15 |
| listForBrigadir endpoint | 3 |
| Photo report category (SITE/DESIGN) | 6 |
| File upload UI (URL + file tabs) | 11 |
| Design files component | 12 |
| Designer workbench: remove order claiming | 13 |
| BrigadirWorkbenchPage | 14 |
| Quick actions in ProjectDetail (create estimate, add task) | 16 |
| Brigadir view restrictions in ProjectDetail | 16 |
| Portal: client sees design files | 17 |
| BRIGADIR nav + routes | 8 |
| board() filters for BRIGADIR | 5 |

All spec requirements covered. ✓

**Known dependency:** `BrigadirWorkbenchPage` is referenced in `App.tsx` (Task 8) but created in Task 14. Execute Task 14 before Task 8, or add a placeholder export in Task 14 first.

Corrected task order: **1 → 2 → 3 → 4 → 5 → 6 → 14 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 15 → 16 → 17**
