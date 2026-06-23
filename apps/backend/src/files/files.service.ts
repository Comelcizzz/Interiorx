import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { Model, Types } from 'mongoose'
import { toObjectId } from '../lib/object-id'
import { UploadedFileEntity } from '../mongo/schemas/uploaded-file.schema'
import {
	decodeUploadOriginalName,
	resolveStoredFilePath,
} from './files.util'

const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads'
const persistUploadsInDb =
	process.env.PERSIST_UPLOADS_IN_DB === 'true' ||
	process.env.NODE_ENV === 'production'

@Injectable()
export class FilesService {
	constructor(
		@InjectModel(UploadedFileEntity.name)
		private readonly fileModel: Model<UploadedFileEntity>
	) {}

	async handleUpload(file: Express.Multer.File, userId?: string) {
		const originalName = decodeUploadOriginalName(file.originalname)
		const storagePath = path.posix.join(
			uploadRoot.replace(/\\/g, '/'),
			file.filename
		)
		const absolutePath = resolveStoredFilePath(uploadRoot, storagePath)
		const buffer = fs.readFileSync(absolutePath)
		const sha256 = createHash('sha256').update(buffer).digest('hex')
		const existing = await this.fileModel.findOne({ sha256 }).lean().exec()

		if (existing) {
			const existingAbs = resolveStoredFilePath(
				uploadRoot,
				existing.storagePath
			)
			if (fs.existsSync(existingAbs)) {
				fs.unlinkSync(absolutePath)
				return {
					id: existing._id.toString(),
					url: this.toPublicUrl(existing.storagePath),
					deduped: true,
					originalName: existing.originalName,
					size: existing.size,
					mimeType: existing.mimeType,
				}
			}
			await this.fileModel.updateOne(
				{ _id: existing._id },
				{
					$set: {
						storagePath,
						originalName,
						mimeType: file.mimetype,
						size: file.size,
						uploadedBy: userId
							? new Types.ObjectId(userId)
							: undefined,
					},
				}
			)
			return {
				id: existing._id.toString(),
				url: this.toPublicUrl(storagePath),
				deduped: false,
				originalName,
				size: file.size,
				mimeType: file.mimetype,
			}
		}

		const created = await this.fileModel.create({
			originalName,
			storagePath,
			mimeType: file.mimetype,
			size: file.size,
			sha256,
			data: persistUploadsInDb ? buffer : undefined,
			uploadedBy: userId ? new Types.ObjectId(userId) : undefined,
		})
		if (persistUploadsInDb) {
			fs.unlinkSync(absolutePath)
		}
		return {
			id: created.id,
			url: this.toPublicUrl(storagePath),
			deduped: false,
			originalName,
			size: file.size,
			mimeType: file.mimetype,
		}
	}

	async getFileRecord(id: string) {
		const doc = await this.fileModel
			.findById(toObjectId(id, 'Invalid file id'))
			.lean()
			.exec()
		if (!doc) throw new NotFoundException('File not found')
		return doc
	}

	async getPublicMediaPath(fileId: string): Promise<string | null> {
		const doc = await this.fileModel
			.findById(toObjectId(fileId, 'Invalid file id'))
			.select('storagePath')
			.lean()
			.exec()
		if (!doc) return null
		const abs = resolveStoredFilePath(uploadRoot, doc.storagePath)
		if (!fs.existsSync(abs)) return null
		return this.toPublicUrl(doc.storagePath)
	}

	getAbsolutePath(storagePath: string) {
		return resolveStoredFilePath(uploadRoot, storagePath)
	}

	private toPublicUrl(storagePath: string) {
		const normalized = storagePath.replace(/\\/g, '/')
		if (normalized.startsWith('/uploads/')) return normalized
		const fileName = path.posix.basename(normalized)
		return `/uploads/${fileName}`
	}
}
