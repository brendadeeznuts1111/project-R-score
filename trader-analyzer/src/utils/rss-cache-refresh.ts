#!/usr/bin/env bun
/**
 * @fileoverview RSS Cache Refresh Utility
 * @description Centralized utility for refreshing RSS feed cache via internal API endpoints
 * @module utils/rss-cache-refresh
 *
 * [[TECH][MODULE][UTILITY][META:{blueprint=BP-RSS-CACHE-REFRESH@1.3.3;instance-id=RSS-CACHE-REFRESH-001;version=1.3.3}]
 * [PROPERTIES:{utility={value:"rss-cache-refresh";@root:"ROOT-UTILS";@chain:["BP-RSS-INTEGRATOR","BP-CIRCUIT-BREAKER"];@version:"1.3.3"}}]
 * [CLASS:RSSCacheRefresh][#REF:v-1.3.3.BP.RSS.CACHE.REFRESH.1.0.A.1.1.UTILS.1.1]]
 *
 * Implementation Patterns:
 * - Circuit breaker protection (BP-CIRCUIT-BREAKER@0.1.0)
 * - Retry logic with exponential backoff (BP-ENTERPRISE-RETRY@0.1.0)
 * - Fallback endpoint selection (RSS_INTERNAL.registry_api || RSS_INTERNAL.benchmark_api)
 *
 * @see {@link ./rss-constants.ts RSS_INTERNAL constants}
 * @see {@link ../docs/TEAM-ORGANIZATION-IMPLEMENTATION-PATTERNS.md Implementation Patterns}
 */

import { CircuitBreaker, retryWithBackoff, type RetryOptions } from "./enterprise-retry.js";
import { RSS_INTERNAL } from "./rss-constants.js";

/**
 * Circuit breaker instance for RSS cache refresh requests
 * Prevents cascading failures when RSS cache refresh endpoint is down
 */
const cacheRefreshBreaker = new CircuitBreaker();

/**
 * Default retry options for RSS cache refresh
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
	maxAttempts: 3,
	initialDelayMs: 1000,
	maxDelayMs: 5000,
	backoffMultiplier: 2,
	retryableErrors: [408, 429, 500, 502, 503, 504],
};

/**
 * Refresh RSS feed cache via internal API endpoint
 * 
 * Uses fallback endpoint selection:
 * 1. Primary: `RSS_INTERNAL.registry_api` (registry API)
 * 2. Fallback: `RSS_INTERNAL.benchmark_api` (benchmark API)
 * 
 * Features:
 * - Circuit breaker protection
 * - Retry logic with exponential backoff
 * - Timeout protection (10 seconds)
 * - Graceful error handling
 * 
 * @param options - Refresh options
 * @param options.team - Team ID for team-specific cache refresh (optional)
 * @param options.package - Package name for package-specific cache refresh (optional)
 * @param options.retryOptions - Custom retry options (optional)
 * @param options.timeoutMs - Custom timeout in milliseconds (default: 10000)
 * @returns Promise resolving to refresh result
 * 
 * @example
 * ```typescript
 * // Refresh cache for a team
 * await refreshRSSCache({ team: 'platform_tools' });
 * 
 * // Refresh cache for a package
 * await refreshRSSCache({ package: '@graph/layer4' });
 * 
 * // Custom retry options
 * await refreshRSSCache({ 
 *   team: 'sports_correlation',
 *   retryOptions: { maxAttempts: 5 }
 * });
 * ```
 */
export async function refreshRSSCache(options: {
	team?: string;
	package?: string;
	retryOptions?: RetryOptions;
	timeoutMs?: number;
} = {}): Promise<{ success: boolean; endpoint?: string; error?: string }> {
	const { team, package: packageName, retryOptions, timeoutMs = 10000 } = options;

	// Select endpoint (registry_api preferred, benchmark_api as fallback)
	const endpoint = RSS_INTERNAL.registry_api || RSS_INTERNAL.benchmark_api;

	if (!endpoint) {
		return {
			success: false,
			error: "No RSS cache refresh endpoint configured (RSS_INTERNAL.registry_api or RSS_INTERNAL.benchmark_api)",
		};
	}

	if (!process.env.REGISTRY_API_TOKEN) {
		return {
			success: false,
			error: "REGISTRY_API_TOKEN environment variable not set",
		};
	}

	// Build request body
	const body: Record<string, string> = {};
	if (team) {
		body.team = team;
	}
	if (packageName) {
		body.package = packageName;
	}

	// Use circuit breaker with retry logic
	try {
		const result = await retryWithBackoff(
			() =>
				cacheRefreshBreaker.execute(async () => {
					const response = await fetch(`${endpoint}/refresh`, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${process.env.REGISTRY_API_TOKEN}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify(body),
						signal: AbortSignal.timeout(timeoutMs),
					});

					if (!response.ok) {
						throw new Error(
							`RSS cache refresh failed: ${response.status} ${response.statusText}`,
						);
					}

					return response;
				}),
			retryOptions ?? DEFAULT_RETRY_OPTIONS,
		);

		if (result.success) {
			return {
				success: true,
				endpoint,
			};
		} else {
			return {
				success: false,
				endpoint,
				error:
					result.error instanceof Error
						? result.error.message
						: String(result.error),
			};
		}
	} catch (error) {
		return {
			success: false,
			endpoint,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Get current circuit breaker state for RSS cache refresh
 * Useful for monitoring and debugging
 * 
 * @returns Current circuit breaker state
 */
export function getCacheRefreshCircuitBreakerState(): "closed" | "open" | "half-open" {
	return cacheRefreshBreaker.getState();
}

/**
 * Reset RSS cache refresh circuit breaker
 * Useful for manual recovery after fixing endpoint issues
 */
export function resetCacheRefreshCircuitBreaker(): void {
	cacheRefreshBreaker.reset();
}



