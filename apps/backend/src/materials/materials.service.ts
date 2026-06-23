import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { InventoryMovementType } from '../domain/enums'
import { optionalToObjectId, toObjectId } from '../lib/object-id'
import { InventoryMovement } from '../mongo/schemas/inventory-movement.schema'
import { Material } from '../mongo/schemas/material.schema'
import { Supplier } from '../mongo/schemas/supplier.schema'
import { CreateMaterialMovementDto } from './dto/create-material-movement.dto'
import { escapeRegExp } from '../lib/regex'
import {
	applyDateRangeToWhere,
	parsePagination,
	resolveSort,
} from '../lib/list-query'
@Injectable()
export class MaterialsService {
	constructor(
		@InjectModel(Material.name)
		private readonly materialModel: Model<Material>,
		@InjectModel(Supplier.name)
		private readonly supplierModel: Model<Supplier>,
		@InjectModel(InventoryMovement.name)
		private readonly movementModel: Model<InventoryMovement>
	) {}
	async list(filters: {
		search?: string
		q?: string
		category?: string
		lowStock?: boolean
		page?: number
		perPage?: number
		from?: string
		to?: string
		sort?: string
	}) {
		const where: Record<string, unknown> = {}
		const searchTerm = (filters.q ?? filters.search)?.trim()
		if (searchTerm) {
			const re = new RegExp(escapeRegExp(searchTerm), 'i')
			const suppliers = await this.supplierModel
				.find({ name: re })
				.select('_id')
				.lean()
				.exec()
			where.$or = [
				{ name: re },
				{ sku: re },
				{ supplierId: { $in: suppliers.map((s) => s._id) } },
			]
		}
		if (filters.category) {
			where.category = filters.category
		}
		applyDateRangeToWhere(where, 'createdAt', filters.from, filters.to)
		const rows = await this.materialModel
			.find(where)
			.sort(
				filters.sort?.trim()
					? resolveSort(filters.sort, 'createdAt')
					: { category: 1, name: 1 }
			)
			.lean()
			.exec()
		const normalized = await Promise.all(
			rows.map(async (item) => {
				const supplier = item.supplierId
					? await this.supplierModel
							.findById(item.supplierId)
							.lean()
							.exec()
					: null
				const movements = await this.movementModel
					.find({ materialId: item._id })
					.sort({ createdAt: -1 })
					.limit(5)
					.lean()
					.exec()
				const stockQty = parseFloat(item.stockQty)
				const minStockQty = parseFloat(item.minStockQty)
				const purchasePrice = parseFloat(item.purchasePrice)
				const isLowStock = stockQty <= minStockQty
				return {
					id: item._id.toString(),
					sku: item.sku,
					name: item.name,
					category: item.category,
					unit: item.unit,
					purchasePrice: item.purchasePrice,
					salePrice: item.salePrice,
					stockQty: item.stockQty,
					minStockQty: item.minStockQty,
					isLowStock,
					stockValue: String(stockQty * purchasePrice),
					supplier: supplier
						? {
								id: supplier._id.toString(),
								name: supplier.name,
								contactName: supplier.contactName,
								city: supplier.city,
								reliability: supplier.reliability,
							}
						: null,
					recentMovements: movements.map((movement) => ({
						id: movement._id.toString(),
						type: movement.type,
						quantity: movement.quantity,
						reason: movement.reason,
						createdAt: movement.createdAt,
					})),
				}
			})
		)
		const all = filters.lowStock
			? normalized.filter((item) => item.isLowStock)
			: normalized
		const { page, perPage, skip } = parsePagination(
			filters.page,
			filters.perPage
		)
		const items = all.slice(skip, skip + perPage)
		return { items, total: all.length, page, perPage }
	}
	async detailBySku(sku: string) {
		const item = await this.materialModel
			.findOne({ sku: sku.trim() })
			.lean()
			.exec()
		if (!item) throw new NotFoundException('Material not found')
		const supplier = item.supplierId
			? await this.supplierModel.findById(item.supplierId).lean().exec()
			: null
		const movements = await this.movementModel
			.find({ materialId: item._id })
			.sort({ createdAt: -1 })
			.limit(40)
			.lean()
			.exec()
		const stockQty = parseFloat(item.stockQty)
		const minStockQty = parseFloat(item.minStockQty)
		const purchasePrice = parseFloat(item.purchasePrice)
		const isLowStock = stockQty <= minStockQty
		return {
			id: item._id.toString(),
			sku: item.sku,
			name: item.name,
			category: item.category,
			unit: item.unit,
			purchasePrice: item.purchasePrice,
			salePrice: item.salePrice,
			stockQty: item.stockQty,
			minStockQty: item.minStockQty,
			isLowStock,
			stockValue: String(stockQty * purchasePrice),
			supplier: supplier
				? {
						id: supplier._id.toString(),
						name: supplier.name,
						contactName: supplier.contactName,
						city: supplier.city,
						reliability: supplier.reliability,
					}
				: null,
			recentMovements: movements.map((movement) => ({
				id: movement._id.toString(),
				type: movement.type,
				quantity: movement.quantity,
				reason: movement.reason,
				createdAt: movement.createdAt,
			})),
		}
	}
	async overview() {
		const [materials, suppliers, movements] = await Promise.all([
			this.materialModel.find().lean().exec(),
			this.supplierModel.find().sort({ reliability: -1 }).lean().exec(),
			this.movementModel
				.find()
				.sort({ createdAt: -1 })
				.limit(12)
				.lean()
				.exec(),
		])
		const categoryMap = new Map<
			string,
			{
				count: number
				value: number
			}
		>()
		let totalValue = 0
		for (const item of materials) {
			const value =
				parseFloat(item.stockQty) * parseFloat(item.purchasePrice)
			const prev = categoryMap.get(item.category) ?? {
				count: 0,
				value: 0,
			}
			totalValue += value
			categoryMap.set(item.category, {
				count: prev.count + 1,
				value: prev.value + value,
			})
		}
		const suppliersOut = await Promise.all(
			suppliers.map(async (supplier) => ({
				id: supplier._id.toString(),
				name: supplier.name,
				city: supplier.city,
				reliability: supplier.reliability,
				materialsCount: await this.materialModel.countDocuments({
					supplierId: supplier._id,
				}),
			}))
		)
		return {
			totalMaterials: materials.length,
			totalStockValue: String(totalValue),
			lowStock: await Promise.all(
				materials
					.filter(
						(item) =>
							parseFloat(item.stockQty) <=
							parseFloat(item.minStockQty)
					)
					.map(async (item) => ({
						id: item._id.toString(),
						sku: item.sku,
						name: item.name,
						stockQty: item.stockQty,
						minStockQty: item.minStockQty,
						supplierName: item.supplierId
							? ((
									await this.supplierModel
										.findById(item.supplierId)
										.select('name')
										.lean()
										.exec()
								)?.name ?? null)
							: null,
					}))
			),
			byCategory: Array.from(categoryMap.entries()).map(
				([category, value]) => ({
					category,
					count: value.count,
					value: String(value.value),
				})
			),
			suppliers: suppliersOut,
			recentMovements: await Promise.all(
				movements.map(async (movement) => {
					const mat = await this.materialModel
						.findById(movement.materialId)
						.select('sku name')
						.lean()
						.exec()
					return {
						id: movement._id.toString(),
						materialSku: mat?.sku ?? '',
						materialName: mat?.name ?? '',
						type: movement.type,
						quantity: movement.quantity,
						reason: movement.reason,
						createdAt: movement.createdAt,
					}
				})
			),
		}
	}
	async createMovement(id: string, dto: CreateMaterialMovementDto) {
		const material = await this.materialModel
			.findById(toObjectId(id))
			.exec()
		if (!material) {
			throw new NotFoundException('Material not found')
		}
		const amount = parseFloat(dto.quantity)
		if (!Number.isFinite(amount) || amount <= 0) {
			throw new BadRequestException('Quantity must be greater than zero')
		}
		const stock = parseFloat(material.stockQty)
		const subtracting =
			dto.type === InventoryMovementType.RESERVE ||
			dto.type === InventoryMovementType.WRITE_OFF
		const nextStock = subtracting ? stock - amount : stock + amount
		if (nextStock < 0) {
			throw new BadRequestException('Movement would make stock negative')
		}
		const movement = await this.movementModel.create({
			materialId: material._id,
			type: dto.type,
			quantity: String(amount),
			reason: dto.reason,
			projectId: optionalToObjectId(dto.projectId, 'projectId'),
		})
		material.stockQty = String(nextStock)
		await material.save()
		return {
			id: movement.id,
			materialId: material.id,
			type: movement.type,
			quantity: movement.quantity,
			stockQty: material.stockQty,
		}
	}
}
