import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeNextRunAt } from '@/lib/cron'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, template_type, config, schedule_cron, timezone, status } = body

  const effectiveStatus = status ?? 'paused'
  const tz = timezone ?? 'UTC'

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name,
    description,
    template_type,
    config: config ?? {},
    schedule_cron,
    timezone: tz,
    status: effectiveStatus,
  }

  // Compute next_run_at when creating as active with a cron schedule
  if (effectiveStatus === 'active' && schedule_cron) {
    const nextRun = computeNextRunAt(schedule_cron, tz)
    if (nextRun) {
      insertPayload.next_run_at = nextRun
    }
  }

  const { data, error } = await supabase
    .from('automations')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
