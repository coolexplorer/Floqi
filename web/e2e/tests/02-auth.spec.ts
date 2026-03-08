import { test, expect } from '@playwright/test'
import { createTempUser, deleteTempUser } from '../helpers/data-helpers'

test.describe('Authentication', () => {
  test.describe('Signup', () => {
    let tempUserId: string | null = null

    test.afterEach(async () => {
      if (tempUserId) {
        await deleteTempUser(tempUserId)
        tempUserId = null
      }
    })

    test('TC-1001: valid signup redirects to dashboard', async ({ page }) => {
      const email = `e2e-signup-${Date.now()}@floqi.test`
      await page.goto('/signup')
      await page.getByLabel('Email').fill(email)
      await page.getByLabel(/password/i).fill('TestPassword123!')
      await page.getByRole('button', { name: 'Sign Up' }).click()
      await page.waitForURL('**/dashboard', { timeout: 30000 })
      await expect(page).toHaveURL(/\/dashboard/)

      // Clean up: find and delete the user
      const { getAdminClient } = await import('../helpers/data-helpers')
      const admin = getAdminClient()
      const { data } = await admin.auth.admin.listUsers()
      const user = data?.users?.find((u) => u.email === email)
      if (user) tempUserId = user.id
    })

    test('TC-1002: password under 8 chars shows error', async ({ page }) => {
      await page.goto('/signup')
      await page.getByLabel('Email').fill('test@floqi.test')
      await page.getByLabel(/password/i).fill('short')
      await page.getByRole('button', { name: 'Sign Up' }).click()
      await expect(page.getByText('8자 이상 입력하세요')).toBeVisible()
    })

    test('TC-1003: invalid email shows error', async ({ page }) => {
      await page.goto('/signup')
      await page.getByLabel('Email').fill('not-an-email')
      await page.getByLabel(/password/i).fill('TestPassword123!')
      await page.getByRole('button', { name: 'Sign Up' }).click()
      await expect(page.getByText('Invalid email address')).toBeVisible()
    })

    test('TC-1004: empty email shows error', async ({ page }) => {
      await page.goto('/signup')
      await page.getByLabel(/password/i).fill('TestPassword123!')
      await page.getByRole('button', { name: 'Sign Up' }).click()
      await expect(page.getByText('Email is required')).toBeVisible()
    })

    test('TC-1011: duplicate email signup shows error', async ({ page }) => {
      // Use the same email as the global test user
      await page.goto('/signup')
      await page.getByLabel('Email').fill('e2e-test@floqi.test')
      await page.getByLabel(/password/i).fill('TestPassword123!')
      await page.getByRole('button', { name: 'Sign Up' }).click()
      // Supabase returns error for duplicate email
      await expect(page.locator('[id="signup-error"]')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Login', () => {
    let tempUserId: string | null = null
    const loginEmail = `e2e-login-${Date.now()}@floqi.test`
    const loginPassword = 'TestPassword123!'

    test.beforeAll(async () => {
      const user = await createTempUser(loginEmail, loginPassword)
      tempUserId = user.id

      // Set onboarding_completed to true
      const { getAdminClient } = await import('../helpers/data-helpers')
      const admin = getAdminClient()
      await admin.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    })

    test.afterAll(async () => {
      if (tempUserId) {
        await deleteTempUser(tempUserId)
      }
    })

    test('TC-1005: valid login redirects to dashboard', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel('Email').fill(loginEmail)
      await page.getByLabel('Password').fill(loginPassword)
      await page.getByRole('button', { name: 'Sign In' }).click()
      await page.waitForURL('**/dashboard', { timeout: 30000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('TC-1006: wrong password shows error toast', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel('Email').fill(loginEmail)
      await page.getByLabel('Password').fill('WrongPassword123!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page.locator('[id="login-error"]')).toBeVisible({ timeout: 10000 })
    })

    test('TC-1007: empty email shows error', async ({ page }) => {
      await page.goto('/login')
      await page.getByLabel('Password').fill('TestPassword123!')
      await page.getByRole('button', { name: 'Sign In' }).click()
      await expect(page.getByText('Email is required')).toBeVisible()
    })
  })

  test.describe('Google OAuth', () => {
    test('TC-1008: Google OAuth button exists on login page', async ({ page }) => {
      await page.goto('/login')
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    })

    test('TC-1009: Google OAuth button initiates OAuth flow', async ({ page }) => {
      await page.goto('/login')
      const loginUrl = page.url()
      await page.getByRole('button', { name: /continue with google/i }).click()
      // OAuth should redirect away from /login to Supabase/Google
      await page.waitForURL((url) => url.href !== loginUrl, { timeout: 10000 })
      const newUrl = page.url()
      expect(newUrl).not.toBe(loginUrl)
      expect(newUrl).toMatch(/supabase|google|accounts\.google\.com/)
    })

    test('TC-1010: Sign Up link on login page navigates to /signup', async ({ page }) => {
      await page.goto('/login')
      await page.getByRole('link', { name: /sign up/i }).click()
      await expect(page).toHaveURL(/\/signup/)
    })

    test('TC-1017: Sign In link on signup page navigates to /login', async ({ page }) => {
      await page.goto('/signup')
      await page.getByRole('link', { name: /sign in/i }).click()
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Auth Redirects', () => {
    test('TC-1012: authenticated user on landing redirects to dashboard', async ({ page }) => {
      // This test uses the authenticated storageState
      await page.goto('/')
      // Landing page checks auth and redirects to /dashboard
      await page.waitForURL('**/dashboard', { timeout: 15000 })
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })
})
