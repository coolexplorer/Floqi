import * as React from 'react'
import { cn } from '@/lib/cn'
import { Badge, BadgeVariant } from '@/components/ui/Badge'

export interface LogData {
  time: string | Date
  name: string
  status: 'success' | 'error' | 'running' | 'pending'
  duration?: number
  inputTokens?: number
  outputTokens?: number
}

export interface LogEntryProps {
  log: LogData
  onClick?: (log: LogData) => void
  className?: string
}

const statusBadgeVariant: Record<LogData['status'], BadgeVariant> = {
  success: 'success',
  error: 'error',
  running: 'info',
  pending: 'neutral',
}

const statusLabels: Record<LogData['status'], string> = {
  success: 'Success',
  error: 'Error',
  running: 'Running',
  pending: 'Pending',
}

function formatTime(time: string | Date): string {
  const date = typeof time === 'string' ? new Date(time) : time
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const logEntryInnerContent = (log: LogData) => (
  <>
    {/* Timestamp */}
    <span className="w-24 shrink-0 font-mono text-xs text-slate-500">
      {formatTime(log.time)}
    </span>

    {/* Automation name */}
    <span className="flex-1 truncate font-medium text-slate-800">
      {log.name}
    </span>

    {/* Status badge */}
    <Badge variant={statusBadgeVariant[log.status]} size="sm">
      {statusLabels[log.status]}
    </Badge>

    {/* Duration */}
    {log.duration !== undefined ? (
      <span className="w-16 shrink-0 text-right text-xs text-slate-500">
        {formatDuration(log.duration)}
      </span>
    ) : (
      <span className="w-16 shrink-0" />
    )}

    {/* Token counts */}
    {(log.inputTokens !== undefined || log.outputTokens !== undefined) && (
      <span className="w-28 shrink-0 text-right font-mono text-xs text-slate-500">
        {log.inputTokens ?? 0} / {log.outputTokens ?? 0}
      </span>
    )}
  </>
)

export function LogEntry({ log, onClick, className }: LogEntryProps) {
  const isClickable = Boolean(onClick)

  const sharedClassName = cn(
    'flex items-center gap-4 rounded-md px-4 py-3 text-sm',
    'border border-transparent transition-colors duration-150',
    isClickable
      ? 'cursor-pointer hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      : '',
    className
  )

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(log)}
        className={sharedClassName}
      >
        {logEntryInnerContent(log)}
      </button>
    )
  }

  return (
    <div className={sharedClassName}>
      {logEntryInnerContent(log)}
    </div>
  )
}
