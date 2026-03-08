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

  // Ownership check (RLS enforced)
  const { data: automation, error: fetchError } = await supabase
    .from('automations')
    .select('id, status')
    .eq('id', id)
    .single()

  if (fetchError || !automation) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
  }

  // Enqueue only — Worker creates and manages execution_logs
  try {
    await enqueueAutomation(id)
  } catch (err) {
    console.error('[Run Now] enqueue failed:', err)
    return NextResponse.json({ error: 'Failed to enqueue automation' }, { status: 500 })
  }

  return NextResponse.json({ status: 'queued' })
}
