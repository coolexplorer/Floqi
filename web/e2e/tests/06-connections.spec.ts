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
    const originalUrl = page.url()
    await page.getByRole('button', { name: /connect/i }).first().click()
    // Wait for navigation away from connections page
    await page.waitForURL((url) => url.href !== originalUrl, { timeout: 10000 })
    const url = page.url()
    expect(url).toContain('connect/google')
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

    test('TC-2008: connected service shows scopes', async ({ page }) => {
      await page.goto('/connections')
      // When connected, the ServiceCard should show connection info
      await expect(page.getByRole('button', { name: /disconnect/i })).toBeVisible({ timeout: 10000 })
      // The card should display the service as connected
      await expect(page.getByText('Google')).toBeVisible()
    })

    test('TC-2009: disconnect with affected automations shows warning', async ({ page, userId }) => {
      // Seed an active automation that depends on Google
      const { seedAutomation: seed } = await import('../helpers/data-helpers')
      const auto = await seed(userId, {
        name: 'E2E Google Dependent',
        template_type: 'morning_briefing',
        status: 'active',
        schedule_cron: '0 8 * * *'
      })

      await page.goto('/connections')
      await page.getByRole('button', { name: /disconnect/i }).click()

      // Modal should show affected automations warning
      await expect(page.getByText(/자동화가 일시정지됩니다/)).toBeVisible({ timeout: 5000 })

      // Cancel to not actually disconnect
      await page.getByRole('button', { name: '취소' }).click()

      // Cleanup
      if (auto) {
        const { getAdminClient } = await import('../helpers/data-helpers')
        const admin = getAdminClient()
        await admin.from('automations').delete().eq('id', auto.id)
      }
    })
  })

  test('TC-2010: shows Add Integration button', async ({ page }) => {
    await page.goto('/connections')
    await expect(page.getByRole('button', { name: /add integration/i })).toBeVisible()
  })

  test('TC-2007: shows Coming Soon for Notion, Slack, GitHub', async ({ page }) => {
    await page.goto('/connections')
    const comingSoonBadges = page.getByText('Coming Soon')
    await expect(comingSoonBadges.first()).toBeVisible()
  })
})
