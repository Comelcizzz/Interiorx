import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { RoleCode } from '../domain/enums'
import { FilesService } from '../files/files.service'
import { toObjectId } from '../lib/object-id'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { PhotoReport } from '../mongo/schemas/photo-report.schema'
import { Project } from '../mongo/schemas/project.schema'
import { Task } from '../mongo/schemas/task.schema'
import { CreatePhotoReportDto } from './dto/create-photo-report.dto'
const STAFF_PHOTO_VIEW_ROLES: RoleCode[] = [
	RoleCode.ADMIN,
	RoleCode.PROJECT_MANAGER,
	RoleCode.DESIGNER,
	RoleCode.BRIGADIR,
]
@Injectable()
export class PhotoReportsService {
	constructor(
		@InjectModel(PhotoReport.name)
		private readonly reportModel: Model<PhotoReport>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>,
		@InjectModel(Task.name)
		private readonly taskModel: Model<Task>,
		@InjectModel(ClientProfile.name)
		private readonly clientProfileModel: Model<ClientProfile>,
		private readonly filesService: FilesService
	) {}
	private assertStaffCanView(role: RoleCode) {
		if (!STAFF_PHOTO_VIEW_ROLES.includes(role)) {
			throw new ForbiddenException('Insufficient permissions')
		}
	}
	private async mapRow(
		row: PhotoReport & {
			_id: Types.ObjectId
		}
	) {
		const urls: string[] = []
		let missingCount = 0
		for (const fid of row.fileIds ?? []) {
			const p = await this.filesService.getPublicMediaPath(fid.toString())
			if (p) urls.push(p)
			else missingCount += 1
		}
		for (const url of row.photoUrls ?? []) {
			const clean = String(url).trim()
			if (clean) urls.push(clean)
		}
		return {
			id: row._id.toString(),
			projectId: row.projectId.toString(),
			taskId: row.taskId?.toString() ?? null,
			caption: row.caption,
			category: (row.category as string) ?? 'SITE',
			photoUrls: urls,
			missingCount,
			createdAt: (
				row as {
					createdAt?: Date
				}
			).createdAt,
			updatedAt: (
				row as {
					updatedAt?: Date
				}
			).updatedAt,
		}
	}
	async listForStaffProject(
		projectId: string,
		role: RoleCode,
		page = 1,
		perPage = 24,
		category?: 'SITE' | 'DESIGN',
	) {
		this.assertStaffCanView(role)
		const pid = toObjectId(projectId, 'Invalid projectId')
		const project = await this.projectModel
			.findById(pid)
			.select('_id')
			.lean()
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		const p = Math.max(1, page)
		const pp = Math.min(100, Math.max(1, perPage))
		const filter: Record<string, unknown> = { projectId: pid }
		if (category) filter.category = category
		const [total, rows] = await Promise.all([
			this.reportModel.countDocuments(filter).exec(),
			this.reportModel
				.find(filter)
				.sort({ createdAt: -1 })
				.skip((p - 1) * pp)
				.limit(pp)
				.lean()
				.exec(),
		])
		const items = await Promise.all(
			rows.map((r) =>
				this.mapRow(
					r as PhotoReport & {
						_id: Types.ObjectId
					}
				)
			)
		)
		return { items, total, page: p, perPage: pp }
	}
	async createForStaff(
		userId: string,
		role: RoleCode,
		dto: CreatePhotoReportDto
	) {
		const allowedCreate: RoleCode[] = [
			RoleCode.ADMIN,
			RoleCode.PROJECT_MANAGER,
			RoleCode.DESIGNER,
			RoleCode.BRIGADIR,
		]
		if (!allowedCreate.includes(role)) {
			throw new ForbiddenException(
				'Insufficient permissions to create photo reports'
			)
		}
		const projectOid = toObjectId(dto.projectId, 'Invalid projectId')
		const project = await this.projectModel
			.findById(projectOid)
			.select('_id')
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		let taskOid: Types.ObjectId | undefined
		if (dto.taskId) {
			taskOid = toObjectId(dto.taskId, 'Invalid taskId')
			const task = await this.taskModel.findById(taskOid).exec()
			if (!task || !projectOid.equals(task.projectId)) {
				throw new BadRequestException('Task does not belong to project')
			}
		}
		const fileOids = (dto.fileIds ?? []).map((id) =>
			toObjectId(id, 'Invalid file id')
		)
		const photoUrls = (dto.photoUrls ?? [])
			.map((url) => url.trim())
			.filter((url) => {
				if (/^https?:\/\//i.test(url)) return true
				return url.startsWith('/uploads/')
			})
			.slice(0, 12)
		if (!fileOids.length && !photoUrls.length) {
			throw new BadRequestException('Provide at least one photo')
		}
		const row = await this.reportModel.create({
			projectId: projectOid,
			taskId: taskOid,
			uploadedBy: new Types.ObjectId(userId),
			fileIds: fileOids,
			photoUrls,
			caption: dto.caption?.trim() ?? '',
			category: dto.category ?? 'SITE',
		})
		return this.mapRow(
			row.toObject() as PhotoReport & {
				_id: Types.ObjectId
			}
		)
	}
	async listForPortalByCode(
		userId: string,
		code: string,
		page = 1,
		perPage = 24,
		category?: 'SITE' | 'DESIGN'
	) {
		const profile = await this.clientProfileModel
			.findOne({ userId: new Types.ObjectId(userId) })
			.exec()
		if (!profile) {
			throw new ForbiddenException('Client profile not found')
		}
		const project = await this.projectModel
			.findOne({ code, clientId: profile._id })
			.select('_id')
			.lean()
			.exec()
		if (!project) {
			throw new NotFoundException('Project not found')
		}
		const p = Math.max(1, page)
		const pp = Math.min(48, Math.max(1, perPage))
		const filter: Record<string, unknown> = { projectId: project._id }
		if (category) filter.category = category
		const [total, rows] = await Promise.all([
			this.reportModel.countDocuments(filter).exec(),
			this.reportModel
				.find(filter)
				.sort({ createdAt: -1 })
				.skip((p - 1) * pp)
				.limit(pp)
				.lean()
				.exec(),
		])
		const items = await Promise.all(
			rows.map((r) =>
				this.mapRow(
					r as PhotoReport & {
						_id: Types.ObjectId
					}
				)
			)
		)
		return { items, total, page: p, perPage: pp }
	}
}
