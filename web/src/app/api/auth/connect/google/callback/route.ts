import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@/lib/supabase/server';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
];

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

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/connect/google/callback`
  );

  let tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    scope?: string;
  };

  try {
    const result = await oauth2Client.getToken(code);
    tokens = result.tokens;
  } catch {
    return NextResponse.json(
      { error: 'OAuth failed: invalid code. Token exchange failed.' },
      { status: 400 }
    );
  }

  // Dynamic import avoids TDZ issue with vitest vi.mock factory hoisting
  const { encrypt } = await import('@/lib/crypto');
  const encryptedAccess = await encrypt(tokens.access_token ?? '');
  const encryptedRefresh = await encrypt(tokens.refresh_token ?? '');

  const { error: upsertError } = await supabase.from('connected_services').upsert({
    user_id: user.id,
    service_name: 'google',
    encrypted_access_token: encryptedAccess,
    encrypted_refresh_token: encryptedRefresh,
    expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scopes: JSON.stringify(SCOPES),
    connected_at: new Date().toISOString(),
  });

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
