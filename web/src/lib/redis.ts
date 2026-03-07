/**
 * Redis queue client using Upstash REST API.
 * Pushes automation run payloads to the "floqi:queue" list.
 * The Go worker reads from this list via Asynq.
 *
 * UPSTASH_REDIS_URL format: rediss://:password@host:port
 * Upstash REST API format:  https://host/lpush/floqi:queue
 */

function buildRestUrl(redisUrl: string): string {
  // Convert rediss://:password@host:port → https://host
  const url = new URL(redisUrl)
  return `https://${url.hostname}`
}

function extractToken(redisUrl: string): string {
  // password is the auth token for Upstash REST API
  const url = new URL(redisUrl)
  return url.password
}

export async function enqueueAutomation(automationId: string): Promise<void> {
  const redisUrl = process.env.UPSTASH_REDIS_URL
  if (!redisUrl) {
    throw new Error('UPSTASH_REDIS_URL is not configured')
  }

  const baseUrl = buildRestUrl(redisUrl)
  const token = extractToken(redisUrl)
  const payload = JSON.stringify({ automation_id: automationId })

  const response = await fetch(`${baseUrl}/lpush/floqi:queue/${encodeURIComponent(payload)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Redis enqueue failed: ${response.status}`)
  }
}
