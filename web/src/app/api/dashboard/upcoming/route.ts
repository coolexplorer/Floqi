import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('automations')
    .select('id, name, template_type, next_run_at, schedule_cron')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .not('next_run_at', 'is', null)
    .order('next_run_at', { ascending: true })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const upcoming = (data ?? []).map(a => ({
    automationId: a.id,
    automationName: a.name,
    templateType: a.template_type,
    nextRunAt: a.next_run_at,
    scheduleCron: a.schedule_cron,
  }))

  return NextResponse.json({ upcoming })
}
