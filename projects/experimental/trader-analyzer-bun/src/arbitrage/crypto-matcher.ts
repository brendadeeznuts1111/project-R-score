/**
 * @fileoverview Cross-Asset Crypto Matcher
 * @description Matches crypto options implied probability with prediction market events
 * @module arbitrage/crypto-matcher
 *
 * This module enables arbitrage detection between:
 * - Deribit BTC/ETH options implied probability
 * - Polymarket/Kalshi crypto price predictions
 *
 * Example: "BTC above $100k by Dec 2025" on Polymarket vs
 *          Deribit $100k call option delta for Dec 2025
 */

import {
	type DeribitOption,
	type DeribitOptionTicker,
	DeribitProvider,
} from "../providers/deribit";
import type { PredictionMarket } from "../types";
import type { MarketCategory, MatchedEvent, VenueQuote } from "./types";

// Namespace for crypto prediction events
const CRYPTO_PREDICTION_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c9";

/**
 * Crypto target extracted from prediction market question
 */
export interface CryptoTarget {
	/** Base currency (BTC, ETH, SOL) */
	currency: "BTC" | "ETH" | "SOL";
	/** Direction of prediction */
	direction: "above" | "below" | "at";
	/** Target price in USD */
	targetPrice: number;
	/** Target date */
	targetDate: Date;
	/** Confidence of extraction (0-1) */
	extractionConfidence: number;
	/** Original question text */
	originalQuestion: string;
}

/**
 * Deribit quote with implied probability
 */
export interface DeribitQuote
	extends Omit<VenueQuote, "yesBid" | "noAsk" | "noBid"> {
	venue: "deribit";
	/** The option used for pricing */
	option: DeribitOption;
	/** Option ticker with Greeks */
	ticker: DeribitOptionTicker | null;
	/** Delta-derived implied probability */
	impliedProbability: number;
	/** Mark IV for the option */
	markIv: number;
	/** Current spot price */
	spotPrice: number;
	/** Days to expiry */
	daysToExpiry: number;
}

/**
 * Cross-asset arbitrage opportunity
 */
export interface CryptoArbitrageOpportunity {
	/** Unique ID */
	id: string;
	/** The matched crypto prediction event */
	event: MatchedEvent;
	/** Crypto target details */
	target: CryptoTarget;
	/** Best prediction market quote */
	predictionQuote: VenueQuote;
	/** Deribit options quote */
	optionsQuote: DeribitQuote;
	/** Price difference (options prob - prediction prob) */
	priceDifference: number;
	/** Absolute price difference percentage */
	differencePercent: number;
	/** Which side is cheaper */
	cheaperVenue: "deribit" | "prediction";
	/** Recommended action */
	action: {
		venue: "deribit" | "prediction";
		side: "buy" | "sell";
		rationale: string;
	};
	/** Confidence in the match (0-1) */
	matchConfidence: number;
	/** Timestamp */
	detectedAt: number;
}

/**
 * Patterns for extracting crypto targets from prediction market questions
 */
const CRYPTO_PATTERNS: Record<string, { above: RegExp[]; below: RegExp[] }> = {
	btc: {
		// "Bitcoin above $100k by Dec 2025"
		above: [
			/bitcoin?\s+(?:to\s+)?(?:reach|hit|exceed|above|over|at least|at or above)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/btc\s+(?:to\s+)?(?:reach|hit|exceed|above|over|at least|at or above)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/will\s+bitcoin?\s+(?:be\s+)?(?:above|over|exceed|at least)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/bitcoin?\s+(?:price\s+)?(?:above|over)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in|at)\s+(.+?)(?:\?|$)/i,
			/\$?([\d,]+(?:\.\d+)?[kmb]?)\s+bitcoin?\s+(?:by|before|on)\s+(.+?)(?:\?|$)/i,
			// "Bitcoin to $150k by end of 2025"
			/(?:bitcoin?|btc)\s+to\s+\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
		],
		// "Bitcoin below $50k on Dec 31"
		below: [
			/bitcoin?\s+(?:to\s+)?(?:fall|drop|below|under|less than)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/will\s+bitcoin?\s+(?:be\s+)?(?:below|under|less than)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
		],
	},
	eth: {
		above: [
			/ethereum?\s+(?:to\s+)?(?:reach|hit|exceed|above|over|at least|at or above)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/eth\s+(?:to\s+)?(?:reach|hit|exceed|above|over|at least|at or above)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/will\s+(?:ethereum?|eth)\s+(?:be\s+)?(?:above|over|exceed|at least)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/(?:ethereum?|eth)\s+(?:price\s+)?(?:above|over)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in|at)\s+(.+?)(?:\?|$)/i,
		],
		below: [
			/(?:ethereum?|eth)\s+(?:to\s+)?(?:fall|drop|below|under|less than)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/will\s+(?:ethereum?|eth)\s+(?:be\s+)?(?:below|under|less than)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
		],
	},
	sol: {
		above: [
			/solana?\s+(?:to\s+)?(?:reach|hit|exceed|above|over|at least|at or above)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/sol\s+(?:to\s+)?(?:reach|hit|exceed|above|over|at least|at or above)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/will\s+(?:solana?|sol)\s+(?:be\s+)?(?:above|over|exceed|at least)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/(?:solana?|sol)\s+(?:price\s+)?(?:above|over)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in|at)\s+(.+?)(?:\?|$)/i,
		],
		below: [
			/(?:solana?|sol)\s+(?:to\s+)?(?:fall|drop|below|under|less than)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
			/will\s+(?:solana?|sol)\s+(?:be\s+)?(?:below|under|less than)\s*\$?([\d,]+(?:\.\d+)?[kmb]?)\s+(?:by|before|on|in)\s+(.+?)(?:\?|$)/i,
		],
	},
};

