import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enqueueAutomation } from '@/lib/redis'

export async function POST(
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

  const { data: automation, error: fetchError } = await supabase
    .from('automations')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !automation) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
  }

  const { data: log, error: logError } = await supabase
    .from('execution_logs')
    .insert({
      automation_id: id,
      status: 'running',
      started_at: new Date().toISOString(),
      tool_calls: [],
    })
    .select('id')
    .single()

  if (logError || !log) {
    return NextResponse.json({ error: 'Failed to create execution log' }, { status: 500 })
  }

  try {
    await enqueueAutomation(id)
  } catch {
    return NextResponse.json({ error: 'Failed to enqueue automation' }, { status: 500 })
  }

  return NextResponse.json({ logId: log.id, status: 'queued' })
}
