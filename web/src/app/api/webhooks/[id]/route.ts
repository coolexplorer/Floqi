import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enqueueAutomation } from '@/lib/redis'

/**
 * Verifies the HMAC-SHA256 signature from the x-floqi-signature header.
 * Signature format: "sha256=<hex_digest>"
 */
async function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature.startsWith('sha256=')) return false

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signatureBuffer))
  const expectedHex = 'sha256=' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  try {
    return timingSafeEqual(
      Buffer.from(expectedHex, 'utf-8'),
      Buffer.from(signature, 'utf-8')
    )
  } catch {
    return false // Buffer length mismatch
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Check Content-Length before reading body
  const contentLength = parseInt(request.headers.get('content-length') ?? '0', 10);
  if (contentLength > 102400) { // 100KB
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // 1. Validate HMAC signature first (security gate)
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const signature = request.headers.get('x-floqi-signature') ?? ''
  const payload = await request.text()

  if (Buffer.byteLength(payload, 'utf-8') > 102400) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const isValid = await verifyHmacSignature(payload, signature, secret)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Verify automation exists (service role — no user auth for webhooks)
  const supabase = await createClient()
  const { data: automation, error } = await supabase
    .from('automations')
    .select('id, status')
    .eq('id', id)
    .single()

  if (error || !automation) {
    return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
  }

  // Check if automation is active
  if (automation.status !== 'active') {
    return NextResponse.json(
      { error: 'Automation is not active' },
      { status: 400 }
    )
  }

  // 3. Enqueue automation job to Redis
  await enqueueAutomation(id)

  return NextResponse.json({ status: 'queued' }, { status: 202 })
}
