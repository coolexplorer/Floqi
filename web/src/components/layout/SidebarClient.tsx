'use client'

import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './Sidebar'

interface SidebarClientProps {
  userName: string
  userEmail: string
  userAvatar?: string
}

export function SidebarClient({ userName, userEmail, userAvatar }: SidebarClientProps) {
  const pathname = usePathname()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <Sidebar
      currentPath={pathname}
      userName={userName}
      userEmail={userEmail}
      userAvatar={userAvatar}
      onLogout={handleLogout}
    />
  )
}
