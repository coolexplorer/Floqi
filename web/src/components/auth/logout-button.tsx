'use client'

import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-gray-900"
    >
      Log Out
    </button>
  )
}
