/**
 * @fileoverview SQLite API Cache Manager for Bookmaker Markets
 * @description Production-ready cache with WAL mode, TTL, and metrics tracking
 * @module orca/aliases/bookmakers/cache
 */

import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = unknown> {
	key: string;
	value: T;
	expires: number;
	metadata?: {
		hits: number;
		lastAccessed: number;
		size: number;
	};
}

/**
 * Cache metrics
 */
export interface CacheMetrics {
	totalHits: number;
	totalMisses: number;
	totalSets: number;
	cacheSize: number;
	hitRate: number;
}

/**
 * SQLite Cache Manager for API responses
 *
 * Features:
 * - WAL mode for better concurrency
 * - TTL-based expiration
 * - Hit/miss tracking
 * - Automatic cleanup
 * - Metrics collection
 */
export class BookmakerCacheManager {
	private db: Database;
	protected metrics: CacheMetrics = {
		totalHits: 0,
		totalMisses: 0,
		totalSets: 0,
		cacheSize: 0,
		hitRate: 0,
	};

	constructor(dbPath?: string) {
		const isDev =
			process.env.DEV === "true" || process.env.NODE_ENV === "development";
		const finalPath =
			dbPath || (isDev ? ":memory:" : "./data/bookmaker-cache.db");

		this.db = new Database(finalPath, { create: true });
		this.initializeDatabase();
		this.loadMetrics();
		this.startCleanupInterval();

		// Initialize data directory asynchronously if needed (non-blocking)
		if (!isDev && finalPath !== ":memory:") {
			this.ensureDataDirectory().catch((err) => {
				console.warn(
					"[BookmakerCacheManager] Failed to ensure data directory:",
					err,
				);
			});
		}
	}

	private async ensureDataDirectory(): Promise<void> {
		const dataDir = Bun.file("./data");
		if (!(await dataDir.exists())) {
			await mkdir("./data", { recursive: true });
		}
	}

