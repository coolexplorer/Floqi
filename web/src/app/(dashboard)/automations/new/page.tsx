'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Sun, Mail, BookOpen, ClipboardList, Save } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Wizard, type WizardStep } from '@/components/forms/Wizard'
import { SchedulePicker } from '@/components/pickers/SchedulePicker'

interface Template {
  id: string
  label: string
  description: string
  icon: LucideIcon
  defaultCron: string
  requiresGoogle?: boolean
  comingSoon?: boolean
}

const TEMPLATES: Template[] = [
  {
    id: 'morning_briefing',
    label: 'Morning Briefing',
    description: "Daily summary of today's schedule, important emails, and weather",
    icon: Sun,
    defaultCron: '0 8 * * *',
    requiresGoogle: true,
  },
  {
    id: 'email_triage',
    label: 'Email Triage',
    description: 'Classify unread emails into urgent, important, and reference',
    icon: Mail,
    defaultCron: '0 9 * * *',
    requiresGoogle: true,
  },
  {
    id: 'reading_digest',
    label: 'Reading Digest',
    description: 'Summarize news from your interests and save to Notion',
    icon: BookOpen,
    defaultCron: '0 7 * * *',
  },
  {
    id: 'weekly_review',
    label: 'Weekly Review',
    description: 'Weekly review of your activities, achievements, and goals',
    icon: ClipboardList,
    defaultCron: '0 9 * * 1',
    comingSoon: true,
  },
  {
    id: 'smart_save',
    label: 'Smart Save',
    description: 'Automatically save important emails and articles to Notion',
    icon: Save,
    defaultCron: '0 * * * *',
    comingSoon: true,
  },
]

export default function NewAutomationPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [cronExpression, setCronExpression] = React.useState('0 9 * * *')
  const [timezone, setTimezone] = React.useState('UTC')
  const [googleConnectionError, setGoogleConnectionError] = React.useState(false)

  async function handleTemplateSelect(tpl: Template) {
    setSelectedTemplate(tpl)
    setName(tpl.label)
    setDescription(tpl.description)
    setCronExpression(tpl.defaultCron)

    if (tpl.requiresGoogle) {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('connected_services')
          .select('*')
          .eq('service_name', 'google')
        setGoogleConnectionError(!(Array.isArray(data) && data.length > 0))
      } catch {
        // If check fails, assume connected (graceful degradation)
        setGoogleConnectionError(false)
      }
    } else {
      setGoogleConnectionError(false)
    }
  }

  async function handleSubmit() {
    if (!selectedTemplate) return

    const payload = {
      name: name || selectedTemplate.label,
      description: description || selectedTemplate.description,
      template_type: selectedTemplate.id,
      status: 'paused',
      schedule_cron: cronExpression,
      timezone: timezone,
      config: {},
    }

    try {
      await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      // fetch unavailable in this environment
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('automations').insert({ user_id: user.id, ...payload })
      }
    } catch {
      // supabase insert failed
    }

    router.push('/automations')
  }

  const steps: WizardStep[] = [
    {
      label: 'Choose Template',
      validate: () => selectedTemplate !== null,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Select a template to get started. You can customize it in the next steps.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TEMPLATES.map((tpl) => {
              const Icon = tpl.icon
              const isSelected = selectedTemplate?.id === tpl.id
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => !tpl.comingSoon && handleTemplateSelect(tpl)}
                  disabled={tpl.comingSoon}
                  aria-disabled={tpl.comingSoon}
                  className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    tpl.comingSoon
                      ? 'cursor-not-allowed opacity-50 border-slate-200 bg-white'
                      : isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  aria-pressed={tpl.comingSoon ? undefined : isSelected}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isSelected ? 'bg-blue-100' : 'bg-slate-100'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon
                      className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}
                    />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                      {tpl.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                      {tpl.description}
                    </p>
                    {tpl.comingSoon && (
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
          {googleConnectionError && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Google not connected — please connect your Google account in Connections settings.
            </p>
          )}
        </div>
      ),
    },
    {
      label: 'Configure',
      validate: () => name.trim().length > 0,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Give your automation a name and description.
          </p>
          <div>
            <label htmlFor="automation-name" className="block text-sm font-medium text-slate-700 mb-1.5">
              Name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="automation-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Briefing"
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="automation-description" className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              id="automation-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this automation do?"
              rows={3}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>
        </div>
      ),
    },
    {
      label: 'Schedule',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Choose when this automation should run.
          </p>
          <SchedulePicker
            value={cronExpression}
            onChange={setCronExpression}
            onTimezoneChange={setTimezone}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create Automation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set up a new automation workflow in a few steps
        </p>
      </div>

      <Wizard
        steps={steps}
        currentStep={currentStep}
        onNext={() => setCurrentStep((s) => s + 1)}
        onBack={() => setCurrentStep((s) => s - 1)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
