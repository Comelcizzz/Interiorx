import { create } from 'zustand'
import { setApiToken, setUnauthorizedHandler } from './api'
import { AuthUser } from './types'
type AuthState = {
	token: string | null
	user: AuthUser | null
	setSession: (token: string, user: AuthUser) => void
	logout: () => void
}
const rawSession = localStorage.getItem('tailored.session')
let parsedSession: {
	token: string
	user: AuthUser
} | null = null
if (rawSession) {
	try {
		parsedSession = JSON.parse(rawSession) as {
			token: string
			user: AuthUser
		}
	} catch {
		localStorage.removeItem('tailored.session')
		parsedSession = null
	}
}
if (parsedSession?.token) {
	setApiToken(parsedSession.token)
}
export const useAuthStore = create<AuthState>((set) => ({
	token: parsedSession?.token ?? null,
	user: parsedSession?.user ?? null,
	setSession: (token, user) => {
		localStorage.setItem(
			'tailored.session',
			JSON.stringify({ token, user })
		)
		setApiToken(token)
		set({ token, user })
	},
	logout: () => {
		localStorage.removeItem('tailored.session')
		setApiToken(null)
		set({ token: null, user: null })
	},
}))

setUnauthorizedHandler(() => {
	localStorage.removeItem('tailored.session')
	setApiToken(null)
	useAuthStore.setState({ token: null, user: null })
	const current = `${window.location.pathname}${window.location.search}`
	if (!window.location.pathname.startsWith('/login')) {
		window.location.assign(`/login?next=${encodeURIComponent(current)}`)
	}
})
