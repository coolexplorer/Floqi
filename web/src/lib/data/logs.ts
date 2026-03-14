import { createClient } from '@/lib/supabase/server'
import type { ToolCall } from '@/components/timeline/ToolCallsTimeline'
import type { ExecutionLogDetail } from '@/app/api/logs/[id]/route'

/**
 * Fetch a single execution log by ID.
 * Returns null if not found or unauthorized.
 */
export async function getLogById(id: string): Promise<ExecutionLogDetail | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const { data, error } = await supabase
    .from('execution_logs')
    .select(
      'id, automation_id, status, created_at, started_at, completed_at, error_message, tool_calls, tokens_used, automations(name)'
    )
    .eq('id', id)
    .single()

  if (error || !data) return null

  let durationMs: number | undefined
  if (data.started_at && data.completed_at) {
    durationMs = new Date(data.completed_at).getTime() - new Date(data.started_at).getTime()
  }

  return {
    id: data.id,
    automation_id: data.automation_id,
    automation_name:
      (data.automations as unknown as { name: string } | null)?.name ?? 'Unknown',
    status: data.status as 'running' | 'success' | 'error',
    created_at: data.created_at,
    duration_ms: durationMs,
    error_message: data.error_message ?? undefined,
    tool_calls: (data.tool_calls as ToolCall[] | null) ?? [],
    tokens_used: data.tokens_used ?? 0,
  }
}
