import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { toObjectId } from '../lib/object-id'
import { Material } from '../mongo/schemas/material.schema'
import { Supplier } from '../mongo/schemas/supplier.schema'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'
@Injectable()
export class SuppliersService {
	constructor(
		@InjectModel(Supplier.name)
		private readonly supplierModel: Model<Supplier>,
		@InjectModel(Material.name)
		private readonly materialModel: Model<Material>
	) {}
	async list() {
		const suppliers = await this.supplierModel
			.find()
			.sort({ name: 1 })
			.lean()
			.exec()
		return Promise.all(
			suppliers.map(async (s) => ({
				...s,
				id: s._id.toString(),
				materialsCount: await this.materialModel.countDocuments({
					supplierId: s._id,
				}),
			}))
		)
	}
	async detail(id: string) {
		const supplier = await this.supplierModel
			.findById(toObjectId(id))
			.lean()
			.exec()
		if (!supplier) throw new NotFoundException('Supplier not found')
		const materials = await this.materialModel
			.find({ supplierId: supplier._id })
			.sort({ name: 1 })
			.limit(50)
			.lean()
			.exec()
		return { ...supplier, id: supplier._id.toString(), materials }
	}
	async create(dto: CreateSupplierDto) {
		const exists = await this.supplierModel
			.findOne({ name: dto.name })
			.exec()
		if (exists)
			throw new ConflictException(
				'Supplier with this name already exists'
			)
		return this.supplierModel.create(dto)
	}
	async update(id: string, dto: UpdateSupplierDto) {
		await this.detail(id)
		return this.supplierModel
			.findByIdAndUpdate(toObjectId(id), dto, { returnDocument: 'after' })
			.exec()
	}
	async remove(id: string) {
		await this.detail(id)
		await this.supplierModel.findByIdAndDelete(toObjectId(id)).exec()
		return { ok: true }
	}
}
