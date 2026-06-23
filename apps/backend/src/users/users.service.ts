import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Role } from '../mongo/schemas/role.schema'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { User } from '../mongo/schemas/user.schema'
import { escapeRegExp } from '../lib/regex'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'

const MATRIX_ROLE_CODES = [
	'ADMIN',
	'PROJECT_MANAGER',
	'DESIGNER',
	'CLIENT',
] as const
@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Role.name)
		private readonly roleModel: Model<Role>,
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>
	) {}
	async users(filters: {
		page?: number
		perPage?: number
		q?: string
		from?: string
		to?: string
		sort?: string
	}) {
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const where: Record<string, unknown> = {}
		if (filters.q) {
			const re = new RegExp(escapeRegExp(filters.q.trim()), 'i')
			where.$or = [{ fullName: re }, { email: re }, { title: re }]
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const [users, total] = await Promise.all([
			this.userModel
				.find(where)
				.sort(resolveSort(filters.sort, 'createdAt'))
				.skip(skip)
				.limit(perPage)
				.lean()
				.exec(),
			this.userModel.countDocuments(where),
		])
		const roles = await this.roleModel.find().lean().exec()
		const roleById = new Map(roles.map((r) => [r._id.toString(), r]))
		const out = await Promise.all(
			users.map(async (user) => {
				const role = roleById.get(user.roleId.toString())
				const client = await this.clientModel
					.findOne({ userId: user._id })
					.lean()
					.exec()
				const staff = await this.staffModel
					.findOne({ userId: user._id })
					.lean()
					.exec()
				return {
					id: user._id.toString(),
					email: user.email,
					fullName: user.fullName,
					phone: user.phone,
					title: user.title,
					isActive: user.isActive,
					createdAt: user.createdAt,
					role: role
						? {
								code: role.code,
								name: role.name,
								permissions: role.permissions,
							}
						: { code: '', name: '', permissions: [] },
					profileType: client ? 'client' : staff ? 'staff' : 'system',
					clientId: client?._id.toString() ?? null,
					staffId: staff?._id.toString() ?? null,
				}
			})
		)
		const items = out.sort((a, b) => {
			const rc = a.role.code.localeCompare(b.role.code)
			return rc !== 0 ? rc : a.fullName.localeCompare(b.fullName)
		})
		return { items, total, page, perPage }
	}
	async roles() {
		const roles = await this.roleModel
			.find({ code: { $in: [...MATRIX_ROLE_CODES] } })
			.sort({ code: 1 })
			.lean()
			.exec()
		return Promise.all(
			roles.map(async (role) => ({
				id: role._id.toString(),
				code: role.code,
				name: role.name,
				description: role.description,
				permissions: role.permissions,
				usersCount: await this.userModel.countDocuments({
					roleId: role._id,
				}),
			}))
		)
	}
}
