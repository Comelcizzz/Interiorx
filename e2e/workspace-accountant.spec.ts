import { test, expect } from '@playwright/test'
import { seedAuthInBrowser } from './fixtures/auth'

test.describe('Accountant workspace', () => {
	test.beforeEach(async ({ page }) => {
		await seedAuthInBrowser(page, 'accountant')
	})

	test('dashboard accessible', async ({ page }) => {
		await page.goto('/workspace/dashboard')
		await expect(page).toHaveURL(/\/workspace\/dashboard/)
	})

	test('CRM redirect away', async ({ page }) => {
		await page.goto('/workspace/crm')
		await expect(page).toHaveURL(/\/workspace\/dashboard/)
	})

	test('payments page', async ({ page }) => {
		await page.goto('/workspace/payments')
		await expect(page.locator('body')).toBeVisible()
	})

	test('receipts archive', async ({ page }) => {
		await page.goto('/workspace/receipts')
		await expect(page.getByText(/архів чеків/i)).toBeVisible()
	})
})
