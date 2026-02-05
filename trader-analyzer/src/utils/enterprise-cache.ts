/**
 * @fileoverview Enterprise Cache
 * @description LRU cache with TTL and automatic cleanup
 * @module utils/enterprise-cache
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ENTERPRISE-CACHE@0.1.0;instance-id=ENTERPRISE-CACHE-001;version=0.1.0}]
 * [PROPERTIES:{cache={value:"enterprise-cache";@root:"ROOT-CACHE";@chain:["BP-CACHE","BP-ENTERPRISE"];@version:"0.1.0"}}]
 * [CLASS:EnterpriseCache][#REF:v-0.1.0.BP.ENTERPRISE.CACHE.1.0.A.1.1.CACHE.1.1]]
 */

import { ENTERPRISE_CONFIG } from "./enterprise-config";

/**
 * Cache entry
 */
interface CacheEntry<T> {
	value: T;
	expiresAt: number;
	accessCount: number;
	lastAccessed: number;
}

/**
 * Enterprise LRU cache with TTL
 */
export class EnterpriseCache<K, V> {
	private cache = new Map<K, CacheEntry<V>>();
	private cleanupTimer?: ReturnType<typeof setInterval>;

	constructor(
		private readonly maxSize: number = ENTERPRISE_CONFIG.cache.maxSize,
		private readonly ttlMs: number = ENTERPRISE_CONFIG.cache.ttlMs,
		private readonly cleanupIntervalMs: number = ENTERPRISE_CONFIG.cache
			.cleanupIntervalMs,
	) {
		this.startCleanup();
	}

	/**
	 * Get value from cache
	 */
	get(key: K): V | undefined {
		const entry = this.cache.get(key);

		if (!entry) {
			return undefined;
		}

		// Check if expired
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}

		// Update access stats
		entry.accessCount++;
		entry.lastAccessed = Date.now();

		return entry.value;
	}

	/**
	 * Set value in cache
	 */
	set(key: K, value: V, ttlMs?: number): void {
		const expiresAt = Date.now() + (ttlMs || this.ttlMs);

		// Evict if at capacity
		if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
			this.evictLRU();
		}

		this.cache.set(key, {
			value,
			expiresAt,
			accessCount: 0,
			lastAccessed: Date.now(),
		});
	}

	/**
	 * Delete value from cache
	 */
	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	/**
	 * Clear all cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache size
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Get cache stats
	 */
	getStats(): {
		size: number;
		maxSize: number;
		hitRate: number;
		totalAccesses: number;
	} {
		let totalAccesses = 0;
		for (const entry of this.cache.values()) {
			totalAccesses += entry.accessCount;
		}

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			hitRate: totalAccesses > 0 ? totalAccesses / this.cache.size : 0,
			totalAccesses,
		};
	}

	/**
	 * Evict least recently used entry
	 */
	private evictLRU(): void {
		let lruKey: K | undefined;
		let lruTime = Infinity;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccessed < lruTime) {
				lruTime = entry.lastAccessed;
				lruKey = key;
			}
		}

		if (lruKey !== undefined) {
			this.cache.delete(lruKey);
		}
	}

	/**
	 * Start automatic cleanup
	 */
	private startCleanup(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanup();
		}, this.cleanupIntervalMs);
	}

	/**
	 * Cleanup expired entries
	 */
	private cleanup(): void {
		const now = Date.now();
		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Stop cleanup timer
	 */
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = undefined;
		}
	}
}
