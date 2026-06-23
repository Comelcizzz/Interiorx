import { test, expect } from '@playwright/test'
import { seedAuthInBrowser } from './fixtures/auth'

test.describe('Supplier workspace', () => {
	test.beforeEach(async ({ page }) => {
		await seedAuthInBrowser(page, 'supplier')
	})

	test('removed materials page redirects to projects', async ({ page }) => {
		await page.goto('/workspace/materials')
		await expect(page).toHaveURL(/\/workspace\/projects/)
	})
})
