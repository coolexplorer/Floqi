import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeNextRunAt } from '@/lib/cron'
import { createAutomationSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const parsed = createAutomationSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 })
  }
  const { name, description, template_type, config, schedule_cron, timezone, status } = parsed.data

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    name,
    description,
    template_type,
    config,
    schedule_cron,
    timezone,
    status,
  }

  // Compute next_run_at when creating as active with a cron schedule
  if (status === 'active' && schedule_cron) {
    const nextRun = computeNextRunAt(schedule_cron, timezone)
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
