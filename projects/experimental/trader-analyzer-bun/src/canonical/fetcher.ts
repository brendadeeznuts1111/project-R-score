/**
 * @fileoverview Canonical Market Fetcher
 * @description Unified market fetching with canonical UUIDs across all exchanges
 * @module canonical/fetcher
 */

import { createNamespacedCache, getCache } from "../cache/manager";
import {
	canonicalUUID,
	type ExchangeName,
	parseSlug,
	slugToUUID,
} from "./uuidv5";

/**
 * Canonical market representation
 * Same structure regardless of source exchange
 */
export interface CanonicalMarket {
	uuid: string;
	exchange: ExchangeName;
	marketId: string;
	title: string;
	description?: string;
	outcomes: string[];
	volume: number;
	volume24h?: number;
	liquidity?: number;
	yesPrice?: number;
	noPrice?: number;
	lastPrice?: number;
	expiresAt?: number;
	createdAt?: number;
	category?: string;
	tags?: string[];
	status: "open" | "closed" | "resolved" | "cancelled";
	resolution?: string;
	fetchedAt: number;
}

/**
 * Exchange-specific market data (before normalization)
 */
export interface RawMarketData {
	id: string;
	title: string;
	description?: string;
	outcomes?: string[];
	volume?: number;
	yesPrice?: number;
	noPrice?: number;
	lastPrice?: number;
	expiresAt?: number;
	createdAt?: number;
	status?: string;
	[key: string]: unknown; // Allow exchange-specific fields
}

/**
 * Market fetcher interface for exchanges
 */
export interface ExchangeFetcher {
	name: ExchangeName;
	fetchMarket(marketId: string): Promise<RawMarketData | null>;
	fetchMarkets?(params?: {
		limit?: number;
		cursor?: string;
	}): Promise<RawMarketData[]>;
	searchMarkets?(query: string): Promise<RawMarketData[]>;
}

/**
 * Registered exchange fetchers
 */
const exchangeFetchers = new Map<ExchangeName, ExchangeFetcher>();

/**
 * Register an exchange fetcher
 */
export function registerFetcher(fetcher: ExchangeFetcher): void {
	exchangeFetchers.set(fetcher.name, fetcher);
}

/**
 * Get a registered fetcher
 */
export function getFetcher(
	exchange: ExchangeName,
): ExchangeFetcher | undefined {
	return exchangeFetchers.get(exchange);
}

/**
 * Normalize raw market data to canonical format
 */
function normalizeMarket(
	exchange: ExchangeName,
	marketId: string,
	raw: RawMarketData,
): CanonicalMarket {
	const uuid = canonicalUUID(exchange, marketId);

	// Normalize status
	let status: CanonicalMarket["status"] = "open";
	if (raw.status) {
		const s = raw.status.toLowerCase();
		if (s.includes("close") || s === "ended") status = "closed";
		else if (s.includes("resolv")) status = "resolved";
		else if (s.includes("cancel")) status = "cancelled";
	}

	return {
		uuid,
		exchange,
		marketId,
		title: raw.title,
		description: raw.description,
		outcomes: raw.outcomes || ["Yes", "No"],
		volume: raw.volume || 0,
		yesPrice: raw.yesPrice,
		noPrice: raw.noPrice,
		lastPrice: raw.lastPrice,
		expiresAt: raw.expiresAt,
		createdAt: raw.createdAt,
		status,
		fetchedAt: Date.now(),
	};
}

// Create namespaced cache for markets
const marketCache = createNamespacedCache("market");

/**
 * Fetch a canonical market by slug
 *
 * @param slug - Format: "exchange:marketId" (e.g., "polymarket:USElectionWinner2024")
 * @param options - Fetch options
 * @returns Canonical market or null
 *
 * @example
 * ```ts
 * const market = await fetchCanonicalMarket("polymarket:USElectionWinner2024");
 * console.log(market.uuid); // Always the same UUID
 * ```
 */
export async function fetchCanonicalMarket(
	slug: string,
	options: { bypassCache?: boolean; cacheTtl?: number } = {},
): Promise<CanonicalMarket | null> {
	const { bypassCache = false, cacheTtl = 300 } = options;

	// Check cache first
	if (!bypassCache) {
		const cached = marketCache.get<CanonicalMarket>(slug);
		if (cached) return cached;
	}

	// Parse slug
	const { exchange, marketId } = parseSlug(slug);

	// Get fetcher
	const fetcher = exchangeFetchers.get(exchange);
	if (!fetcher) {
		console.warn(`No fetcher registered for exchange: ${exchange}`);
		return null;
	}

	// Fetch raw data
	const raw = await fetcher.fetchMarket(marketId);
	if (!raw) return null;

	// Normalize to canonical format
	const canonical = normalizeMarket(exchange, marketId, raw);

	// Cache the result
	marketCache.set(slug, canonical, cacheTtl);

	return canonical;
}

