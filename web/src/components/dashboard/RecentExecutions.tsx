'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'

export interface ExecutionLogEntry {
  id: string
  automationName: string
  status: 'success' | 'error' | 'running'
  durationMs?: number
  tokensUsed: number
  toolCallCount: number
  createdAt: string
}

export interface RecentExecutionsProps {
  data: ExecutionLogEntry[]
}

type StatusFilter = 'all' | 'success' | 'error'

function formatDuration(ms?: number): string {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTokens(n: number): string {
  return n.toLocaleString()
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

const statusVariant: Record<ExecutionLogEntry['status'], 'success' | 'error' | 'warning'> = {
  success: 'success',
  error: 'error',
  running: 'warning',
}

export function RecentExecutions({ data }: RecentExecutionsProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = filter === 'all' ? data : data.filter((e) => e.status === filter)
  const rows = filtered.slice(0, 10)

  const tabs: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Success', value: 'success' },
    { label: 'Error', value: 'error' },
  ]

  return (
    <div data-testid="recent-executions" className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Executions</h3>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-medium text-gray-500">Automation</th>
              <th className="text-left py-2 text-xs font-medium text-gray-500">Status</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Duration</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Tokens</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Tools</th>
              <th className="text-right py-2 text-xs font-medium text-gray-500">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                  No executions found
                </td>
              </tr>
            ) : (
              rows.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-900 truncate max-w-[160px]">
                    {entry.automationName}
                  </td>
                  <td className="py-2">
                    <Badge variant={statusVariant[entry.status]} size="sm">
                      {entry.status}
                    </Badge>
                  </td>
                  <td className="py-2 text-right text-gray-600">{formatDuration(entry.durationMs)}</td>
                  <td className="py-2 text-right text-gray-600">{formatTokens(entry.tokensUsed)}</td>
                  <td className="py-2 text-right text-gray-600">{entry.toolCallCount}</td>
                  <td className="py-2 text-right text-gray-400">{formatRelativeTime(entry.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
