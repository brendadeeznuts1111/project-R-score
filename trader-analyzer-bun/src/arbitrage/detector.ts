/**
 * @fileoverview Arbitrage Opportunity Detector
 * @description Detects cross-market arbitrage opportunities in prediction markets
 * @module arbitrage/detector
 */

// Using Bun.randomUUIDv4 for non-deterministic IDs
import type { PredictionMarket } from "../types";
import { createEventMatcher, type EventMatcher } from "./matcher";
import type {
	ArbitrageOpportunity,
	ArbitrageScannerConfig,
	MarketCategory,
	MatchedEvent,
	PredictionVenue,
	ScanResult,
	VenueQuote,
} from "./types";

/**
 * Default scanner configuration
 */
const DEFAULT_CONFIG: Required<ArbitrageScannerConfig> = {
	minSpread: 0.02, // 2% minimum spread
	minLiquidity: 1000, // $1000 minimum liquidity
	categories: ["crypto", "politics", "economics", "sports", "other"],
	venues: ["polymarket", "kalshi"],
	pollInterval: 30000, // 30 seconds
	maxQuoteAge: 60000, // 1 minute
};

/**
 * ArbitrageDetector - Finds cross-market arbitrage opportunities
 *
 * Scans matched events for price discrepancies that could yield
 * guaranteed profit or positive expected value.
 */
export class ArbitrageDetector {
	private config: Required<ArbitrageScannerConfig>;
	private matcher: EventMatcher;
	private opportunities: Map<string, ArbitrageOpportunity> = new Map();
	private lastScan: number = 0;

	constructor(config?: Partial<ArbitrageScannerConfig>) {
		this.config = {
			...DEFAULT_CONFIG,
			...config,
		} as Required<ArbitrageScannerConfig>;
		this.matcher = createEventMatcher({
			minSimilarity: 0.65,
			categoryMustMatch: false,
			maxDateDifferenceDays: 7,
		});
	}

	/**
	 * Scan matched events for arbitrage opportunities
	 */
	detectOpportunities(events: MatchedEvent[]): ArbitrageOpportunity[] {
		const newOpportunities: ArbitrageOpportunity[] = [];
		const now = Date.now();

		for (const event of events) {
			// Skip events with only one venue
			if (event.quotes.length < 2) continue;

			// Filter quotes by configured venues and freshness
			const validQuotes = event.quotes.filter(
				(q) =>
					this.config.venues.includes(q.venue as PredictionVenue) &&
					now - q.timestamp < this.config.maxQuoteAge,
			);

			if (validQuotes.length < 2) continue;

			// Find best prices for YES and NO
			const bestYesBuy = this.findBestPrice(validQuotes, "yesAsk", "min");
			const bestNoBuy = this.findBestPrice(validQuotes, "noAsk", "min");

			if (!bestYesBuy || !bestNoBuy) continue;

			// Calculate spread and check if it's an arbitrage
			const totalCost = bestYesBuy.yesAsk + bestNoBuy.noAsk;
			// ✅ Numeric safety: Prevent division by zero
			if (totalCost <= 0) continue;
			const spread = 1 - totalCost; // Positive spread = arbitrage
			const spreadPercent = (spread / totalCost) * 100;

			// Skip if spread is below threshold
			if (Math.abs(spreadPercent) < this.config.minSpread * 100) continue;

			// Check liquidity
			const minLiq = Math.min(bestYesBuy.liquidity, bestNoBuy.liquidity);
			if (minLiq < this.config.minLiquidity) continue;

			// Calculate optimal sizing for arbitrage
			const sizing = this.calculateSizing(
				bestYesBuy.yesAsk,
				bestNoBuy.noAsk,
				minLiq,
			);

			// True arbitrage: buy YES + buy NO costs less than $1, guarantees $1 payout
			const isArbitrage = totalCost < 1;

			// Calculate expected value per $100
			const expectedValue = isArbitrage
				? sizing.guaranteedProfit * 100
				: this.calculateExpectedValue(bestYesBuy, bestNoBuy);

			const opportunity: ArbitrageOpportunity = {
				id: Bun.randomUUIDv7(),
				event,
				buyYesVenue: bestYesBuy,
				buyNoVenue: bestNoBuy,
				spread,
				spreadPercent,
				expectedValue,
				isArbitrage,
				sizing,
				detectedAt: now,
				updatedAt: now,
			};

			newOpportunities.push(opportunity);
			this.opportunities.set(opportunity.id, opportunity);
		}

		this.lastScan = now;
		return newOpportunities;
	}

	/**
	 * Perform a full scan with market data from providers
	 */
	async scan(
		polymarketMarkets: PredictionMarket[],
		kalshiMarkets: PredictionMarket[],
	): Promise<ScanResult> {
		const startTime = Date.now();

		// Build market map by venue
		const marketsByVenue = new Map<PredictionVenue, PredictionMarket[]>();
		marketsByVenue.set("polymarket", polymarketMarkets);
		marketsByVenue.set("kalshi", kalshiMarkets);

		// Match events across venues
		const matchedEvents = this.matcher.matchAllMarkets(marketsByVenue);

		// Filter by configured categories
		const filteredEvents = matchedEvents.filter((e) =>
			this.config.categories.includes(e.category),
		);

		// Detect opportunities
		const opportunities = this.detectOpportunities(filteredEvents);

		const scanTime = Date.now() - startTime;

		return {
			matchedEvents: filteredEvents,
			opportunities,
			meta: {
				scanTime,
				venuesScanned: this.config.venues,
				marketsAnalyzed: polymarketMarkets.length + kalshiMarkets.length,
				eventsMatched: filteredEvents.length,
				opportunitiesFound: opportunities.length,
			},
		};
	}

