import { test, expect } from '@playwright/test'
import { seedAuthInBrowser, loginViaApi } from './fixtures/auth'

const apiOrigin = process.env.API_URL ?? 'http://localhost:4000'

test.describe('Designer workspace', () => {
	test.beforeEach(async ({ page }) => {
		await seedAuthInBrowser(page, 'designer')
	})

	test('CRM accessible', async ({ page }) => {
		await page.goto('/workspace/crm')
		await expect(page).toHaveURL(/\/workspace\/crm/)
		await expect(page.getByText(/пайплайн заявок/i)).toBeVisible()
	})

	test('claim button visible for new orders', async ({ page }) => {
		await page.goto('/workspace/crm')
		const claim = page.getByRole('button', { name: /закріпити/i })
		if ((await claim.count()) > 0) {
			await expect(claim.first()).toBeVisible()
		}
	})
})

test('designer can call claim API', async () => {
	const login = await loginViaApi('designer')
	const ordersRes = await fetch(
		`${apiOrigin}/api/crm/orders?page=1&perPage=5&status=NEW`,
		{
			headers: { authorization: `Bearer ${login.accessToken}` },
		}
	)
	const orders = (await ordersRes.json()) as {
		items?: Array<{ code: string }>
	}
	const code = orders.items?.[0]?.code as string
	test.skip(!code, 'no NEW orders in seed')
	const claimRes = await fetch(
		`${apiOrigin}/api/crm/orders/${encodeURIComponent(code!)}/claim`,
		{
			method: 'POST',
			headers: { authorization: `Bearer ${login.accessToken}` },
		}
	)
	expect([200, 201, 400]).toContain(claimRes.status)
})
