export interface RateLimitConfig {
  ip: string;
  limit: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

function buildRestUrl(redisUrl: string): string {
  const url = new URL(redisUrl);
  return `https://${url.hostname}`;
}

function extractToken(redisUrl: string): string {
  const url = new URL(redisUrl);
  return url.password;
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_URL;
  if (!redisUrl) {
    // If Redis is not configured, allow all requests
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: Date.now() + 60000 };
  }

  const baseUrl = buildRestUrl(redisUrl);
  const token = extractToken(redisUrl);
  const windowMs = 60000; // 1 minute
  const key = `ratelimit:${config.ip}:${config.limit}`;

  // INCR the key
  const incrResponse = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!incrResponse.ok) {
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: Date.now() + windowMs };
  }

  const incrData = await incrResponse.json();
  const count = incrData.result as number;

  // Set expiry on first request
  if (count === 1) {
    await fetch(`${baseUrl}/expire/${encodeURIComponent(key)}/60`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  const remaining = Math.max(0, config.limit - count);
  const reset = Date.now() + windowMs;

  return {
    success: count <= config.limit,
    limit: config.limit,
    remaining,
    reset,
  };
}
