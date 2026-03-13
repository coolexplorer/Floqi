import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'

export interface UpcomingRun {
  automationId: string
  automationName: string
  templateType: string
  nextRunAt: string
  scheduleCron: string
}

export interface UpcomingRunsProps {
  data: UpcomingRun[]
}

const templateConfig: Record<string, { icon: string; color: BadgeVariant }> = {
  morning_briefing: { icon: '☀️', color: 'warning' },
  email_triage: { icon: '📧', color: 'info' },
  reading_digest: { icon: '📰', color: 'success' },
  weekly_review: { icon: '📊', color: 'neutral' },
  smart_save: { icon: '💾', color: 'error' },
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const target = new Date(dateStr).getTime()
  const diffMs = target - now
  if (diffMs < 0) return 'overdue'
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `in ${diffMin}m`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `in ${diffHrs}h`
  const diffDays = Math.floor(diffHrs / 24)
  return `in ${diffDays}d`
}

function formatAbsoluteTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function cronToHuman(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length < 5) return cron

  const [min, hour, dayOfMonth, , dayOfWeek] = parts

  if (dayOfWeek !== '*' && dayOfWeek !== '?') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = days[Number(dayOfWeek)] ?? dayOfWeek
    return `${dayName} at ${hour}:${min.padStart(2, '0')}`
  }

  if (dayOfMonth !== '*' && dayOfMonth !== '?') {
    return `Monthly on ${dayOfMonth} at ${hour}:${min.padStart(2, '0')}`
  }

  return `Daily at ${hour}:${min.padStart(2, '0')}`
}

function formatTemplateName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function UpcomingRuns({ data }: UpcomingRunsProps) {
  return (
    <div data-testid="upcoming-runs" className="rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Upcoming Runs</h3>

      {data.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No upcoming runs</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" aria-hidden="true" />

          <div className="space-y-4">
            {data.map((run) => {
              const config = templateConfig[run.templateType] ?? { icon: '⚙️', color: 'neutral' as BadgeVariant }
              return (
                <div key={run.automationId + run.nextRunAt} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 border-gray-300 bg-white" aria-hidden="true" />

                  <div>
                    <p className="text-sm font-medium text-gray-900">{run.automationName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={config.color} size="sm">
                        {config.icon} {formatTemplateName(run.templateType)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(run.nextRunAt)} · {formatAbsoluteTime(run.nextRunAt)}
                    </p>
                    <p className="text-xs text-gray-400">{cronToHuman(run.scheduleCron)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
