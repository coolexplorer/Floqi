import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { byokSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = byokSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { apiKey } = parsed.data;

  const encrypted = await encrypt(apiKey);

  const { error } = await supabase
    .from('profiles')
    .update({
      llm_provider: 'byok',
      llm_api_key_encrypted: encrypted,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
