/**
 * @fileoverview 1.1.1.1.1.1.0: Shadow-Graph Types & Schema
 * @description Type definitions for shadow-graph arbitrage detection system
 * @module arbitrage/shadow-graph/types
 */

/**
 * 1.1.1.1.1.1.2: Node Visibility Enumeration
 */
export enum NodeVisibility {
	/** Visible in display/UI */
	DISPLAY = "display",
	/** Visible only in API (hidden from UI) */
	API_ONLY = "api_only",
	/** Not visible in either (dark liquidity) */
	DARK = "dark",
}

/**
 * 1.1.1.1.1.1.3: Liquidity-Depth Tuple
 *
 * Stored as separate fields in database:
 * - displayed_liquidity: Visible liquidity
 * - hidden_liquidity: API-only liquidity
 * - reserved_liquidity: Reserved/institutional liquidity
 */
export interface LiquidityDepth {
	/** Displayed liquidity (visible in UI) */
	displayed: number;
	/** Hidden liquidity (API-only) */
	hidden: number;
	/** Reserved liquidity (institutional) */
	reserved: number;
}

/**
 * 1.1.1.1.1.1.4: Correlation-Deviation Metric
 */
export interface CorrelationDeviation {
	/** Correlation coefficient (-1 to 1) */
	coefficient: number;
	/** Deviation from expected correlation */
	deviation: number;
	/** Statistical significance (p-value) */
	significance: number;
	/** Timestamp of measurement */
	timestamp: number;
}

/**
 * 1.1.1.1.1.1.6: Edge Latency & Propagation-Rate
 */
export interface EdgeLatency {
	/** Latency in milliseconds */
	latencyMs: number;
	/** Propagation rate (events per second) */
	propagationRate: number;
	/** Last measured timestamp */
	timestamp: number;
}

/**
 * 1.1.1.1.1.1.1: Shadow-Graph Node Schema
 *
 * Node ID format: event:market:bookmaker:period:visibility
 */
export interface ShadowNode {
	/** Unique node identifier (format: event:market:bookmaker:period:visibility) */
	nodeId: string;
	/** Event identifier */
	eventId: string;
	/** Market identifier */
	marketId: string;
	/** Bookmaker/exchange identifier */
	bookmaker: string;
	/** Visibility state (1.1.1.1.1.1.2) */
	visibility: NodeVisibility;
	/** Displayed liquidity (visible in UI) */
	displayedLiquidity: number;
	/** Hidden liquidity (API-only) */
	hiddenLiquidity: number;
	/** Reserved liquidity (institutional) */
	reservedLiquidity: number;
	/** Expected correlation coefficient */
	expectedCorrelation: number;
	/** Actual correlation coefficient */
	actualCorrelation: number;
	/** Correlation deviation (generated: ABS(expected - actual)) */
	correlationDeviation: number;
	/** Last known odds/price */
	lastOdds?: number;
	/** Whether this is a bait line (fake odds) (1.1.1.1.1.1.5) */
	isBaitLine: boolean;
	/** Last probe success status */
	lastProbeSuccess: boolean | null;
	/** Bait detection count */
	baitDetectionCount: number;
	/** Parent node ID (for hierarchical markets) */
	parentNodeId: string | null;
	/** Timestamp of last update */
	lastUpdated: number;
}

/**
 * 1.1.1.1.1.1.1: Shadow-Graph Edge Schema
 */
export interface ShadowEdge {
	/** Unique edge identifier */
	id: string;
	/** Source node ID */
	sourceId: string;
	/** Target node ID */
	targetId: string;
	/** Correlation deviation metric */
	correlationDeviation: CorrelationDeviation;
	/** Edge latency metrics */
	latency: EdgeLatency;
	/** Whether this edge represents hidden arbitrage */
	hiddenArbitrage: boolean;
	/** Arbitrage profit percentage */
	arbitrageProfit: number;
	/** Timestamp of last update */
	lastUpdate: number;
}

/**
 * 1.1.1.1.1.1.1: Shadow-Graph Schema
 */
export interface ShadowGraph {
	/** Graph nodes */
	nodes: Map<string, ShadowNode>;
	/** Graph edges */
	edges: Map<string, ShadowEdge>;
	/** Timestamp of graph creation */
	createdAt: number;
	/** Last update timestamp */
	updatedAt: number;
}

/**
 * Database row types matching SQL schema
 */
export interface ShadowNodeRow {
	node_id: string;
	event_id: string;
	market_id: string;
	bookmaker: string;
	visibility: string;
	displayed_liquidity: number;
	hidden_liquidity: number;
	reserved_liquidity: number;
	expected_correlation: number;
	actual_correlation: number;
	correlation_deviation: number;
	is_bait_line: boolean;
	last_probe_success: boolean | null;
	bait_detection_count: number;
	parent_node_id: string | null;
	last_updated: number | null;
}

export interface ShadowEdgeRow {
	edge_id: string;
	from_node_id: string;
	to_node_id: string;
	edge_type: string;
	latency_ms: number | null;
	propagation_rate: number;
	hidden_arbitrage: boolean;
	last_arb_profit: number | null;
	arb_detection_count: number;
	reliability_score: number;
	latency_stddev: number;
}

/**
 * 1.1.1.1.1.3.1: Hidden-Steam Event Interface
 */
export interface HiddenSteamEvent {
	/** Event identifier */
	eventId: string;
	/** Hidden node identifier */
	hiddenNodeId: string;
	/** Visible node identifier */
	visibleNodeId: string;
	/** Timestamp of detection */
	detectedAt: number;
	/** Severity score (0-10) */
	severity: number;
	/** Hidden move size (line movement in points) */
	hiddenMoveSize: number;
	/** Visible lag in milliseconds (1.1.1.1.1.3.2: Lag-Threshold Constant 30s) */
	visibleLagMs: number;
	/** Correlation deviation (1.1.1.1.1.3.3: Deviation-Threshold Constant 0.3) */
	correlationDeviation: number;
	/** Sharp money indicator */
	sharpMoneyIndicator: "confirmed" | "suspected" | "false";
	/** Whether arbitrage opportunity exists */
	arbitrageOpportunity: boolean;
}

/**
 * 1.1.1.1.1.5.1: Shadow-Arb Matrix Entry
 */
export interface ShadowArbEntry {
	/** Arbitrage opportunity ID */
	id: string;
	/** Source node ID */
	sourceNodeId: string;
	/** Target node ID */
	targetNodeId: string;
	/** True arbitrage profit percentage */
	trueArbProfit: number;
	/** Liquidity capacity (minimum of both sides) */
	liquidityCapacity: number;
	/** Estimated arbitrage window duration (ms) */
	arbWindowMs: number;
	/** Confidence score (0-1) */
	confidenceScore: number;
	/** Timestamp */
	timestamp: number;
}

/**
 * 1.1.1.1.1.5.1: Shadow-Arb Matrix
 */
export interface ShadowArbMatrix {
	/** Arbitrage opportunities */
	opportunities: ShadowArbEntry[];
	/** Total opportunities found */
	totalCount: number;
	/** Timestamp of scan */
	scannedAt: number;
}
