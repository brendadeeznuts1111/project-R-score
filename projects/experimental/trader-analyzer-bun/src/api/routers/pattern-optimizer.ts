/**
 * @fileoverview 7.2.0.0.0.0.0: Pattern Optimizer for URLPattern Router
 * @description Optimizes URLPattern matching with caching and pre-compilation
 * @module api/routers/pattern-optimizer
 * @version 7.2.0.0.0.0.0
 *
 * [DoD][CLASS:PatternOptimizer][SCOPE:Performance]
 * Optimizes URLPattern matching with caching and pre-compilation
 * Provides LRU cache for frequently used patterns with TTL support
 *
 * Cross-reference: docs/7.0.0.0.0.0.0-URLPATTERN-ROUTER.md
 * Cross-reference: docs/BUN-1.3.4-URLPATTERN-API.md
 * Ripgrep Pattern: 7\.2\.0\.0\.0\.0\.0|PatternOptimizer|pattern-optimizer
 */

interface PatternCacheEntry {
	pattern: URLPattern;
	compiled: boolean;
	hitCount: number;
	lastAccess: number;
}

/**
 * 7.2.0.0.0.0.0: Pattern Optimizer Class
 * [DoD][CLASS:PatternOptimizer][SCOPE:Performance]
 * 
 * Provides LRU cache for frequently used URLPattern instances with TTL support.
 * Reduces pattern compilation overhead by caching compiled patterns.
 */
export class PatternOptimizer {
	private static readonly CACHE_SIZE = 1000;
	private static readonly PATTERN_TTL = 300000; // 5 minutes

	private cache = new Map<string, PatternCacheEntry>();

	/**
	 * 7.2.1.0.0.0.0: Get or compile pattern with caching
	 * [DoD][METHOD:GetOrCompile][SCOPE:Performance]
	 * 
	 * @param patternString - URLPattern pathname string (e.g., '/api/v1/graph/:eventId')
	 * @returns Cached or newly compiled URLPattern instance
	 * 
	 * @example
	 * ```typescript
	 * const pattern = patternOptimizer.getOrCompile('/api/v1/graph/:eventId');
	 * const result = pattern.exec('https://example.com/api/v1/graph/NFL-123');
	 * ```
	 */
	getOrCompile(patternString: string): URLPattern {
		const now = Date.now();
		
		// Clean expired entries
		this.cleanupExpired(now);

		// Check cache
		const cached = this.cache.get(patternString);
		if (cached) {
			cached.hitCount++;
			cached.lastAccess = now;
			return cached.pattern;
		}

		// Compile new pattern
		const pattern = new URLPattern({ pathname: patternString });
		
		// Add to cache (evict LRU if full)
		if (this.cache.size >= PatternOptimizer.CACHE_SIZE) {
			this.evictLRU();
		}

		this.cache.set(patternString, {
			pattern,
			compiled: true,
			hitCount: 1,
			lastAccess: now
		});

		return pattern;
	}

	/**
	 * 7.2.2.0.0.0.0: Clean up expired cache entries
	 * [DoD][METHOD:CleanupExpired][SCOPE:CacheManagement]
	 */
	private cleanupExpired(now: number): void {
		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.lastAccess > PatternOptimizer.PATTERN_TTL) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * 7.2.3.0.0.0.0: Evict least recently used entry
	 * [DoD][METHOD:EvictLRU][SCOPE:CacheManagement]
	 */
	private evictLRU(): void {
		let lruKey: string | null = null;
		let lruTime = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccess < lruTime) {
				lruTime = entry.lastAccess;
				lruKey = key;
			}
		}

		if (lruKey) {
			this.cache.delete(lruKey);
		}
	}

	/**
	 * 7.2.4.0.0.0.0: Get cache statistics
	 * [DoD][METHOD:GetStats][SCOPE:Observability]
	 * 
	 * @returns Cache statistics including size, hits, and hit rate
	 */
	getStats() {
		const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hitCount, 0);
		const avgHitRate = totalHits / Math.max(this.cache.size, 1);
		
		return {
			cacheSize: this.cache.size,
			totalHits,
			avgHitRate: avgHitRate.toFixed(2),
			patterns: Array.from(this.cache.keys())
		};
	}

	/**
	 * 7.2.5.0.0.0.0: Clear cache
	 * [DoD][METHOD:Clear][SCOPE:CacheManagement]
	 */
	clear(): void {
		this.cache.clear();
	}
}

/**
 * Global optimizer instance for application-wide use
 * [DoD][SINGLETON:PatternOptimizer][SCOPE:Global]
 */
export const patternOptimizer = new PatternOptimizer();
