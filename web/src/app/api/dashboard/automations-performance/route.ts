import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: automations } = await supabase
    .from('automations')
    .select('id, name, template_type, last_run_at, next_run_at')
    .eq('user_id', user.id)

  if (!automations || automations.length === 0) {
    return NextResponse.json({ automations: [] })
  }

  const automationIds = automations.map(a => a.id)

  const { data: logs } = await supabase
    .from('execution_logs')
    .select('automation_id, status, started_at, completed_at, tokens_used')
    .in('automation_id', automationIds)
    .in('status', ['success', 'error'])

  const logsByAutomation = new Map<string, typeof logs>()
  for (const log of logs ?? []) {
    const existing = logsByAutomation.get(log.automation_id) ?? []
    existing.push(log)
    logsByAutomation.set(log.automation_id, existing)
  }

  const result = automations.map(a => {
    const aLogs = logsByAutomation.get(a.id) ?? []
    const totalExecutions = aLogs.length
    const successCount = aLogs.filter(l => l.status === 'success').length
    const successRate = totalExecutions > 0
      ? Math.round((successCount / totalExecutions) * 100 * 10) / 10
      : 0

    const durations = aLogs
      .filter(l => l.started_at && l.completed_at)
      .map(l => new Date(l.completed_at!).getTime() - new Date(l.started_at!).getTime())
    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0

    const tokenValues = aLogs.map(l => l.tokens_used ?? 0)
    const avgTokens = tokenValues.length > 0
      ? Math.round(tokenValues.reduce((sum, t) => sum + t, 0) / tokenValues.length)
      : 0

    return {
      id: a.id,
      name: a.name,
      templateType: a.template_type,
      successRate,
      totalExecutions,
      avgDurationMs,
      avgTokens,
      lastRunAt: a.last_run_at ?? null,
      nextRunAt: a.next_run_at ?? null,
    }
  })

  return NextResponse.json({ automations: result })
}
