import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { toObjectId } from '../lib/object-id'
import { StaffProfile } from '../mongo/schemas/staff-profile.schema'
import { Project } from '../mongo/schemas/project.schema'
import { Task } from '../mongo/schemas/task.schema'
import { TeamMember } from '../mongo/schemas/team-member.schema'
import { Team } from '../mongo/schemas/team.schema'
import { User } from '../mongo/schemas/user.schema'
import { CreateTeamDto } from './dto/create-team.dto'
@Injectable()
export class TeamsService {
	constructor(
		@InjectModel(Team.name)
		private readonly teamModel: Model<Team>,
		@InjectModel(TeamMember.name)
		private readonly teamMemberModel: Model<TeamMember>,
		@InjectModel(StaffProfile.name)
		private readonly staffModel: Model<StaffProfile>,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Task.name)
		private readonly taskModel: Model<Task>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>
	) {}
	async list() {
		const teams = await this.teamModel
			.find()
			.sort({ name: 1 })
			.lean()
			.exec()
		return Promise.all(
			teams.map(async (team) => {
				const members = await this.teamMemberModel
					.find({ teamId: team._id })
					.lean()
					.exec()
				const membersOut = await Promise.all(
					members.map(async (m) => {
						const staff = await this.staffModel
							.findById(m.staffId)
							.lean()
							.exec()
						const user = staff
							? await this.userModel
									.findById(staff.userId)
									.select('fullName email title')
									.lean()
									.exec()
							: null
						return {
							...m,
							staff: staff
								? {
										...staff,
										user: {
											fullName: user?.fullName,
											email: user?.email,
											title: user?.title,
										},
									}
								: null,
						}
					})
				)
				const taskCount = await this.taskModel.countDocuments({
					teamId: team._id,
				})
				return {
					...team,
					id: team._id.toString(),
					members: membersOut,
					_count: { tasks: taskCount },
				}
			})
		)
	}
	async detail(id: string) {
		const team = await this.teamModel.findById(toObjectId(id)).lean().exec()
		if (!team) throw new NotFoundException('Team not found')
		const members = await this.teamMemberModel
			.find({ teamId: team._id })
			.lean()
			.exec()
		const membersOut = await Promise.all(
			members.map(async (m) => {
				const staff = await this.staffModel
					.findById(m.staffId)
					.lean()
					.exec()
				const user = staff
					? await this.userModel
							.findById(staff.userId)
							.select('fullName email phone title')
							.lean()
							.exec()
					: null
				return {
					...m,
					staff: staff
						? {
								...staff,
								user: {
									fullName: user?.fullName,
									email: user?.email,
									phone: user?.phone,
									title: user?.title,
								},
							}
						: null,
				}
			})
		)
		const tasks = await this.taskModel
			.find({ teamId: team._id })
			.sort({ dueDate: 1 })
			.limit(20)
			.lean()
			.exec()
		const tasksOut = await Promise.all(
			tasks.map(async (t) => {
				const project = await this.projectModel
					.findById(t.projectId)
					.select('code title')
					.lean()
					.exec()
				return { ...t, project }
			})
		)
		return {
			...team,
			id: team._id.toString(),
			members: membersOut,
			tasks: tasksOut,
		}
	}
	async create(dto: CreateTeamDto) {
		const t = await this.teamModel.create({
			name: dto.name,
			city: dto.city,
			speciality: dto.speciality,
		})
		return t
	}
	async addMember(teamId: string, staffId: string, isLead = false) {
		await this.detail(teamId)
		const tOid = toObjectId(teamId)
		const sOid = toObjectId(staffId, 'Invalid staffId')
		const existing = await this.teamMemberModel.findOne({
			teamId: tOid,
			staffId: sOid,
		})
		if (existing) {
			existing.isLead = isLead
			return existing.save()
		}
		return this.teamMemberModel.create({
			teamId: tOid,
			staffId: sOid,
			isLead,
		})
	}
	async removeMember(teamId: string, staffId: string) {
		await this.teamMemberModel.deleteOne({
			teamId: toObjectId(teamId),
			staffId: toObjectId(staffId, 'Invalid staffId'),
		})
		return { ok: true }
	}
}
