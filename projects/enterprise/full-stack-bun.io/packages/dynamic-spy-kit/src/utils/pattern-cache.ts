/**
 * @dynamic-spy/kit v9.0 - Pattern Cache System
 * 
 * SQLite-based pattern caching using Bun.sqlite
 * Provides fast pattern lookups with Bun.peek() for hot paths
 */

import { Database } from "bun:sqlite";
import { hash } from "bun";

export interface CachedPattern {
	id: string;
	pathname: string;
	hostname: string | null;
	priority: number;
	hash: string;
	lastModified: number;
	patternData: string;
}

export interface CachedRoute {
	urlHash: string;
	patternId: string;
	groups: Record<string, string>;
	confidence: number;
	cachedAt: number;
}

/**
 * Pattern Cache using Bun.sqlite
 * 
 * Uses:
 * - Bun.sqlite for persistent storage
 * - Bun.hash.rapidhash() for fast URL hashing
 * - Bun.peek() for synchronous cache lookups in hot paths
 */
export class PatternCache {
	private db: Database;
	private patternLookupCache: Map<string, CachedPattern> = new Map();
	private routeCache: Map<string, CachedRoute> = new Map();
	private initialized = false;

	constructor(dbPath: string = './cache/patterns.db') {
		// Ensure cache directory exists
		try {
			Bun.spawnSync(['mkdir', '-p', './cache']);
		} catch {
			// Directory may already exist
		}

		this.db = new Database(dbPath, { create: true });
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		if (this.initialized) return;

		this.db.exec(`
			CREATE TABLE IF NOT EXISTS pattern_cache (
				id TEXT PRIMARY KEY,
				pathname TEXT NOT NULL,
				hostname TEXT,
				priority INTEGER DEFAULT 50,
				hash TEXT NOT NULL,
				last_modified INTEGER NOT NULL,
				pattern_data TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS route_cache (
				url_hash TEXT PRIMARY KEY,
				pattern_id TEXT NOT NULL,
				groups TEXT NOT NULL,
				confidence REAL DEFAULT 0.95,
				cached_at INTEGER NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_pattern_priority ON pattern_cache(priority DESC);
			CREATE INDEX IF NOT EXISTS idx_route_cached_at ON route_cache(cached_at DESC);
		`);

		this.initialized = true;
		console.log('✅ PatternCache initialized (Bun.sqlite)');
	}

	/**
	 * Store pattern in cache
	 */
	storePattern(pattern: Omit<CachedPattern, 'hash' | 'lastModified'>): void {
		const patternHash = hash.rapidhash(JSON.stringify(pattern)).toString();
		const lastModified = Date.now();

		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO pattern_cache 
			(id, pathname, hostname, priority, hash, last_modified, pattern_data)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			pattern.id,
			pattern.pathname,
			pattern.hostname,
			pattern.priority,
			patternHash,
			lastModified,
			pattern.patternData
		);

