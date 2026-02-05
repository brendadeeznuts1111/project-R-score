#!/usr/bin/env bun
/**
 * @fileoverview Sub-Market Correlation Types
 * @description 6.1.1.2.2.8.1.1.2.8.1 - Type definitions for multi-dimensional sub-market correlation subsystem
 * @module api/routes/17.16.8-submarket-correlation-types
 *
 * @see {@link ../../../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../../../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

/**
 * 6.1.1.2.2.8.1.1.2.8.1.1: Represents an observed correlation between two specific market offerings.
 * Used within the SubMarketCorrelationMatrix.
 */
export interface CorrelationPair {
	/** The unique identifier of the source market offering. */
	sourceNodeId: string;
	/** The unique identifier of the target market offering. */
	targetNodeId: string;
	/** The observed statistical correlation coefficient (e.g., Pearson's r, Spearman's rho). */
	coefficient: number; // e.g., -1.0 to 1.0
	/** The p-value indicating the statistical significance of the correlation. */
	p_value: number;
	/** The calculated temporal lag in milliseconds from source movement to target response. */
	temporalLag_ms: number;
	/** The number of observed data points used to calculate this correlation. */
	observationCount: number;
	/** The timestamp when this correlation was last updated. */
	lastUpdated: number;
	/** Optional: Additional metadata about the correlation calculation method. */
	calculationMethod?: 'pearson' | 'spearman' | 'kendall';
	/** Optional: Source node exposure level for filtering. */
	sourceExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
	/** Optional: Target node exposure level for filtering. */
	targetExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
}

/**
 * 6.1.1.2.2.8.1.1.2.8.1.2: Attributes that provide context to a sub-market correlation,
 * enabling filtering and specific analysis.
 */
export interface ContextualCorrelationAttributes {
	/** Specific bookmaker for the source node, or 'ANY'. */
	sourceBookmaker?: string | 'ANY';
	/** Specific bookmaker for the target node, or 'ANY'. */
	targetBookmaker?: string | 'ANY';
	/** The market type of the source node (e.g., 'TOTAL_POINTS', 'SPREAD'). */
	sourceMarketType?: string;
	/** The market type of the target node. */
	targetMarketType?: string;
	/** The period segment of the source node (e.g., 'Q1', 'FULL_GAME'). */
	sourcePeriod?: string;
	/** The period segment of the target node. */
	targetPeriod?: string;
	/** The 'market_exposure_level' of the source node ('displayed', 'api_exposed', 'dark_pool'). */
	sourceExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
	/** The 'market_exposure_level' of the target node. */
	targetExposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
	/**
	 * Optional: An external event type that may influence correlation (e.g., 'player_injury', 'weather_change').
	 * References 13.2.1.1.0.0.0 ExternalEventContext.
	 */
	externalEventType?: string;
	/** Optional: Minimum correlation coefficient threshold. */
	minCoefficient?: number;
	/** Optional: Maximum p-value threshold for statistical significance. */
	maxPValue?: number;
	/** Optional: Minimum observation count threshold. */
	minObservationCount?: number;
}

/**
 * 6.1.1.2.2.8.1.1.2.8.1.3: A matrix (or graph) representing the multi-dimensional correlations
 * between various sub-market offerings.
 */
export interface SubMarketCorrelationMatrix {
	/** The unique identifier of the event for which the correlations are calculated. */
	eventId: string;
	/** The time window (in milliseconds) over which the correlations were observed. */
	observationWindow_ms: number;
	/** A collection of observed correlation pairs. */
	correlations: CorrelationPair[];
	/**
	 * Optional: Overall contextual attributes applied to this entire matrix calculation.
	 * @see 6.1.1.2.2.8.1.1.2.8.1.2 ContextualCorrelationAttributes
	 */
	contextAttributes?: ContextualCorrelationAttributes;
	/** The timestamp when this matrix was calculated. */
	calculatedAt: number;
	/** The total number of nodes analyzed. */
	totalNodesAnalyzed: number;
	/** The total number of pairs evaluated. */
	totalPairsEvaluated: number;
}

/**
 * Configuration for correlation calculation
 */
export interface CorrelationConfig {
	/** Time window in milliseconds for observation (default: 3600000 = 1 hour). */
	observationWindow_ms?: number;
	/** Minimum number of observations required for a valid correlation (default: 10). */
	minObservationCount?: number;
	/** Whether to include dark pool nodes in analysis (default: false). */
	includeDarkPools?: boolean;
	/** Maximum temporal lag in milliseconds to consider (default: 300000 = 5 minutes). */
	temporalLagMax_ms?: number;
	/** Statistical significance threshold (p-value, default: 0.05). */
	significanceThreshold?: number;
	/** Correlation method to use (default: 'pearson'). */
	correlationMethod?: 'pearson' | 'spearman' | 'kendall';
	/** Minimum correlation coefficient to include in results (default: 0.3). */
	minCoefficient?: number;
	/** Optional: Contextual attributes for filtering. */
	contextAttributes?: ContextualCorrelationAttributes;
}

/**
 * Market offering node structure (simplified for correlation engine)
 */
export interface MarketOfferingNode {
	nodeId: string;
	eventId: string;
	bookmaker: string;
	marketType?: string;
	period?: string;
	exposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
	parentNodeId?: string | null;
	lastUpdated: number;
}

/**
 * 6.1.1.2.2.8.1.1.2.8.2.4: Options for fractional/historical spread deviation calculation
 * Detects bait lines and subtle shifts by comparing historical/fractional spreads against mainline
 */
export interface FhSpreadDeviationOptions {
	/** Bookmakers to include in mainline calculation */
	bookmakers?: string[];
	/** Time range for historical mainline price (ms timestamps) */
	timeRange: { start: number; end: number };
	/** Methodology for mainline (Volume-Weighted Average Price) */
	mainlineMethod: 'VWAP' | 'median' | 'consensus';
	/** Threshold for significant deviation (e.g., 0.25 points) */
	deviationThreshold?: number;
	/** Spread type: 'point_spread', 'alternate_spread' */
	spreadType?: string;
	/** Period segment (e.g., 'FULL_GAME', 'H1', 'Q1') */
	period?: string;
}

/**
 * 6.1.1.2.2.8.1.1.2.8.2.4: Result of fractional/historical spread deviation calculation
 */
export interface FhSpreadDeviationResult {
	marketId: string;
	mainlinePrice: number; // e.g., -7.0 (consensus spread)
	mainlineSource: string; // "VWAP:DraftKings,FanDuel"
	deviationIndex: number; // +0.5 (off mainline)
	deviationPercentage: number; // 7.14%
	significantDeviationDetected: boolean;
	deviatingNodes: {
		nodeId: string;
		line: number;
		deviation: number; // Individual node deviation
		bookmaker: string;
		exposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
	}[];
	calculationTimestamp: number;
}
