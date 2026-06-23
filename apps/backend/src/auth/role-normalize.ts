import { RoleCode } from '../domain/enums'

/** Повертає роль без змін (legacy ролі видалено). */
export function normalizeWorkspaceRole(role: RoleCode): RoleCode {
	return role
}
