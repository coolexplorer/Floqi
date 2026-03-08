/**
 * Enqueue automation tasks for the Go worker.
 *
 * Local dev:  Calls Worker's HTTP enqueue endpoint (WORKER_URL).
 * Production: Uses Upstash REST API to push tasks in Asynq protobuf format.
 *
 * Environment detection:
 *   - WORKER_URL (e.g. "http://127.0.0.1:8081") → Worker HTTP API
 *   - UPSTASH_REDIS_URL → Upstash REST API (production)
 */

import { randomUUID } from 'crypto'

const TASK_TYPE = 'automation:run'
const QUEUE_NAME = 'default'
const DEFAULT_RETRY = 25
const DEFAULT_TIMEOUT_SEC = 1800 // 30 minutes

// ── Worker HTTP API (local development) ──────────────────────────────────────

async function enqueueViaWorker(automationId: string): Promise<void> {
  const workerUrl = process.env.WORKER_URL!
  const res = await fetch(`${workerUrl}/enqueue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ automation_id: automationId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Worker enqueue failed: ${res.status} ${text}`)
  }
}

// ── Asynq protobuf encoder ─────────────────────────────────────────────────
// Encodes a minimal TaskMessage protobuf matching asynq's internal/proto/asynq.proto

function encodeVarint(value: number): Buffer {
  const bytes: number[] = []
  let v = value >>> 0 // unsigned
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80)
    v >>>= 7
  }
  bytes.push(v & 0x7f)
  return Buffer.from(bytes)
}

function encodeString(fieldNumber: number, value: string): Buffer {
  const tag = encodeVarint((fieldNumber << 3) | 2)
  const data = Buffer.from(value, 'utf-8')
  const len = encodeVarint(data.length)
  return Buffer.concat([tag, len, data])
}

function encodeBytes(fieldNumber: number, value: Buffer): Buffer {
  const tag = encodeVarint((fieldNumber << 3) | 2)
  const len = encodeVarint(value.length)
  return Buffer.concat([tag, len, value])
}

function encodeVarintField(fieldNumber: number, value: number): Buffer {
  const tag = encodeVarint((fieldNumber << 3) | 0)
  return Buffer.concat([tag, encodeVarint(value)])
}

function encodeAsynqTaskMessage(taskId: string, payload: string): Buffer {
  // Proto fields: 1=type, 2=payload, 3=id, 4=queue, 5=retry, 8=timeout
  return Buffer.concat([
    encodeString(1, TASK_TYPE),
    encodeBytes(2, Buffer.from(payload, 'utf-8')),
    encodeString(3, taskId),
    encodeString(4, QUEUE_NAME),
    encodeVarintField(5, DEFAULT_RETRY),
    encodeVarintField(8, DEFAULT_TIMEOUT_SEC),
  ])
}

// ── Upstash REST API (production) ───────────────────────────────────────────

async function enqueueUpstash(automationId: string): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_URL!
  const url = new URL(redisUrl)
  const baseUrl = `https://${url.hostname}`
  const token = url.password

  const taskId = randomUUID()
  const payload = JSON.stringify({ automation_id: automationId })
  const msg = encodeAsynqTaskMessage(taskId, payload)
  const now = Date.now() * 1_000_000

  const taskKey = `asynq:{${QUEUE_NAME}}:t:${taskId}`
  const pendingKey = `asynq:{${QUEUE_NAME}}:pending`

  // HSET task
  const hsetRes = await fetch(
    `${baseUrl}/hset/${encodeURIComponent(taskKey)}/msg/${encodeURIComponent(msg.toString('base64'))}/state/pending/pending_since/${now}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!hsetRes.ok) throw new Error(`Upstash HSET failed: ${hsetRes.status}`)

  // LPUSH to pending
  const lpushRes = await fetch(
    `${baseUrl}/lpush/${encodeURIComponent(pendingKey)}/${encodeURIComponent(taskId)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!lpushRes.ok) throw new Error(`Upstash LPUSH failed: ${lpushRes.status}`)
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function enqueueAutomation(automationId: string): Promise<void> {
  if (process.env.WORKER_URL) {
    return enqueueViaWorker(automationId)
  }
  if (process.env.UPSTASH_REDIS_URL) {
    return enqueueUpstash(automationId)
  }
  throw new Error('No enqueue configuration found (set WORKER_URL or UPSTASH_REDIS_URL)')
}
