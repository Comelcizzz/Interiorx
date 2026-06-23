import { test, expect } from '@playwright/test'
import { seedAuthInBrowser } from './fixtures/auth'

test.describe('Manager workspace', () => {
	test.beforeEach(async ({ page }) => {
		await seedAuthInBrowser(page, 'manager')
	})

	test('CRM pipeline without NaN', async ({ page }) => {
		await page.goto('/workspace/crm')
		await expect(page.getByText(/NaN/)).toHaveCount(0)
		await expect(page.getByText(/бюджет pipeline/i)).toBeVisible()
	})

	test('projects pagination', async ({ page }) => {
		await page.goto('/workspace/projects')
		await expect(page.getByText(/з \d+/i).first()).toBeVisible({
			timeout: 15_000,
		})
	})

	test('receipts page', async ({ page }) => {
		await page.goto('/workspace/receipts')
		await expect(page.getByRole('heading', { name: /чеки/i })).toBeVisible()
	})

	test('estimates page', async ({ page }) => {
		await page.goto('/workspace/estimates')
		await expect(page.getByRole('heading', { name: /кошторис/i })).toBeVisible()
	})

	test('measurements page', async ({ page }) => {
		await page.goto('/workspace/measurements')
		await expect(page.locator('body')).toBeVisible()
	})
})
