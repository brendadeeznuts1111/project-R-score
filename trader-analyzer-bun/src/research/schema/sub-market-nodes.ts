/**
 * Sub-Market Node Registry & Graph Schema
 * Research infrastructure for sub-market correlations and tension analysis
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-RESEARCH-NODES@0.1.0;instance-id=ORCA-RESEARCH-001;version=0.1.0}][PROPERTIES:{schema={value:"sub-market-nodes";@root:"ROOT-RESEARCH";@chain:["BP-GRAPH-DB","BP-TENSION-DETECTION"];@version:"0.1.0"}}][CLASS:SubMarketNodeSchema][#REF:v-0.1.0.BP.RESEARCH.NODES.1.0.A.1.1.ORCA.1.1]]
 */

import { Database } from "bun:sqlite";

/**
 * Complete SQLite schema for sub-market node research system
 */
export const nodeSchema = `
-- Sub-market nodes (each is a researchable entity)
CREATE TABLE IF NOT EXISTS sub_market_nodes (
  nodeId TEXT PRIMARY KEY, -- Format: "{eventId}:{marketId}:{bookmaker}:{period}"
  eventId TEXT NOT NULL,
  marketId TEXT NOT NULL,
  bookmaker TEXT NOT NULL,
  period TEXT CHECK(period IN ('full', 'first_half', 'second_half', 'q1', 'q2', 'q3', 'q4', 'first_quintile')),
  
  -- Node characteristics
  base_line_type TEXT CHECK(base_line_type IN ('spread', 'total', 'moneyline', 'prop')),
  parent_node_id TEXT, -- References full-game node (if applicable)
  
  -- Liquidity metrics
  implied_volume REAL, -- Derived from odds movement depth
  number_of_moves INTEGER DEFAULT 0, -- Activity score
  avg_move_interval_ms REAL,
  
  -- Movement metrics
  velocity REAL DEFAULT 0, -- Rate of line change
  juice_volatility REAL DEFAULT 0, -- Odds volatility
  arbitrage_pressure REAL DEFAULT 0, -- Pressure from arb opportunities
  
  -- Tension metrics (how "stressed" this node is)
  tension_score REAL GENERATED ALWAYS AS (
    (ABS(COALESCE(velocity, 0)) * 100) + 
    (ABS(COALESCE(juice_volatility, 0)) * 50) +
    (COALESCE(arbitrage_pressure, 0) * 200)
  ) STORED,
  
  -- Last state
  last_line REAL,
  last_odds REAL,
  last_move_timestamp INTEGER,
  
  -- Graph relationships (JSON array of edge IDs)
  edges TEXT, -- JSON array: ["edge_123", "edge_456"]
  
  -- Metadata
  sport TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  
  UNIQUE(eventId, marketId, bookmaker, period)
) STRICT;

-- Edge registry (relationships between nodes)
CREATE TABLE IF NOT EXISTS sub_market_edges (
  edgeId TEXT PRIMARY KEY, -- Format: "{fromNodeId}:{toNodeId}:{relationship}"
  fromNodeId TEXT NOT NULL REFERENCES sub_market_nodes(nodeId),
  toNodeId TEXT NOT NULL REFERENCES sub_market_nodes(nodeId),
  
  relationship_type TEXT CHECK(relationship_type IN (
    'parent_child',        -- Full game → Half time
    'correlated',          -- Moves together
    'anti_correlated',     -- Moves opposite
    'derivative',          -- Derived from another (team total from full total)
    'arbitrage_pair',      -- Creates arb opportunity
    'temporal_lead',       -- One leads the other (e.g., Asia leads US)
    'liquidity_sink'       -- One drains liquidity from another
  )),
  
  -- Relationship strength
  correlation_coefficient REAL, -- -1.0 to 1.0
  avg_lag_ms REAL, -- Positive = fromNode leads toNode
  confidence REAL DEFAULT 0.5, -- 0.0 to 1.0 (statistical significance)
  
  -- Last observed
  last_observed INTEGER DEFAULT (unixepoch()),
  
  -- Composite index for graph traversal
  UNIQUE(fromNodeId, toNodeId, relationship_type)
) STRICT;

-- Partial index: Only high-confidence edges
CREATE INDEX IF NOT EXISTS idx_strong_edges
ON sub_market_edges(relationship_type, last_observed)
WHERE confidence > 0.7;

-- Tension events (when nodes conflict)
CREATE TABLE IF NOT EXISTS sub_market_tension_events (
  tensionId INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId TEXT NOT NULL,
  involved_nodes TEXT NOT NULL, -- JSON array: ["node_123", "node_456"]
  tension_type TEXT CHECK(tension_type IN (
    'line_divergence',      -- Lines not mathematically consistent
    'liquidity_imbalance',  -- One node has 10x volume of related node
    'temporal_desync',      -- Related nodes moving out of sync
    'arbitrage_rupture',    -- Arb opportunity > 5%
    'bookmaker_confusion'   -- Same book has conflicting lines
  )),
  severity INTEGER CHECK(severity BETWEEN 1 AND 10), -- 1-10 scale
  detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER,
  
  -- Data snapshot
  snapshot TEXT, -- JSON: Full state at detection time
  
  -- Deduplication hash
  dedupe_hash TEXT UNIQUE,
  
  -- Research notes
  notes TEXT
) STRICT;

-- Index for real-time tension monitoring
CREATE INDEX IF NOT EXISTS idx_active_tension
ON sub_market_tension_events(eventId, detected_at)
WHERE resolved_at IS NULL;

-- Research log (human-annotated patterns)
CREATE TABLE IF NOT EXISTS research_pattern_log (
  patternId TEXT PRIMARY KEY,
  discovered_at INTEGER NOT NULL DEFAULT (unixepoch()),
  analyst_id TEXT,
  
  -- Pattern description
  pattern_name TEXT NOT NULL,
  sport TEXT,
  market_hierarchy TEXT, -- e.g., "full_game:total → first_half:total"
  
  -- Statistical signature
  pre_conditions TEXT, -- JSON: Conditions that must be met
  trigger_signature TEXT, -- JSON: What line movement looks like
  
  -- Outcome
  expected_outcome TEXT, -- "second_half:total moves 0.5 points within 10m"
  observed_outcome TEXT, -- JSON: Actual results from backtesting
  
  -- Validation
  backtest_accuracy REAL DEFAULT 0, -- 0.0 to 1.0
  live_accuracy REAL DEFAULT 0,
  confidence_level REAL DEFAULT 0.5, -- 0.0 to 1.0
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_validated BOOLEAN DEFAULT FALSE
  
) STRICT;

-- Index for pattern search
CREATE INDEX IF NOT EXISTS idx_pattern_search
ON research_pattern_log(sport, is_active, backtest_accuracy);

-- Line movement micro-history (for correlation analysis)
CREATE TABLE IF NOT EXISTS line_movement_micro_v2 (
  movementId INTEGER PRIMARY KEY AUTOINCREMENT,
  nodeId TEXT NOT NULL REFERENCES sub_market_nodes(nodeId),
  timestamp INTEGER NOT NULL DEFAULT (unixepoch('now', 'subsec')),
  line REAL,
  odds REAL,
  movement REAL, -- Change from previous
  velocity REAL, -- Rate of change
  volume REAL, -- Implied volume from move
  parentMarket TEXT -- Reference to parent market if applicable
) STRICT;

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_movement_temporal
ON line_movement_micro_v2(nodeId, timestamp DESC);

-- Sub-market metadata (for hierarchy tracking)
CREATE TABLE IF NOT EXISTS sub_market_metadata (
  marketId TEXT PRIMARY KEY,
  parentMarket TEXT,
  marketType TEXT,
  period TEXT,
  sport TEXT,
  created_at INTEGER DEFAULT (unixepoch())
) STRICT;
`;

