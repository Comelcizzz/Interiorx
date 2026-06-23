import {
	ConflictException,
	Injectable,
	UnauthorizedException,
	BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import * as bcrypt from 'bcrypt'
import { Model, Types } from 'mongoose'
import { SignOptions } from 'jsonwebtoken'
import { RoleCode } from '../domain/enums'
import { ClientProfile } from '../mongo/schemas/client-profile.schema'
import { Role } from '../mongo/schemas/role.schema'
import { User } from '../mongo/schemas/user.schema'
import { FilesService } from '../files/files.service'
import { LoginDto } from './dto/login.dto'
import { RegisterClientDto } from './dto/register-client.dto'
import { PatchMeDto } from './dto/patch-me.dto'
import { PatchAvatarDto } from './dto/patch-avatar.dto'
import { PatchPasswordDto } from './dto/patch-password.dto'
import { getJwtAccessSecret } from './jwt-access-secret'
import type { AuthUser } from './auth-user'
@Injectable()
export class AuthService {
	constructor(
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Role.name)
		private readonly roleModel: Model<Role>,
		@InjectModel(ClientProfile.name)
		private readonly clientModel: Model<ClientProfile>,
		private readonly jwt: JwtService,
		private readonly config: ConfigService,
		private readonly filesService: FilesService
	) {}
	async getPublicProfile(userId: string): Promise<AuthUser> {
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.exec()
		if (!user || !user.isActive) {
			throw new UnauthorizedException('User is not active')
		}
		const role = await this.roleModel.findById(user.roleId).exec()
		if (!role) {
			throw new UnauthorizedException('User is not active')
		}
		const avatarUrl = user.avatarFileId
			? await this.filesService.getPublicMediaPath(
					user.avatarFileId.toString()
				)
			: null
		return {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			phone: user.phone,
			title: user.title,
			role: role.code as RoleCode,
			permissions: role.permissions,
			avatarUrl,
		}
	}
	async updateMe(userId: string, dto: PatchMeDto) {
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.exec()
		if (!user) throw new UnauthorizedException()
		if (dto.fullName !== undefined) user.fullName = dto.fullName.trim()
		if (dto.phone !== undefined) user.phone = dto.phone.trim() || undefined
		await user.save()
		return this.getPublicProfile(userId)
	}
	async updateAvatar(userId: string, dto: PatchAvatarDto) {
		const file = await this.filesService.getFileRecord(dto.fileId)
		const allowed = ['image/jpeg', 'image/png', 'image/webp']
		if (!allowed.includes(file.mimeType)) {
			throw new BadRequestException(
				'Avatar file must be JPEG, PNG, or WebP'
			)
		}
		if (
			!file.uploadedBy ||
			!file.uploadedBy.equals(new Types.ObjectId(userId))
		) {
			throw new BadRequestException('Invalid file for avatar')
		}
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.exec()
		if (!user) throw new UnauthorizedException()
		user.avatarFileId = new Types.ObjectId(dto.fileId)
		await user.save()
		return this.getPublicProfile(userId)
	}
	async updatePassword(userId: string, dto: PatchPasswordDto) {
		const user = await this.userModel
			.findById(new Types.ObjectId(userId))
			.exec()
		if (!user) throw new UnauthorizedException()
		const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash)
		if (!ok) {
			throw new UnauthorizedException('Current password is incorrect')
		}
		user.passwordHash = await bcrypt.hash(dto.newPassword, 12)
		await user.save()
		return { ok: true }
	}
	async login(dto: LoginDto) {
		const user = await this.userModel
			.findOne({ email: dto.email.toLowerCase() })
			.exec()
		if (!user || !user.isActive) {
			throw new UnauthorizedException('Invalid email or password')
		}
		const ok = await bcrypt.compare(dto.password, user.passwordHash)
		if (!ok) {
			throw new UnauthorizedException('Invalid email or password')
		}
		const role = await this.roleModel.findById(user.roleId).exec()
		if (!role) {
			throw new UnauthorizedException('Invalid email or password')
		}
		const payload = {
			sub: user.id,
			email: user.email,
			role: role.code,
		}
		const accessToken = await this.jwt.signAsync(payload, {
			secret: getJwtAccessSecret(this.config),
			expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ??
				'24h') as SignOptions['expiresIn'],
		})
		const profile = await this.getPublicProfile(user.id)
		return {
			accessToken,
			user: profile,
		}
	}
	async registerClient(dto: RegisterClientDto) {
		const email = dto.email.toLowerCase()
		const exists = await this.userModel.findOne({ email }).exec()
		if (exists) {
			throw new ConflictException('Email already registered')
		}
		const role = await this.roleModel
			.findOne({ code: RoleCode.CLIENT })
			.exec()
		if (!role) {
			throw new UnauthorizedException('CLIENT role is not configured')
		}
		const passwordHash = await bcrypt.hash(dto.password, 12)
		const user = await this.userModel.create({
			email,
			passwordHash,
			fullName: dto.fullName,
			phone: dto.phone,
			roleId: role._id,
			isActive: true,
		})
		await this.clientModel.create({
			userId: user._id,
			companyName: dto.companyName ?? undefined,
			leadSource: 'Website registration',
		})
		return this.login({ email, password: dto.password })
	}
}
