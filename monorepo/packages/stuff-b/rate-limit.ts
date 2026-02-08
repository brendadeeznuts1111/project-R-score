import { LIMITS, FEATURES } from 'stuff-a/config';

const hits = new Map<string, number[]>();

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  if (!FEATURES.RATE_LIMITING) return { allowed: true, remaining: LIMITS.RATE_LIMIT_MAX_REQUESTS };

  const now = Date.now();
  const windowStart = now - LIMITS.RATE_LIMIT_WINDOW_MS;

  let timestamps = hits.get(ip);
  if (!timestamps) {
    timestamps = [];
    hits.set(ip, timestamps);
  }

  // Remove expired entries
  while (timestamps.length > 0 && timestamps[0] < windowStart) {
    timestamps.shift();
  }

  if (timestamps.length >= LIMITS.RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  return { allowed: true, remaining: LIMITS.RATE_LIMIT_MAX_REQUESTS - timestamps.length };
}

export function resetRateLimits(): void {
  hits.clear();
}

// Periodic cleanup of stale IPs every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - LIMITS.RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of hits) {
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
    if (timestamps.length === 0) hits.delete(ip);
  }
}, 5 * 60_000).unref();