	/**
	 * Find best price from quotes
	 */
	private findBestPrice(
		quotes: VenueQuote[],
		field: "yesAsk" | "yesBid" | "noAsk" | "noBid",
		type: "min" | "max",
	): VenueQuote | null {
		if (quotes.length === 0) return null;

		return quotes.reduce((best, current) => {
			const bestValue = best[field];
			const currentValue = current[field];

			if (type === "min") {
				return currentValue < bestValue ? current : best;
			} else {
				return currentValue > bestValue ? current : best;
			}
		});
	}

	/**
	 * Calculate optimal position sizing for arbitrage
	 */
	private calculateSizing(
		yesPrice: number,
		noPrice: number,
		maxCapital: number,
	): ArbitrageOpportunity["sizing"] {
		const totalCost = yesPrice + noPrice;

		// For true arbitrage (totalCost < 1):
		// Buy $X on YES, $Y on NO where X + Y = capital
		// Guaranteed return is 1 / totalCost per dollar
		// Profit = capital * (1/totalCost - 1)

		if (totalCost < 1) {
			// Optimal ratio: proportional to prices
			const yesRatio = yesPrice / totalCost;
			const noRatio = noPrice / totalCost;

			const totalCapital = Math.min(maxCapital, 10000); // Cap at $10k
			const yesAmount = totalCapital * yesRatio;
			const noAmount = totalCapital * noRatio;
			const guaranteedProfit = totalCapital * (1 / totalCost - 1);

			return {
				yesAmount: Math.round(yesAmount * 100) / 100,
				noAmount: Math.round(noAmount * 100) / 100,
				totalCapital: Math.round(totalCapital * 100) / 100,
				guaranteedProfit: Math.round(guaranteedProfit * 100) / 100,
			};
		}

		// Not a true arbitrage - return balanced sizing
		const totalCapital = Math.min(maxCapital / 2, 5000);
		return {
			yesAmount: Math.round(totalCapital * 100) / 100,
			noAmount: 0,
			totalCapital: Math.round(totalCapital * 100) / 100,
			guaranteedProfit: 0,
		};
	}

	/**
	 * Calculate expected value for non-arbitrage opportunity
	 * Based on price discrepancy suggesting mispricing
	 */
	private calculateExpectedValue(
		yesQuote: VenueQuote,
		noQuote: VenueQuote,
	): number {
		// If YES is cheaper on venue A than NO is on venue B,
		// there might be alpha in buying YES on A

		// Average implied probability from both venues
		const avgYesProb =
			(yesQuote.yesProbability + (1 - noQuote.yesProbability)) / 2;

		// Expected value of buying YES at yesAsk price
		// EV = (prob * 1) - yesAsk
		const evYes = avgYesProb * 1 - yesQuote.yesAsk;

		// Expected value per $100
		return Math.round(evYes * 10000) / 100;
	}

	/**
	 * Get all current opportunities
	 */
	getOpportunities(): ArbitrageOpportunity[] {
		return Array.from(this.opportunities.values());
	}

	/**
	 * Get opportunities filtered by criteria
	 */
	getFilteredOpportunities(filter: {
		minSpread?: number;
		minExpectedValue?: number;
		category?: MarketCategory;
		isArbitrage?: boolean;
	}): ArbitrageOpportunity[] {
		return this.getOpportunities().filter((opp) => {
			if (
				filter.minSpread !== undefined &&
				opp.spreadPercent < filter.minSpread
			) {
				return false;
			}
			if (
				filter.minExpectedValue !== undefined &&
				opp.expectedValue < filter.minExpectedValue
			) {
				return false;
			}
			if (
				filter.category !== undefined &&
				opp.event.category !== filter.category
			) {
				return false;
			}
			if (
				filter.isArbitrage !== undefined &&
				opp.isArbitrage !== filter.isArbitrage
			) {
				return false;
			}
			return true;
		});
	}

	/**
	 * Get opportunity by ID
	 */
	getOpportunity(id: string): ArbitrageOpportunity | undefined {
		return this.opportunities.get(id);
	}

	/**
	 * Remove stale opportunities
	 */
	pruneStale(maxAge: number = 300000): number {
		const now = Date.now();
		let removed = 0;

		for (const [id, opp] of this.opportunities) {
			if (now - opp.updatedAt > maxAge) {
				this.opportunities.delete(id);
				removed++;
			}
		}

		return removed;
	}

	/**
	 * Clear all opportunities
	 */
	clear(): void {
		this.opportunities.clear();
	}

	/**
	 * Get detector statistics
	 */
	getStats(): {
		totalOpportunities: number;
		arbitrageOpportunities: number;
		evOpportunities: number;
		lastScan: number;
		byCategory: Record<MarketCategory, number>;
	} {
		const opportunities = this.getOpportunities();
		const arbitrage = opportunities.filter((o) => o.isArbitrage);

		const byCategory: Record<MarketCategory, number> = {
			crypto: 0,
			politics: 0,
			sports: 0,
			economics: 0,
			weather: 0,
			entertainment: 0,
			science: 0,
			other: 0,
		};

		for (const opp of opportunities) {
			byCategory[opp.event.category]++;
		}

		return {
			totalOpportunities: opportunities.length,
			arbitrageOpportunities: arbitrage.length,
			evOpportunities: opportunities.length - arbitrage.length,
			lastScan: this.lastScan,
			byCategory,
		};
	}

	/**
	 * Get the event matcher instance
	 */
	getMatcher(): EventMatcher {
		return this.matcher;
	}
}

/**
 * Create a new ArbitrageDetector instance
 */
export function createArbitrageDetector(
	config?: Partial<ArbitrageScannerConfig>,
): ArbitrageDetector {
	return new ArbitrageDetector(config);
}

/**
 * Global detector instance
 */
export const globalDetector = new ArbitrageDetector();
