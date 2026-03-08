import { createClient } from '@supabase/supabase-js'

export default async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!serviceRoleKey) return

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userId = process.env.E2E_USER_ID
  if (!userId) return

  // Delete user — cascade will clean up related data
  await admin.auth.admin.deleteUser(userId)
}
