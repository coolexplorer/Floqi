import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json(
      { error: 'Missing code parameter. code required.' },
      { status: 400 }
    );
  }

  if (!state) {
    return NextResponse.json(
      { error: 'Missing state parameter. csrf required.' },
      { status: 400 }
    );
  }

  const storedState = request.cookies.get('oauth_state')?.value;
  if (!storedState || state !== storedState) {
    return NextResponse.json(
      { error: 'CSRF validation failed: state mismatch or invalid state.' },
      { status: 400 }
    );
  }

  const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID!;
  const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET!;
  const origin = new URL(request.url).origin;
  const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');

  const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/auth/connect/notion/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: 'Notion OAuth failed: token exchange error.' },
      { status: 400 }
    );
  }

  const tokenData = await tokenResponse.json();

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { encrypt } = await import('@/lib/crypto');
  const encryptedAccessToken = await encrypt(tokenData.access_token);

  const { error: upsertError } = await supabase
    .from('connected_services')
    .upsert({
      user_id: user.id,
      service_name: 'notion',
      encrypted_access_token: encryptedAccessToken,
      connected_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (upsertError) {
    return NextResponse.json(
      { error: 'Failed to save connection' },
      { status: 500 }
    );
  }

  const response = NextResponse.redirect(new URL('/connections', request.url), 302);
  response.cookies.delete('oauth_state');
  return response;
}
