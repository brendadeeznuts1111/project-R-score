/**
 * @fileoverview Market Canonicalizer
 * @description Caching and canonicalization for market identifiers
 * @module canonical/market-canonicalizer
 */

import type { CanonicalMarket } from "./fetcher";
import {
	canonicalUUID,
	EXCHANGE_NAMESPACES,
	type ExchangeName,
} from "./uuidv5";

/**
 * Market identifier input for canonicalization
 */
export interface MarketIdentifier {
	exchange: ExchangeName;
	nativeId: string;
	type?: string;
	tags?: string[];
	[key: string]: unknown; // Allow additional metadata
}

/**
 * Extended canonical market with API metadata
 */
export interface CanonicalMarketWithMetadata extends CanonicalMarket {
	apiMetadata: {
		cacheKey: string;
		canonicalizedAt: number;
	};
}

/**
 * Cache statistics
 */
export interface CacheStats {
	size: number;
	promiseSize: number;
	hitRatio?: number;
}

/**
 * Market Canonicalizer with caching
 *
 * Provides efficient canonicalization of market identifiers with:
 * - In-memory caching to avoid redundant UUID generation
 * - Promise caching to deduplicate concurrent requests
 * - Exchange namespace management
 */
export class MarketCanonicalizer {
	protected cache = new Map<string, CanonicalMarketWithMetadata>();
	protected promiseCache = new Map<
		string,
		Promise<CanonicalMarketWithMetadata>
	>();
	protected exchangeNamespaces = new Map<ExchangeName, Uint8Array>();

	protected hits = 0;
	protected misses = 0;

	constructor() {
		// Initialize exchange namespaces as bytes
		for (const [exchange, namespace] of Object.entries(EXCHANGE_NAMESPACES)) {
			this.exchangeNamespaces.set(
				exchange as ExchangeName,
				this.hexToBytes(namespace.replace(/-/g, "")),
			);
		}
	}

	/**
	 * Convert hex string to bytes
	 */
	protected hexToBytes(hex: string): Uint8Array {
		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < hex.length; i += 2) {
			bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
		}
		return bytes;
	}

	/**
	 * Generate cache key from market identifier
	 */
	protected getCacheKey(market: MarketIdentifier): string {
		return `${market.exchange}:${market.nativeId}`;
	}

	/**
	 * Canonicalize a market identifier
	 *
	 * @param market - Market identifier to canonicalize
	 * @returns Canonical market with metadata
	 */
	canonicalize(market: MarketIdentifier): CanonicalMarketWithMetadata {
		const cacheKey = this.getCacheKey(market);

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached) {
			this.hits++;
			return cached;
		}

		this.misses++;

		// Generate canonical UUID
		const uuid = canonicalUUID(market.exchange, market.nativeId);

		// Create canonical market
		const canonical: CanonicalMarketWithMetadata = {
			uuid,
			exchange: market.exchange,
			marketId: market.nativeId,
			title: (market.title as string) || market.nativeId,
			description: market.description as string | undefined,
			outcomes: (market.outcomes as string[]) || ["Yes", "No"],
			volume: (market.volume as number) || 0,
			volume24h: market.volume24h as number | undefined,
			liquidity: market.liquidity as number | undefined,
			yesPrice: market.yesPrice as number | undefined,
			noPrice: market.noPrice as number | undefined,
			lastPrice: market.lastPrice as number | undefined,
			expiresAt: market.expiresAt as number | undefined,
			createdAt: market.createdAt as number | undefined,
			category: market.category as string | undefined,
			tags: market.tags || [],
			status: (market.status as CanonicalMarket["status"]) || "open",
			resolution: market.resolution as string | undefined,
			fetchedAt: Date.now(),
			apiMetadata: {
				cacheKey,
				canonicalizedAt: Date.now(),
			},
		};

		// Cache the result
		this.cache.set(cacheKey, canonical);

		return canonical;
	}

	/**
	 * Batch canonicalize multiple markets
	 *
	 * @param markets - Array of market identifiers
	 * @returns Map of UUID to canonical market
	 */
	batchCanonicalize(
		markets: MarketIdentifier[],
	): Map<string, CanonicalMarketWithMetadata> {
		const results = new Map<string, CanonicalMarketWithMetadata>();

		for (const market of markets) {
			const canonical = this.canonicalize(market);
			results.set(canonical.uuid, canonical);
		}

		return results;
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): CacheStats {
		const total = this.hits + this.misses;
		return {
			size: this.cache.size,
			promiseSize: this.promiseCache.size,
			hitRatio: total > 0 ? this.hits / total : undefined,
		};
	}

	/**
	 * Clear all caches
	 */
	clearCache(): void {
		this.cache.clear();
		this.promiseCache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Get cache size
	 */
	getCacheSize(): number {
		return this.cache.size;
	}
}
