import { test, expect } from '@playwright/test'

test.describe('Public marketing', () => {
	test('home page loads', async ({ page }) => {
		await page.goto('/')
		await expect(page.locator('body')).toBeVisible()
	})

	test('services catalog', async ({ page }) => {
		await page.goto('/services')
		await expect(page.getByRole('heading').first()).toBeVisible()
	})

	test('reviews page', async ({ page }) => {
		await page.goto('/reviews')
		await expect(page.locator('body')).toContainText(/відгук|review/i)
	})

	test('verify receipt page', async ({ page }) => {
		await page.goto('/verify/RCPT-2026-250568')
		await expect(page.getByText(/Перевірка чека/i)).toBeVisible()
	})

	test('anonymous service CTA opens auth', async ({ page }) => {
		await page.goto('/services/full-interior')
		const orderBtn = page.getByRole('button', {
			name: /замовити/i,
		})
		if (await orderBtn.isVisible()) {
			await orderBtn.click()
			await expect(
				page.getByRole('link', { name: /увійти/i })
			).toBeVisible()
		}
	})

	test('login page quick-picks', async ({ page }) => {
		await page.goto('/login')
		await expect(page.getByText('manager@tailored.demo')).toBeVisible()
		await expect(page.getByText('worker@tailored.demo')).toBeVisible()
	})
})
