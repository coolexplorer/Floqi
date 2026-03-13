import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
}

function estimateCost(tokens: number, model?: string): number {
  const rate = MODEL_RATES[model || 'claude-haiku-4-5'] || MODEL_RATES['claude-haiku-4-5']
  const inputTokens = tokens * 0.75
  const outputTokens = tokens * 0.25
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30', 10)

  const { data: automations } = await supabase
    .from('automations')
    .select('id')
    .eq('user_id', user.id)

  const automationIds = (automations ?? []).map(a => a.id)

  if (automationIds.length === 0) {
    return NextResponse.json({ executionTrend: [], tokenTrend: [] })
  }

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs } = await supabase
    .from('execution_logs')
    .select('status, created_at, tokens_used, model')
    .in('automation_id', automationIds)
    .gte('created_at', sinceDate)
    .in('status', ['success', 'error'])

  const executionByDate = new Map<string, { success: number; error: number; total: number }>()
  const tokenByDate = new Map<string, { haikuTokens: number; sonnetTokens: number }>()

  for (const log of logs ?? []) {
    const date = log.created_at.split('T')[0]

    const exec = executionByDate.get(date) ?? { success: 0, error: 0, total: 0 }
    exec.total++
    if (log.status === 'success') exec.success++
    else exec.error++
    executionByDate.set(date, exec)

    const tok = tokenByDate.get(date) ?? { haikuTokens: 0, sonnetTokens: 0 }
    const tokens = log.tokens_used ?? 0
    if (log.model === 'claude-sonnet-4-6') {
      tok.sonnetTokens += tokens
    } else {
      tok.haikuTokens += tokens
    }
    tokenByDate.set(date, tok)
  }

  const executionTrend = Array.from(executionByDate.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const tokenTrend = Array.from(tokenByDate.entries())
    .map(([date, data]) => ({
      date,
      ...data,
      estimatedCost:
        Math.round(
          (estimateCost(data.haikuTokens, 'claude-haiku-4-5') +
            estimateCost(data.sonnetTokens, 'claude-sonnet-4-6')) * 10000
        ) / 10000,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ executionTrend, tokenTrend })
}
