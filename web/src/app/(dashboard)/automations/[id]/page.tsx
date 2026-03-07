'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Sun, Mail, BookOpen, Zap, ArrowLeft, Pencil, Trash2, Play, Pause } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ToolCallsTimeline, type ToolCall } from '@/components/timeline/ToolCallsTimeline'

interface AutomationDetail {
  id: string
  name: string
  description: string | null
  template_type: string
  status: 'active' | 'paused' | 'error'
  schedule_cron: string | null
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

interface ExecutionLog {
  id: string
  status: 'success' | 'error' | 'running' | 'pending'
  duration_ms: number | null
  created_at: string
  tool_calls: ToolCall[] | null
}

const templateIconMap: Record<string, LucideIcon> = {
  morning_briefing: Sun,
  email_triage: Mail,
  reading_digest: BookOpen,
}

const statusConfig: Record<
  AutomationDetail['status'],
  { variant: BadgeVariant; label: string }
> = {
  active: { variant: 'success', label: 'Active' },
  paused: { variant: 'neutral', label: 'Paused' },
  error: { variant: 'error', label: 'Error' },
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

export default function AutomationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [automation, setAutomation] = React.useState<AutomationDetail | null>(null)
  const [executions, setExecutions] = React.useState<ExecutionLog[]>([])
  const [selectedExecution, setSelectedExecution] = React.useState<ExecutionLog | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [deleting, setDeleting] = React.useState(false)
  const [toggling, setToggling] = React.useState(false)
  const [runningNow, setRunningNow] = React.useState(false)
  const [runFeedback, setRunFeedback] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'success' | 'error'>('all')

  React.useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: auto } = await supabase
        .from('automations')
        .select('*')
        .eq('id', id)
        .single()

      if (!auto) {
        router.push('/automations')
        return
      }

      setAutomation(auto as AutomationDetail)

      const { data: logs } = await supabase
        .from('execution_logs')
        .select('id, status, duration_ms, created_at, tool_calls')
        .eq('automation_id', id)
        .order('created_at', { ascending: false })
        .limit(20)

      setExecutions((logs as ExecutionLog[] | null) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [id, router])

  async function handleToggle() {
    if (!automation) return
    setToggling(true)
    const newStatus = automation.status === 'active' ? 'paused' : 'active'
    const supabase = createClient()
    await supabase.from('automations').update({ status: newStatus }).eq('id', id)
    setAutomation((prev) => (prev ? { ...prev, status: newStatus } : prev))
    setToggling(false)
  }

  async function handleRunNow() {
    setRunningNow(true)
    setRunFeedback(null)
    try {
      const res = await fetch(`/api/automations/${id}/run`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setRunFeedback(data.status ?? 'queued')
        // Button stays disabled after queuing — user must refresh to run again
      } else {
        setRunningNow(false)
      }
    } catch {
      setRunningNow(false)
    }
  }

  async function handleDelete() {
    if (!confirm('이 자동화를 삭제하시겠습니까?')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('automations').delete().eq('id', id)
    router.push('/automations')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading...
      </div>
    )
  }

  if (!automation) return null

  const Icon = templateIconMap[automation.template_type] ?? Zap
  const statusMeta = statusConfig[automation.status]
  const toolCalls = selectedExecution?.tool_calls ?? []
  const filteredExecutions = statusFilter === 'all'
    ? executions
    : executions.filter((e) => e.status === statusFilter)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/automations')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Automations
      </button>

      {/* Automation header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50"
            aria-hidden="true"
          >
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">{automation.name}</h1>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            </div>
            {automation.description && (
              <p className="mt-1 text-sm text-slate-500">{automation.description}</p>
            )}
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              {automation.schedule_cron && (
                <div className="flex gap-1">
                  <dt className="font-medium text-slate-400">Schedule:</dt>
                  <dd>
                    <code className="font-mono">{automation.schedule_cron}</code>
                  </dd>
                </div>
              )}
              {automation.last_run_at && (
                <div className="flex gap-1">
                  <dt className="font-medium text-slate-400">Last run:</dt>
                  <dd>{formatDate(automation.last_run_at)}</dd>
                </div>
              )}
              {automation.next_run_at && (
                <div className="flex gap-1">
                  <dt className="font-medium text-slate-400">Next run:</dt>
                  <dd>{formatDate(automation.next_run_at)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunNow}
            disabled={runningNow}
            loading={runningNow}
            aria-label="Run Now"
          >
            Run Now
          </Button>
          {runFeedback && (
            <span className="text-xs text-green-600">{runFeedback}</span>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => alert('Edit functionality coming in Sprint 2')}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={
              automation.status === 'active' ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )
            }
            onClick={handleToggle}
            loading={toggling}
            disabled={automation.status === 'error'}
          >
            {automation.status === 'active' ? 'Pause' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
            onClick={handleDelete}
            loading={deleting}
            className="ml-auto text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Execution History */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Execution History</h2>

        {executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="text-sm text-slate-400">No executions recorded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Status filter */}
            <div
              role="group"
              aria-label="Filter execution logs by status"
              className="flex gap-2"
            >
              {(['all', 'success', 'error'] as const).map((filter) => {
                const label = filter === 'all' ? 'All' : filter === 'success' ? 'Success' : 'Error'
                const isActive = statusFilter === filter
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                    <span role="radio" aria-checked={isActive} hidden />
                  </button>
                )
              })}
            </div>

            {/* Execution list */}
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {filteredExecutions.map((exec) => (
                <button
                  key={exec.id}
                  type="button"
                  onClick={() =>
                    setSelectedExecution((prev) =>
                      prev?.id === exec.id ? null : exec
                    )
                  }
                  className={`w-full flex items-center gap-4 px-4 py-3 text-sm text-left transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                    selectedExecution?.id === exec.id ? 'bg-blue-50' : ''
                  }`}
                  aria-expanded={selectedExecution?.id === exec.id}
                >
                  <Badge
                    variant={
                      exec.status === 'success'
                        ? 'success'
                        : exec.status === 'error'
                        ? 'error'
                        : exec.status === 'running'
                        ? 'info'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {exec.status}
                  </Badge>
                  <span className="flex-1 font-mono text-xs text-slate-500">
                    {formatDate(exec.created_at)}
                  </span>
                  {exec.duration_ms != null && (
                    <span className="text-xs text-slate-400">
                      {exec.duration_ms < 1000
                        ? `${exec.duration_ms}ms`
                        : `${(exec.duration_ms / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tool calls timeline */}
            {selectedExecution && (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold text-slate-700">
                  Tool Calls — {formatDate(selectedExecution.created_at)}
                </h3>
                <ToolCallsTimeline toolCalls={toolCalls} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
