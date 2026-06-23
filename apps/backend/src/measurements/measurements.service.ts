import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { optionalToObjectId, toObjectId } from '../lib/object-id'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
import { DesignMeasurement } from '../mongo/schemas/design-measurement.schema'
import { Project } from '../mongo/schemas/project.schema'
import { CreateMeasurementDto } from './dto/create-measurement.dto'

export type MeasurementsListResult = {
	items: Array<{
		id: string
		zoneName: string
		floorArea: string
		wallArea: string
		ceilingHeight: string
		notes?: string | null
		createdAt: Date
		project: { id: string; code: string; title: string }
	}>
	total: number
	page: number
	perPage: number
	totalFloor: number
	totalWall: number
}

@Injectable()
export class MeasurementsService {
	constructor(
		@InjectModel(DesignMeasurement.name)
		private readonly measurementModel: Model<DesignMeasurement>,
		@InjectModel(Project.name)
		private readonly projectModel: Model<Project>
	) {}

	private buildMeasurementMatch(
		projectId?: string,
		q?: string
	): Record<string, unknown> {
		const match: Record<string, unknown> = {}
		const pid = optionalToObjectId(projectId, 'projectId')
		if (pid) match.projectId = pid
		const trimmed = q?.trim()
		if (trimmed) {
			const esc = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			const rx = new RegExp(esc, 'i')
			match.$or = [{ zoneName: rx }, { notes: rx }]
		}
		return match
	}

	async list(opts?: {
		projectId?: string
		q?: string
		page?: number
		perPage?: number
		from?: string
		to?: string
		sort?: string
	}): Promise<MeasurementsListResult> {
		const { page, perPage, skip } = parsePagination(
			opts?.page,
			opts?.perPage,
			25
		)
		const match = this.buildMeasurementMatch(opts?.projectId, opts?.q)
		applyDateRangeToWhere(match, 'createdAt', opts?.from, opts?.to)
		const sortStage = resolveSort(opts?.sort, 'createdAt')

		const [total, sumsAgg, rows] = await Promise.all([
			this.measurementModel.countDocuments(match).exec(),
			this.measurementModel
				.aggregate<{
					totalFloor: number
					totalWall: number
				}>([
					{ $match: match },
					{
						$group: {
							_id: null,
							totalFloor: {
								$sum: {
									$convert: {
										input: '$floorArea',
										to: 'double',
										onError: 0,
										onNull: 0,
									},
								},
							},
							totalWall: {
								$sum: {
									$convert: {
										input: '$wallArea',
										to: 'double',
										onError: 0,
										onNull: 0,
									},
								},
							},
						},
					},
				])
				.exec(),
			this.measurementModel
				.aggregate<{
					id: string
					zoneName: string
					floorArea: string
					wallArea: string
					ceilingHeight: string
					notes?: string | null
					createdAt: Date
					project: { id: string; code: string; title: string }
				}>([
					{ $match: match },
					{ $sort: sortStage },
					{ $skip: skip },
					{ $limit: perPage },
					{
						$lookup: {
							from: 'projects',
							localField: 'projectId',
							foreignField: '_id',
							as: 'p',
						},
					},
					{ $unwind: '$p' },
					{
						$project: {
							_id: 0,
							id: { $toString: '$_id' },
							zoneName: 1,
							floorArea: 1,
							wallArea: 1,
							ceilingHeight: 1,
							notes: 1,
							createdAt: 1,
							project: {
								id: { $toString: '$p._id' },
								code: '$p.code',
								title: '$p.title',
							},
						},
					},
				])
				.exec(),
		])

		const sums = sumsAgg[0] ?? { totalFloor: 0, totalWall: 0 }
		return {
			items: rows,
			total,
			page,
			perPage,
			totalFloor: sums.totalFloor ?? 0,
			totalWall: sums.totalWall ?? 0,
		}
	}
	async findOne(id: string) {
		const m = await this.measurementModel
			.findById(toObjectId(id))
			.lean()
			.exec()
		if (!m) throw new NotFoundException('Measurement not found')
		const project = await this.projectModel
			.findById(m.projectId)
			.select('id code title')
			.lean()
			.exec()
		return {
			...m,
			id: m._id.toString(),
			floorArea: m.floorArea,
			wallArea: m.wallArea,
			ceilingHeight: m.ceilingHeight,
			project,
		}
	}
	async create(dto: CreateMeasurementDto) {
		const project = await this.projectModel
			.findById(toObjectId(dto.projectId, 'Invalid projectId'))
			.exec()
		if (!project) throw new NotFoundException('Project not found')
		return this.measurementModel.create({
			projectId: project._id,
			zoneName: dto.zoneName,
			floorArea: String(dto.floorArea),
			wallArea: String(dto.wallArea),
			ceilingHeight: String(dto.ceilingHeight),
			notes: dto.notes,
		})
	}
	async update(id: string, dto: Partial<CreateMeasurementDto>) {
		const existing = await this.measurementModel
			.findById(toObjectId(id))
			.exec()
		if (!existing) throw new NotFoundException('Measurement not found')
		if (dto.zoneName !== undefined) existing.zoneName = dto.zoneName
		if (dto.floorArea !== undefined)
			existing.floorArea = String(dto.floorArea)
		if (dto.wallArea !== undefined) existing.wallArea = String(dto.wallArea)
		if (dto.ceilingHeight !== undefined)
			existing.ceilingHeight = String(dto.ceilingHeight)
		if (dto.notes !== undefined) existing.notes = dto.notes
		return existing.save()
	}
	async remove(id: string) {
		const existing = await this.measurementModel
			.findById(toObjectId(id))
			.exec()
		if (!existing) throw new NotFoundException('Measurement not found')
		await existing.deleteOne()
		return { deleted: true }
	}
	async summary(projectId: string) {
		const measurements = await this.measurementModel
			.find({ projectId: toObjectId(projectId, 'Invalid projectId') })
			.lean()
			.exec()
		const totalFloor = measurements.reduce(
			(sum, m) => sum + Number(m.floorArea),
			0
		)
		const totalWall = measurements.reduce(
			(sum, m) => sum + Number(m.wallArea),
			0
		)
		const avgHeight = measurements.length
			? measurements.reduce(
					(sum, m) => sum + Number(m.ceilingHeight),
					0
				) / measurements.length
			: 0
		return {
			count: measurements.length,
			totalFloorArea: totalFloor.toFixed(2),
			totalWallArea: totalWall.toFixed(2),
			avgCeilingHeight: avgHeight.toFixed(2),
		}
	}
}
