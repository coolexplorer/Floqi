import { test, expect } from '../fixtures/auth'

test.describe('Settings', () => {
  test.describe('Profile', () => {
    test('TC-7001: renders profile section with name field', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByText('Data Profile')).toBeVisible()
      await expect(page.locator('#display-name')).toBeVisible()
    })

    test('TC-7002: save profile shows success toast', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForTimeout(1000) // Wait for data to load

      const nameInput = page.locator('#display-name')
      await nameInput.clear()
      await nameInput.fill('E2E Updated Name')

      await page.getByRole('button', { name: /save|저장/i }).click()
      await expect(page.getByText(/saved successfully|저장 완료/i)).toBeVisible({ timeout: 10000 })
    })

    test('TC-7003: language and timezone selects visible', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.locator('#language')).toBeVisible()
      await expect(page.locator('#timezone')).toBeVisible()
    })
  })

  test.describe('BYOK', () => {
    test('TC-7004: API Key section visible', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByText('API Key (BYOK)')).toBeVisible()
      await expect(page.locator('#api-key')).toBeVisible()
    })

    test('TC-7005: empty API key shows error', async ({ page }) => {
      await page.goto('/settings')
      await page.getByRole('button', { name: /register key|키 등록/i }).click()
      await expect(page.getByText(/유효하지 않은 API 키/)).toBeVisible()
    })

    test('TC-7006: invalid API key format shows error', async ({ page }) => {
      await page.goto('/settings')
      await page.locator('#api-key').fill('invalid-key')
      await page.getByRole('button', { name: /register key|키 등록/i }).click()
      await expect(page.getByText(/유효하지 않은 API 키 형식/)).toBeVisible()
    })
  })

  test.describe('Preferences', () => {
    test('TC-7007: news category checkboxes visible', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByText('Preferences (선호도)')).toBeVisible()
      await expect(page.getByLabel('Technology')).toBeVisible()
      await expect(page.getByLabel('Science')).toBeVisible()
      await expect(page.getByLabel('Business')).toBeVisible()
      await expect(page.getByLabel('Health')).toBeVisible()
      await expect(page.getByLabel('Sports')).toBeVisible()
    })

    test('TC-7008: toggle news category', async ({ page }) => {
      await page.goto('/settings')
      await page.waitForTimeout(1000)

      const techCheckbox = page.getByLabel('Technology')
      const wasChecked = await techCheckbox.isChecked()
      await techCheckbox.click()

      if (wasChecked) {
        await expect(techCheckbox).not.toBeChecked()
      } else {
        await expect(techCheckbox).toBeChecked()
      }
    })

    test('TC-7009: importance criteria select visible', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.locator('#importance-criteria')).toBeVisible()
    })
  })

  test.describe('Account Deletion', () => {
    test('TC-7010: Delete Account button visible', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByText('Danger zone')).toBeVisible()
      await expect(page.getByRole('button', { name: /delete account/i })).toBeVisible()
    })

    test('TC-7011: Delete Account opens confirmation modal', async ({ page }) => {
      await page.goto('/settings')
      await page.getByRole('button', { name: /delete account/i }).click()
      await expect(page.getByText('Are you sure?')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible()
    })

    test('TC-7012: Cancel closes delete modal', async ({ page }) => {
      await page.goto('/settings')
      await page.getByRole('button', { name: /delete account/i }).click()
      await expect(page.getByText('Are you sure?')).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByText('Are you sure?')).toBeHidden()
    })

    test('TC-7013: profile heading visible', async ({ page }) => {
      await page.goto('/settings')
      await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
    })
  })
})
