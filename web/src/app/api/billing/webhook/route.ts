import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === 'checkout.session.completed') {
      const userId = body.data?.object?.client_reference_id;

      if (userId) {
        const supabase = createClient();
        await supabase
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', userId);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