/**
 * Initialize research database schema
 */
export function initializeResearchSchema(
	dbPath: string = "data/research.db",
): Database {
	const db = new Database(dbPath);

	// Enable WAL mode for better concurrency
	db.exec("PRAGMA journal_mode = WAL");
	db.exec("PRAGMA synchronous = NORMAL");
	db.exec("PRAGMA foreign_keys = ON");

	// Create schema
	db.exec(nodeSchema);

	return db;
}

/**
 * Helper function to generate node ID
 */
export function generateNodeId(
	eventId: string,
	marketId: string,
	bookmaker: string,
	period: string,
): string {
	return `${eventId}:${marketId}:${bookmaker}:${period}`;
}

/**
 * Helper function to parse node ID
 */
export function parseNodeId(nodeId: string): {
	eventId: string;
	marketId: string;
	bookmaker: string;
	period: string;
} {
	const parts = nodeId.split(":");
	if (parts.length !== 4) {
		throw new Error(`Invalid node ID format: ${nodeId}`);
	}
	return {
		eventId: parts[0],
		marketId: parts[1],
		bookmaker: parts[2],
		period: parts[3],
	};
}

/**
 * Helper function to generate edge ID
 */
export function generateEdgeId(
	fromNodeId: string,
	toNodeId: string,
	relationshipType: string,
): string {
	return `${fromNodeId}:${toNodeId}:${relationshipType}`;
}