/**
 * Date parsing patterns
 * @internal Reserved for future use
 */
const _DATE_PATTERNS = [
	// "December 31, 2025", "Dec 31, 2025"
	/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i,
	// "December 2025", "Dec 2025"
	/([a-z]+)\s+(\d{4})/i,
	// "12/31/2025", "12-31-2025"
	/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
	// "2025-12-31"
	/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/,
	// "end of 2025", "EOY 2025"
	/(?:end\s+of|eoy)\s+(\d{4})/i,
	// "Q4 2025"
	/q([1-4])\s+(\d{4})/i,
];

const MONTH_MAP: Record<string, number> = {
	january: 0,
	jan: 0,
	february: 1,
	feb: 1,
	march: 2,
	mar: 2,
	april: 3,
	apr: 3,
	may: 4,
	june: 5,
	jun: 5,
	july: 6,
	jul: 6,
	august: 7,
	aug: 7,
	september: 8,
	sep: 8,
	sept: 8,
	october: 9,
	oct: 9,
	november: 10,
	nov: 10,
	december: 11,
	dec: 11,
};

/**
 * CryptoMatcher - Matches crypto prediction markets with options
 */
export class CryptoMatcher {
	private deribit: DeribitProvider;
	private optionsCache: Map<string, DeribitOption[]> = new Map();
	private tickerCache: Map<string, DeribitOptionTicker> = new Map();
	private lastFetch: number = 0;
	private cacheTtl: number = 60000; // 1 minute

	constructor() {
		this.deribit = new DeribitProvider({ testnet: false });
	}

	/**
	 * Extract crypto target from a prediction market question
	 */
	extractCryptoTarget(question: string): CryptoTarget | null {
		const normalizedQuestion = question.toLowerCase();

		// Check for BTC
		if (
			normalizedQuestion.includes("bitcoin") ||
			normalizedQuestion.includes("btc")
		) {
			return this.tryExtract(question, "BTC");
		}

		// Check for ETH
		if (
			normalizedQuestion.includes("ethereum") ||
			normalizedQuestion.includes("eth")
		) {
			return this.tryExtract(question, "ETH");
		}

		// Check for SOL
		if (
			normalizedQuestion.includes("solana") ||
			normalizedQuestion.includes("sol")
		) {
			return this.tryExtract(question, "SOL");
		}

		return null;
	}

	/**
	 * Try to extract target for a specific currency
	 */
	private tryExtract(
		question: string,
		currency: "BTC" | "ETH" | "SOL",
	): CryptoTarget | null {
		const patterns = CRYPTO_PATTERNS[currency.toLowerCase()];
		if (!patterns) return null;

		// Try above patterns
		for (const pattern of patterns.above) {
			const match = question.match(pattern);
			if (match) {
				const price = this.parsePrice(match[1]);
				const date = this.parseDate(match[2]);

				if (price && date) {
					return {
						currency,
						direction: "above",
						targetPrice: price,
						targetDate: date,
						extractionConfidence: 0.9,
						originalQuestion: question,
					};
				}
			}
		}

		// Try below patterns
		for (const pattern of patterns.below) {
			const match = question.match(pattern);
			if (match) {
				const price = this.parsePrice(match[1]);
				const date = this.parseDate(match[2]);

				if (price && date) {
					return {
						currency,
						direction: "below",
						targetPrice: price,
						targetDate: date,
						extractionConfidence: 0.9,
						originalQuestion: question,
					};
				}
			}
		}

		return null;
	}

