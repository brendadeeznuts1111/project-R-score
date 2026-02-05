/**
 * @fileoverview 7.2.0.0.0.0.0: Pattern Optimizer for URLPattern Caching
 * @description LRU cache for URLPattern instances with performance metrics
 * @module api/router/pattern-optimizer
 * @version 7.2.0.0.0.0.0
 *
 * [DoD][CLASS:PatternOptimizer][SCOPE:Performance]
 * Optimizes URLPattern matching with caching and pre-compilation
 */

import { consoleEnhanced } from "../../logging/console-enhanced"

/**
 * Cached pattern entry with metadata
 */
interface CachedPattern {
  pattern: URLPattern
  compiled: boolean
  hitCount: number
  lastAccess: number
}

/**
 * 7.2.0.0.0.0.0: Pattern Optimizer Class
 * [DoD][CLASS:PatternOptimizer][SCOPE:Performance]
 *
 * Provides LRU caching for URLPattern instances to improve performance
 * and reduce compilation overhead for frequently used patterns.
 */
export class PatternOptimizer {
  private static readonly CACHE_SIZE = 1000
  private static readonly PATTERN_TTL = 300000 // 5 minutes

  private cache = new Map<string, CachedPattern>()

  /**
   * 7.2.1.0.0.0.0: Get or compile pattern with caching
   * [DoD][METHOD:GetOrCompile][SCOPE:Caching]
   *
   * @param patternString - URL pattern string (e.g., '/api/v1/users/:id')
   * @returns Compiled URLPattern instance
   *
   * @example
   * ```typescript
   * const pattern = optimizer.getOrCompile('/api/v1/users/:id');
   * const result = pattern.exec('https://example.com/api/v1/users/123');
   * ```
   */
  getOrCompile(patternString: string): URLPattern {
    const now = Date.now()

    // Clean expired entries
    this.cleanupExpired(now)

    // Check cache
    const cached = this.cache.get(patternString)
    if (cached) {
      cached.hitCount++
      cached.lastAccess = now
      return cached.pattern
    }

    // Compile new pattern
    const pattern = new URLPattern({ pathname: patternString })

    // Add to cache (evict LRU if full)
    if (this.cache.size >= PatternOptimizer.CACHE_SIZE) {
      this.evictLRU()
    }

    this.cache.set(patternString, {
      pattern,
      compiled: true,
      hitCount: 1,
      lastAccess: now,
    })

    consoleEnhanced.debug("HBAPI-007", "Pattern compiled and cached", {
      pattern: patternString,
      cacheSize: this.cache.size,
    })

    return pattern
  }

  /**
   * 7.2.2.0.0.0.0: Clean up expired cache entries
   * [DoD][METHOD:CleanupExpired][SCOPE:MemoryManagement]
   */
  private cleanupExpired(now: number): void {
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccess > PatternOptimizer.PATTERN_TTL) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 7.2.3.0.0.0.0: Evict least recently used entry
   * [DoD][METHOD:EvictLRU][SCOPE:CacheManagement]
   */
  private evictLRU(): void {
    let lruKey: string | null = null
    let lruTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
      consoleEnhanced.debug("HBAPI-008", "LRU pattern evicted", {
        pattern: lruKey,
        cacheSize: this.cache.size,
      })
    }
  }

  /**
   * 7.2.4.0.0.0.0: Get cache statistics
   * [DoD][METHOD:GetStats][SCOPE:Observability]
   *
   * @returns Cache performance statistics
   */
  getStats() {
    const totalHits = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.hitCount,
      0
    )
    const avgHitRate = totalHits / Math.max(this.cache.size, 1)

    return {
      cacheSize: this.cache.size,
      totalHits,
      avgHitRate: avgHitRate.toFixed(2),
      patterns: Array.from(this.cache.keys()),
      hitRate:
        (
          (totalHits /
            (totalHits +
              (this.cache.size -
                Array.from(this.cache.values()).filter((e) => e.hitCount > 0).length))) *
          100
        ).toFixed(1) + "%",
    }
  }

  /**
   * 7.2.5.0.0.0.0: Clear pattern cache
   * [DoD][METHOD:Clear][SCOPE:Development]
   *
   * Useful for hot reload scenarios or memory cleanup
   */
  clear(): void {
    const oldSize = this.cache.size
    this.cache.clear()
    consoleEnhanced.info("Pattern cache cleared", {
      previousSize: oldSize,
      currentSize: this.cache.size,
    })
  }

  /**
   * 7.2.6.0.0.0.0: Pre-compile common patterns
   * [DoD][METHOD:Precompile][SCOPE:Performance]
   *
   * @param patterns - Array of pattern strings to pre-compile
   */
  precompile(patterns: string[]): void {
    for (const pattern of patterns) {
      this.getOrCompile(pattern)
    }

    consoleEnhanced.info("Patterns pre-compiled", {
      count: patterns.length,
      cacheSize: this.cache.size,
    })
  }

  /**
   * 7.2.7.0.0.0.0: Check if pattern is cached
   * [DoD][METHOD:IsCached][SCOPE:CacheInspection]
   */
  isCached(patternString: string): boolean {
    return this.cache.has(patternString)
  }

  /**
   * 7.2.8.0.0.0.0: Get cache size
   * [DoD][METHOD:Size][SCOPE:CacheInspection]
   */
  size(): number {
    return this.cache.size
  }
}

/**
 * Global pattern optimizer instance
 * [DoD][SINGLETON:PatternOptimizer][SCOPE:Global]
 */
export const patternOptimizer = new PatternOptimizer()
