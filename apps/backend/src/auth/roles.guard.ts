import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RoleCode } from '../domain/enums'
import { normalizeWorkspaceRole } from './role-normalize'
import { ROLES_KEY } from './roles.decorator'
import { AuthenticatedRequest } from './request-user'
@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}
	canActivate(context: ExecutionContext) {
		const roles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])
		if (!roles?.length) {
			return true
		}
		const request = context
			.switchToHttp()
			.getRequest<AuthenticatedRequest>()
		const user = request.user
		const effective = user ? normalizeWorkspaceRole(user.role) : null
		const allowed =
			effective != null &&
			roles.some((r) => normalizeWorkspaceRole(r) === effective)
		if (!user || !allowed) {
			throw new ForbiddenException(
				'Not enough permissions for this action'
			)
		}
		return true
	}
}
