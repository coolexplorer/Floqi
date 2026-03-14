import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { ToolCallsTimeline } from '@/components/timeline/ToolCallsTimeline'
import { BackButton } from '@/components/ui/BackButton'
import { getLogById } from '@/lib/data/logs'

const statusBadgeVariant: Record<string, BadgeVariant> = {
  success: 'success',
  error: 'error',
  running: 'info',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default async function LogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const log = await getLogById(id)
  if (!log) notFound()

  const badgeVariant = statusBadgeVariant[log.status] ?? 'neutral'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <BackButton href="/logs" label="Back to Logs" />

      {/* Log header card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-semibold text-slate-900">{log.automation_name}</h1>
            <Badge variant={badgeVariant}>{log.status}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <div className="flex gap-1">
              <dt className="font-medium text-slate-400">Time:</dt>
              <dd>{formatDate(log.created_at)}</dd>
            </div>
            {log.duration_ms != null && (
              <div className="flex gap-1">
                <dt className="font-medium text-slate-400">Duration:</dt>
                <dd>{formatDuration(log.duration_ms)}</dd>
              </div>
            )}
            {log.tokens_used > 0 && (
              <div className="flex gap-1">
                <dt className="font-medium text-slate-400">Tokens:</dt>
                <dd>{log.tokens_used.toLocaleString()}</dd>
              </div>
            )}
          </dl>

          {/* Error message highlight */}
          {log.status === 'error' && log.error_message && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
              <p>{log.error_message}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tool calls timeline */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Tool Calls</h2>
        <ToolCallsTimeline toolCalls={log.tool_calls} />
      </div>
    </div>
  )
}
