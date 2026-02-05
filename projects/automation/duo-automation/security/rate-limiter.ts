// security/rate-limiter.ts
export class RateLimiter {
  private requestCounts = new Map<string, number>();
  private readonly WINDOW_MS = 60_000; // 1 minute
  private readonly MAX_REQUESTS = 100;

  async checkRateLimit(apiKey: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;
    
    // Clean old entries
    for (const [key, timestamp] of this.requestCounts) {
      if (timestamp < windowStart) {
        this.requestCounts.delete(key);
      }
    }

    // Check current count
    const count = Array.from(this.requestCounts.keys())
      .filter(key => key.startsWith(`${apiKey}:`))
      .length;

    if (count >= this.MAX_REQUESTS) {
      // Exponential backoff with jitter
      const backoff = Math.min(1000 * 2 ** count, 30000);
      const jitter = Math.random() * 1000;
      await Bun.sleep(backoff + jitter);
      return false;
    }

    // Add new request
    this.requestCounts.set(`${apiKey}:${now}`, now);
    return true;
  }
}