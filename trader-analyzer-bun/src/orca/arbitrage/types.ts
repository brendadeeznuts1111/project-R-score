/**
 * @fileoverview ORCA Arbitrage Types
 * @description Types for sports betting arbitrage detection and execution
 * @module orca/arbitrage/types
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ORCA-ARBITRAGE-TYPES@0.1.0;instance-id=ORCA-ARB-TYPES-001;version=0.1.0}]
 * [PROPERTIES:{types={value:"orca-arbitrage-types";@root:"ROOT-ORCA";@chain:["BP-TYPESCRIPT","BP-ARBITRAGE"];@version:"0.1.0"}}]
 * [CLASS:OrcaArbitrageTypes]
 * [#REF:v-0.1.0.BP.ORCA.ARBITRAGE.TYPES.1.0.A.1.1.ORCA.1.1]]
 */

/**
 * Arbitrage execution status
 */
export type ArbitrageStatus =
	| "detected" // Just detected, not yet executed
	| "live" // Live opportunity with open size
	| "executed" // Successfully executed
	| "filled" // Partially filled
	| "expired" // Opportunity expired
	| "cancelled"; // Cancelled before execution

/**
 * Bookmaker/book type classification
 */
export type BookType = "sharp" | "soft" | "exchange";

/**
 * Bookmaker identifier
 */
export type Bookmaker =
	| "pinnacle"
	| "ps3838"
	| "singbet"
	| "orbit"
	| "matchbook"
	| "betisn"
	| "betfair"
	| "polymarket"
	| "draftkings"
	| "fanduel"
	| "betmgm"
	| "caesars"
	| "other";

/**
 * Market outcome path (e.g., "1X2 Home Win", "Total Over 168.5")
 */
export interface OutcomePath {
	/** Market type (e.g., "1X2", "total", "moneyline", "player-props") */
	type: string;
	/** Outcome description (e.g., "Home Win", "Over 168.5") */
	outcome: string;
	/** Full path string */
	full: string;
}

/**
 * Book quote for arbitrage calculation
 */
export interface BookQuote {
	/** Bookmaker identifier */
	book: Bookmaker;
	/** Book type (sharp/soft/exchange) */
	type: BookType;
	/** American odds (e.g., -106, +104) */
	americanOdds: number;
	/** Decimal odds (e.g., 1.943, 2.040) */
	decimalOdds: number;
	/** Implied probability (0-1) */
	impliedProbability: number;
	/** Available stake/liquidity */
	availableStake: number;
	/** Last update timestamp */
	timestamp: number;
}

/**
 * ORCA arbitrage opportunity
 */
export interface OrcaArbitrageOpportunity {
	/** Unique opportunity ID (UUIDv5) */
	id: string;
	/** Event UUIDv5 identifier */
	eventId: string;
	/** Event description (e.g., "Lakers @ Clippers") */
	eventDescription: string;
	/** Outcome path */
	outcomePath: OutcomePath;
	/** Sharp book quote (typically better odds) */
	bookA: BookQuote;
	/** Soft book/exchange quote */
	bookB: BookQuote;
	/** Calculated edge percentage */
	edge: number;
	/** Maximum stake detected */
	maxStakeDetected: number;
	/** Tension score (0-1, higher = more reliable) */
	tensionScore: number;
	/** Execution status */
	status: ArbitrageStatus;
	/** Amount filled/executed (if executed) */
	filledAmount?: number;
	/** Profit locked (if executed) */
	profitLocked?: number;
	/** Execution time in milliseconds (if executed) */
	executionTimeMs?: number;
	/** Number of accounts used (if executed) */
	accountsUsed?: number;
	/** Detected timestamp */
	detectedAt: number;
	/** Last updated timestamp */
	updatedAt: number;
	/** Expires at timestamp */
	expiresAt?: number;
}

/**
 * Book pair statistics
 */
export interface BookPairStats {
	/** Book A identifier */
	bookA: Bookmaker;
	/** Book B identifier */
	bookB: Bookmaker;
	/** Number of active arbitrage opportunities */
	activeArbs: number;
	/** Total size across all opportunities */
	totalSize: number;
	/** Average edge */
	averageEdge: number;
	/** Highest edge detected */
	highestEdge: number;
	/** Last update timestamp */
	lastUpdate: number;
}

/**
 * Arbitrage feed message (for WebSocket)
 */
export interface ArbitrageFeedMessage {
	/** Message type */
	type: "opportunity" | "update" | "executed" | "expired" | "stats";
	/** Opportunity data (if type is opportunity/update/executed) */
	opportunity?: OrcaArbitrageOpportunity;
	/** Book pair stats (if type is stats) */
	bookPairs?: BookPairStats[];
	/** Scan statistics */
	scanStats?: {
		/** Total markets scanned */
		marketsScanned: number;
		/** Opportunities detected */
		opportunitiesDetected: number;
		/** False positives */
		falsePositives: number;
		/** Scan timestamp */
		timestamp: number;
	};
	/** Timestamp */
	timestamp: number;
}

/**
 * Arbitrage filter criteria
 */
export interface ArbitrageFilter {
	/** Minimum edge percentage */
	minEdge?: number;
	/** Maximum edge percentage */
	maxEdge?: number;
	/** Minimum tension score */
	minTensionScore?: number;
	/** Minimum stake */
	minStake?: number;
	/** Bookmaker filters */
	bookmakers?: Bookmaker[];
	/** Status filters */
	status?: ArbitrageStatus[];
	/** Event ID filter */
	eventId?: string;
	/** Outcome path type filter */
	outcomeType?: string;
}

/**
 * Arbitrage query options
 */
export interface ArbitrageQueryOptions {
	/** Filter criteria */
	filter?: ArbitrageFilter;
	/** Sort field */
	sortBy?: "edge" | "stake" | "tensionScore" | "detectedAt" | "updatedAt";
	/** Sort order */
	sortOrder?: "asc" | "desc";
	/** Limit results */
	limit?: number;
	/** Offset for pagination */
	offset?: number;
}
