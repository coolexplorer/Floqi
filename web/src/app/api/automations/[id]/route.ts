import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
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

  const body = await request.json()
  const updatePayload: Record<string, unknown> = {}

  if ('status' in body) updatePayload.status = body.status
  if ('name' in body) updatePayload.name = body.name
  if ('agent_prompt' in body) updatePayload.agent_prompt = body.agent_prompt
  if ('schedule_cron' in body) {
    updatePayload.schedule_cron = body.schedule_cron
    // Recalculate next_run_at based on new schedule (server-side in worker, not here)
  }

  const { data, error } = await supabase
    .from('automations')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, status, schedule_cron, agent_prompt')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
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

  const { error } = await supabase
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
