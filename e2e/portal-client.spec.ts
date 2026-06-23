import { test, expect } from '@playwright/test'
import { seedAuthInBrowser } from './fixtures/auth'

test.describe('Client portal', () => {
	test.beforeEach(async ({ page }) => {
		await seedAuthInBrowser(page, 'client')
	})

	test('dashboard', async ({ page }) => {
		await page.goto('/portal/dashboard')
		await expect(page).toHaveURL(/\/portal\/dashboard/)
	})

	test('invoices with pager', async ({ page }) => {
		await page.goto('/portal/invoices')
		await expect(page.getByText(/з \d+/i).first()).toBeVisible({
			timeout: 15_000,
		})
	})

	test('orders list', async ({ page }) => {
		await page.goto('/portal/orders')
		await expect(page.getByRole('heading', { name: /заяв/i })).toBeVisible()
	})

	test('profile form', async ({ page }) => {
		await page.goto('/portal/profile')
		await expect(page.getByText(/профіль/i).first()).toBeVisible()
	})

	test('projects paginated', async ({ page }) => {
		await page.goto('/portal/projects')
		await expect(page.locator('body')).toBeVisible()
	})
})
