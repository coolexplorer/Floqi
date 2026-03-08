import { test, expect } from '../fixtures/auth'

test.describe('Execution Logs', () => {
  test('TC-6001: renders logs page with heading', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('Execution Logs')).toBeVisible()
  })

  test('TC-6002: shows seed execution logs', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
  })

  test('TC-6003: filter by status - success', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    await page.getByLabel('Success').check()
    const successBadges = page.getByText('success', { exact: true })
    await expect(successBadges.first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-6004: filter by status - error', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    await page.getByLabel('Failed').check()
    const errorBadges = page.getByText('error', { exact: true })
    await expect(errorBadges.first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-6005: filter by automation', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    const automationFilter = page.locator('#filter-automation')
    await automationFilter.selectOption({ label: 'E2E Morning Briefing' })
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-6006: clear filters resets all', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    await page.getByLabel('Success').check()
    await expect(page.getByLabel('Success')).toBeChecked()
    await page.getByRole('button', { name: /clear filters/i }).click()
    await expect(page.getByLabel('All').first()).toBeChecked()
  })

  test('TC-6007: filter by date range', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    const dateFilter = page.locator('#filter-date-range')
    await dateFilter.selectOption('last_7_days')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-6008: click log entry navigates to detail', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    // Click on a log entry row (LogEntry component renders clickable rows)
    const logRow = page.locator('[role="button"], .cursor-pointer').first()
    if (await logRow.count() > 0) {
      await logRow.click()
    } else {
      // Fallback: click on the automation group's first visible entry
      await page.getByText('E2E Morning Briefing').first().click()
    }
    await page.waitForURL(/\/logs\//, { timeout: 10000 })
    await expect(page).toHaveURL(/\/logs\//)
  })

  test('TC-6009: log detail shows automation name and status', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    const logRow = page.locator('[role="button"], .cursor-pointer').first()
    if (await logRow.count() > 0) {
      await logRow.click()
    } else {
      await page.getByText('E2E Morning Briefing').first().click()
    }
    await page.waitForURL(/\/logs\//, { timeout: 10000 })

    await expect(page.getByText('E2E Morning Briefing')).toBeVisible()
    const badge = page.getByText(/success|error/)
    await expect(badge.first()).toBeVisible()
  })

  test('TC-6010: log detail shows tool calls timeline', async ({ page }) => {
    await page.goto('/logs')
    await expect(page.getByText('E2E Morning Briefing').first()).toBeVisible({ timeout: 10000 })
    const logRow = page.locator('[role="button"], .cursor-pointer').first()
    if (await logRow.count() > 0) {
      await logRow.click()
    } else {
      await page.getByText('E2E Morning Briefing').first().click()
    }
    await page.waitForURL(/\/logs\//, { timeout: 10000 })

    await expect(page.getByText('Tool Calls')).toBeVisible()
    await expect(page.getByRole('button', { name: /back to logs/i })).toBeVisible()
  })
})
