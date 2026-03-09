import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeNextRunAt } from '@/lib/cron'
import { updateAutomationSchema } from '@/lib/validation/schemas'

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

  const raw = await request.json()
  const parsed = updateAutomationSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 })
  }
  const body = parsed.data
  const updatePayload: Record<string, unknown> = {}

  if ('status' in body) updatePayload.status = body.status
  if ('name' in body) updatePayload.name = body.name
  if ('agent_prompt' in body) updatePayload.agent_prompt = body.agent_prompt
  if ('schedule_cron' in body) updatePayload.schedule_cron = body.schedule_cron

  // Recalculate next_run_at when activating or changing schedule
  const needsNextRun =
    updatePayload.status === 'active' || 'schedule_cron' in updatePayload

  if (needsNextRun) {
    // Fetch current automation to get schedule_cron and timezone
    const { data: current } = await supabase
      .from('automations')
      .select('schedule_cron, timezone')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (current) {
      const cron = (updatePayload.schedule_cron as string) ?? current.schedule_cron
      const tz = current.timezone ?? 'UTC'
      if (cron) {
        const nextRun = computeNextRunAt(cron, tz)
        if (nextRun) {
          updatePayload.next_run_at = nextRun
        }
      }
    }
  }

  // Clear next_run_at when pausing
  if (updatePayload.status === 'paused') {
    updatePayload.next_run_at = null
  }

  const { data, error } = await supabase
    .from('automations')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, status, schedule_cron, agent_prompt, next_run_at')
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
