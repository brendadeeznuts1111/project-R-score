// utils/toml-cache.ts
// Advanced caching system for TOML configurations with performance optimization
import { readFileSync } from "node:fs";
import { fastHash } from "./common";
import { parseTomlString } from "./toml-utils";

export interface CacheEntry<T = any> {
	data: T;
	hash: string;
	timestamp: number;
	expiresAt?: number;
	accessCount: number;
	lastAccessed: number;
	size: number;
	metadata?: Record<string, any>;
}

export interface CacheOptions {
	maxSize?: number; // Maximum number of entries
	maxMemory?: number; // Maximum memory usage in bytes
	ttl?: number; // Time to live in milliseconds
	enableStats?: boolean; // Enable performance statistics
	enableCompression?: boolean; // Enable data compression
	persistToDisk?: boolean; // Persist cache to disk
	diskCachePath?: string; // Path for disk cache
}

export interface CacheStats {
	hits: number;
	misses: number;
	size: number;
	memoryUsage: number;
	oldestEntry: number;
	newestEntry: number;
	averageAccessTime: number;
	evictions: number;
}

export class TomlCache {
	private cache = new Map<string, CacheEntry>();
	private options: Required<CacheOptions>;
	private stats: CacheStats = {
		hits: 0,
		misses: 0,
		size: 0,
		memoryUsage: 0,
		oldestEntry: 0,
		newestEntry: 0,
		averageAccessTime: 0,
		evictions: 0,
	};
	private memoryUsage = 0;
	private cleanupTimer?: NodeJS.Timeout;

	constructor(options: CacheOptions = {}) {
		this.options = {
			maxSize: options.maxSize || 1000,
			maxMemory: options.maxMemory || 100 * 1024 * 1024, // 100MB
			ttl: options.ttl || 30 * 60 * 1000, // 30 minutes
			enableStats: options.enableStats !== false,
			enableCompression: options.enableCompression || false,
			persistToDisk: options.persistToDisk || false,
			diskCachePath: options.diskCachePath || "./.cache/toml-cache",
		};

		// Start periodic cleanup
		this.startCleanup();
	}

	/**
	 * Get cached configuration
	 */
	get<T = any>(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			this.stats.misses++;
			return null;
		}

		// Check if expired
		if (entry.expiresAt && Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			this.stats.misses++;
			this.updateMemoryUsage();
			return null;
		}

		// Update access statistics
		entry.accessCount++;
		entry.lastAccessed = Date.now();

		if (this.options.enableStats) {
			this.stats.hits++;
			this.updateAverageAccessTime();
		}

