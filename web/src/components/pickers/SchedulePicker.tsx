'use client'

import * as React from 'react'
import { Clock, Code } from 'lucide-react'
import { cn } from '@/lib/cn'
import { isValidCron } from '@/lib/cron-utils'
import { Select } from '../ui/Select'
import { Input } from '../ui/Input'

export interface SchedulePickerProps {
  value?: string
  onChange?: (cronExpression: string) => void
  onTimezoneChange?: (timezone: string) => void
  className?: string
}

type Preset = 'daily' | 'weekly' | 'monthly' | 'custom'

interface ScheduleState {
  preset: Preset
  hour: string
  minute: string
  timezone: string
  dayOfWeek: string
  dayOfMonth: string
  customCron: string
}

const PRESET_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: String(i).padStart(2, '0'),
}))

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => ({
  value: String(m),
  label: String(m).padStart(2, '0'),
}))

const DAY_OF_WEEK_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
]

const DAY_OF_MONTH_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}))

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

function parseCron(cron: string): ScheduleState | null {
  if (!cron) return null
  const parts = cron.split(' ')
  if (parts.length !== 5) return null

  const [minute, hour, dom, , dow] = parts

  const isDaily = dom === '*' && dow === '*' && /^\d+$/.test(hour) && /^\d+$/.test(minute)
  const isWeekly = dom === '*' && /^\d+$/.test(dow) && /^\d+$/.test(hour) && /^\d+$/.test(minute)
  const isMonthly = dow === '*' && /^\d+$/.test(dom) && /^\d+$/.test(hour) && /^\d+$/.test(minute)

  if (isDaily && !isWeekly) {
    return { preset: 'daily', hour, minute, timezone: 'UTC', dayOfWeek: '1', dayOfMonth: '1', customCron: '' }
  }
  if (isWeekly) {
    return { preset: 'weekly', hour, minute, timezone: 'UTC', dayOfWeek: dow, dayOfMonth: '1', customCron: '' }
  }
  if (isMonthly) {
    return { preset: 'monthly', hour, minute, timezone: 'UTC', dayOfWeek: '1', dayOfMonth: dom, customCron: '' }
  }

  return { preset: 'custom', hour: '9', minute: '0', timezone: 'UTC', dayOfWeek: '1', dayOfMonth: '1', customCron: cron }
}

function buildCron(state: ScheduleState): string {
  if (state.preset === 'custom') return state.customCron
  const m = state.minute || '0'
  const h = state.hour || '9'
  if (state.preset === 'daily') return `${m} ${h} * * *`
  if (state.preset === 'weekly') return `${m} ${h} * * ${state.dayOfWeek}`
  if (state.preset === 'monthly') return `${m} ${h} ${state.dayOfMonth} * *`
  return `${m} ${h} * * *`
}

function describeCron(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length !== 5) return 'Invalid expression'
  const [minute, hour, dom, , dow] = parts

  const pad = (v: string) => v.padStart(2, '0')
  const time = `${pad(hour)}:${pad(minute)}`

  if (dom === '*' && dow === '*') return `Every day at ${time}`
  if (dom === '*' && /^\d+$/.test(dow)) {
    const day = DAY_OF_WEEK_OPTIONS.find((d) => d.value === dow)?.label ?? `day ${dow}`
    return `Every ${day} at ${time}`
  }
  if (dow === '*' && /^\d+$/.test(dom)) {
    return `Monthly on day ${dom} at ${time}`
  }
  return cron
}

