import { test, expect } from '@playwright/test'
import { seedAuthInBrowser } from './fixtures/auth'

test.describe('Worker workspace', () => {
	test('worker index redirects to kanban', async ({ page }) => {
		await seedAuthInBrowser(page, 'worker')
		await page.goto('/workspace')
		await expect(page).toHaveURL(/\/workspace\/kanban/)
	})

	test('kanban visible', async ({ page }) => {
		await seedAuthInBrowser(page, 'worker')
		await page.goto('/workspace/kanban')
		await expect(page.locator('body')).toBeVisible()
	})
})

test.describe('Worker lead workspace', () => {
	test('lead kanban and operations nav', async ({ page }) => {
		await seedAuthInBrowser(page, 'lead')
		await page.goto('/workspace/kanban')
		await expect(page).toHaveURL(/\/workspace\/kanban/)
		await page.goto('/workspace/operations')
		await expect(page).toHaveURL(/\/workspace\/operations/)
	})
})
