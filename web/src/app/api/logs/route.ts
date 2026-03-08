import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface ExecutionLog {
  id: string
  automation_id: string
  automation_name: string
  status: 'running' | 'success' | 'error'
  created_at: string
  duration_ms?: number
  error_message?: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const automationId = searchParams.get('automation_id')
  const status = searchParams.get('status')
  const days = searchParams.get('days')

  let query = supabase
    .from('execution_logs')
    .select('id, automation_id, status, created_at, started_at, completed_at, error_message, automations(name)')
    .order('created_at', { ascending: false })

  if (automationId) {
    query = query.eq('automation_id', automationId)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (days) {
    const daysAgo = new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000)
    query = query.gte('created_at', daysAgo.toISOString())
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const logs: ExecutionLog[] = (data ?? []).map((row) => {
    let durationMs: number | undefined
    if (row.started_at && row.completed_at) {
      durationMs = new Date(row.completed_at).getTime() - new Date(row.started_at).getTime()
    }
    return {
      id: row.id,
      automation_id: row.automation_id,
      automation_name:
        (row.automations as unknown as { name: string } | null)?.name ?? 'Unknown',
      status: row.status as 'running' | 'success' | 'error',
      created_at: row.created_at,
      duration_ms: durationMs,
      error_message: row.error_message ?? undefined,
    }
  })

  return NextResponse.json({ logs })
}
