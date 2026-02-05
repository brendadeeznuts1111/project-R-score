/**
 * @fileoverview Market Fetcher for Bookmakers
 * @description Fetches and canonicalizes markets from bookmaker APIs
 * @module orca/aliases/bookmakers/fetcher
 */

import type { OrcaBookmaker } from "../../../types";
import { getBookmakerCache } from "./cache";
import { getHeaderManager } from "./headers";
import { generateMarketUUID, type MarketIdentifier } from "./uuid";

/**
 * Raw market data from a bookmaker
 */
export interface MarketData {
	id: string;
	bookId: string;
	event: {
		home: string;
		away: string;
		league: string;
		sport: string;
		startTime: Date;
	};
	period: number;
	odds: Record<string, number>;
	timestamp: Date;
	exchange: string;
	rawData?: unknown;
}

/**
 * Canonical market representation
 * Aggregates markets from multiple exchanges with same UUID
 */
export interface CanonicalMarket {
	uuid: string;
	bookId: string;
	home: string;
	away: string;
	period: number;
	league?: string; // Optional - some markets may not have league info
	sport?: string; // Optional - some markets may not have sport info
	startTime: Date;
	odds: Record<string, number>;
	exchanges: Array<{
		exchange: string;
		odds: Record<string, number>;
		timestamp: Date;
	}>;
	canonicalOdds: Record<string, number>;
	timestamp: Date;
}

/**
 * Exchange adapter interface
 */
export interface ExchangeAdapter {
	name: string;
	fetchMarkets(params: any): Promise<MarketData[]>;
	normalizeMarket(market: any): MarketData;
}

/**
 * Market Fetcher
 * Wraps exchange APIs, canonicalizes data, and integrates with cache
 */
export class MarketFetcher {
	private adapters: Map<string, ExchangeAdapter> = new Map();
	private cacheTTL = 300; // 5 minutes
	private cache = getBookmakerCache();

	constructor(cacheTTL?: number) {
		if (cacheTTL) {
			this.cacheTTL = cacheTTL;
		}
	}

	/**
	 * Register an exchange adapter
	 */
	registerAdapter(adapter: ExchangeAdapter): void {
		this.adapters.set(adapter.name, adapter);
	}

