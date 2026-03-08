import { test as base } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type AuthFixtures = {
  adminClient: SupabaseClient
  userId: string
}

export const test = base.extend<AuthFixtures>({
  adminClient: async ({}, use) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await use(client)
  },
  userId: async ({}, use) => {
    await use(process.env.E2E_USER_ID ?? '')
  },
})

export { expect } from '@playwright/test'
