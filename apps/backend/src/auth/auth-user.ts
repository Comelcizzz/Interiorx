import { RoleCode } from '../domain/enums'
export type AuthUser = {
	id: string
	email: string
	fullName: string
	phone?: string
	title?: string
	role: RoleCode
	permissions: string[]
	avatarUrl?: string | null
}
declare module 'express-serve-static-core' {
	interface Request {
		user?: AuthUser
	}
}