	/**
	 * Fetch markets from a specific exchange
	 */
	async fetchFromExchange(
		exchange: string,
		params: any,
	): Promise<MarketData[]> {
		const adapter = this.adapters.get(exchange);
		if (!adapter) {
			throw new Error(`No adapter found for exchange: ${exchange}`);
		}

		try {
			const markets = await adapter.fetchMarkets(params);
			return markets.map((market) => adapter.normalizeMarket(market));
		} catch (error) {
			console.error(`Error fetching from ${exchange}:`, error);
			throw new Error(
				`Failed to fetch from ${exchange}: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Fetch and canonicalize markets from an exchange
	 */
	async fetchAndCanonicalize(
		exchange: string,
		params: any,
	): Promise<CanonicalMarket[]> {
		const cacheKey = `market:${exchange}:${JSON.stringify(params)}`;

		// Try cache first
		const cached = await this.cache.get<CanonicalMarket[]>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from exchange
		const rawMarkets = await this.fetchFromExchange(exchange, params);

		// Canonicalize markets
		const canonicalMarkets = await this.canonicalizeMarkets(rawMarkets);

		// Cache the results
		await this.cache.set(cacheKey, canonicalMarkets, this.cacheTTL);

		return canonicalMarkets;
	}

	/**
	 * Canonicalize markets by grouping by UUID
	 */
	private async canonicalizeMarkets(
		markets: MarketData[],
	): Promise<CanonicalMarket[]> {
		const canonicalMap = new Map<string, CanonicalMarket>();

		for (const market of markets) {
			const uuid = generateMarketUUID(
				market.bookId,
				market.event.home,
				market.event.away,
				market.period,
			);

			if (!canonicalMap.has(uuid)) {
				// Create new canonical market
				canonicalMap.set(uuid, {
					uuid,
					bookId: market.bookId,
					home: market.event.home,
					away: market.event.away,
					period: market.period,
					league: market.event.league,
					sport: market.event.sport,
					startTime: market.event.startTime,
					odds: market.odds,
					exchanges: [
						{
							exchange: market.exchange,
							odds: market.odds,
							timestamp: market.timestamp,
						},
					],
					canonicalOdds: this.calculateCanonicalOdds([market]),
					timestamp: market.timestamp,
				});
			} else {
				// Update existing canonical market
				const existing = canonicalMap.get(uuid)!;
				existing.exchanges.push({
					exchange: market.exchange,
					odds: market.odds,
					timestamp: market.timestamp,
				});

				// Update canonical odds with all exchanges
				existing.canonicalOdds = this.calculateCanonicalOdds(
					existing.exchanges.map((e) => ({
						exchange: e.exchange,
						odds: e.odds,
						timestamp: e.timestamp,
					})),
				);

				// Update timestamp to latest
				existing.timestamp = new Date(
					Math.max(existing.timestamp.getTime(), market.timestamp.getTime()),
				);
			}
		}

		return Array.from(canonicalMap.values());
	}

	/**
	 * Calculate canonical odds (best odds across exchanges)
	 */
	private calculateCanonicalOdds(
		exchangeMarkets: Array<{ exchange: string; odds: Record<string, number> }>,
	): Record<string, number> {
		if (exchangeMarkets.length === 0) {
			return {};
		}

		const canonicalOdds: Record<string, number> = {};
		const allOutcomes = new Set<string>();

		// Collect all outcomes
		exchangeMarkets.forEach((market) => {
			Object.keys(market.odds).forEach((outcome) => allOutcomes.add(outcome));
		});

		// Calculate best odds for each outcome
		allOutcomes.forEach((outcome) => {
			let bestOdds = -Infinity;

			exchangeMarkets.forEach((market) => {
				const odds = market.odds[outcome];
				if (odds !== undefined && odds > bestOdds) {
					bestOdds = odds;
				}
			});

			if (bestOdds !== -Infinity) {
				canonicalOdds[outcome] = bestOdds;
			}
		});

		return canonicalOdds;
	}

	/**
	 * Fetch from multiple exchanges in parallel
	 */
	async fetchMultipleExchanges(
		exchanges: string[],
		params: any,
	): Promise<Record<string, CanonicalMarket[]>> {
		const results: Record<string, CanonicalMarket[]> = {};

		await Promise.all(
			exchanges.map(async (exchange) => {
				try {
					results[exchange] = await this.fetchAndCanonicalize(exchange, params);
				} catch (error) {
					console.error(`Error fetching from ${exchange}:`, error);
					results[exchange] = [];
				}
			}),
		);

		return results;
	}

	/**
	 * Get available exchanges
	 */
	getAvailableExchanges(): string[] {
		return Array.from(this.adapters.keys());
	}

	/**
	 * Get cache instance
	 */
	getCache() {
		return this.cache;
	}
}

// Default exchange adapters (placeholder implementations)
export class BetfairAdapter implements ExchangeAdapter {
	name = "betfair";

	async fetchMarkets(params: any): Promise<MarketData[]> {
		// Implementation would make actual HTTP requests to Betfair API
		// This is a placeholder
		return [];
	}

	normalizeMarket(market: any): MarketData {
		return {
			id: market.marketId,
			bookId: market.marketId,
			event: {
				home: market.event?.homeTeam || "Home",
				away: market.event?.awayTeam || "Away",
				league: market.event?.competitionName || "Unknown",
				sport: market.eventTypeName || "Unknown",
				startTime: new Date(market.marketStartTime),
			},
			period: 0, // Main period
			odds: this.extractOdds(market.runners),
			timestamp: new Date(),
			exchange: "betfair",
			rawData: market,
		};
	}

	private extractOdds(runners: any[]): Record<string, number> {
		const odds: Record<string, number> = {};
		runners?.forEach((runner) => {
			odds[runner.runnerName] = runner.lastPriceTraded || 0;
		});
		return odds;
	}
}

export class PinnacleAdapter implements ExchangeAdapter {
	name = "pinnacle";

	async fetchMarkets(params: any): Promise<MarketData[]> {
		// Implementation would make actual HTTP requests to Pinnacle API
		return [];
	}

	normalizeMarket(market: any): MarketData {
		return {
			id: market.id,
			bookId: `pinnacle-${market.id}`,
			event: {
				home: market.homeTeam,
				away: market.awayTeam,
				league: market.league?.name || "Unknown",
				sport: market.sport?.name || "Unknown",
				startTime: new Date(market.startsAt),
			},
			period: market.periodNumber || 0,
			odds: this.extractOdds(market.periods),
			timestamp: new Date(),
			exchange: "pinnacle",
			rawData: market,
		};
	}

	private extractOdds(periods: any[]): Record<string, number> {
		const odds: Record<string, number> = {};
		periods?.forEach((period) => {
			period.lines?.forEach((line: any) => {
				odds[line.designation] = line.price;
			});
		});
		return odds;
	}
}

// Singleton instance with default adapters
let globalMarketFetcher: MarketFetcher | null = null;

/**
 * Get or create global market fetcher instance
 */
export function getMarketFetcher(cacheTTL?: number): MarketFetcher {
	if (!globalMarketFetcher) {
		globalMarketFetcher = new MarketFetcher(cacheTTL);
		// Register default adapters
		globalMarketFetcher.registerAdapter(new BetfairAdapter());
		globalMarketFetcher.registerAdapter(new PinnacleAdapter());
	}
	return globalMarketFetcher;
}
