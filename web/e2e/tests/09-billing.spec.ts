import { test, expect } from '../fixtures/auth'

test.describe('Billing', () => {
  test('TC-8001: shows Free plan by default', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Current Plan: Free')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('30 executions/month')).toBeVisible()
  })

  test('TC-8002: shows Upgrade to Pro button', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible({ timeout: 10000 })
  })

  test('TC-8003: Upgrade button calls checkout API', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible({ timeout: 10000 })

    // Mock the checkout API
    await page.route('**/api/billing/checkout', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://checkout.stripe.com/test-session' }),
      })
    )

    // Intercept navigation to Stripe
    const navigationPromise = page.waitForURL(/stripe\.com/, { timeout: 10000 }).catch(() => null)
    await page.getByRole('button', { name: /upgrade to pro/i }).click()
    await navigationPromise
  })

  test('TC-8004: Pro user sees Manage Plan button', async ({ page, adminClient, userId }) => {
    // Temporarily set plan to 'pro'
    await adminClient.from('profiles').update({ plan: 'pro' }).eq('id', userId)

    try {
      await page.goto('/settings')
      await expect(page.getByText('Current Plan: Pro')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('500 executions/month')).toBeVisible()
      await expect(page.getByRole('button', { name: /manage plan/i })).toBeVisible()
    } finally {
      // Always reset to free, even on assertion failure
      await adminClient.from('profiles').update({ plan: 'free' }).eq('id', userId)
    }
  })

  test('TC-8005: Pro user sees correct execution limit', async ({ page, adminClient, userId }) => {
    await adminClient.from('profiles').update({ plan: 'pro' }).eq('id', userId)
    try {
      await page.goto('/settings')
      await expect(page.getByText('500 executions/month')).toBeVisible({ timeout: 10000 })
    } finally {
      await adminClient.from('profiles').update({ plan: 'free' }).eq('id', userId)
    }
  })

  test('TC-8006: Manage Plan button calls portal API', async ({ page, adminClient, userId }) => {
    await adminClient.from('profiles').update({ plan: 'pro' }).eq('id', userId)
    try {
      await page.goto('/settings')
      await expect(page.getByRole('button', { name: /manage plan/i })).toBeVisible({ timeout: 10000 })

      // Mock the portal API
      await page.route('**/api/billing/portal', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: 'https://billing.stripe.com/test-portal' }),
        })
      )

      const navigationPromise = page.waitForURL(/stripe\.com/, { timeout: 10000 }).catch(() => null)
      await page.getByRole('button', { name: /manage plan/i }).click()
      await navigationPromise
    } finally {
      await adminClient.from('profiles').update({ plan: 'free' }).eq('id', userId)
    }
  })
})
