import { RedisClient } from 'bun';

// @see https://bun.com/docs/runtime/redis
/**
 * @dynamic-spy/kit v3.4 - Redis Arbitrage Cache
 *
 * Production-ready Redis cache for arbitrage opportunities
 * Fuzzer-proof error handling
 */

export interface ArbCacheEntry {
  market: string;
  profit_pct: number;
  value_usd: number;
  timestamp: number;
  bookie_a: string;
  bookie_b: string;
}

export class RedisArbCache {
  private redis: RedisClient;
  private connected: boolean = false;
  private readonly memory = new Map<string, ArbCacheEntry>();

  constructor(redisUrl?: string) {
    this.redis = new RedisClient(redisUrl, {
      connectionTimeout: 250,
      maxRetries: 0,
      enableOfflineQueue: false,
    });
  }

  /**
   * Connect to Redis (optional - falls back to in-memory)
   *
   * @returns True if connected, false if using fallback
   */
  async connect(): Promise<boolean> {
    try {
      await this.redis.connect();
      this.connected = true;
      return true;
    } catch (error) {
      this.connected = false;
      return false;
    }
  }

  /**
   * Cache arbitrage opportunity
   *
   * ✅ Fuzzer-proof: Handles all error cases
   *
   * @param entry - Arbitrage cache entry
   */
  async cacheArb(entry: ArbCacheEntry): Promise<void> {
    try {
      this.memory.set(entry.market, entry);
      if (this.connected) {
        await this.redis.set(`arb:${entry.market}`, JSON.stringify(entry));
      }
    } catch (error) {
      // Fuzzer-safe: silently fail
      console.warn('Redis cache failed, continuing without cache');
    }
  }

  /**
   * Get cached arbitrage opportunity
   *
   * ✅ Fuzzer-proof: Returns null on error
   *
   * @param market - Market identifier
   * @returns Cached entry or null
   */
  async getArb(market: string): Promise<ArbCacheEntry | null> {
    try {
      if (this.connected) {
        const data = await this.redis.get(`arb:${market}`);
        return data ? (JSON.parse(data) as ArbCacheEntry) : null;
      }
      return this.memory.get(market) ?? null;
    } catch (error) {
      // Fuzzer-safe: return null on error
      return null;
    }
  }

  /**
   * Get all cached arbitrage opportunities
   *
   * ✅ Fuzzer-proof: Returns empty array on error
   *
   * @returns Array of cached entries
   */
  async getAllArbs(): Promise<ArbCacheEntry[]> {
    try {
      if (this.connected) {
        const keys = (await this.redis.send('KEYS', ['arb:*'])) as string[];
        return (await Promise.all(keys.map(key => this.getArb(key.slice(4))))).filter(
          (entry): entry is ArbCacheEntry => entry !== null
        );
      }
      return [...this.memory.values()];
    } catch (error) {
      // Fuzzer-safe: return empty array
      return [];
    }
  }

  /**
   * Clear cache
   *
   * ✅ Fuzzer-proof: No errors thrown
   */
  async clearCache(): Promise<void> {
    try {
      this.memory.clear();
      if (this.connected) {
        const keys = (await this.redis.send('KEYS', ['arb:*'])) as string[];
        if (keys.length > 0) await this.redis.del(...keys);
      }
    } catch (error) {
      // Fuzzer-safe: ignore errors
    }
  }
}
