import { getModelToken } from '@nestjs/mongoose'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'
import type { Model } from 'mongoose'
import { UploadedFileEntity } from '../mongo/schemas/uploaded-file.schema'

export function setupUploadsHandler(app: NestExpressApplication) {
	const fileModel = app.get<Model<UploadedFileEntity>>(
		getModelToken(UploadedFileEntity.name)
	)
	app.use('/uploads', async (req: Request, res: Response, next: NextFunction) => {
		if (req.method !== 'GET' && req.method !== 'HEAD') {
			next()
			return
		}
		const relative = decodeURIComponent(req.path.replace(/^\/+/, ''))
		if (!relative) {
			next()
			return
		}
		const storagePath = relative.startsWith('uploads/')
			? relative
			: `uploads/${relative}`
		const doc = await fileModel
			.findOne({ storagePath })
			.select('data mimeType size')
			.lean()
			.exec()
		if (!doc?.data) {
			next()
			return
		}
		res.setHeader('Content-Type', doc.mimeType)
		res.setHeader('Content-Length', String(doc.size))
		if (req.method === 'HEAD') {
			res.end()
			return
		}
		res.send(doc.data)
	})
}
