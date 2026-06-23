import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { ChangeRequestStatus, RoleCode, TaskStatus } from '../domain/enums'
import { AuthenticatedUser } from '../auth/request-user'
import { Approval } from '../mongo/schemas/approval.schema'
import { AuditLog } from '../mongo/schemas/audit-log.schema'
import { ChangeRequest } from '../mongo/schemas/change-request.schema'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Estimate } from '../mongo/schemas/estimate.schema'
import { Project } from '../mongo/schemas/project.schema'
import { QualityChecklist } from '../mongo/schemas/quality-checklist.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { Task } from '../mongo/schemas/task.schema'
import { Team } from '../mongo/schemas/team.schema'
import { User } from '../mongo/schemas/user.schema'
import { toObjectId } from '../lib/object-id'
import { CreateChangeRequestDto } from './dto/create-change-request.dto'
import { CreateTaskDto } from './dto/create-task.dto'
import { DecideApprovalDto } from './dto/decide-approval.dto'
import { UpdateQualityDto } from './dto/update-quality.dto'
import { UpdateTaskStatusDto } from './dto/update-task-status.dto'
@Injectable()
export class OperationsService {
	constructor(
		@InjectModel(Task.name)
		private readonly taskModel: Model<Task>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>,
		@InjectModel(Team.name)
		private readonly teamModel: Model<Team>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(AuditLog.name)
		private readonly auditModel: Model<AuditLog>,
		@InjectModel(Approval.name)
		private readonly approvalModel: Model<Approval>,
		@InjectModel(Estimate.name)
		private readonly estimateModel: Model<Estimate>,
		@InjectModel(ChangeRequest.name)
		private readonly changeRequestModel: Model<ChangeRequest>,
		@InjectModel(QualityChecklist.name)
		private readonly qualityModel: Model<QualityChecklist>,
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>
	) {}
	private async clientProfileIdForUser(
		userId: string
	): Promise<Types.ObjectId | null> {
		const c = await this.clientModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.select('_id')
			.lean()
			.exec()
		return c?._id ?? null
	}
	private async projectIdsForClientUser(
		userId: string
	): Promise<Types.ObjectId[]> {
		const clientId = await this.clientProfileIdForUser(userId)
		if (!clientId) return []
		const projects = await this.projectModel
			.find({ clientId })
			.select('_id')
			.lean()
			.exec()
		return projects.map((p) => p._id as Types.ObjectId)
	}
	async board(user: AuthenticatedUser) {
		const tasks = await this.taskModel
			.find()
			.sort({ priority: 1, dueDate: 1 })
			.limit(150)
			.lean()
			.exec()
		const byStatus: Record<TaskStatus, unknown[]> = {
			[TaskStatus.BACKLOG]: [],
			[TaskStatus.READY]: [],
			[TaskStatus.IN_PROGRESS]: [],
			[TaskStatus.BLOCKED]: [],
			[TaskStatus.REVIEW]: [],
			[TaskStatus.DONE]: [],
		}
		for (const task of tasks) {
			const project = await this.projectModel
				.findById(task.projectId)
				.select('code title status dueDate')
				.lean()
				.exec()
			const assignee = task.assigneeId
				? await this.staffModel.findById(task.assigneeId).lean().exec()
				: null
			const assigneeUser = assignee
				? await this.userModel
						.findById(assignee.userId)
						.select('fullName email')
						.lean()
						.exec()
				: null
			const team = task.teamId
				? await this.teamModel.findById(task.teamId).lean().exec()
				: null
			byStatus[task.status as TaskStatus].push({
				id: task._id.toString(),
				title: task.title,
				description: task.description,
				status: task.status,
				priority: task.priority,
				dueDate: task.dueDate,
				project,
				teamName: team?.name ?? null,
				assigneeName: assigneeUser?.fullName ?? null,
			})
		}
		const result = { total: tasks.length, byStatus }
		// BRIGADIR sees only tasks from their assigned projects
		if (user.role === RoleCode.BRIGADIR) {
			const staff = await this.staffModel
				.findOne({ userId: new Types.ObjectId(user.id) })
				.select('_id')
				.lean()
				.exec()
			if (staff) {
				const brigadirProjects = await this.projectModel
					.find({ brigadirId: staff._id })
					.select('_id')
					.lean()
					.exec()
				const allowed = new Set(brigadirProjects.map((p) => p._id.toString()))
				// Filter each status column
				for (const col of Object.keys(result.byStatus)) {
					result.byStatus[col as TaskStatus] = (
						result.byStatus[col as TaskStatus] as Array<{
							project?: { _id?: unknown } | null
						}>
					).filter((t) => {
						const pid =
							t.project?._id != null
								? (t.project._id as { toString(): string }).toString()
								: ''
						return allowed.has(pid)
					})
				}
				result.total = Object.values(result.byStatus).reduce(
					(sum, col) => sum + (col as unknown[]).length,
					0
				)
			}
		}
		return result
	}
	async updateTaskStatus(
		id: string,
		dto: UpdateTaskStatusDto,
		actor: AuthenticatedUser
	) {
		const task = await this.taskModel.findById(toObjectId(id)).exec()
		if (!task) {
			throw new NotFoundException('Task not found')
		}
		if (actor.role === RoleCode.BRIGADIR) {
			const staff = await this.staffModel
				.findOne({ userId: new Types.ObjectId(actor.id) })
				.select('_id')
				.lean()
				.exec()
			if (
				!staff?._id ||
				!task.assigneeId ||
				!(task.assigneeId as Types.ObjectId).equals(
					staff._id as Types.ObjectId
				)
			) {
				throw new ForbiddenException(
					'You can only update tasks assigned to you'
				)
			}
		}
		const prev = task.status
		task.status = dto.status
		await task.save()
		const project = await this.projectModel
			.findById(task.projectId)
			.select('code title')
			.lean()
			.exec()
		await this.auditModel.create({
			projectId: task.projectId,
			action: 'task.status.updated',
			entityType: 'Task',
			entityId: task.id,
			metadata: { from: prev, to: dto.status, by: actor.email },
		})
		return {
			id: task.id,
			status: task.status,
			projectCode: project?.code,
		}
	}
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
			userId: new Types.ObjectId(user.id),
			metadata: { title: dto.title },
		})

		const proj = await this.projectModel
			.findById(projectOid)
			.select('code title')
			.lean()
			.exec()

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
	async approvals(actor: AuthenticatedUser) {
		const projectFilter =
			actor.role === RoleCode.CLIENT
				? {
						projectId: {
							$in: await this.projectIdsForClientUser(actor.id),
						},
					}
				: {}
		const approvals = await this.approvalModel
			.find(projectFilter)
			.sort({ status: 1, createdAt: -1 })
			.limit(100)
			.lean()
			.exec()
		return Promise.all(
			approvals.map(async (approval) => {
				const project = await this.projectModel
					.findById(approval.projectId)
					.select('id code title')
					.lean()
					.exec()
				let estimate: Record<string, unknown> | null = null
				if (approval.estimateId) {
					const est = await this.estimateModel
						.findById(approval.estimateId)
						.lean()
						.exec()
					if (est) {
						estimate = {
							...est,
							id: est._id.toString(),
							total: est.total,
						}
					}
				}
				return {
					id: approval._id.toString(),
					kind: approval.kind,
					status: approval.status,
					requestedBy: approval.requestedBy,
					decidedBy: approval.decidedBy,
					notes: approval.notes,
					createdAt: approval.createdAt,
					decidedAt: approval.decidedAt,
					project,
					estimate,
				}
			})
		)
	}
	async decideApproval(
		id: string,
		dto: DecideApprovalDto,
		actor: AuthenticatedUser
	) {
		const approval = await this.approvalModel
			.findById(toObjectId(id))
			.exec()
		if (!approval) {
			throw new NotFoundException('Approval not found')
		}
		if (actor.role === RoleCode.CLIENT) {
			const project = await this.projectModel
				.findById(approval.projectId)
				.select('clientId')
				.lean()
				.exec()
			const clientId = await this.clientProfileIdForUser(actor.id)
			if (
				!project ||
				!clientId ||
				!(project.clientId as Types.ObjectId).equals(clientId)
			) {
				throw new ForbiddenException('You cannot decide this approval')
			}
		}
		const prev = approval.status
		approval.status = dto.status
		approval.notes = dto.notes ?? approval.notes
		approval.decidedBy = actor.email
		approval.decidedAt = new Date()
		await approval.save()
		await this.auditModel.create({
			projectId: approval.projectId,
			action: 'approval.decided',
			entityType: 'Approval',
			entityId: approval.id,
			metadata: { from: prev, to: dto.status, by: actor.email },
		})
		return approval
	}
	async changeRequests(actor: AuthenticatedUser) {
		const projectFilter =
			actor.role === RoleCode.CLIENT
				? {
						projectId: {
							$in: await this.projectIdsForClientUser(actor.id),
						},
					}
				: {}
		const rows = await this.changeRequestModel
			.find(projectFilter)
			.sort({ createdAt: -1 })
			.lean()
			.exec()
		return Promise.all(
			rows.map(async (item) => {
				const project = await this.projectModel
					.findById(item.projectId)
					.select('id code title status')
					.lean()
					.exec()
				return {
					id: item._id.toString(),
					title: item.title,
					description: item.description,
					status: item.status,
					impactCost: item.impactCost,
					impactDays: item.impactDays,
					createdAt: item.createdAt,
					project,
				}
			})
		)
	}
	async createChangeRequest(
		dto: CreateChangeRequestDto,
		actor: AuthenticatedUser
	) {
		const project = await this.projectModel
			.findById(toObjectId(dto.projectId, 'Invalid projectId'))
			.exec()
		if (!project) {
			throw new NotFoundException('Project not found')
		}
		if (actor.role === RoleCode.CLIENT) {
			const clientId = await this.clientProfileIdForUser(actor.id)
			if (
				!clientId ||
				!(project.clientId as Types.ObjectId).equals(clientId)
			) {
				throw new ForbiddenException(
					'You cannot create change requests for this project'
				)
			}
		}
		const result = await this.changeRequestModel.create({
			projectId: project._id,
			title: dto.title,
			description: dto.description,
			status: ChangeRequestStatus.OPEN,
			impactCost: dto.impactCost ?? '0',
			impactDays: dto.impactDays ? Number(dto.impactDays) : 0,
		})
		await this.auditModel.create({
			projectId: project._id,
			action: 'change_request.created',
			entityType: 'ChangeRequest',
			entityId: result.id,
			metadata: { by: actor.email, impactDays: result.impactDays },
		})
		return {
			id: result.id,
			status: result.status,
		}
	}
	async quality() {
		const rows = await this.qualityModel
			.find()
			.sort({ score: 1, createdAt: -1 })
			.limit(100)
			.lean()
			.exec()
		return Promise.all(
			rows.map(async (check) => {
				const project = await this.projectModel
					.findById(check.projectId)
					.select('id code title status')
					.lean()
					.exec()
				return {
					id: check._id.toString(),
					title: check.title,
					score: check.score,
					items: check.items,
					createdAt: check.createdAt,
					project,
				}
			})
		)
	}
	async updateQuality(
		id: string,
		dto: UpdateQualityDto,
		actor: AuthenticatedUser
	) {
		const item = await this.qualityModel.findById(toObjectId(id)).exec()
		if (!item) {
			throw new NotFoundException('Quality checklist not found')
		}
		const prev = item.score
		item.score = dto.score
		await item.save()
		await this.auditModel.create({
			projectId: item.projectId,
			action: 'quality.score.updated',
			entityType: 'QualityChecklist',
			entityId: item.id,
			metadata: { from: prev, to: dto.score, by: actor.email },
		})
		return item
	}
	async calendar(from_: string, to_: string, actor: AuthenticatedUser) {
		const start = new Date(from_)
		const end = new Date(to_)
		const projectIds =
			actor.role === RoleCode.CLIENT
				? await this.projectIdsForClientUser(actor.id)
				: null
		const taskWhere: Record<string, unknown> = {
			dueDate: { $gte: start, $lte: end },
		}
		const projectWhere: Record<string, unknown> = {
			$or: [
				{ startDate: { $gte: start, $lte: end } },
				{ dueDate: { $gte: start, $lte: end } },
			],
		}
		if (projectIds && projectIds.length === 0) {
			return { tasks: [], projects: [] }
		}
		if (projectIds) {
			taskWhere.projectId = { $in: projectIds }
			projectWhere._id = { $in: projectIds }
		}
		const tasks = await this.taskModel
			.find(taskWhere)
			.sort({ dueDate: 1 })
			.lean()
			.exec()
		const projects = await this.projectModel
			.find(projectWhere)
			.sort({ dueDate: 1 })
			.lean()
			.exec()
		const tasksOut = await Promise.all(
			tasks.map(async (t) => {
				const project = await this.projectModel
					.findById(t.projectId)
					.select('code title id')
					.lean()
					.exec()
				const assignee = t.assigneeId
					? await this.staffModel.findById(t.assigneeId).lean().exec()
					: null
				const assigneeUser = assignee
					? await this.userModel
							.findById(assignee.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				const team = t.teamId
					? await this.teamModel
							.findById(t.teamId)
							.select('name')
							.lean()
							.exec()
					: null
				return {
					id: t._id.toString(),
					title: t.title,
					status: t.status,
					priority: t.priority,
					dueDate: t.dueDate,
					projectCode: project?.code,
					projectTitle: project?.title,
					projectId: project?._id.toString(),
					assigneeName: assigneeUser?.fullName ?? null,
					teamName: team?.name ?? null,
				}
			})
		)
		const projectsOut = await Promise.all(
			projects.map(async (p) => {
				const client = await this.clientModel
					.findById(p.clientId)
					.lean()
					.exec()
				const user = client
					? await this.userModel
							.findById(client.userId)
							.select('fullName')
							.lean()
							.exec()
					: null
				return {
					id: p._id.toString(),
					code: p.code,
					title: p.title,
					status: p.status,
					startDate: p.startDate,
					dueDate: p.dueDate,
					clientName: user?.fullName ?? '',
				}
			})
		)
		return { tasks: tasksOut, projects: projectsOut }
	}
}
