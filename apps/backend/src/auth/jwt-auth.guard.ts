import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { RoleCode } from '../domain/enums'
import { Role } from '../mongo/schemas/role.schema'
import { User } from '../mongo/schemas/user.schema'
import { getJwtAccessSecret } from './jwt-access-secret'
import { AuthenticatedRequest } from './request-user'
@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly jwt: JwtService,
		private readonly config: ConfigService,
		@InjectModel(User.name)
		private readonly userModel: Model<User>,
		@InjectModel(Role.name)
		private readonly roleModel: Model<Role>
	) {}
	async canActivate(context: ExecutionContext) {
		const request = context
			.switchToHttp()
			.getRequest<AuthenticatedRequest>()
		const header = request.headers.authorization
		if (!header?.startsWith('Bearer ')) {
			throw new UnauthorizedException('Missing bearer token')
		}
		const token = header.slice('Bearer '.length)
		let payload: {
			sub: string
		}
		try {
			payload = await this.jwt.verifyAsync(token, {
				secret: getJwtAccessSecret(this.config),
			})
		} catch {
			throw new UnauthorizedException('Invalid bearer token')
		}
		if (!Types.ObjectId.isValid(payload.sub)) {
			throw new UnauthorizedException('Invalid bearer token')
		}
		const user = await this.userModel
			.findById(new Types.ObjectId(payload.sub))
			.exec()
		if (!user || !user.isActive) {
			throw new UnauthorizedException('User is not active')
		}
		const role = await this.roleModel.findById(user.roleId).exec()
		if (!role) {
			throw new UnauthorizedException('User is not active')
		}
		request.user = {
			id: user.id,
			email: user.email,
			fullName: user.fullName,
			role: role.code as RoleCode,
			permissions: role.permissions,
		}
		return true
	}
}
