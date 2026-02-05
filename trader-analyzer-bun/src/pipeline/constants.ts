/**
 * @fileoverview Pipeline Constants
 * @description Constants used throughout the pipeline
 * @module pipeline/constants
 */

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT = {
	/** Maximum requests per window */
	maxRequests: 100,
	/** Window duration in milliseconds (1 minute) */
	windowMs: 60 * 1000,
} as const;

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG = {
	/** Cache TTL in milliseconds (5 minutes) */
	ttl: 300_000,
	/** Maximum number of results to cache */
	maxResults: 1000,
} as const;

/**
 * Database paths
 */
export const DATABASE_PATHS = {
	pipeline: "./data/pipeline.sqlite",
	properties: "./data/properties.sqlite",
	rbac: "./data/rbac.sqlite",
	features: "./data/features.sqlite",
	sources: "./data/sources.sqlite",
	usage: "./data/usage.sqlite",
} as const;

/**
 * Cache size limits
 */
export const CACHE_LIMITS = {
	/** Maximum metrics to keep in memory */
	maxMetrics: 1000,
	/** Maximum alerts to keep in memory */
	maxAlerts: 100,
	/** Maximum cache entries */
	maxCacheEntries: 10_000,
} as const;

/**
 * Property category mappings
 */
export const PROPERTY_CATEGORY_KEYWORDS = {
	financial: ["price", "cost", "fee", "amount", "volume", "odds", "spread"],
	temporal: ["time", "date", "timestamp", "duration"],
	identifier: ["id", "uuid", "key", "identifier"],
	analytics: ["analytics", "stat", "metric", "score"],
	correlation: ["correlation", "correlate"],
	arbitrage: ["arbitrage", "opportunity"],
	risk: ["risk", "volatility", "tension"],
	performance: ["performance", "latency", "throughput"],
	system: ["system", "source", "namespace"],
} as const;
