/** Активні ролі workspace (основний бізнес-флоу). */
export const WORKSPACE_CORE_ROLES = [
	'ADMIN',
	'PROJECT_MANAGER',
	'DESIGNER',
	'BRIGADIR',
] as const

export type WorkspaceCoreRole = (typeof WORKSPACE_CORE_ROLES)[number]

export type WorkspaceRoleCode = WorkspaceCoreRole | 'CLIENT'

/** Повертає актуальну core-роль або undefined для невідомих кодів. */
export function normalizeWorkspaceRole(
	role: WorkspaceRoleCode | string | undefined
): WorkspaceCoreRole | 'CLIENT' | undefined {
	if (!role) return undefined
	if (role === 'CLIENT') return 'CLIENT'
	if (
		role === 'ADMIN' ||
		role === 'PROJECT_MANAGER' ||
		role === 'DESIGNER' ||
		role === 'BRIGADIR'
	) {
		return role as WorkspaceCoreRole
	}
	return undefined
}

export function isWorkspaceCoreRole(
	code: string
): code is WorkspaceCoreRole {
	return (WORKSPACE_CORE_ROLES as readonly string[]).includes(code)
}
