import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const logId = `log-${Date.now()}`
  return NextResponse.json({ logId, status: 'queued' })
}
