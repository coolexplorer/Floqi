import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ToolCall } from '@/components/timeline/ToolCallsTimeline'

export interface ExecutionLogDetail {
  id: string
  automation_id: string
  automation_name: string
  status: 'running' | 'success' | 'error'
  created_at: string
  duration_ms?: number
  error_message?: string
  tool_calls: ToolCall[]
  tokens_used: number
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('execution_logs')
    .select(
      'id, automation_id, status, created_at, duration_ms, error_message, tool_calls, tokens_used, automations(name)'
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const log: ExecutionLogDetail = {
    id: data.id,
    automation_id: data.automation_id,
    automation_name:
      (data.automations as unknown as { name: string } | null)?.name ?? 'Unknown',
    status: data.status as 'running' | 'success' | 'error',
    created_at: data.created_at,
    duration_ms: data.duration_ms ?? undefined,
    error_message: data.error_message ?? undefined,
    tool_calls: (data.tool_calls as ToolCall[] | null) ?? [],
    tokens_used: data.tokens_used ?? 0,
  }

  return NextResponse.json({ log })
}
