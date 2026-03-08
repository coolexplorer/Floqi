import { test, expect } from '../fixtures/auth'
import { seedConnection, cleanupConnections } from '../helpers/data-helpers'

test.describe('Connections', () => {
  test('TC-2001: shows Google service card', async ({ page }) => {
    await page.goto('/connections')
    await expect(page.getByText('Google')).toBeVisible()
  })

  test('TC-2002: shows Connect button when not connected', async ({ page }) => {
    await page.goto('/connections')
    await expect(page.getByRole('button', { name: /connect/i }).first()).toBeVisible()
  })

  test('TC-2003: Connect button navigates to Google OAuth', async ({ page }) => {
    await page.goto('/connections')
    // Intercept the navigation to avoid actual OAuth
    const navigationPromise = page.waitForURL(/\/api\/auth\/connect\/google|accounts\.google/, { timeout: 10000 }).catch(() => null)
    await page.getByRole('button', { name: /connect/i }).first().click()
    await navigationPromise
    // Verify URL changed toward OAuth
    const url = page.url()
    expect(url.includes('connect/google') || url.includes('google')).toBeTruthy()
  })

  test.describe('With connection', () => {
    test.beforeEach(async ({ userId }) => {
      await cleanupConnections(userId)
      await seedConnection(userId)
    })

    test.afterEach(async ({ userId }) => {
      await cleanupConnections(userId)
    })

    test('TC-2004: shows Disconnect button when connected', async ({ page }) => {
      await page.goto('/connections')
      await expect(page.getByRole('button', { name: /disconnect/i })).toBeVisible({ timeout: 10000 })
    })

    test('TC-2005: Disconnect opens confirmation modal', async ({ page }) => {
      await page.goto('/connections')
      await page.getByRole('button', { name: /disconnect/i }).click()
      await expect(page.getByText('서비스 연결 해제')).toBeVisible()
      await expect(page.getByText('Google 서비스 연결을 해제하시겠습니까?')).toBeVisible()
    })

    test('TC-2006: Cancel disconnect closes modal', async ({ page }) => {
      await page.goto('/connections')
      await page.getByRole('button', { name: /disconnect/i }).click()
      await expect(page.getByText('서비스 연결 해제')).toBeVisible()
      await page.getByRole('button', { name: '취소' }).click()
      await expect(page.getByText('서비스 연결 해제')).toBeHidden()
    })
  })

  test('TC-2007: shows Coming Soon for Notion, Slack, GitHub', async ({ page }) => {
    await page.goto('/connections')
    const comingSoonBadges = page.getByText('Coming Soon')
    await expect(comingSoonBadges.first()).toBeVisible()
  })
})
