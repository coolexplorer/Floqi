import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/connect/notion/callback`,
    response_type: 'code',
    owner: 'user',
    state,
  });

  const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });

  return response;
}