export function SchedulePicker({ value, onChange, onTimezoneChange, className }: SchedulePickerProps) {
  const parsed = value ? parseCron(value) : null

  const [state, setState] = React.useState<ScheduleState>(() => ({
    preset: parsed?.preset ?? 'daily',
    hour: parsed?.hour ?? '9',
    minute: parsed?.minute ?? '0',
    timezone: parsed?.timezone ?? 'UTC',
    dayOfWeek: parsed?.dayOfWeek ?? '1',
    dayOfMonth: parsed?.dayOfMonth ?? '1',
    customCron: parsed?.customCron ?? '',
  }))

  const presetButtonRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const [cronError, setCronError] = React.useState<string | null>(null)

  const cronExpression = buildCron(state)

  function update(patch: Partial<ScheduleState>) {
    const nextState = { ...state, ...patch }
    setState(nextState)
    const cron = buildCron(nextState)
    onChange?.(cron)
    if ('timezone' in patch && patch.timezone !== undefined) {
      onTimezoneChange?.(patch.timezone)
    }
  }

  function handlePresetChange(preset: string) {
    setCronError(null)
    update({ preset: preset as Preset })
  }

  function handlePresetKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const total = PRESET_OPTIONS.length
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextIndex = (index + 1) % total
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextIndex = (index - 1 + total) % total
    }

    if (nextIndex !== null) {
      const nextPreset = PRESET_OPTIONS[nextIndex].value
      handlePresetChange(nextPreset)
      presetButtonRefs.current[nextIndex]?.focus()
    }
  }

  function handleCustomCronChange(val: string) {
    update({ customCron: val })
    if (val && !isValidCron(val)) {
      setCronError('Invalid cron expression')
    } else {
      setCronError(null)
    }
  }

  function handleCustomCronBlur() {
    if (!state.customCron) {
      setCronError('Invalid cron expression')
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Preset selector */}
      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-700">Frequency</p>
        <div
          className="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
          role="radiogroup"
          aria-label="Schedule frequency"
        >
          {PRESET_OPTIONS.map((opt, index) => (
            <button
              key={opt.value}
              ref={(el) => { presetButtonRefs.current[index] = el }}
              type="button"
              role="radio"
              aria-checked={state.preset === opt.value}
              tabIndex={state.preset === opt.value ? 0 : -1}
              onClick={() => handlePresetChange(opt.value)}
              onKeyDown={(e) => handlePresetKeyDown(e, index)}
              className={cn(
                'rounded-md py-1.5 text-sm font-medium transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                state.preset === opt.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time picker */}
      {state.preset !== 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="schedule-hour" className="mb-1.5 block text-sm font-medium text-slate-700">
              <Clock className="mr-1 inline h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Hour
            </label>
            <Select
              id="schedule-hour"
              options={HOUR_OPTIONS}
              value={state.hour}
              onChange={(v) => update({ hour: v })}
              placeholder="Hour"
            />
          </div>
          <div>
            <label htmlFor="schedule-minute" className="mb-1.5 block text-sm font-medium text-slate-700">Minute</label>
            <Select
              id="schedule-minute"
              options={MINUTE_OPTIONS}
              value={state.minute}
              onChange={(v) => update({ minute: v })}
              placeholder="Minute"
            />
          </div>
        </div>
      )}

      {/* Day of week (weekly only) */}
      {state.preset === 'weekly' && (
        <div>
          <label htmlFor="schedule-day-of-week" className="mb-1.5 block text-sm font-medium text-slate-700">Day of week</label>
          <Select
            id="schedule-day-of-week"
            options={DAY_OF_WEEK_OPTIONS}
            value={state.dayOfWeek}
            onChange={(v) => update({ dayOfWeek: v })}
            placeholder="Select day"
          />
        </div>
      )}

      {/* Day of month (monthly only) */}
      {state.preset === 'monthly' && (
        <div>
          <label htmlFor="schedule-day-of-month" className="mb-1.5 block text-sm font-medium text-slate-700">Day of month</label>
          <Select
            id="schedule-day-of-month"
            options={DAY_OF_MONTH_OPTIONS}
            value={state.dayOfMonth}
            onChange={(v) => update({ dayOfMonth: v })}
            placeholder="Select day"
          />
        </div>
      )}

      {/* Custom cron input */}
      {state.preset === 'custom' && (
        <div>
          <label htmlFor="schedule-custom-cron" className="mb-1.5 block text-sm font-medium text-slate-700">
            Cron expression
          </label>
          <Input
            id="schedule-custom-cron"
            type="text"
            value={state.customCron}
            onChange={(e) => handleCustomCronChange(e.target.value)}
            onBlur={handleCustomCronBlur}
            placeholder="0 9 * * *"
            aria-label="Custom cron expression"
            icon={<Code className="h-3.5 w-3.5" />}
            iconPosition="left"
          />
          {cronError ? (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {cronError}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Format: minute hour day month weekday</p>
          )}
        </div>
      )}

      {/* Timezone */}
      <div>
        <label htmlFor="schedule-timezone" className="mb-1.5 block text-sm font-medium text-slate-700">Timezone</label>
        <Select
          id="schedule-timezone"
          options={TIMEZONE_OPTIONS}
          value={state.timezone}
          onChange={(v) => update({ timezone: v })}
          placeholder="Select timezone"
          searchable
        />
      </div>

      {/* Cron preview */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Schedule preview
        </p>
        <p className="text-sm font-medium text-slate-900">
          {cronExpression ? describeCron(cronExpression) : '—'}
        </p>
        <code className="mt-1 block text-xs text-slate-500">{cronExpression || '—'}</code>
      </div>
    </div>
  )
}
