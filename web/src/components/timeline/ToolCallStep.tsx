'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'

export type ToolCallStatus = 'success' | 'error' | 'pending'

export interface ToolCallStepProps {
  toolName: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  duration: number
  status: ToolCallStatus
  defaultExpanded?: boolean
  className?: string
}

function ToolIcon({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600"
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

function StatusIcon({ status }: { status: ToolCallStatus }) {
  if (status === 'success') {
    return (
      <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" aria-hidden="true" />
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={cn('h-4 w-4 text-slate-400 transition-transform duration-200', expanded && 'rotate-180')}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

const statusBadgeVariant: Record<ToolCallStatus, 'success' | 'error' | 'warning'> = {
  success: 'success',
  error: 'error',
  pending: 'warning',
}

const statusLabel: Record<ToolCallStatus, string> = {
  success: 'Success',
  error: 'Error',
  pending: 'Running',
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function ToolCallStep({
  toolName,
  input,
  output,
  duration,
  status,
  defaultExpanded = false,
  className,
}: ToolCallStepProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const contentId = React.useId()
  const headerId = React.useId()

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden',
        status === 'error' && 'border-red-200',
        className
      )}
    >
      {/* Header */}
      <button
        id={headerId}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left',
          'hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
          'transition-colors duration-150'
        )}
      >
        <ToolIcon name={toolName} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon status={status} />
            <span className="truncate text-sm font-medium text-slate-800">{toolName}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-slate-400">{formatDuration(duration)}</span>
          <Badge variant={statusBadgeVariant[status]} size="sm">
            {statusLabel[status]}
          </Badge>
          <ChevronIcon expanded={expanded} />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-slate-100"
        >
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Input */}
            <div className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Input</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 font-mono">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
            {/* Output */}
            <div className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Output</p>
              <pre className={cn(
                'overflow-x-auto rounded-lg p-3 text-xs leading-relaxed font-mono',
                status === 'error'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-50 text-slate-700'
              )}>
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