	/**
	 * Parse price from string (handles k, m, b suffixes)
	 */
	private parsePrice(priceStr: string): number | null {
		const cleaned = priceStr.replace(/,/g, "").toLowerCase();
		const match = cleaned.match(/^([\d.]+)([kmb])?$/);

		if (!match) return null;

		let value = parseFloat(match[1]);
		const suffix = match[2];

		if (suffix === "k") value *= 1000;
		if (suffix === "m") value *= 1000000;
		if (suffix === "b") value *= 1000000000;

		return value;
	}

	/**
	 * Parse date from string
	 */
	private parseDate(dateStr: string): Date | null {
		const normalized = dateStr.trim().toLowerCase();

		// Try "Month DD, YYYY" pattern first
		const monthDayYearMatch = normalized.match(
			/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
		);
		if (monthDayYearMatch) {
			const month = MONTH_MAP[monthDayYearMatch[1]];
			const day = parseInt(monthDayYearMatch[2], 10);
			const year = parseInt(monthDayYearMatch[3], 10);
			if (month !== undefined && day >= 1 && day <= 31) {
				return new Date(year, month, day, 23, 59, 59);
			}
		}

		// Try "Month Year" pattern
		const monthYearMatch = normalized.match(/([a-z]+)\s+(\d{4})/);
		if (monthYearMatch) {
			const month = MONTH_MAP[monthYearMatch[1]];
			const year = parseInt(monthYearMatch[2], 10);
			if (month !== undefined) {
				// End of month
				return new Date(year, month + 1, 0, 23, 59, 59);
			}
		}

		// Try "end of YEAR" pattern
		const eoyMatch = normalized.match(/(?:end\s+of|eoy)\s+(\d{4})/);
		if (eoyMatch) {
			return new Date(parseInt(eoyMatch[1], 10), 11, 31, 23, 59, 59);
		}

		// Try "Q# YEAR" pattern
		const quarterMatch = normalized.match(/q([1-4])\s+(\d{4})/);
		if (quarterMatch) {
			const quarter = parseInt(quarterMatch[1], 10);
			const year = parseInt(quarterMatch[2], 10);
			const month = quarter * 3 - 1; // Q1=Feb end, Q2=May end, etc
			return new Date(year, month + 1, 0, 23, 59, 59);
		}

		// Try MM/DD/YYYY
		const slashMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
		if (slashMatch) {
			return new Date(
				parseInt(slashMatch[3], 10),
				parseInt(slashMatch[1], 10) - 1,
				parseInt(slashMatch[2], 10),
				23,
				59,
				59,
			);
		}

		// Try YYYY-MM-DD
		const isoMatch = normalized.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
		if (isoMatch) {
			return new Date(
				parseInt(isoMatch[1], 10),
				parseInt(isoMatch[2], 10) - 1,
				parseInt(isoMatch[3], 10),
				23,
				59,
				59,
			);
		}

		return null;
	}

