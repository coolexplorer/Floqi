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

// ─── In-memory store (local dev) ───────────────────────────────────────────────

const memStore = new Map<string, { count: number; reset: number }>();

function checkInMemory(config: RateLimitConfig): RateLimitResult {
  const windowMs = 60000;
  const key = `ratelimit:${config.ip}:${config.limit}`;
  const now = Date.now();

  const entry = memStore.get(key);
  if (!entry || now >= entry.reset) {
    memStore.set(key, { count: 1, reset: now + windowMs });
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: now + windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, config.limit - entry.count);

  return {
    success: entry.count <= config.limit,
    limit: config.limit,
    remaining,
    reset: entry.reset,
  };
}

// ─── Upstash REST (production) ─────────────────────────────────────────────────

function buildRestUrl(redisUrl: string): string {
  const url = new URL(redisUrl);
  return `https://${url.hostname}`;
}

function extractToken(redisUrl: string): string {
  const url = new URL(redisUrl);
  return url.password;
}

async function checkUpstash(config: RateLimitConfig, redisUrl: string): Promise<RateLimitResult> {
  const baseUrl = buildRestUrl(redisUrl);
  const token = extractToken(redisUrl);
  const windowMs = 60000;
  const key = `ratelimit:${config.ip}:${config.limit}`;

  const incrResponse = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!incrResponse.ok) {
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: Date.now() + windowMs };
  }

  const incrData = await incrResponse.json();
  const count = incrData.result as number;

  if (count === 1) {
    await fetch(`${baseUrl}/expire/${encodeURIComponent(key)}/60`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  const remaining = Math.max(0, config.limit - count);
  return {
    success: count <= config.limit,
    limit: config.limit,
    remaining,
    reset: Date.now() + windowMs,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_URL;

  // No Redis URL → in-memory fallback (local dev)
  if (!redisUrl) {
    return checkInMemory(config);
  }

  try {
    return await checkUpstash(config, redisUrl);
  } catch {
    // Upstash unreachable → fall back to in-memory
    return checkInMemory(config);
  }
}
