import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user owns this automation
  const { data: automation } = await supabase
    .from('automations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!automation) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
  }

  // Call worker cancel endpoint
  const workerUrl = process.env.WORKER_URL ?? 'http://localhost:8081';
  try {
    const workerRes = await fetch(`${workerUrl}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automation_id: id }),
    });

    if (!workerRes.ok) {
      const data = await workerRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: data.error ?? 'Cancel failed' },
        { status: workerRes.status }
      );
    }

    // Update latest running execution log to cancelled
    await supabase
      .from('execution_logs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('automation_id', id)
      .eq('status', 'running');

    return NextResponse.json({ status: 'cancelled' });
  } catch {
    return NextResponse.json({ error: 'Worker unreachable' }, { status: 502 });
  }
}
