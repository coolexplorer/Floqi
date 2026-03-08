import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up. Notifications will appear here when your automations have updates."
      />
    </div>
  )
}
