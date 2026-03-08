import { test, expect } from '../fixtures/auth'

test.describe('Dashboard', () => {
  test('TC-4001: renders 4 stat cards', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="stat-active-automations"]')).toBeVisible()
    await expect(page.locator('[data-testid="stat-execution-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="stat-tokens-used"]')).toBeVisible()
    await expect(page.locator('[data-testid="stat-success-rate"]')).toBeVisible()
  })

  test('TC-4002: renders execution trend chart', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="execution-trend-chart"]')).toBeVisible({ timeout: 10000 })
  })

  test('TC-4003: renders success rate chart', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="success-rate-chart"]')).toBeVisible({ timeout: 10000 })
  })

  test('TC-4004: shows recent automations and executions', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Recent Automations')).toBeVisible()
    await expect(page.getByText('Recent Executions')).toBeVisible()
    // Seed data should show at least one automation
    await expect(page.getByText('E2E Morning Briefing')).toBeVisible({ timeout: 10000 })
  })
})