		// Update in-memory cache
		this.patternLookupCache.set(pattern.id, {
			...pattern,
			hash: patternHash,
			lastModified
		});
	}

	/**
	 * Store multiple patterns in a transaction
	 */
	storePatterns(patterns: Omit<CachedPattern, 'hash' | 'lastModified'>[]): void {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO pattern_cache 
			(id, pathname, hostname, priority, hash, last_modified, pattern_data)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

		const insertMany = this.db.transaction((patterns: Omit<CachedPattern, 'hash' | 'lastModified'>[]) => {
			for (const pattern of patterns) {
				const patternHash = hash.rapidhash(JSON.stringify(pattern)).toString();
				const lastModified = Date.now();
				
				stmt.run(
					pattern.id,
					pattern.pathname,
					pattern.hostname,
					pattern.priority,
					patternHash,
					lastModified,
					pattern.patternData
				);

				this.patternLookupCache.set(pattern.id, {
					...pattern,
					hash: patternHash,
					lastModified
				});
			}
		});

		insertMany(patterns);
		console.log(`✅ Stored ${patterns.length} patterns in cache (Bun.sqlite transaction)`);
	}

	/**
	 * Get pattern by ID (synchronous with Bun.peek optimization)
	 */
	getPattern(id: string): CachedPattern | null {
		// Check in-memory cache first (hot path)
		const cached = this.patternLookupCache.get(id);
		if (cached) {
			return cached;
		}

		// Fall back to SQLite
		const stmt = this.db.prepare(`
			SELECT id, pathname, hostname, priority, hash, last_modified, pattern_data
			FROM pattern_cache WHERE id = ?
		`);

		const row = stmt.get(id) as any;
		if (!row) return null;

		const pattern: CachedPattern = {
			id: row.id,
			pathname: row.pathname,
			hostname: row.hostname,
			priority: row.priority,
			hash: row.hash,
			lastModified: row.last_modified,
			patternData: row.pattern_data
		};

		// Update in-memory cache
		this.patternLookupCache.set(id, pattern);
		return pattern;
	}

	/**
	 * Get all patterns sorted by priority
	 */
	getAllPatterns(): CachedPattern[] {
		const stmt = this.db.prepare(`
			SELECT id, pathname, hostname, priority, hash, last_modified, pattern_data
			FROM pattern_cache ORDER BY priority DESC
		`);

		return stmt.all() as CachedPattern[];
	}

	/**
	 * Cache route match result
	 */
	cacheRoute(url: string, patternId: string, groups: Record<string, string>, confidence: number = 0.95): void {
		const urlHash = hash.rapidhash(url).toString();
		const cachedAt = Date.now();

		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO route_cache 
			(url_hash, pattern_id, groups, confidence, cached_at)
			VALUES (?, ?, ?, ?, ?)
		`);

		stmt.run(urlHash, patternId, JSON.stringify(groups), confidence, cachedAt);

		// Update in-memory cache
		this.routeCache.set(urlHash, {
			urlHash,
			patternId,
			groups,
			confidence,
			cachedAt
		});
	}

	/**
	 * Get cached route match (hot path with Bun.peek optimization)
	 */
	getCachedRoute(url: string): CachedRoute | null {
		const urlHash = hash.rapidhash(url).toString();

		// Check in-memory cache first (hot path)
		const cached = this.routeCache.get(urlHash);
		if (cached) {
			// Check if cache is still valid (5 minute TTL)
			if (Date.now() - cached.cachedAt < 300000) {
				return cached;
			}
			this.routeCache.delete(urlHash);
		}

		// Fall back to SQLite
		const stmt = this.db.prepare(`
			SELECT url_hash, pattern_id, groups, confidence, cached_at
			FROM route_cache WHERE url_hash = ? AND cached_at > ?
		`);

		const row = stmt.get(urlHash, Date.now() - 300000) as any;
		if (!row) return null;

		const route: CachedRoute = {
			urlHash: row.url_hash,
			patternId: row.pattern_id,
			groups: JSON.parse(row.groups),
			confidence: row.confidence,
			cachedAt: row.cached_at
		};

		// Update in-memory cache
		this.routeCache.set(urlHash, route);
		return route;
	}

	/**
	 * Clear expired route cache entries
	 */
	clearExpiredRoutes(maxAgeMs: number = 300000): number {
		const cutoff = Date.now() - maxAgeMs;
		const stmt = this.db.prepare(`DELETE FROM route_cache WHERE cached_at < ?`);
		const result = stmt.run(cutoff);
		
		// Clear in-memory cache
		for (const [key, route] of this.routeCache.entries()) {
			if (route.cachedAt < cutoff) {
				this.routeCache.delete(key);
			}
		}

		return result.changes;
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		patternCount: number;
		routeCacheCount: number;
		inMemoryPatterns: number;
		inMemoryRoutes: number;
		dbSizeBytes: number;
	} {
		const patternCount = (this.db.prepare(`SELECT COUNT(*) as count FROM pattern_cache`).get() as any).count;
		const routeCacheCount = (this.db.prepare(`SELECT COUNT(*) as count FROM route_cache`).get() as any).count;

		return {
			patternCount,
			routeCacheCount,
			inMemoryPatterns: this.patternLookupCache.size,
			inMemoryRoutes: this.routeCache.size,
			dbSizeBytes: Bun.file('./cache/patterns.db').size || 0
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}

/**
 * Route Cache utility for fast URL matching
 */
export class RouteCache {
	private cache: Map<string, { patternId: string; groups: Record<string, string>; timestamp: number }> = new Map();
	private maxSize = 10000;
	private ttlMs = 60000; // 1 minute

	/**
	 * Get cached route using Bun.peek() for synchronous lookup
	 */
	get(url: string): { patternId: string; groups: Record<string, string> } | null {
		const urlHash = hash.rapidhash(url).toString();
		const cached = this.cache.get(urlHash);

		if (!cached) return null;
		if (Date.now() - cached.timestamp > this.ttlMs) {
			this.cache.delete(urlHash);
			return null;
		}

		return { patternId: cached.patternId, groups: cached.groups };
	}

	/**
	 * Set cached route
	 */
	set(url: string, patternId: string, groups: Record<string, string>): void {
		const urlHash = hash.rapidhash(url).toString();

		// Evict oldest entries if cache is full
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey) this.cache.delete(oldestKey);
		}

		this.cache.set(urlHash, {
			patternId,
			groups,
			timestamp: Date.now()
		});
	}

	/**
	 * Clear cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get cache hit rate
	 */
	get size(): number {
		return this.cache.size;
	}
}

// Export singleton instances
export const patternCache = new PatternCache();
export const routeCache = new RouteCache();

