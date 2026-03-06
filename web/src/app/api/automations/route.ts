import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { data, error } = await supabase
    .from('automations')
    .insert({
      user_id: user.id,
      name,
      description,
      template_type,
      config: config ?? {},
      schedule_cron,
      timezone: timezone ?? 'UTC',
      status: status ?? 'paused',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
