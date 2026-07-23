#!/usr/bin/env bun
/**
 * retry.ts — exponential backoff retry utility for registry proof checks.
 *
 * @example
 *   const result = await withRetry(() => fetchHealth(), 'health', 3, 1000);
 */
export {};

const GLOBAL_CACHE = new Map<string, { data: unknown; ts: number }>();

/**
 * Retry an async function with exponential backoff + jitter.
 * Returns null if all retries fail (does not throw).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const jitter = Math.random() * 1000;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
      console.warn(`[${label}] attempt ${attempt}/${maxRetries}: ${(e as Error).message}. retry in ${Math.round(delay)}ms`);
      if (attempt === maxRetries) {
        console.error(`[${label}] all ${maxRetries} retries exhausted`);
        return null;
      }
      await Bun.sleep(delay);
    }
  }
  return null;
}

/**
 * In-memory + disk cache for computed proofs.
 * Reads from disk on miss, writes on compute.
 */
export async function withCache<T>(
  key: string,
  compute: () => Promise<T>,
  ttlMs = 5 * 60 * 1000,
  diskPath?: string,
): Promise<{ data: T; source: 'fresh' | 'memory' | 'disk' | 'stale' }> {
  const now = Date.now();

  // 1. Memory cache
  const mem = GLOBAL_CACHE.get(key);
  if (mem && now - mem.ts < ttlMs) {
    return { data: mem.data as T, source: 'memory' };
  }

  // 2. Disk cache
  if (diskPath) {
    try {
      const file = Bun.file(diskPath);
      if (await file.exists()) {
        const disk = JSON.parse(await file.text()) as { data: T; ts?: string };
        const diskTs = disk.ts ? new Date(disk.ts).getTime() : 0;
        if (diskTs && now - diskTs < ttlMs) {
          GLOBAL_CACHE.set(key, { data: disk.data, ts: diskTs });
          return { data: disk.data, source: 'disk' };
        }
        // Stale but usable fallback
        if (disk.data) {
          return { data: disk.data, source: 'stale' };
        }
      }
    } catch { /* corrupted */ }
  }

  // 3. Fresh compute
  const data = await compute();
  GLOBAL_CACHE.set(key, { data, ts: now });
  if (diskPath) {
    await Bun.write(diskPath, JSON.stringify({ data, ts: new Date().toISOString() }, null, 2)).catch(() => {});
  }
  return { data, source: 'fresh' };
}
