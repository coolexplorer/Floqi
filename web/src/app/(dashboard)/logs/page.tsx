'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { LogEntry, type LogData } from '@/components/cards/LogEntry'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ExecutionLog } from '@/app/api/logs/route'

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = React.useState<ExecutionLog[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/logs')
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Execution Logs</h1>

      {logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No execution logs"
          description="Logs will appear here once your automations run."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {logs.map((log) => {
            const logData: LogData = {
              time: log.created_at,
              name: log.automation_name,
              status: log.status,
              duration: log.duration_ms,
            }
            return (
              <div key={log.id} className="border-b border-slate-100 last:border-b-0">
                <LogEntry
                  log={logData}
                  onClick={() => router.push(`/logs/${log.id}`)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
