import {
	BadRequestException,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Req,
	Res,
	UploadedFile,
	UseGuards,
	UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { diskStorage } from 'multer'
import * as fs from 'fs'
import type { Response } from 'express'
import { RoleCode } from '../domain/enums'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { AuthenticatedRequest } from '../auth/request-user'
import { FilesService } from './files.service'
import { buildStoredFilename, resolveUploadRoot } from './files.util'
const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads'
@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
	constructor(private readonly filesService: FilesService) {}

	@Post('upload')
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: { file: { type: 'string', format: 'binary' } },
		},
	})
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.BRIGADIR,
		RoleCode.CLIENT,
	)
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: (_req, _file, cb) => {
					const dir = resolveUploadRoot(uploadRoot)
					fs.mkdirSync(dir, { recursive: true })
					cb(null, dir)
				},
				filename: (_req, file, cb) => {
					cb(
						null,
						buildStoredFilename(file.mimetype, file.originalname)
					)
				},
			}),
			limits: {
				fileSize:
					Number(process.env.UPLOAD_MAX_BYTES) > 0
						? Number(process.env.UPLOAD_MAX_BYTES)
						: 2097152,
			},
		})
	)
	upload(
		@UploadedFile()
		file: Express.Multer.File | undefined,
		@Req()
		req: AuthenticatedRequest,
		@Query('purpose')
		purpose?: string
	) {
		if (!file) {
			throw new BadRequestException('File is required')
		}
		if (purpose === 'AVATAR') {
			const allowed = ['image/jpeg', 'image/png', 'image/webp']
			if (!allowed.includes(file.mimetype)) {
				throw new BadRequestException(
					'Avatar must be JPEG, PNG, or WebP'
				)
			}
			const maxBytes = 512 * 1024
			if (file.size > maxBytes) {
				throw new BadRequestException(
					'Avatar must be 512 KB or smaller'
				)
			}
		}
		return this.filesService.handleUpload(file, req.user.id)
	}
	@Get(':id')
	@Roles(
		RoleCode.ADMIN,
		RoleCode.PROJECT_MANAGER,
		RoleCode.DESIGNER,
		RoleCode.BRIGADIR,
		RoleCode.CLIENT,
	)
	async download(
		@Param('id')
		id: string,
		@Res()
		res: Response
	) {
		const meta = await this.filesService.getFileRecord(id)
		if (meta.data) {
			res.setHeader('Content-Type', meta.mimeType)
			res.send(meta.data)
			return
		}
		const absolutePath = this.filesService.getAbsolutePath(meta.storagePath)
		res.setHeader('Content-Type', meta.mimeType)
		res.sendFile(absolutePath)
	}
}
