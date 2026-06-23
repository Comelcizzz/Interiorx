import { Navigate } from 'react-router-dom'
import type { RoleCode } from '@tailored/shared'
import { normalizeWorkspaceRole } from '@tailored/shared'
import { useAuthStore } from '@/lib/auth-store'

const CLIENT: RoleCode = 'CLIENT'

export function defaultHomePath(role: RoleCode | undefined): string {
	const effective = normalizeWorkspaceRole(role)
	if (effective === CLIENT || !effective) return '/portal/dashboard'
	if (effective === 'DESIGNER') return '/workspace/my-work'
	if (effective === 'PROJECT_MANAGER') return '/workspace/orders'
	return '/workspace/dashboard'
}

export function WorkspaceRoleGuard({ children }: { children: JSX.Element }) {
	const user = useAuthStore((s) => s.user)
	if (user?.role === CLIENT) {
		return <Navigate to="/portal/dashboard" replace />
	}
	return children
}

export function RequireWorkspaceRoles({
	children,
	roles,
}: {
	children: JSX.Element
	roles: readonly RoleCode[]
}) {
	const user = useAuthStore((s) => s.user)
	if (!user || user.role === CLIENT) {
		return <Navigate to="/portal/dashboard" replace />
	}
	const effective = normalizeWorkspaceRole(user.role) ?? user.role
	const allowed = roles.some(
		(r) => r === user.role || r === effective
	)
	if (!allowed) {
		return <Navigate to={defaultHomePath(user.role)} replace />
	}
	return children
}

export function PortalRoleGuard({ children }: { children: JSX.Element }) {
	const user = useAuthStore((s) => s.user)
	if (user && user.role !== CLIENT) {
		return <Navigate to={defaultHomePath(user.role)} replace />
	}
	return children
}