		return entry.data as T;
	}

	/**
	 * Set cached configuration
	 */
	set<T = any>(key: string, data: T, ttl?: number): void {
		const now = Date.now();
		const serialized = JSON.stringify(data);
		const hash = fastHash(serialized);
		const size = new Blob([serialized]).size;

		// Check memory constraints
		if (this.shouldEvict(size)) {
			this.evictLeastRecentlyUsed();
		}

		const entry: CacheEntry<T> = {
			data,
			hash: hash.toString(),
			timestamp: now,
			expiresAt: ttl ? now + ttl : now + this.options.ttl,
			accessCount: 0,
			lastAccessed: now,
			size,
			metadata: {
				compressed: this.options.enableCompression,
				serializedSize: serialized.length,
			},
		};

		this.cache.set(key, entry);
		this.updateMemoryUsage();
		this.updateStats();
	}

	/**
	 * Get or set cached configuration with factory function
	 */
	async getOrSet<T = any>(
		key: string,
		factory: () => Promise<T> | T,
		ttl?: number,
	): Promise<T> {
		const cached = this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const data = await factory();
		this.set(key, data, ttl);
		return data;
	}

	/**
	 * Cache a TOML file with automatic parsing
	 */
	cacheFile(filePath: string, ttl?: number): any {
		const key = `file:${filePath}`;

		// Check if file is already cached and up to date
		const existing = this.get(key);
		if (existing) {
			// Check if file has changed
			try {
				const fileContent = readFileSync(filePath, "utf-8");
				const currentHash = fastHash(fileContent);

				if (existing.hash === currentHash) {
					return existing;
				}
			} catch {
				// File doesn't exist or can't be read
				return null;
			}
		}

		// Load and cache the file
		try {
			const fileContent = readFileSync(filePath, "utf-8");
			const parsed = parseTomlString(fileContent);
			const hash = fastHash(fileContent);

			const entry = {
				data: parsed,
				hash: hash.toString(),
				timestamp: Date.now(),
				expiresAt: ttl ? Date.now() + ttl : Date.now() + this.options.ttl,
				accessCount: 0,
				lastAccessed: Date.now(),
				size: fileContent.length,
				metadata: { filePath },
			};

			this.cache.set(key, entry);
			this.updateMemoryUsage();
			return parsed;
		} catch (error) {
			throw new Error(`Failed to cache TOML file ${filePath}: ${error}`);
		}
	}

	/**
	 * Invalidate cache entry
	 */
	invalidate(key: string): boolean {
		const deleted = this.cache.delete(key);
		if (deleted) {
			this.updateMemoryUsage();
		}
		return deleted;
	}

	/**
	 * Invalidate cache entries matching pattern
	 */
	invalidatePattern(pattern: string | RegExp): number {
		let count = 0;
		const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

		for (const key of this.cache.keys()) {
			if (regex.test(key)) {
				this.cache.delete(key);
				count++;
			}
		}

		if (count > 0) {
			this.updateMemoryUsage();
		}

		return count;
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
		this.memoryUsage = 0;
		this.resetStats();
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		return { ...this.stats };
	}

	/**
	 * Get detailed cache information
	 */
	getCacheInfo(): {
		entries: Array<{ key: string; entry: CacheEntry }>;
		stats: CacheStats;
		options: CacheOptions;
	} {
		const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
			key,
			entry: { ...entry },
		}));

		return {
			entries,
			stats: this.getStats(),
			options: this.options,
		};
	}

	/**
	 * Export cache to JSON (for persistence)
	 */
	export(): string {
		const exportData = {
			version: "1.0.0",
			timestamp: Date.now(),
			entries: Array.from(this.cache.entries()),
			stats: this.stats,
		};

		return JSON.stringify(exportData);
	}

	/**
	 * Import cache from JSON
	 */
	import(data: string): void {
		try {
			const importData = JSON.parse(data);

			if (importData.version !== "1.0.0") {
				throw new Error("Unsupported cache version");
			}

			this.cache.clear();
			for (const [key, entry] of importData.entries) {
				this.cache.set(key, entry);
			}

			this.stats = importData.stats;
			this.updateMemoryUsage();
		} catch (error) {
			throw new Error(`Failed to import cache: ${error}`);
		}
	}

	/**
	 * Check if eviction is needed
	 */
	private shouldEvict(newEntrySize: number): boolean {
		return (
			this.cache.size >= this.options.maxSize ||
			this.memoryUsage + newEntrySize >= this.options.maxMemory
		);
	}

	/**
	 * Evict least recently used entries
	 */
	private evictLeastRecentlyUsed(): void {
		const entries = Array.from(this.cache.entries()).sort(
			([, a], [, b]) => a.lastAccessed - b.lastAccessed,
		);

		const toEvict = Math.ceil(this.options.maxSize * 0.2); // Evict 20%

		for (let i = 0; i < Math.min(toEvict, entries.length); i++) {
			const [key] = entries[i];
			this.cache.delete(key);
			this.stats.evictions++;
		}

		this.updateMemoryUsage();
	}

	/**
	 * Update memory usage calculation
	 */
	private updateMemoryUsage(): void {
		this.memoryUsage = 0;
		for (const entry of this.cache.values()) {
			this.memoryUsage += entry.size;
		}
		this.stats.memoryUsage = this.memoryUsage;
		this.stats.size = this.cache.size;
	}

	/**
	 * Update cache statistics
	 */
	private updateStats(): void {
		if (this.cache.size === 0) return;

		const entries = Array.from(this.cache.values());
		this.stats.oldestEntry = Math.min(...entries.map((e) => e.timestamp));
		this.stats.newestEntry = Math.max(...entries.map((e) => e.timestamp));
	}

	/**
	 * Update average access time
	 */
	private updateAverageAccessTime(): void {
		const total = this.stats.hits + this.stats.misses;
		if (total === 0) return;

		this.stats.averageAccessTime = (this.stats.hits / total) * 100;
	}

	/**
	 * Reset statistics
	 */
	private resetStats(): void {
		this.stats = {
			hits: 0,
			misses: 0,
			size: 0,
			memoryUsage: 0,
			oldestEntry: 0,
			newestEntry: 0,
			averageAccessTime: 0,
			evictions: 0,
		};
	}

	/**
	 * Start periodic cleanup timer
	 */
	private startCleanup(): void {
		this.cleanupTimer = setInterval(
			() => {
				this.cleanup();
			},
			5 * 60 * 1000,
		); // Cleanup every 5 minutes
	}

	/**
	 * Cleanup expired entries
	 */
	private cleanup(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (entry.expiresAt && now > entry.expiresAt) {
				this.cache.delete(key);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			this.updateMemoryUsage();
		}
	}

	/**
	 * Destroy cache and cleanup resources
	 */
	destroy(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
		this.clear();
	}
}

// Global cache instance for convenience
export const defaultTOMLCache = new TomlCache({
	maxSize: 500,
	maxMemory: 50 * 1024 * 1024, // 50MB
	ttl: 15 * 60 * 1000, // 15 minutes
	enableStats: true,
});

/**
 * Convenience functions for global cache
 */
export const cacheTOMLFile = (filePath: string, ttl?: number) =>
	defaultTOMLCache.cacheFile(filePath, ttl);

export const getCachedTOML = <T = any>(key: string) =>
	defaultTOMLCache.get<T>(key);

export const setCachedTOML = <T = any>(key: string, data: T, ttl?: number) =>
	defaultTOMLCache.set(key, data, ttl);

export const getOrSetCachedTOML = async <T = any>(
	key: string,
	factory: () => Promise<T> | T,
	ttl?: number,
) => defaultTOMLCache.getOrSet<T>(key, factory, ttl);