	/**
	 * Find the best matching Deribit option for a crypto target
	 */
	async findMatchingOption(target: CryptoTarget): Promise<DeribitQuote | null> {
		// Refresh cache if stale
		const now = Date.now();
		if (now - this.lastFetch > this.cacheTtl) {
			await this.refreshOptionsCache(target.currency);
		}

		const cacheKey = target.currency;
		const options = this.optionsCache.get(cacheKey);

		if (!options || options.length === 0) {
			return null;
		}

		// Find options near the target strike and expiration
		const targetTime = target.targetDate.getTime();
		const optionType = target.direction === "above" ? "call" : "put";

		// Filter to relevant options
		const candidates = options.filter((opt) => {
			if (opt.optionType !== optionType) return false;

			// Strike within 10% of target
			const strikeDiff =
				Math.abs(opt.strike - target.targetPrice) / target.targetPrice;
			if (strikeDiff > 0.1) return false;

			// Expiration within 7 days of target
			const daysDiff =
				Math.abs(opt.expiration.getTime() - targetTime) / (1000 * 60 * 60 * 24);
			if (daysDiff > 7) return false;

			return true;
		});

		if (candidates.length === 0) {
			// Try with looser criteria
			const looseCandidates = options.filter((opt) => {
				if (opt.optionType !== optionType) return false;

				// Strike within 20% of target
				const strikeDiff =
					Math.abs(opt.strike - target.targetPrice) / target.targetPrice;
				if (strikeDiff > 0.2) return false;

				// Expiration within 30 days of target
				const daysDiff =
					Math.abs(opt.expiration.getTime() - targetTime) /
					(1000 * 60 * 60 * 24);
				if (daysDiff > 30) return false;

				return true;
			});

			if (looseCandidates.length === 0) return null;
			candidates.push(...looseCandidates);
		}

		// Sort by closest match (strike + expiration proximity)
		candidates.sort((a, b) => {
			const aStrikeDiff = Math.abs(a.strike - target.targetPrice);
			const bStrikeDiff = Math.abs(b.strike - target.targetPrice);
			const aDateDiff = Math.abs(a.expiration.getTime() - targetTime);
			const bDateDiff = Math.abs(b.expiration.getTime() - targetTime);

			// Weighted score (strike more important)
			const aScore =
				(aStrikeDiff / target.targetPrice) * 2 +
				aDateDiff / (30 * 24 * 60 * 60 * 1000);
			const bScore =
				(bStrikeDiff / target.targetPrice) * 2 +
				bDateDiff / (30 * 24 * 60 * 60 * 1000);

			return aScore - bScore;
		});

		const bestOption = candidates[0];

		// Fetch ticker for the best option
		let ticker: DeribitOptionTicker | null = null;
		try {
			const tickerResult = await this.deribit.getOptionTicker(
				bestOption.instrumentName,
			);
			if (tickerResult.ok) {
				ticker = tickerResult.data;
				this.tickerCache.set(bestOption.instrumentName, ticker);
			}
		} catch {
			ticker = this.tickerCache.get(bestOption.instrumentName) || null;
		}

		// Get current spot price
		const indexResult = await this.deribit.getIndex(
			`${target.currency.toLowerCase()}_usd`,
		);
		const spotPrice = indexResult.ok ? indexResult.data.price : 0;

		// Calculate implied probability from delta
		// For a call: delta ≈ probability of being in the money
		// For a put: 1 - |delta| ≈ probability of being below strike
		let impliedProbability = 0;
		if (ticker) {
			if (target.direction === "above") {
				// Call delta is the probability of finishing above strike
				impliedProbability = Math.abs(ticker.greeks.delta);
			} else {
				// Put delta gives probability of finishing below
				impliedProbability = 1 - Math.abs(ticker.greeks.delta);
			}
		}

		const daysToExpiry =
			(bestOption.expiration.getTime() - now) / (1000 * 60 * 60 * 24);

		return {
			venue: "deribit",
			instrumentId: bestOption.instrumentName,
			instrumentName: bestOption.instrumentName,
			yesProbability: impliedProbability,
			yesAsk: impliedProbability + 0.02, // Add 2% spread approximation
			volume: 0,
			liquidity: 0,
			timestamp: now,
			option: bestOption,
			ticker,
			impliedProbability,
			markIv: ticker?.markIv || 0,
			spotPrice,
			daysToExpiry,
		};
	}

	/**
	 * Refresh the options cache for a currency
	 */
	private async refreshOptionsCache(
		currency: "BTC" | "ETH" | "SOL",
	): Promise<void> {
		// SOL options not supported by Deribit
		if (currency === "SOL") {
			return;
		}

		try {
			const result = await this.deribit.fetchOptions(currency as "BTC" | "ETH");
			if (result.ok) {
				this.optionsCache.set(currency, result.data);
				this.lastFetch = Date.now();
			}
		} catch (error) {
			console.error(`Failed to fetch ${currency} options:`, error);
		}
	}

	/**
	 * Find crypto prediction markets from a list of markets
	 */
	findCryptoMarkets(
		markets: PredictionMarket[],
	): { market: PredictionMarket; target: CryptoTarget }[] {
		const results: { market: PredictionMarket; target: CryptoTarget }[] = [];

		for (const market of markets) {
			const question = market.question || market.title || "";
			const target = this.extractCryptoTarget(question);

			if (target) {
				results.push({ market, target });
			}
		}

		return results;
	}

