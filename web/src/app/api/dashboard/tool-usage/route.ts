import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ToolCallRecord {
  toolName: string
  status?: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)

  const { data: automations } = await supabase
    .from('automations')
    .select('id, template_type')
    .eq('user_id', user.id)

  const automationIds = (automations ?? []).map(a => a.id)

  if (automationIds.length === 0) {
    return NextResponse.json({ tools: [], templateDistribution: [] })
  }

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs } = await supabase
    .from('execution_logs')
    .select('automation_id, tool_calls')
    .in('automation_id', automationIds)
    .gte('created_at', sinceDate)

  // Aggregate tool usage
  const toolMap = new Map<string, { total: number; success: number; error: number }>()

  for (const log of logs ?? []) {
    const calls: ToolCallRecord[] = Array.isArray(log.tool_calls) ? log.tool_calls : []
    for (const call of calls) {
      const name = call.toolName || 'unknown'
      const entry = toolMap.get(name) ?? { total: 0, success: 0, error: 0 }
      entry.total++
      if (call.status === 'error') {
        entry.error++
      } else {
        entry.success++
      }
      toolMap.set(name, entry)
    }
  }

  const tools = Array.from(toolMap.entries()).map(([toolName, data]) => ({
    toolName,
    totalCalls: data.total,
    successCalls: data.success,
    errorCalls: data.error,
  }))

  // Template distribution
  const templateCountMap = new Map<string, number>()
  const automationTemplateMap = new Map<string, string>()
  for (const a of automations ?? []) {
    automationTemplateMap.set(a.id, a.template_type)
  }

  for (const log of logs ?? []) {
    const tmpl = automationTemplateMap.get(log.automation_id) ?? 'unknown'
    templateCountMap.set(tmpl, (templateCountMap.get(tmpl) ?? 0) + 1)
  }

  const totalLogs = logs?.length ?? 0
  const templateDistribution = Array.from(templateCountMap.entries()).map(([templateType, count]) => ({
    templateType,
    count,
    percentage: totalLogs > 0 ? Math.round((count / totalLogs) * 100 * 10) / 10 : 0,
  }))

  return NextResponse.json({ tools, templateDistribution })
}
