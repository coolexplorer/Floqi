import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter. code required.' }, { status: 400 });
  }
  if (!state) {
    return NextResponse.json({ error: 'Missing state parameter. csrf required.' }, { status: 400 });
  }

  const storedState = request.cookies.get('oauth_state')?.value;
  if (!storedState || state !== storedState) {
    return NextResponse.json({ error: 'CSRF validation failed: state mismatch or invalid state.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
      redirect_uri: `${origin}/api/auth/connect/github/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.json({ error: 'GitHub OAuth failed: token exchange error.' }, { status: 400 });
  }

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return NextResponse.json({ error: 'GitHub OAuth failed: token exchange error.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const encryptedAccess = await encrypt(tokenData.access_token);
  const scopes = (tokenData.scope ?? '').split(',').filter(Boolean);

  const { error: upsertError } = await supabase.from('connected_services').upsert(
    {
      user_id: user.id,
      provider: 'github',
      access_token_encrypted: encryptedAccess,
      scopes,
      is_active: true,
    },
    { onConflict: 'user_id,provider' }
  );

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
  }

  const response = NextResponse.redirect(new URL('/connections', request.url), 302);
  response.cookies.delete('oauth_state');
  return response;
}
