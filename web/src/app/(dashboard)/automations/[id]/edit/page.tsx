'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AutomationData {
  id: string
  name: string
  description: string | null
  agent_prompt: string | null
  schedule_cron: string
  template_type: string
  status: string
  output_format: string | null
}

type Frequency = 'daily' | 'weekly' | 'monthly'

function parseCronFrequency(cron: string): Frequency {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 'daily'
  const [, , dom, , dow] = parts
  if (dow !== '*') return 'weekly'
  if (dom !== '*') return 'monthly'
  return 'daily'
}

function parseCronTime(cron: string): { minute: string; hour: string } {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return { minute: '0', hour: '9' }
  return { minute: parts[0], hour: parts[1] }
}

function parseCronDayOfWeek(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return '1'
  const dow = parts[4]
  return dow !== '*' ? dow : '1'
}

function parseCronDayOfMonth(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return '1'
  const dom = parts[2]
  return dom !== '*' ? dom : '1'
}

function buildCron(
  freq: Frequency,
  minute: string,
  hour: string,
  dayOfWeek: string,
  dayOfMonth: string
): string {
  const m = minute || '0'
  const h = hour || '9'
  const dow = dayOfWeek || '1'
  const dom = dayOfMonth || '1'
  switch (freq) {
    case 'weekly':
      return `${m} ${h} * * ${dow}`
    case 'monthly':
      return `${m} ${h} ${dom} * *`
    default:
      return `${m} ${h} * * *`
  }
}

export default function EditAutomationPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = React.useState(true)
  const [name, setName] = React.useState('')
  const [prompt, setPrompt] = React.useState('')
  const [frequency, setFrequency] = React.useState<Frequency>('daily')
  const [hour, setHour] = React.useState('9')
  const [minute, setMinute] = React.useState('0')
  const [dayOfWeek, setDayOfWeek] = React.useState('1')
  const [dayOfMonth, setDayOfMonth] = React.useState('1')
  const [outputFormat, setOutputFormat] = React.useState('email')
  const [notionConnected, setNotionConnected] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Use ref to avoid router reference instability causing effect re-runs
  const routerRef = React.useRef(router)
  React.useEffect(() => {
    routerRef.current = router
  })

  React.useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data } = await supabase
        .from('automations')
        .select('*')
        .eq('id', id)
        .single()

      if (!data) {
        routerRef.current.push('/automations')
        return
      }

      const auto = data as AutomationData
      setName(auto.name)
      setPrompt(auto.agent_prompt ?? auto.description ?? '')
      setOutputFormat(auto.output_format ?? 'email')

      const freq = parseCronFrequency(auto.schedule_cron)
      setFrequency(freq)
      const { minute: m, hour: h } = parseCronTime(auto.schedule_cron)
      setMinute(m)
      setHour(h)
      setDayOfWeek(parseCronDayOfWeek(auto.schedule_cron))
      setDayOfMonth(parseCronDayOfMonth(auto.schedule_cron))

      // Check Notion connection
      if (user) {
        const { data: notionConn } = await supabase
          .from('connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('service', 'notion')
          .single()
        setNotionConnected(!!notionConn)
      }

      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSave() {
    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요')
      return
    }

    setSaving(true)
    const schedule_cron = buildCron(frequency, minute, hour, dayOfWeek, dayOfMonth)

    // Try API route first; fall back to direct supabase if unavailable
    let fetchAvailable = true
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, agent_prompt: prompt, schedule_cron, output_format: outputFormat }),
      })
      if (!res.ok) {
        setError('저장에 실패했습니다')
        setSaving(false)
        return
      }
    } catch {
      fetchAvailable = false
    }

    if (!fetchAvailable) {
      const supabase = createClient()
      const { error: saveError } = await supabase
        .from('automations')
        .update({ name, agent_prompt: prompt, schedule_cron, output_format: outputFormat })
        .eq('id', id)

      if (saveError) {
        setError('저장에 실패했습니다')
        setSaving(false)
        return
      }
    }

    router.push(`/automations/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Edit Automation</h1>

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Name */}
        <div>
          <label
            htmlFor="edit-name"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Name
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Name"
          />
        </div>

        {/* Prompt */}
        <div>
          <label
            htmlFor="edit-prompt"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Prompt
          </label>
          <textarea
            id="edit-prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value)
              if (e.target.value.trim()) setError(null)
            }}
            rows={4}
            placeholder="Describe what this automation should do..."
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            aria-label="Prompt"
          />
          {error && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Output Format */}
        <div>
          <label
            htmlFor="edit-output-format"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Output Format
          </label>
          <select
            id="edit-output-format"
            data-testid="output-format-select"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="email">Email</option>
            <option value="notion">Notion</option>
            <option value="both">Both</option>
          </select>
          {(outputFormat === 'notion' || outputFormat === 'both') && !notionConnected && (
            <p className="mt-1 text-xs text-amber-600">
              Notion 연결이 필요합니다. Connect Notion first.
            </p>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label
            htmlFor="edit-frequency"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Frequency
          </label>
          <select
            id="edit-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Frequency"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/automations')}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
