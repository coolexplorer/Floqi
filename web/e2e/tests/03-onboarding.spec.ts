import { test, expect } from '@playwright/test'
import { createTempUser, deleteTempUser, getAdminClient } from '../helpers/data-helpers'

test.describe('Onboarding', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  let tempUserId: string | null = null
  const email = `e2e-onboard-${Date.now()}@floqi.test`
  const password = 'TestPassword123!'

  test.beforeAll(async () => {
    const user = await createTempUser(email, password)
    tempUserId = user.id
    // Leave onboarding_completed = false (default)
  })

  test.afterAll(async () => {
    if (tempUserId) {
      await deleteTempUser(tempUserId)
    }
  })

  test('TC-1018: new user login redirects to onboarding', async ({ page }) => {
    // Use fresh context (no storageState)
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    // After login, middleware should redirect to onboarding
    await page.waitForURL('**/onboarding', { timeout: 30000 })
    await expect(page).toHaveURL(/\/onboarding/)
    await expect(page.getByText('Welcome to Floqi')).toBeVisible()
  })

  test('TC-1019: complete onboarding redirects to dashboard', async ({ page }) => {
    // Reset onboarding_completed to false for this test
    if (tempUserId) {
      const admin = getAdminClient()
      await admin.from('profiles').update({ onboarding_completed: false }).eq('id', tempUserId)
    }

    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await page.waitForURL('**/onboarding', { timeout: 30000 })

    // Select timezone
    await page.getByLabel(/timezone/i).selectOption('Asia/Seoul')
    // Select language
    await page.getByLabel(/language/i).selectOption('ko')
    // Submit
    await page.getByRole('button', { name: /시작하기|get started/i }).click()
    await page.waitForURL('**/dashboard', { timeout: 30000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
