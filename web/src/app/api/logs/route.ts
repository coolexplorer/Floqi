import { NextResponse } from 'next/server'
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

export async function GET() {
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
    .select('id, automation_id, status, created_at, duration_ms, error_message, automations(name)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const logs: ExecutionLog[] = (data ?? []).map((row) => ({
    id: row.id,
    automation_id: row.automation_id,
    automation_name:
      (row.automations as unknown as { name: string } | null)?.name ?? 'Unknown',
    status: row.status as 'running' | 'success' | 'error',
    created_at: row.created_at,
    duration_ms: row.duration_ms ?? undefined,
    error_message: row.error_message ?? undefined,
  }))

  return NextResponse.json({ logs })
}
