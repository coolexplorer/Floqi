import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('TC-9001: renders hero section with headline', async ({ page }) => {
    await page.goto('/')
    const hero = page.locator('[data-testid="hero"]')
    await expect(hero).toBeVisible()
    await expect(hero).toContainText('Automate Your Day with AI')
  })

  test('TC-9002: displays 5 template cards', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < 5; i++) {
      await expect(page.locator(`[data-testid="template-card-${i}"]`)).toBeVisible()
    }
  })

  test('TC-9003: displays pricing section', async ({ page }) => {
    await page.goto('/')
    const pricing = page.locator('[data-testid="pricing-section"]')
    await expect(pricing).toBeVisible()
    await expect(pricing).toContainText('Free')
    await expect(pricing).toContainText('Pro')
    await expect(pricing).toContainText('BYOK')
  })

  test('TC-9004: "Get started" CTA navigates to /signup', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /get started/i }).first().click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('TC-9005: "Sign In" link navigates to /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('TC-9006: How It Works section with 3 steps', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-testid="step-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="step-2"]')).toBeVisible()
    await expect(page.locator('[data-testid="step-3"]')).toBeVisible()
  })
})
