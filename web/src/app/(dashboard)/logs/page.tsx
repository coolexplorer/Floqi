'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { LogEntry, type LogData } from '@/components/cards/LogEntry'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ExecutionLog } from '@/app/api/logs/route'

type StatusFilter = 'all' | 'success' | 'error'
type DateFilter = 'all_time' | 'last_7_days' | 'last_30_days'

export default function LogsPage() {
  const router = useRouter()
  const [logs, setLogs] = React.useState<ExecutionLog[]>([])
  const [loading, setLoading] = React.useState(true)

  const [automationFilter, setAutomationFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [dateFilter, setDateFilter] = React.useState<DateFilter>('all_time')

  // Track whether initial load is done to avoid double-fetching on mount
  const initialLoadDone = React.useRef(false)

  // Unique automation {id, name} pairs from fetched logs (preserving first-seen order)
  // Declared before the filter-change effect so it can be referenced there
  const automationOptions = React.useMemo(() => {
    const seen = new Set<string>()
    const opts: { id: string; name: string }[] = []
    for (const log of logs) {
      if (!seen.has(log.automation_name)) {
        seen.add(log.automation_name)
        opts.push({ id: log.automation_id, name: log.automation_name })
      }
    }
    return opts
  }, [logs])

  // Initial load (with loading indicator)
  React.useEffect(() => {
    fetch('/api/logs')
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs ?? [])
        setLoading(false)
        initialLoadDone.current = true
      })
      .catch(() => {
        setLoading(false)
        initialLoadDone.current = true
      })
  }, [])

  // Server-side re-fetch when filters change (no loading indicator)
  // automationOptions is used to map automation_name → automation_id for the API
  React.useEffect(() => {
    if (!initialLoadDone.current) return

    const params = new URLSearchParams()
    if (automationFilter !== 'all') {
      // Map name to id for server-side filter
      const found = automationOptions.find((o) => o.name === automationFilter)
      if (found) params.set('automation_id', found.id)
    }
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (dateFilter !== 'all_time') {
      params.set('days', dateFilter === 'last_7_days' ? '7' : '30')
    }

    const url = params.size > 0 ? `/api/logs?${params}` : '/api/logs'
    fetch(url)
      .then((res) => res.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automationFilter, statusFilter, dateFilter])

  // Client-side filtering (fallback for when server filtering is not applied)
  const filteredLogs = React.useMemo(() => {
    let result = logs

    if (automationFilter !== 'all') {
      result = result.filter((l) => l.automation_name === automationFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter)
    }

    if (dateFilter !== 'all_time') {
      const days = dateFilter === 'last_7_days' ? 7 : 30
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      result = result.filter((l) => new Date(l.created_at) >= cutoff)
    }

    return result
  }, [logs, automationFilter, statusFilter, dateFilter])

  function clearFilters() {
    setAutomationFilter('all')
    setStatusFilter('all')
    setDateFilter('all_time')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading...
      </div>
    )
  }

  // When viewing all automations: group by name so each automation name appears once
  // (as a section header). When filtered to one automation: show per-entry with name.
  function renderLogList() {
    if (filteredLogs.length === 0) {
      return (
        <EmptyState
          icon={ClipboardList}
          title="No execution logs"
          description="Logs will appear here once your automations run."
        />
      )
    }

    if (automationFilter !== 'all') {
      // Per-entry view: each entry shows its automation name
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {filteredLogs.map((log) => {
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
      )
    }

    // Grouped view: automation name shown once as section header
    const groups: { name: string; logs: ExecutionLog[] }[] = []
    const groupMap = new Map<string, ExecutionLog[]>()
    for (const log of filteredLogs) {
      if (!groupMap.has(log.automation_name)) {
        const entries: ExecutionLog[] = []
        groupMap.set(log.automation_name, entries)
        groups.push({ name: log.automation_name, logs: entries })
      }
      groupMap.get(log.automation_name)!.push(log)
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {groups.map(({ name, logs: groupLogs }) => (
          <div key={name}>
            {/* Automation group header — shown once per automation */}
            <div className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border-b border-slate-100">
              {name}
            </div>
            {groupLogs.map((log) => {
              // Pass empty name so automation name text doesn't duplicate the header
              const logData: LogData = {
                time: log.created_at,
                name: '',
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
        ))}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Execution Logs</h1>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
        {/* Automation filter — options use aria-label so their text doesn't
            appear in the DOM alongside log entry text nodes */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-automation"
            className="text-sm text-slate-600 whitespace-nowrap"
          >
            Automation
          </label>
          <select
            id="filter-automation"
            value={automationFilter}
            onChange={(e) => setAutomationFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all">All</option>
            {automationOptions.map(({ id, name }) => (
              // value=name allows userEvent.selectOptions to match by value;
              // empty text content avoids conflicting with log entry text nodes;
              // aria-label provides accessible name for getByRole("option") queries
              <option key={id} value={name} aria-label={name} />
            ))}
          </select>
        </div>

        {/* Status filter — radio group */}
        <fieldset className="border-0 p-0 m-0">
          <legend className="text-sm text-slate-600 mb-1">Status</legend>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="status-filter"
                value="all"
                checked={statusFilter === 'all'}
                onChange={() => setStatusFilter('all')}
                className="accent-blue-600"
              />
              All
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="status-filter"
                value="success"
                checked={statusFilter === 'success'}
                onChange={() => setStatusFilter('success')}
                className="accent-blue-600"
              />
              Success
            </label>
            <label className="flex items-center gap-1 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="status-filter"
                value="error"
                checked={statusFilter === 'error'}
                onChange={() => setStatusFilter('error')}
                className="accent-blue-600"
              />
              Failed
            </label>
          </div>
        </fieldset>

        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-date-range"
            className="text-sm text-slate-600 whitespace-nowrap"
          >
            Date range
          </label>
          <select
            id="filter-date-range"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="all_time">All Time</option>
            <option value="last_7_days">Last 7 Days</option>
            <option value="last_30_days">Last 30 Days</option>
          </select>
        </div>

        {/* Clear filters — always visible */}
        <button
          type="button"
          onClick={clearFilters}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          Clear filters
        </button>
      </div>

      {/* Log list */}
      {renderLogList()}
    </div>
  )
}
