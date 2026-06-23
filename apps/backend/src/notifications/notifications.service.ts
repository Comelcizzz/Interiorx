import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { RoleCode } from '../domain/enums'
import { toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { localizeNotificationFields } from '@tailored/shared'
import { Notification } from '../mongo/schemas/notification.schema'
import { Project } from '../mongo/schemas/project.schema'
@Injectable()
export class NotificationsService {
	constructor(
		@InjectModel(Notification.name)
		private readonly notificationModel: Model<Notification>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>
	) {}

	/** Клієнтський кабінет: старі записи могли мати `/projects/:mongoId` без префікса portal/workspace. */
	private rewriteClientNotificationLink(
		role: RoleCode,
		link: string | null | undefined,
		projectCode: string | null
	): string | null | undefined {
		if (!link || role !== RoleCode.CLIENT) return link
		const m = link.match(/^\/projects\/([a-f\d]{24})$/i)
		if (!m) return link
		if (projectCode) {
			return `/portal/projects/${encodeURIComponent(projectCode)}`
		}
		return '/portal/projects'
	}
	private audienceFilter(userId: string, role: RoleCode) {
		// Клієнт бачить лише персональні сповіщення та broadcast для CLIENT —
		// не внутрішні (матеріали, CRM, постачальники тощо).
		if (role === RoleCode.CLIENT) {
			return {
				$or: [
					{ userId: new Types.ObjectId(userId) },
					{ roleCode: RoleCode.CLIENT },
				],
			}
		}
		return {
			$or: [
				{ userId: new Types.ObjectId(userId) },
				{
					$and: [
						{
							$or: [
								{ userId: { $exists: false } },
								{ userId: null },
							],
						},
						{
							$or: [
								{ roleCode: { $exists: false } },
								{ roleCode: null },
								{ roleCode: role },
							],
						},
					],
				},
			],
		}
	}
	async list(
		userId: string,
		role: RoleCode,
		opts?: {
			unreadOnly?: boolean
			page?: number
			perPage?: number
			from?: string
			to?: string
			sort?: string
		}
	) {
		const { page, perPage, skip } = parsePagination(
			opts?.page,
			opts?.perPage,
			25
		)
		const filter: Record<string, unknown> = {
			...this.audienceFilter(userId, role),
			...(opts?.unreadOnly ? { isRead: false } : {}),
		}
		applyDateRangeToWhere(filter, 'createdAt', opts?.from, opts?.to)
		const [rows, total] = await Promise.all([
			this.notificationModel
				.find(filter)
				.sort(resolveSort(opts?.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.notificationModel.countDocuments(filter),
		])
		const items = await Promise.all(
			rows.map(async (n) => {
				const project = n.projectId
					? await this.projectModel
							.findById(n.projectId)
							.select('code title')
							.lean()
							.exec()
					: null
				const code = project?.code ?? null
				const localized = localizeNotificationFields(
					n.title,
					n.body ?? ''
				)
				return {
					...n,
					title: localized.title,
					body: localized.body,
					id: n._id.toString(),
					link: this.rewriteClientNotificationLink(role, n.link, code),
					project: project
						? { code: project.code, title: project.title }
						: null,
				}
			})
		)
		return { items, total, page, perPage }
	}
	async markRead(id: string, userId: string, role: RoleCode) {
		const oid = toObjectId(id, 'Invalid notification id')
		const updated = await this.notificationModel
			.findOneAndUpdate(
				{
					_id: oid,
					...this.audienceFilter(userId, role),
				},
				{ isRead: true },
				{ returnDocument: 'after' }
			)
			.exec()
		if (!updated) {
			throw new NotFoundException('Notification not found')
		}
		return updated
	}
	async markAllRead(userId: string, role: RoleCode) {
		await this.notificationModel
			.updateMany(
				{
					isRead: false,
					...this.audienceFilter(userId, role),
				},
				{ isRead: true }
			)
			.exec()
		return { ok: true }
	}
	async unreadCount(userId: string, role: RoleCode) {
		const count = await this.notificationModel
			.countDocuments({
				isRead: false,
				...this.audienceFilter(userId, role),
			})
			.exec()
		return { count }
	}
}
