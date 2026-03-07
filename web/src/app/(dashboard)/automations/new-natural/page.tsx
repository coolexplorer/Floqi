'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NaturalLanguageAutomationPage() {
  const router = useRouter()
  const [prompt, setPrompt] = React.useState('')
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit() {
    if (!prompt.trim()) {
      setValidationError('자동화 설명을 입력해주세요')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSubmitting(false)
      return
    }

    await supabase.from('automations').insert({
      user_id: user.id,
      name: prompt.slice(0, 50),
      description: prompt,
      agent_prompt: prompt,
      template_type: 'morning_briefing',
      schedule_cron: '0 9 * * *',
      status: 'paused',
    })

    router.push('/automations')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!prompt.trim()) {
        setValidationError('자동화 설명을 입력해주세요')
      } else {
        handleSubmit()
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(e.target.value)
    if (e.target.value.trim()) {
      setValidationError(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">자동화 만들기</h1>
      <p className="text-sm text-slate-500">
        자동화하고 싶은 작업을 자연어로 입력하세요.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label
            htmlFor="nl-prompt"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            자동화 설명
          </label>
          <textarea
            id="nl-prompt"
            value={prompt}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={5}
            placeholder="예: 매일 오전 8시에 뉴스 요약해줘"
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            aria-label="자동화 설명"
          />
          {validationError && (
            <p className="mt-1 text-xs text-red-600">{validationError}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!prompt.trim() || submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '생성 중...' : '생성'}
        </button>
      </div>
    </div>
  )
}