	private initializeDatabase(): void {
		// Enable WAL mode for better concurrency
		this.db.exec("PRAGMA journal_mode = WAL;");
		this.db.exec("PRAGMA synchronous = NORMAL;");
		this.db.exec("PRAGMA busy_timeout = 5000;");

		// Create cache table
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        hits INTEGER DEFAULT 0,
        last_accessed INTEGER DEFAULT (unixepoch()),
        size INTEGER DEFAULT 0
      )
    `);

		// Create indexes
		this.db.exec("CREATE INDEX IF NOT EXISTS idx_expires ON cache(expires)");
		this.db.exec(
			"CREATE INDEX IF NOT EXISTS idx_last_accessed ON cache(last_accessed)",
		);

		// Create metrics table
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_metrics (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_hits INTEGER DEFAULT 0,
        total_misses INTEGER DEFAULT 0,
        total_sets INTEGER DEFAULT 0,
        last_reset INTEGER DEFAULT (unixepoch())
      )
    `);
	}

	private loadMetrics(): void {
		const stmt = this.db.prepare(`
      SELECT total_hits, total_misses, total_sets FROM cache_metrics WHERE id = 1
    `);

		const row = stmt.get() as
			| { total_hits: number; total_misses: number; total_sets: number }
			| undefined;

		if (row) {
			this.metrics.totalHits = row.total_hits;
			this.metrics.totalMisses = row.total_misses;
			this.metrics.totalSets = row.total_sets;
			this.updateHitRate();
		} else {
			this.db.run("INSERT OR IGNORE INTO cache_metrics (id) VALUES (1)");
		}

		// Calculate cache size
		const sizeStmt = this.db.prepare("SELECT COUNT(*) as count FROM cache");
		const sizeRow = sizeStmt.get() as { count: number };
		this.metrics.cacheSize = sizeRow.count;
	}

	private updateHitRate(): void {
		const totalAccesses = this.metrics.totalHits + this.metrics.totalMisses;
		this.metrics.hitRate =
			totalAccesses > 0 ? this.metrics.totalHits / totalAccesses : 0;
	}

	private updateMetricsInDB(): void {
		const stmt = this.db.prepare(`
      UPDATE cache_metrics SET 
        total_hits = ?,
        total_misses = ?,
        total_sets = ?
      WHERE id = 1
    `);

		stmt.run(
			this.metrics.totalHits,
			this.metrics.totalMisses,
			this.metrics.totalSets,
		);
	}

	/**
	 * Set a cached value with TTL
	 */
	async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
		const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
		const valueStr = JSON.stringify(value);
		const size = new TextEncoder().encode(valueStr).length;

		const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cache (key, value, expires, hits, last_accessed, size)
      VALUES (?, ?, ?, COALESCE((SELECT hits FROM cache WHERE key = ?), 0), unixepoch(), ?)
    `);

		stmt.run(key, valueStr, expires, key, size);

		this.metrics.totalSets++;
		this.metrics.cacheSize = await this.getCacheSize();
		this.updateHitRate();
		this.updateMetricsInDB();
	}

	/**
	 * Get a cached value
	 */
	async get<T>(key: string): Promise<T | null> {
		// First, check and remove if expired
		this.cleanupExpired();

		const stmt = this.db.prepare(`
      SELECT value, hits FROM cache 
      WHERE key = ? AND expires > unixepoch()
    `);

		const row = stmt.get(key) as { value: string; hits: number } | undefined;

		if (row) {
			// Update hits and last accessed
			const updateStmt = this.db.prepare(`
        UPDATE cache SET hits = hits + 1, last_accessed = unixepoch() WHERE key = ?
      `);
			updateStmt.run(key);

			this.metrics.totalHits++;
			this.updateHitRate();
			this.updateMetricsInDB();

			return JSON.parse(row.value) as T;
		}

		this.metrics.totalMisses++;
		this.updateHitRate();
		this.updateMetricsInDB();

		return null;
	}

	/**
	 * Delete a cached value
	 */
	async delete(key: string): Promise<boolean> {
		const stmt = this.db.prepare("DELETE FROM cache WHERE key = ?");
		const result = stmt.run(key);

		if (result.changes > 0) {
			this.metrics.cacheSize = await this.getCacheSize();
			return true;
		}

		return false;
	}

	/**
	 * Check if a key exists and is not expired
	 */
	async has(key: string): Promise<boolean> {
		await this.cleanupExpired();

		const stmt = this.db.prepare(`
      SELECT 1 FROM cache WHERE key = ? AND expires > unixepoch()
    `);

		return stmt.get(key) !== undefined;
	}

	/**
	 * Clear all cache entries
	 */
	async clear(): Promise<void> {
		this.db.exec("DELETE FROM cache");
		this.metrics.cacheSize = 0;
		this.updateMetricsInDB();
	}

	private async getCacheSize(): Promise<number> {
		const stmt = this.db.prepare("SELECT COUNT(*) as count FROM cache");
		const row = stmt.get() as { count: number };
		return row.count;
	}

	private cleanupExpired(): void {
		const stmt = this.db.prepare(
			"DELETE FROM cache WHERE expires <= unixepoch()",
		);
		stmt.run();
	}

	private startCleanupInterval(): void {
		// Clean up expired entries every 5 minutes
		setInterval(
			() => {
				this.cleanupExpired();
			},
			5 * 60 * 1000,
		);
	}

	/**
	 * Get cache metrics
	 */
	async getMetrics(): Promise<CacheMetrics> {
		this.metrics.cacheSize = await this.getCacheSize();
		return { ...this.metrics };
	}

	/**
	 * Get cache entries (for inspection)
	 */
	async getEntries(
		limit: number = 100,
	): Promise<
		Array<{ key: string; hits: number; size: number; expires: number }>
	> {
		const stmt = this.db.prepare(`
      SELECT key, hits, size, expires 
      FROM cache 
      WHERE expires > unixepoch()
      ORDER BY hits DESC 
      LIMIT ?
    `);

		return stmt.all(limit) as any[];
	}

	/**
	 * Get detailed cache statistics
	 */
	async getStats(): Promise<{
		totalEntries: number;
		totalSizeBytes: number;
		avgEntrySize: number;
		topKeys: Array<{ key: string; hits: number }>;
	}> {
		const sizeStmt = this.db.prepare(
			"SELECT SUM(size) as total_size FROM cache",
		);
		const sizeRow = sizeStmt.get() as { total_size: number | null };

		const topStmt = this.db.prepare(`
      SELECT key, hits FROM cache 
      WHERE expires > unixepoch()
      ORDER BY hits DESC 
      LIMIT 10
    `);

		return {
			totalEntries: this.metrics.cacheSize,
			totalSizeBytes: sizeRow.total_size || 0,
			avgEntrySize:
				this.metrics.cacheSize > 0
					? (sizeRow.total_size || 0) / this.metrics.cacheSize
					: 0,
			topKeys: topStmt.all() as any[],
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}

// Singleton instance
let globalCache: BookmakerCacheManager | null = null;

/**
 * Get or create global cache instance
 */
export function getBookmakerCache(dbPath?: string): BookmakerCacheManager {
	if (!globalCache) {
		globalCache = new BookmakerCacheManager(dbPath);
	}
	return globalCache;
}