	/**
	 * Create a matched event for a crypto prediction with Deribit quote
	 */
	async createMatchedEvent(
		predictionMarket: PredictionMarket,
		target: CryptoTarget,
		predictionVenue: "polymarket" | "kalshi",
	): Promise<MatchedEvent | null> {
		// Get Deribit quote
		const deribitQuote = await this.findMatchingOption(target);

		// Parse prediction market price
		let yesPrice = 0.5;
		let noPrice = 0.5;

		if (predictionMarket.outcomePrices) {
			if (typeof predictionMarket.outcomePrices === "string") {
				try {
					const prices = JSON.parse(predictionMarket.outcomePrices);
					yesPrice = parseFloat(prices[0]) || 0.5;
					noPrice = parseFloat(prices[1]) || 0.5;
				} catch {
					// Use default
				}
			} else if (Array.isArray(predictionMarket.outcomePrices)) {
				yesPrice = parseFloat(String(predictionMarket.outcomePrices[0])) || 0.5;
				noPrice = parseFloat(String(predictionMarket.outcomePrices[1])) || 0.5;
			}
		}

		// Handle Kalshi-style prices
		if (
			predictionVenue === "kalshi" &&
			predictionMarket.yes_bid !== undefined
		) {
			yesPrice = predictionMarket.yes_bid / 100;
		}

		const predictionQuote: VenueQuote = {
			venue: predictionVenue,
			instrumentId: predictionMarket.id,
			instrumentName:
				predictionMarket.question ||
				predictionMarket.title ||
				predictionMarket.id,
			yesProbability: yesPrice,
			yesAsk: predictionMarket.yes_ask
				? predictionMarket.yes_ask / 100
				: yesPrice + 0.01,
			yesBid: predictionMarket.yes_bid
				? predictionMarket.yes_bid / 100
				: yesPrice - 0.01,
			noAsk: predictionMarket.no_ask
				? predictionMarket.no_ask / 100
				: noPrice + 0.01,
			noBid: predictionMarket.no_bid
				? predictionMarket.no_bid / 100
				: noPrice - 0.01,
			volume: predictionMarket.volume || 0,
			liquidity: predictionMarket.liquidity || 0,
			timestamp: Date.now(),
			raw: predictionMarket,
		};

		const quotes: VenueQuote[] = [predictionQuote];

		if (deribitQuote) {
			// Convert DeribitQuote to VenueQuote
			const deribitVenueQuote: VenueQuote = {
				venue: "deribit" as any, // We extend the venue type
				instrumentId: deribitQuote.instrumentId,
				instrumentName: deribitQuote.instrumentName,
				yesProbability: deribitQuote.impliedProbability,
				yesAsk: deribitQuote.yesAsk,
				yesBid: deribitQuote.impliedProbability - 0.02,
				noAsk: 1 - deribitQuote.impliedProbability + 0.02,
				noBid: 1 - deribitQuote.impliedProbability - 0.02,
				volume: 0,
				liquidity: 0,
				timestamp: deribitQuote.timestamp,
			};
			quotes.push(deribitVenueQuote);
		}

		// Generate canonical ID
		const normalizedQuestion = `${target.currency}:${target.direction}:${target.targetPrice}:${target.targetDate.toISOString().split("T")[0]}`;
		const eventId = Bun.randomUUIDv5(
			normalizedQuestion,
			CRYPTO_PREDICTION_NAMESPACE,
		);

		return {
			id: eventId,
			description: target.originalQuestion,
			normalizedQuestion,
			category: "crypto" as MarketCategory,
			resolutionDate: target.targetDate.toISOString(),
			quotes,
			confidence: deribitQuote ? 0.85 : 0.5,
			keywords: [
				target.currency.toLowerCase(),
				`$${target.targetPrice}`,
				target.direction,
			],
		};
	}

	/**
	 * Detect cross-asset arbitrage opportunities
	 */
	async detectCryptoArbitrage(
		polymarketMarkets: PredictionMarket[],
		kalshiMarkets: PredictionMarket[],
	): Promise<CryptoArbitrageOpportunity[]> {
		const opportunities: CryptoArbitrageOpportunity[] = [];

		// Find crypto markets in Polymarket
		const polymarketCrypto = this.findCryptoMarkets(polymarketMarkets);
		for (const { market, target } of polymarketCrypto) {
			const opp = await this.evaluateArbitrageOpportunity(
				market,
				target,
				"polymarket",
			);
			if (opp) opportunities.push(opp);
		}

		// Find crypto markets in Kalshi
		const kalshiCrypto = this.findCryptoMarkets(kalshiMarkets);
		for (const { market, target } of kalshiCrypto) {
			const opp = await this.evaluateArbitrageOpportunity(
				market,
				target,
				"kalshi",
			);
			if (opp) opportunities.push(opp);
		}

		// Sort by difference percentage
		opportunities.sort((a, b) => b.differencePercent - a.differencePercent);

		return opportunities;
	}

