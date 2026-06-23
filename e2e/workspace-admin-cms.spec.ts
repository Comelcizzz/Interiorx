import { test, expect } from '@playwright/test'
import { seedAuthInBrowser, loginViaApi } from './fixtures/auth'

const apiOrigin = process.env.API_URL ?? 'http://localhost:4000'

test.describe('Admin CMS', () => {
	test.beforeEach(async ({ page }) => {
		await seedAuthInBrowser(page, 'admin')
	})

	test('catalog services editor', async ({ page }) => {
		await page.goto('/workspace/services')
		await expect(page.getByText(/каталог/i).first()).toBeVisible()
	})

	test('portfolio editor', async ({ page }) => {
		await page.goto('/workspace/portfolio')
		await expect(page.locator('body')).toBeVisible()
	})

	test('review moderation', async ({ page }) => {
		await page.goto('/workspace/reviews')
		await expect(page.getByText(/модерація відгуків/i)).toBeVisible()
	})
})

test.describe('Admin API contracts', () => {
	test('paginated receipts', async () => {
		const login = await loginViaApi('admin')
		const res = await fetch(
			`${apiOrigin}/api/receipts?page=1&perPage=5`,
			{ headers: { authorization: `Bearer ${login.accessToken}` } }
		)
		expect(res.ok).toBeTruthy()
		const body = await res.json()
		expect(Array.isArray(body.items)).toBe(true)
		expect(typeof body.total).toBe('number')
	})

	test('paginated estimates', async () => {
		const login = await loginViaApi('manager')
		const res = await fetch(
			`${apiOrigin}/api/estimates?page=1&perPage=5`,
			{ headers: { authorization: `Bearer ${login.accessToken}` } }
		)
		expect(res.ok).toBeTruthy()
		const body = await res.json()
		expect(Array.isArray(body.items)).toBe(true)
	})

	test('paginated receipts', async () => {
		const login = await loginViaApi('accountant')
		const res = await fetch(
			`${apiOrigin}/api/receipts?page=1&perPage=5`,
			{ headers: { authorization: `Bearer ${login.accessToken}` } }
		)
		expect(res.ok).toBeTruthy()
		const body = await res.json()
		expect(Array.isArray(body.items)).toBe(true)
	})

	test('crm stats aggregate', async () => {
		const login = await loginViaApi('manager')
		const res = await fetch(`${apiOrigin}/api/crm/stats`, {
			headers: { authorization: `Bearer ${login.accessToken}` },
		})
		expect(res.ok).toBeTruthy()
		const body = await res.json()
		expect(typeof body.ordersCount).toBe('number')
		expect(body.pipelineBudget).toBeDefined()
	})
})
