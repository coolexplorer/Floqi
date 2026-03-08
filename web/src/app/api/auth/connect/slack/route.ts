import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const SCOPES = ['channels:read', 'chat:write'];

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/connect/slack/callback`,
    scope: SCOPES.join(','),
    state,
  });

  const authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });

  return response;
}
