import { test, expect } from '../fixtures/auth'
import { seedAutomation, cleanupAutomations } from '../helpers/data-helpers'

test.describe('Automations', () => {
  test.describe('List', () => {
    test('TC-3001: shows seed automations', async ({ page }) => {
      await page.goto('/automations')
      await expect(page.getByText('E2E Morning Briefing')).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('E2E Email Triage')).toBeVisible()
    })

    test('TC-3002: shows Create Automation button', async ({ page }) => {
      await page.goto('/automations')
      await expect(page.getByRole('link', { name: /create automation/i })).toBeVisible()
    })

    test('TC-3003: Create Automation navigates to wizard', async ({ page }) => {
      await page.goto('/automations')
      await page.getByRole('link', { name: /create automation/i }).click()
      await expect(page).toHaveURL(/\/automations\/new/)
      await expect(page.getByText('Create Automation')).toBeVisible()
    })
  })

  test.describe('Wizard Creation', () => {
    test('TC-3004: 3-step wizard - template select, configure, schedule', async ({ page, userId }) => {
      await page.goto('/automations/new')

      // Step 1: Choose Template
      await expect(page.getByText('Choose Template')).toBeVisible()
      await page.getByRole('button', { name: /reading digest/i }).click()
      await page.getByRole('button', { name: /next/i }).click()

      // Step 2: Configure
      await expect(page.getByText('Configure')).toBeVisible()
      const nameInput = page.locator('#automation-name')
      await nameInput.clear()
      await nameInput.fill('E2E Test Automation')
      await page.getByRole('button', { name: /next/i }).click()

      // Step 3: Schedule
      await expect(page.getByText('Schedule')).toBeVisible()
      await page.getByRole('button', { name: /submit|create|완료/i }).click()

      // Should redirect to automations list
      await page.waitForURL('**/automations', { timeout: 15000 })

      // Cleanup
      await cleanupAutomations(userId).catch(() => {})
    })
  })

  test.describe('Natural Language Creation', () => {
    test('TC-3005: create automation via natural language', async ({ page, userId }) => {
      await page.goto('/automations/new-natural')
      await expect(page.getByText('자동화 만들기')).toBeVisible()

      const textarea = page.getByLabel('자동화 설명')
      await textarea.fill('매일 아침 8시에 뉴스 요약해줘')
      await page.getByRole('button', { name: '생성' }).click()

      await page.waitForURL('**/automations', { timeout: 15000 })

      // Cleanup
      await cleanupAutomations(userId).catch(() => {})
    })

    test('TC-3006: empty prompt shows validation error', async ({ page }) => {
      await page.goto('/automations/new-natural')
      await page.getByRole('button', { name: '생성' }).click()
      await expect(page.getByText('자동화 설명을 입력해주세요')).toBeVisible()
    })
  })

  test.describe('Toggle Status', () => {
    test('TC-3007: toggle automation from active to paused', async ({ page }) => {
      await page.goto('/automations')
      // Find the active automation card and click pause
      const card = page.locator('text=E2E Morning Briefing').locator('..')
      // The card should have a toggle or pause button
      await page.getByText('E2E Morning Briefing').click()
      await page.waitForURL(/\/automations\//)

      // On detail page, click Pause
      await page.getByRole('button', { name: /pause/i }).click()
      await expect(page.getByText('Paused')).toBeVisible({ timeout: 5000 })
    })

    test('TC-3008: toggle automation from paused to active', async ({ page }) => {
      await page.goto('/automations')
      await page.getByText('E2E Email Triage').click()
      await page.waitForURL(/\/automations\//)

      // On detail page, click Activate
      await page.getByRole('button', { name: /activate/i }).click()
      await expect(page.getByText('Active')).toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Delete', () => {
    test('TC-3009: delete automation with confirmation modal', async ({ page, userId }) => {
      // Seed a temp automation to delete
      const auto = await seedAutomation(userId, { name: 'E2E Delete Me' })
      if (!auto) return

      await page.goto('/automations')
      await page.waitForTimeout(1000) // Wait for data to load

      // Navigate to the automation detail
      await page.getByText('E2E Delete Me').click()
      await page.waitForURL(/\/automations\//)

      // Click delete
      page.on('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: /delete/i }).click()

      // Should redirect to automations list
      await page.waitForURL('**/automations', { timeout: 10000 })
    })
  })

  test.describe('Detail Page', () => {
    test('TC-3010: shows automation detail with Run Now button', async ({ page }) => {
      await page.goto('/automations')
      await page.getByText('E2E Morning Briefing').click()
      await page.waitForURL(/\/automations\//)

      await expect(page.getByRole('button', { name: /run now/i })).toBeVisible()
      await expect(page.getByText('Execution History')).toBeVisible()
      await expect(page.locator('[data-testid="webhook-url"]')).toBeVisible()
    })

    test('TC-3011: Run Now button triggers execution', async ({ page }) => {
      await page.goto('/automations')
      await page.getByText('E2E Morning Briefing').click()
      await page.waitForURL(/\/automations\//)

      // Mock the run API to avoid actual execution
      await page.route('**/api/automations/*/run', (route) =>
        route.fulfill({ status: 200, body: JSON.stringify({ status: 'queued' }) })
      )
      await page.getByRole('button', { name: /run now/i }).click()
      await expect(page.getByText('queued')).toBeVisible({ timeout: 5000 })
    })

    test('TC-3012: execution history shows logs', async ({ page }) => {
      await page.goto('/automations')
      await page.getByText('E2E Morning Briefing').click()
      await page.waitForURL(/\/automations\//)

      // Should show execution entries
      await expect(page.getByText('success').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Edit Page', () => {
    test('TC-3013: edit automation name, prompt, output format', async ({ page }) => {
      const autoId = process.env.E2E_AUTOMATION_1_ID
      if (!autoId) return

      await page.goto(`/automations/${autoId}/edit`)
      await expect(page.getByText('Edit Automation')).toBeVisible({ timeout: 10000 })

      // Edit name
      const nameInput = page.getByLabel('Name')
      await nameInput.clear()
      await nameInput.fill('Updated Morning Briefing')

      // Edit prompt
      const promptInput = page.getByLabel('Prompt')
      await promptInput.clear()
      await promptInput.fill('Updated prompt for testing')

      // Edit output format
      await page.locator('[data-testid="output-format-select"]').selectOption('notion')

      // Save
      await page.getByRole('button', { name: '저장' }).click()

      // Should redirect to detail page
      await page.waitForURL(/\/automations\//, { timeout: 10000 })
    })
  })
})
