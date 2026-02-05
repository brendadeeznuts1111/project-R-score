/**
 * @fileoverview Arbitrage Detection Types
 * @description Types for cross-market arbitrage detection in NEXUS
 * @module arbitrage/types
 */

import type { PredictionMarket } from "../types";

/**
 * Supported prediction market venues
 */
export type PredictionVenue = "polymarket" | "kalshi";

/**
 * Supported sports betting venues (from ORCA)
 */
export type SportsBettingVenue =
	| "pinnacle"
	| "ps3838"
	| "draftkings"
	| "fanduel"
	| "betmgm"
	| "caesars"
	| "betfair";

/**
 * Supported crypto derivatives venues
 */
export type CryptoVenue = "deribit" | "binance" | "bybit" | "okx";

/**
 * All supported venues
 */
export type Venue = PredictionVenue | SportsBettingVenue | CryptoVenue;

/**
 * Market category for unified event matching
 */
export type MarketCategory =
	| "crypto" // BTC/ETH price predictions
	| "politics" // Elections, policy
	| "sports" // Sports outcomes
	| "economics" // Fed rates, GDP, inflation
	| "weather" // Temperature, disasters
	| "entertainment" // Awards, media
	| "science" // Space, tech milestones
	| "other";

/**
 * Price quote from a specific venue
 */
export interface VenueQuote {
	/** Source venue */
	venue: Venue;
	/** Market/instrument identifier at this venue */
	instrumentId: string;
	/** Display name of the instrument */
	instrumentName: string;
	/** Implied probability (0-1) for YES outcome */
	yesProbability: number;
	/** Price to buy YES (0-1) */
	yesAsk: number;
	/** Price to sell YES (0-1) */
	yesBid: number;
	/** Price to buy NO (0-1) */
	noAsk: number;
	/** Price to sell NO (0-1) */
	noBid: number;
	/** Volume traded (USD equivalent) */
	volume: number;
	/** Available liquidity (USD equivalent) */
	liquidity: number;
	/** Last update timestamp */
	timestamp: number;
	/** Raw market data for reference */
	raw?: PredictionMarket;
}

/**
 * A matched event across multiple venues
 */
export interface MatchedEvent {
	/** Canonical event ID (ORCA-style UUIDv5) */
	id: string;
	/** Human-readable event description */
	description: string;
	/** Normalized question (for matching) */
	normalizedQuestion: string;
	/** Event category */
	category: MarketCategory;
	/** Resolution date/time */
	resolutionDate?: string;
	/** Quotes from each venue */
	quotes: VenueQuote[];
	/** Match confidence score (0-1) */
	confidence: number;
	/** Keywords used for matching */
	keywords: string[];
}

/**
 * Cross-market arbitrage opportunity
 */
export interface ArbitrageOpportunity {
	/** Unique opportunity ID */
	id: string;
	/** The matched event */
	event: MatchedEvent;
	/** Best venue to buy YES */
	buyYesVenue: VenueQuote;
	/** Best venue to buy NO (or sell YES) */
	buyNoVenue: VenueQuote;
	/** Price spread (absolute difference) */
	spread: number;
	/** Spread as percentage */
	spreadPercent: number;
	/** Expected value per $100 wagered */
	expectedValue: number;
	/** Whether this is a true arbitrage (guaranteed profit) */
	isArbitrage: boolean;
	/** Recommended position sizes */
	sizing: {
		yesAmount: number;
		noAmount: number;
		totalCapital: number;
		guaranteedProfit: number;
	};
	/** Time detected */
	detectedAt: number;
	/** Time last updated */
	updatedAt: number;
}

/**
 * Arbitrage scanner configuration
 */
export interface ArbitrageScannerConfig {
	/** Minimum spread to report (default: 0.02 = 2%) */
	minSpread?: number;
	/** Minimum liquidity requirement (default: $1000) */
	minLiquidity?: number;
	/** Categories to scan */
	categories?: MarketCategory[];
	/** Venues to include */
	venues?: Venue[];
	/** Poll interval in ms (default: 30000) */
	pollInterval?: number;
	/** Maximum age for cached quotes in ms (default: 60000) */
	maxQuoteAge?: number;
}

/**
 * Event matching criteria
 */
export interface MatchCriteria {
	/** Minimum similarity score (0-1) */
	minSimilarity: number;
	/** Keywords that must match */
	requiredKeywords?: string[];
	/** Category must match */
	categoryMustMatch: boolean;
	/** Resolution dates must be within this many days */
	maxDateDifferenceDays: number;
}

/**
 * Result of a market scan
 */
export interface ScanResult {
	/** All matched events found */
	matchedEvents: MatchedEvent[];
	/** Arbitrage opportunities detected */
	opportunities: ArbitrageOpportunity[];
	/** Scan metadata */
	meta: {
		scanTime: number;
		venuesScanned: Venue[];
		marketsAnalyzed: number;
		eventsMatched: number;
		opportunitiesFound: number;
	};
}
