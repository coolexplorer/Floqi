import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getAdminClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function seedAutomation(
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  const admin = getAdminClient()
  const { data } = await admin
    .from('automations')
    .insert({
      user_id: userId,
      name: 'Seeded Automation',
      description: 'Auto-created for E2E test',
      template_type: 'morning_briefing',
      schedule_cron: '0 9 * * *',
      status: 'active',
      config: {},
      ...overrides,
    })
    .select()
    .single()
  return data
}

export async function seedConnection(userId: string) {
  const admin = getAdminClient()
  const { data } = await admin
    .from('connected_services')
    .insert({
      user_id: userId,
      provider: 'google',
      service_name: 'google',
      access_token_encrypted: 'e2e-test-token',
      refresh_token_encrypted: 'e2e-test-refresh',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.readonly'],
      is_active: true,
    })
    .select()
    .single()
  return data
}

export async function seedExecutionLog(
  automationId: string,
  automationName: string,
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  const admin = getAdminClient()
  const { data } = await admin
    .from('execution_logs')
    .insert({
      automation_id: automationId,
      automation_name: automationName,
      user_id: userId,
      status: 'success',
      tokens_used: 1000,
      tool_calls: [],
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single()
  return data
}

export async function cleanupAutomations(userId: string) {
  const admin = getAdminClient()
  await admin.from('automations').delete().eq('user_id', userId)
}

export async function cleanupConnections(userId: string) {
  const admin = getAdminClient()
  await admin.from('connected_services').delete().eq('user_id', userId)
}

export async function createTempUser(email: string, password: string) {
  const admin = getAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  return data.user
}

export async function deleteTempUser(userId: string) {
  const admin = getAdminClient()
  await admin.auth.admin.deleteUser(userId)
}
