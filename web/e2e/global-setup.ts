import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const TEST_USER = {
  email: 'e2e-test@floqi.test',
  password: 'TestPassword123!',
}

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Delete existing test user if exists
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u) => u.email === TEST_USER.email)
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id)
  }

  // 2. Create test user with email confirmed
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email: TEST_USER.email,
    password: TEST_USER.password,
    email_confirm: true,
  })
  if (createError || !createData.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`)
  }
  const userId = createData.user.id

  // 3. Update profile for onboarding bypass
  await admin.from('profiles').update({
    display_name: 'E2E Tester',
    onboarding_completed: true,
    timezone: 'UTC',
    preferred_language: 'en',
  }).eq('id', userId)

  // 4. Seed automations
  const { data: auto1 } = await admin.from('automations').insert({
    user_id: userId,
    name: 'E2E Morning Briefing',
    description: 'Test automation for morning briefing',
    template_type: 'morning_briefing',
    schedule_cron: '0 8 * * *',
    status: 'active',
    config: {},
  }).select().single()

  const { data: auto2 } = await admin.from('automations').insert({
    user_id: userId,
    name: 'E2E Email Triage',
    description: 'Test automation for email triage',
    template_type: 'email_triage',
    schedule_cron: '0 9 * * *',
    status: 'paused',
    config: {},
  }).select().single()

  // 5. Seed execution logs
  if (auto1) {
    await admin.from('execution_logs').insert([
      {
        automation_id: auto1.id,
        automation_name: 'E2E Morning Briefing',
        user_id: userId,
        status: 'success',
        tokens_used: 1500,
        tool_calls: [
          { tool_name: 'gmail_read', input: {}, output: { count: 5 }, duration: 200, status: 'success' },
          { tool_name: 'calendar_today', input: {}, output: { events: 3 }, duration: 150, status: 'success' },
        ],
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      {
        automation_id: auto1.id,
        automation_name: 'E2E Morning Briefing',
        user_id: userId,
        status: 'error',
        error_message: 'Rate limit exceeded',
        tokens_used: 500,
        tool_calls: [
          { tool_name: 'gmail_read', input: {}, output: null, duration: 100, status: 'error' },
        ],
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
    ])
  }

  // 6. Store IDs for tests
  process.env.E2E_USER_ID = userId
  process.env.E2E_AUTOMATION_1_ID = auto1?.id ?? ''
  process.env.E2E_AUTOMATION_2_ID = auto2?.id ?? ''

  // 7. Login via browser and save storageState
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  await page.goto(`${baseURL}/login`)
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('**/dashboard', { timeout: 30000 })

  await page.context().storageState({ path: './e2e/.auth/user.json' })
  await browser.close()
}
