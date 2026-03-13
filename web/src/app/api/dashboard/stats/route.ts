import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { estimateCost } from '@/lib/cost'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]

  const [
    { count: activeAutomations },
    { data: currentUsage },
    { data: prevUsage },
    { data: automations },
  ] = await Promise.all([
    supabase
      .from('automations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('usage_tracking')
      .select('executions_count, llm_tokens_total, llm_cost_total')
      .eq('user_id', user.id)
      .eq('period_start', currentMonthStart)
      .single(),
    supabase
      .from('usage_tracking')
      .select('executions_count, llm_tokens_total, llm_cost_total')
      .eq('user_id', user.id)
      .eq('period_start', prevMonthStart)
      .single(),
    supabase
      .from('automations')
      .select('id')
      .eq('user_id', user.id),
  ])

  const automationIds = (automations ?? []).map(a => a.id)

  let successRate = 0
  let avgDurationMs = 0
  let prevSuccessRate = 0

  if (automationIds.length > 0) {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [{ data: currentLogs }, { data: prevLogs }] = await Promise.all([
      supabase
        .from('execution_logs')
        .select('status, started_at, completed_at')
        .in('automation_id', automationIds)
        .gte('created_at', monthStart)
        .in('status', ['success', 'error']),
      supabase
        .from('execution_logs')
        .select('status')
        .in('automation_id', automationIds)
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd)
        .in('status', ['success', 'error']),
    ])

    if (currentLogs && currentLogs.length > 0) {
      const successCount = currentLogs.filter(l => l.status === 'success').length
      successRate = Math.round((successCount / currentLogs.length) * 100 * 10) / 10

      const durations = currentLogs
        .filter(l => l.started_at && l.completed_at)
        .map(l => new Date(l.completed_at!).getTime() - new Date(l.started_at!).getTime())
      avgDurationMs = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0
    }

    if (prevLogs && prevLogs.length > 0) {
      const prevSuccess = prevLogs.filter(l => l.status === 'success').length
      prevSuccessRate = Math.round((prevSuccess / prevLogs.length) * 100 * 10) / 10
    }
  }

  const totalExecutions = currentUsage?.executions_count ?? 0
  const totalTokens = currentUsage?.llm_tokens_total ?? 0
  // Cost is a rough estimate using default haiku rates since usage_tracking
  // does not store per-model token breakdowns.
  const estimatedCostVal = estimateCost(totalTokens)

  const prevExecutions = prevUsage?.executions_count ?? 0
  const prevTokens = prevUsage?.llm_tokens_total ?? 0
  const prevCost = estimateCost(prevTokens)

  return NextResponse.json({
    activeAutomations: activeAutomations ?? 0,
    totalExecutions,
    successRate,
    totalTokens,
    estimatedCost: Math.round(estimatedCostVal * 10000) / 10000,
    avgDurationMs,
    trends: {
      executionsDelta: totalExecutions - prevExecutions,
      successRateDelta: Math.round((successRate - prevSuccessRate) * 10) / 10,
      tokensDelta: totalTokens - prevTokens,
      costDelta: Math.round((estimatedCostVal - prevCost) * 10000) / 10000,
    },
  })
}
