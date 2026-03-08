import { createClient } from '@/lib/supabase/server'
import { SidebarClient } from '@/components/layout/SidebarClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const userEmail = user?.email ?? ''
  const userAvatar = user?.user_metadata?.avatar_url

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarClient
        userName={userName}
        userEmail={userEmail}
        userAvatar={userAvatar}
      />
      <main id="main-content" className="flex-1 ml-60 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