	/**
	 * Evaluate a single arbitrage opportunity
	 */
	private async evaluateArbitrageOpportunity(
		market: PredictionMarket,
		target: CryptoTarget,
		venue: "polymarket" | "kalshi",
	): Promise<CryptoArbitrageOpportunity | null> {
		const deribitQuote = await this.findMatchingOption(target);
		if (!deribitQuote) return null;

		// Get prediction market probability
		let predictionProb = 0.5;
		if (market.outcomePrices) {
			if (typeof market.outcomePrices === "string") {
				try {
					const prices = JSON.parse(market.outcomePrices);
					predictionProb = parseFloat(prices[0]) || 0.5;
				} catch {
					// Use default
				}
			} else if (Array.isArray(market.outcomePrices)) {
				predictionProb = parseFloat(String(market.outcomePrices[0])) || 0.5;
			}
		}

		if (venue === "kalshi" && market.yes_bid !== undefined) {
			predictionProb = market.yes_bid / 100;
		}

		const priceDifference = deribitQuote.impliedProbability - predictionProb;
		const differencePercent = Math.abs(priceDifference) * 100;

		// Only report if difference is significant (> 3%)
		if (differencePercent < 3) return null;

		const cheaperVenue = priceDifference > 0 ? "prediction" : "deribit";

		const predictionQuote: VenueQuote = {
			venue,
			instrumentId: market.id,
			instrumentName: market.question || market.title || market.id,
			yesProbability: predictionProb,
			yesAsk: market.yes_ask ? market.yes_ask / 100 : predictionProb + 0.01,
			yesBid: market.yes_bid ? market.yes_bid / 100 : predictionProb - 0.01,
			noAsk: market.no_ask ? market.no_ask / 100 : 1 - predictionProb + 0.01,
			noBid: market.no_bid ? market.no_bid / 100 : 1 - predictionProb - 0.01,
			volume: market.volume || 0,
			liquidity: market.liquidity || 0,
			timestamp: Date.now(),
			raw: market,
		};

		// Create matched event for this opportunity
		const normalizedQuestion = `${target.currency}:${target.direction}:${target.targetPrice}:${target.targetDate.toISOString().split("T")[0]}`;
		const eventId = Bun.randomUUIDv5(
			normalizedQuestion,
			CRYPTO_PREDICTION_NAMESPACE,
		);

		const matchedEvent: MatchedEvent = {
			id: eventId,
			description: target.originalQuestion,
			normalizedQuestion,
			category: "crypto",
			resolutionDate: target.targetDate.toISOString(),
			quotes: [predictionQuote],
			confidence: 0.85,
			keywords: [
				target.currency.toLowerCase(),
				`$${target.targetPrice}`,
				target.direction,
			],
		};

		return {
			id: `crypto-arb-${eventId}-${Date.now()}`,
			event: matchedEvent,
			target,
			predictionQuote,
			optionsQuote: deribitQuote,
			priceDifference,
			differencePercent,
			cheaperVenue,
			action: {
				venue: cheaperVenue,
				side: "buy",
				rationale:
					priceDifference > 0
						? `Options imply ${(deribitQuote.impliedProbability * 100).toFixed(1)}% probability, but ${venue} prices at ${(predictionProb * 100).toFixed(1)}%. Buy on ${venue}.`
						: `${venue} prices at ${(predictionProb * 100).toFixed(1)}%, but options imply ${(deribitQuote.impliedProbability * 100).toFixed(1)}%. Consider options strategy.`,
			},
			matchConfidence: 0.85 * target.extractionConfidence,
			detectedAt: Date.now(),
		};
	}

	/**
	 * Get stats about the matcher
	 */
	getStats(): {
		btcOptionsCount: number;
		ethOptionsCount: number;
		cacheAge: number;
		tickerCacheSize: number;
	} {
		return {
			btcOptionsCount: this.optionsCache.get("BTC")?.length || 0,
			ethOptionsCount: this.optionsCache.get("ETH")?.length || 0,
			cacheAge: Date.now() - this.lastFetch,
			tickerCacheSize: this.tickerCache.size,
		};
	}
}

/**
 * Create a new CryptoMatcher instance
 */
export function createCryptoMatcher(): CryptoMatcher {
	return new CryptoMatcher();
}

/**
 * Global crypto matcher instance
 */
export const globalCryptoMatcher = new CryptoMatcher();
