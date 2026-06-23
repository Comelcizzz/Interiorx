import { Request } from 'express'
import { RoleCode } from '../domain/enums'
export type AuthenticatedUser = {
	id: string
	email: string
	fullName: string
	role: RoleCode
	permissions: string[]
}
export type AuthenticatedRequest = Request & {
	user: AuthenticatedUser
}
