/**
 * @fileoverview Serving Stage
 * @description Serve data with RBAC filtering and caching
 * @module pipeline/stages/serving
 */

import { err, ok } from "../../types";
import { DEFAULT_CACHE_CONFIG } from "../constants";
import type {
	DataQuery,
	EnrichedData,
	FeatureFlagManagerAdapter,
	PipelineUser,
	RBACManagerAdapter,
	Result,
	ServedData,
} from "../types";

/**
 * Data serving stage for serving enriched data with RBAC filtering and caching
 *
 * Responsibilities:
 * - Check RBAC permissions
 * - Apply feature flags
 * - Filter data by user scope
 * - Cache results for performance
 */
export class DataServingStage {
	private cache: Map<string, { data: ServedData; expiresAt: number }> =
		new Map();
	private cacheTTL: number;
	private maxResults: number;

	constructor(config?: { cacheTTL?: number; maxResults?: number }) {
		this.cacheTTL = config?.cacheTTL ?? DEFAULT_CACHE_CONFIG.ttl;
		this.maxResults = config?.maxResults ?? DEFAULT_CACHE_CONFIG.maxResults;
	}

	/**
	 * Serve enriched data with RBAC filtering and caching
	 *
	 * @param query - Query parameters for filtering and pagination
	 * @param user - User context for RBAC filtering
	 * @param data - Enriched data to serve (single item or array)
	 * @param rbacManager - Optional RBAC manager for access control
	 * @param featureFlagManager - Optional feature flag manager
	 * @returns Result containing served data or error
	 */
	async serve(
		query: DataQuery,
		user: PipelineUser,
		data: EnrichedData | EnrichedData[],
		rbacManager?: RBACManagerAdapter,
		featureFlagManager?: FeatureFlagManagerAdapter,
	): Promise<Result<ServedData>> {
		try {
			// 1. Check cache
			const cacheKey = this.getCacheKey(query, user);
			const cached = this.cache.get(cacheKey);
			if (cached && cached.expiresAt > Date.now()) {
				return ok(cached.data);
			}

			// 2. Convert to array if single item
			const dataArray = Array.isArray(data) ? data : [data];

			// 3. Apply RBAC filtering
			let filteredData: EnrichedData[] = dataArray;

			if (rbacManager) {
				filteredData = dataArray.filter((item) => {
					// Check if user can access this source
					if (!rbacManager.canAccess(user, item.source)) {
						return false;
					}

					// Apply feature flag checks
					if (item.source.featureFlag && featureFlagManager) {
						if (!featureFlagManager.isEnabled(item.source.featureFlag, user)) {
							return false;
						}
					}

					// Apply data filtering
					const filtered = rbacManager.filterData(item, user);
					return filtered !== null;
				});

				// Apply RBAC filter to each item (filter first, then map for efficiency)
				const rbacFiltered: EnrichedData[] = [];
				for (const item of filteredData) {
					const filtered = rbacManager.filterData(item, user);
					if (filtered !== null) {
						rbacFiltered.push(filtered);
					}
				}
				filteredData = rbacFiltered;
			}

			// 4. Apply query filters
			if (query.source) {
				const sources = Array.isArray(query.source)
					? query.source
					: [query.source];
				filteredData = filteredData.filter((item) =>
					sources.includes(item.source.id),
				);
			}

			if (query.properties && query.properties.length > 0) {
				const allowedProperties = new Set(query.properties);
				filteredData = filteredData.map((item) => {
					const filteredProperties: Record<string, unknown> = {};
					for (const [key, value] of Object.entries(item.properties)) {
						if (allowedProperties.has(key)) {
							filteredProperties[key] = value;
						}
					}
					return {
						...item,
						properties: filteredProperties,
					};
				});
			}

			if (query.timeRange) {
				const { start, end } = query.timeRange;
				filteredData = filteredData.filter(
					(item) => item.timestamp >= start && item.timestamp <= end,
				);
			}

			// 5. Apply limit and pagination
			const offset = query.offset ?? 0;
			if (query.limit) {
				filteredData = filteredData.slice(offset, offset + query.limit);
			} else if (filteredData.length > this.maxResults) {
				filteredData = filteredData.slice(0, this.maxResults);
			}

			// 6. Cache result
			const servedData: ServedData = {
				data: filteredData.length === 1 ? filteredData[0] : filteredData,
				query,
				timestamp: Date.now(),
				filtered: rbacManager !== undefined,
				metadata: {
					totalResults: filteredData.length,
					originalCount: dataArray.length,
				},
			};

			this.cache.set(cacheKey, {
				data: servedData,
				expiresAt: Date.now() + this.cacheTTL,
			});

			return ok(servedData);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Serving failed: ${String(error)}`),
			);
		}
	}

	/**
	 * Generate cache key from query and user
	 */
	private getCacheKey(query: DataQuery, user: PipelineUser): string {
		const queryStr = JSON.stringify({
			source: query.source,
			properties: query.properties,
			timeRange: query.timeRange,
			limit: query.limit,
			offset: query.offset,
		});
		return `${user.id}:${Bun.hash(queryStr)}`;
	}

	/**
	 * Clear cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Clear expired cache entries
	 */
	cleanupCache(): void {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (value.expiresAt <= now) {
				this.cache.delete(key);
			}
		}
	}
}