/**
 * Fetch multiple markets by slugs (batched)
 */
export async function fetchCanonicalMarkets(
	slugs: string[],
	options: { bypassCache?: boolean; cacheTtl?: number } = {},
): Promise<Map<string, CanonicalMarket | null>> {
	const results = new Map<string, CanonicalMarket | null>();

	// Fetch in parallel
	const promises = slugs.map(async (slug) => {
		const market = await fetchCanonicalMarket(slug, options);
		results.set(slug, market);
	});

	await Promise.all(promises);
	return results;
}

/**
 * Search across all registered exchanges
 */
export async function searchAllExchanges(
	query: string,
	options: { exchanges?: ExchangeName[] } = {},
): Promise<CanonicalMarket[]> {
	const exchanges = options.exchanges || Array.from(exchangeFetchers.keys());
	const results: CanonicalMarket[] = [];

	const promises = exchanges.map(async (exchange) => {
		const fetcher = exchangeFetchers.get(exchange);
		if (!fetcher?.searchMarkets) return;

		try {
			const markets = await fetcher.searchMarkets(query);
			for (const raw of markets) {
				const canonical = normalizeMarket(exchange, raw.id, raw);
				results.push(canonical);
			}
		} catch (error) {
			console.error(`Search failed for ${exchange}:`, error);
		}
	});

	await Promise.all(promises);
	return results;
}

/**
 * Get market by UUID (searches cache)
 */
export function getMarketByUUID(uuid: string): CanonicalMarket | null {
	const cache = getCache();
	const keys = cache.keys("market:");

	for (const key of keys) {
		const market = cache.get<CanonicalMarket>(key);
		if (market?.uuid === uuid) return market;
	}

	return null;
}

/**
 * Cross-exchange market matching
 * Find the same event across different exchanges
 */
export interface CrossExchangeMatch {
	primaryUUID: string;
	title: string;
	markets: {
		exchange: ExchangeName;
		uuid: string;
		marketId: string;
		yesPrice?: number;
		noPrice?: number;
		volume: number;
		similarity: number;
	}[];
	priceDifference?: number;
	arbitrageOpportunity: boolean;
}

/**
 * Find matching markets across exchanges
 * Uses title similarity to identify the same event
 */
export async function findCrossExchangeMatches(
	title: string,
	options: { threshold?: number } = {},
): Promise<CrossExchangeMatch | null> {
	const { threshold = 0.8 } = options;

	const matches = await searchAllExchanges(title);
	if (matches.length < 2) return null;

	// Simple Jaccard similarity for title matching
	const tokenize = (s: string) =>
		new Set(
			s
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, "")
				.split(/\s+/),
		);

	const similarity = (a: Set<string>, b: Set<string>) => {
		const intersection = new Set([...a].filter((x) => b.has(x)));
		const union = new Set([...a, ...b]);
		return intersection.size / union.size;
	};

	const primaryTokens = tokenize(title);
	const matchingMarkets = matches
		.map((m) => ({
			...m,
			similarity: similarity(primaryTokens, tokenize(m.title)),
		}))
		.filter((m) => m.similarity >= threshold)
		.sort((a, b) => b.similarity - a.similarity);

	if (matchingMarkets.length < 2) return null;

	// Calculate price differences for arbitrage detection
	const yesPrices = matchingMarkets
		.filter((m) => m.yesPrice !== undefined)
		.map((m) => m.yesPrice!);

	const priceDiff =
		yesPrices.length >= 2
			? Math.max(...yesPrices) - Math.min(...yesPrices)
			: undefined;

	return {
		primaryUUID: matchingMarkets[0].uuid,
		title: matchingMarkets[0].title,
		markets: matchingMarkets.map((m) => ({
			exchange: m.exchange,
			uuid: m.uuid,
			marketId: m.marketId,
			yesPrice: m.yesPrice,
			noPrice: m.noPrice,
			volume: m.volume,
			similarity: m.similarity,
		})),
		priceDifference: priceDiff,
		arbitrageOpportunity: priceDiff !== undefined && priceDiff > 0.05, // 5% threshold
	};
}

// Export types
export type { ExchangeName } from "./uuidv5";
