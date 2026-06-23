import { test as base, expect } from '@playwright/test'
import { demoPassword, demoUsers, type DemoRole } from '../helpers/demo-users'

const apiOrigin = process.env.API_URL ?? 'http://localhost:4000'

export async function loginViaApi(role: DemoRole): Promise<{
	accessToken: string
	user: { role: string; email: string }
}> {
	const response = await fetch(`${apiOrigin}/api/auth/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			email: demoUsers[role],
			password: demoPassword,
		}),
	})
	if (!response.ok) {
		throw new Error(`Login failed for ${role}: ${response.status}`)
	}
	return response.json() as Promise<{
		accessToken: string
		user: { role: string; email: string }
	}>
}

export const test = base.extend<{ role: DemoRole }>({
	role: ['manager', { option: true }],
})

export async function seedAuthInBrowser(
	page: import('@playwright/test').Page,
	role: DemoRole
) {
	const login = await loginViaApi(role)
	await page.addInitScript(
		({ token, user }) => {
			localStorage.setItem(
				'tailored.session',
				JSON.stringify({ token, user })
			)
		},
		{ token: login.accessToken, user: login.user }
	)
}

export { expect, demoUsers, demoPassword }
