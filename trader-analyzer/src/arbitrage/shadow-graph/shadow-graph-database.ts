/**
 * @fileoverview 1.1.1.1.1.1.1: Shadow-Graph Database Schema
 * @description Database initialization and utilities for shadow-graph system
 * @module arbitrage/shadow-graph/database
 */

import { Database } from "bun:sqlite";
import type {
	ShadowNode,
	ShadowEdge,
	ShadowNodeRow,
	ShadowEdgeRow,
} from "./types";
import { NodeVisibility } from "./types";

/**
 * Initialize shadow-graph database schema
 */
export function initializeShadowGraphDatabase(db: Database): void {
	// 1.1.1.1.1.1.1: Shadow-Graph Schema - Nodes
	db.exec(`
		CREATE TABLE IF NOT EXISTS shadow_nodes (
			node_id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			market_id TEXT NOT NULL,
			bookmaker TEXT NOT NULL,
			
			-- 1.1.1.1.1.1.2: Node Visibility Enumeration
			visibility TEXT NOT NULL CHECK(visibility IN ('display', 'api_only', 'dark')),
			
			-- 1.1.1.1.1.1.3: Liquidity-Depth Tuple
			displayed_liquidity REAL DEFAULT 0,
			hidden_liquidity REAL DEFAULT 0,
			reserved_liquidity REAL DEFAULT 0,
			
			-- 1.1.1.1.1.1.4: Correlation-Deviation Metric
			expected_correlation REAL DEFAULT 0.5,
			actual_correlation REAL DEFAULT 0,
			correlation_deviation REAL GENERATED ALWAYS AS (ABS(expected_correlation - actual_correlation)) STORED,
			
			-- Last known odds/price
			last_odds REAL,
			
			-- 1.1.1.1.1.1.5: Bait-Line Boolean
			is_bait_line BOOLEAN DEFAULT FALSE,
			last_probe_success BOOLEAN,
			bait_detection_count INTEGER DEFAULT 0,
			
			-- Edge metadata
			parent_node_id TEXT,
			last_updated INTEGER
		)
	`);

	// 1.1.1.1.1.1.6: Edge Latency & Propagation-Rate
	// 1.1.1.1.1.1.7: Hidden-Arbitrage Flag
	db.exec(`
		CREATE TABLE IF NOT EXISTS shadow_edges (
			edge_id TEXT PRIMARY KEY,
			from_node_id TEXT NOT NULL,
			to_node_id TEXT NOT NULL,
			
			edge_type TEXT CHECK(edge_type IN ('visible', 'dark', 'temporal_lag')),
			latency_ms REAL,
			propagation_rate REAL DEFAULT 0,
			
			hidden_arbitrage BOOLEAN DEFAULT FALSE,
			last_arb_profit REAL,
			arb_detection_count INTEGER DEFAULT 0,
			
			-- Reliability analysis columns
			reliability_score REAL DEFAULT 0,
			latency_stddev REAL DEFAULT 0,
			
			FOREIGN KEY (from_node_id) REFERENCES shadow_nodes(node_id),
			FOREIGN KEY (to_node_id) REFERENCES shadow_nodes(node_id)
		)
	`);

	// Create indexes
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_visibility ON shadow_nodes(visibility, bookmaker);
		CREATE INDEX IF NOT EXISTS idx_bait ON shadow_nodes(is_bait_line, bookmaker);
		CREATE INDEX IF NOT EXISTS idx_arb ON shadow_edges(hidden_arbitrage, last_arb_profit DESC);
		CREATE INDEX IF NOT EXISTS idx_propagation ON shadow_edges(propagation_rate DESC, latency_ms);
	`);

	// Events table (referenced by foreign key)
	db.exec(`
		CREATE TABLE IF NOT EXISTS events (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			sport TEXT,
			start_time INTEGER,
			status TEXT DEFAULT 'scheduled',
			created_at INTEGER DEFAULT (strftime('%s', 'now'))
		)
	`);

	// 1.1.1.1.4.4.1: Multi-Layer Correlation Storage Schema (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS multi_layer_correlations_enhanced (
			id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			layer1_data BLOB NOT NULL,
			layer2_data BLOB NOT NULL,
			layer3_data BLOB NOT NULL,
			layer4_data BLOB NOT NULL,
			total_nodes INTEGER NOT NULL,
			total_edges INTEGER NOT NULL,
			anomaly_count INTEGER NOT NULL,
			avg_confidence REAL NOT NULL,
			build_time_ms INTEGER NOT NULL,
			memory_usage_mb INTEGER NOT NULL,
			FOREIGN KEY (event_id) REFERENCES events(id)
		)
	`);

	// Legacy multi_layer_correlations table (for backward compatibility)
	db.exec(`
		CREATE TABLE IF NOT EXISTS multi_layer_correlations (
			correlation_id INTEGER PRIMARY KEY AUTOINCREMENT,
			layer INTEGER NOT NULL CHECK(layer IN (1, 2, 3, 4)),
			event_id TEXT NOT NULL,
			source_node TEXT NOT NULL,
			target_node TEXT NOT NULL,
			correlation_type TEXT NOT NULL CHECK(correlation_type IN ('cross_sport', 'cross_event', 'cross_market', 'direct_latency')),
			correlation_score REAL NOT NULL,
			latency_ms INTEGER NOT NULL,
			expected_propagation REAL NOT NULL,
			detected_at INTEGER NOT NULL,
			verified BOOLEAN DEFAULT FALSE,
			confidence REAL NOT NULL,
			FOREIGN KEY (event_id) REFERENCES events(id)
		)
	`);

	// 1.1.1.1.4.4.2: Cross-Event Edge History Table (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS cross_event_edges (
			edge_id TEXT PRIMARY KEY,
			event1_id TEXT NOT NULL,
			event2_id TEXT NOT NULL,
			sport1 TEXT NOT NULL,
			sport2 TEXT NOT NULL,
			correlation_strength REAL NOT NULL,
			lag_ms INTEGER NOT NULL,
			sample_size INTEGER NOT NULL,
			detection_method TEXT NOT NULL,
			confidence REAL NOT NULL,
			verified BOOLEAN DEFAULT FALSE,
			predictive_accuracy REAL,
			false_positive_count INTEGER DEFAULT 0,
			true_positive_count INTEGER DEFAULT 0,
			first_detected INTEGER NOT NULL,
			last_detected INTEGER NOT NULL,
			detection_count INTEGER DEFAULT 1,
			FOREIGN KEY (event1_id) REFERENCES events(id),
			FOREIGN KEY (event2_id) REFERENCES events(id)
		)
	`);

	// 1.1.1.1.4.4.3: Cross-Sport Correlation Index (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS cross_sport_correlations (
			sport1 TEXT NOT NULL,
			sport2 TEXT NOT NULL,
			market1 TEXT NOT NULL,
			market2 TEXT NOT NULL,
			correlation REAL NOT NULL,
			lag_ms INTEGER NOT NULL,
			sample_size INTEGER NOT NULL,
			p_value REAL NOT NULL,
			time_of_day TEXT,
			day_of_week TEXT,
			season TEXT,
			hidden_signal_strength REAL,
			last_signal_detected INTEGER,
			signal_count INTEGER DEFAULT 0,
			predictive_power REAL,
			accuracy_30d REAL,
			PRIMARY KEY (sport1, sport2, market1, market2)
		)
	`);

	// Legacy cross_sport_index table (for backward compatibility)
	db.exec(`
		CREATE TABLE IF NOT EXISTS cross_sport_index (
			index_id INTEGER PRIMARY KEY AUTOINCREMENT,
			sport_a TEXT NOT NULL,
			sport_b TEXT NOT NULL,
			shared_entity TEXT NOT NULL,
			correlation_baseline REAL NOT NULL,
			games_played INTEGER DEFAULT 0,
			last_calculated INTEGER NOT NULL,
			UNIQUE(sport_a, sport_b, shared_entity)
		)
	`);

	// 1.1.1.1.4.4.4: Hidden Edge Verification Log (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS hidden_edge_verification (
			verification_id TEXT PRIMARY KEY,
			edge_id TEXT NOT NULL,
			verification_method TEXT NOT NULL,
			result TEXT NOT NULL CHECK(result IN ('confirmed', 'false_positive', 'inconclusive')),
			confidence REAL NOT NULL,
			verification_data TEXT, -- JSON
			verified_by TEXT,
			notes TEXT,
			verification_start INTEGER NOT NULL,
			verification_end INTEGER NOT NULL,
			duration_ms INTEGER GENERATED ALWAYS AS (verification_end - verification_start) STORED,
			FOREIGN KEY (edge_id) REFERENCES multi_layer_correlations(correlation_id)
		)
	`);

	// Legacy hidden_edge_verifications table (for backward compatibility)
	db.exec(`
		CREATE TABLE IF NOT EXISTS hidden_edge_verifications (
			verification_id INTEGER PRIMARY KEY AUTOINCREMENT,
			edge_id TEXT NOT NULL,
			predicted_at INTEGER NOT NULL,
			verified_at INTEGER,
			prediction_accuracy REAL,
			profit_captured REAL,
			execution_ms INTEGER,
			FOREIGN KEY (edge_id) REFERENCES multi_layer_correlations(correlation_id)
		)
	`);

	// 1.1.1.1.4.4.5: Anomaly Detection Performance Metrics (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS anomaly_performance (
			detector_id TEXT PRIMARY KEY,
			detector_type TEXT NOT NULL CHECK(detector_type IN ('layer1', 'layer2', 'layer3', 'layer4')),
			true_positives INTEGER DEFAULT 0,
			false_positives INTEGER DEFAULT 0,
			false_negatives INTEGER DEFAULT 0,
			precision REAL GENERATED ALWAYS AS (
				CAST(true_positives AS REAL) / 
				NULLIF(true_positives + false_positives, 0)
			) STORED,
			recall REAL GENERATED ALWAYS AS (
				CAST(true_positives AS REAL) / 
				NULLIF(true_positives + false_negatives, 0)
			) STORED,
			f1_score REAL GENERATED ALWAYS AS (
				2 * precision * recall / NULLIF(precision + recall, 0)
			) STORED,
			avg_detection_time_ms REAL,
			peak_memory_usage_mb REAL,
			last_calibrated INTEGER,
			calibration_interval_hours INTEGER DEFAULT 24
		)
	`);

	// Legacy anomaly_detection_metrics table (for backward compatibility)
	db.exec(`
		CREATE TABLE IF NOT EXISTS anomaly_detection_metrics (
			metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
			layer INTEGER NOT NULL CHECK(layer IN (1, 2, 3, 4)),
			detection_timestamp INTEGER NOT NULL,
			anomalies_detected INTEGER NOT NULL,
			false_positives INTEGER DEFAULT 0,
			true_positives INTEGER DEFAULT 0,
			execution_time_ms INTEGER NOT NULL,
			confidence_avg REAL,
			confidence_stddev REAL
		)
	`);

	// 1.1.1.1.4.4.6: Multi-Layer Snapshot System (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS ml_snapshots (
			snapshot_id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			timestamp INTEGER NOT NULL,
			snapshot_data BLOB NOT NULL,
			compression_ratio REAL,
			original_size_bytes INTEGER,
			compressed_size_bytes INTEGER,
			layers_included TEXT NOT NULL,
			anomaly_count INTEGER,
			hidden_edge_count INTEGER,
			access_count INTEGER DEFAULT 0,
			last_accessed INTEGER,
			avg_retrieval_time_ms REAL,
			retention_days INTEGER DEFAULT 30,
			expires_at INTEGER GENERATED ALWAYS AS (timestamp + retention_days * 86400000) STORED,
			FOREIGN KEY (event_id) REFERENCES events(id)
		)
	`);

	// Legacy multi_layer_snapshots table (for backward compatibility)
	db.exec(`
		CREATE TABLE IF NOT EXISTS multi_layer_snapshots (
			snapshot_id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			snapshot_timestamp INTEGER NOT NULL,
			layer1_edges INTEGER DEFAULT 0,
			layer2_edges INTEGER DEFAULT 0,
			layer3_edges INTEGER DEFAULT 0,
			layer4_edges INTEGER DEFAULT 0,
			total_anomalies INTEGER DEFAULT 0,
			high_confidence_anomalies INTEGER DEFAULT 0,
			FOREIGN KEY (event_id) REFERENCES events(id)
		)
	`);

	// Snapshot graphs storage
	db.exec(`
		CREATE TABLE IF NOT EXISTS snapshot_graphs (
			snapshot_id TEXT PRIMARY KEY,
			event_id TEXT NOT NULL,
			graph_data TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (event_id) REFERENCES events(id)
		)
	`);

	// 1.1.1.1.4.4.7: Correlation Decay Tracking (Enhanced)
	db.exec(`
		CREATE TABLE IF NOT EXISTS correlation_decay (
			correlation_id TEXT PRIMARY KEY,
			source_node TEXT NOT NULL,
			target_node TEXT NOT NULL,
			layer TEXT NOT NULL,
			initial_correlation REAL NOT NULL,
			current_correlation REAL NOT NULL,
			decay_rate REAL NOT NULL,
			decay_type TEXT NOT NULL CHECK(decay_type IN ('linear', 'exponential', 'step')),
			half_life_hours REAL,
			last_measured INTEGER NOT NULL,
			measurement_count INTEGER DEFAULT 1,
			stability_score REAL,
			below_threshold BOOLEAN DEFAULT FALSE,
			last_alert_sent INTEGER,
			FOREIGN KEY (correlation_id) REFERENCES multi_layer_correlations(correlation_id)
		)
	`);

	// Legacy correlation_decay_tracking table (for backward compatibility)
	db.exec(`
		CREATE TABLE IF NOT EXISTS correlation_decay_tracking (
			tracking_id INTEGER PRIMARY KEY AUTOINCREMENT,
			correlation_id INTEGER NOT NULL,
			timestamp INTEGER NOT NULL,
			correlation_value REAL NOT NULL,
			decay_rate REAL,
			FOREIGN KEY (correlation_id) REFERENCES multi_layer_correlations(correlation_id)
		)
	`);

	// Create indexes for multi-layer tables
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_layer_detected ON multi_layer_correlations(layer, detected_at);
		CREATE INDEX IF NOT EXISTS idx_event_correlation ON multi_layer_correlations(event_id, correlation_score);
		CREATE INDEX IF NOT EXISTS idx_event_time ON multi_layer_correlations(event_id, detected_at) WHERE verified = FALSE;
		CREATE INDEX IF NOT EXISTS idx_ml_event_time ON multi_layer_correlations_enhanced(event_id, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_ml_anomaly_count ON multi_layer_correlations_enhanced(anomaly_count DESC);
		CREATE INDEX IF NOT EXISTS idx_cross_event_pair ON cross_event_edges(event1_id, event2_id);
		CREATE INDEX IF NOT EXISTS idx_cross_event_correlation ON cross_event_edges(correlation_strength DESC);
		CREATE INDEX IF NOT EXISTS idx_cross_event_verified ON cross_event_edges(verified, confidence DESC);
		CREATE INDEX IF NOT EXISTS idx_cross_sport_correlation ON cross_sport_correlations(correlation DESC);
		CREATE INDEX IF NOT EXISTS idx_cross_sport_signal ON cross_sport_correlations(hidden_signal_strength DESC);
		CREATE INDEX IF NOT EXISTS idx_verification_edge ON hidden_edge_verification(edge_id);
		CREATE INDEX IF NOT EXISTS idx_verification_result ON hidden_edge_verification(result, confidence DESC);
		CREATE INDEX IF NOT EXISTS idx_performance_f1 ON anomaly_performance(f1_score DESC);
		CREATE INDEX IF NOT EXISTS idx_performance_detector ON anomaly_performance(detector_type, f1_score DESC);
		CREATE INDEX IF NOT EXISTS idx_snapshots_event_time ON ml_snapshots(event_id, timestamp DESC);
		CREATE INDEX IF NOT EXISTS idx_snapshots_expiry ON ml_snapshots(expires_at);
		CREATE INDEX IF NOT EXISTS idx_decay_stability ON correlation_decay(stability_score DESC);
		CREATE INDEX IF NOT EXISTS idx_decay_threshold ON correlation_decay(below_threshold, layer);
		CREATE INDEX IF NOT EXISTS idx_decay_rate ON correlation_decay(decay_rate DESC);
		-- Legacy indexes
		CREATE INDEX IF NOT EXISTS idx_cross_event_entities ON cross_event_edges(event1_id, event2_id);
		CREATE INDEX IF NOT EXISTS idx_cross_sport_shared ON cross_sport_index(sport_a, sport_b);
		CREATE INDEX IF NOT EXISTS idx_verification_edge_legacy ON hidden_edge_verifications(edge_id, verified_at);
		CREATE INDEX IF NOT EXISTS idx_metrics_layer ON anomaly_detection_metrics(layer, detection_timestamp);
		CREATE INDEX IF NOT EXISTS idx_snapshot_event ON multi_layer_snapshots(event_id, snapshot_timestamp);
		CREATE INDEX IF NOT EXISTS idx_decay_correlation ON correlation_decay_tracking(correlation_id, timestamp);
	`);

	// Historical snapshots of shadow graph
	db.exec(`
		CREATE TABLE IF NOT EXISTS shadow_nodes_history (
			snapshot_timestamp INTEGER NOT NULL,
			node_id TEXT NOT NULL,
			event_id TEXT NOT NULL,
			market_id TEXT NOT NULL,
			bookmaker TEXT NOT NULL,
			visibility TEXT NOT NULL CHECK(visibility IN ('display', 'api_only', 'dark')),
			displayed_liquidity REAL DEFAULT 0,
			hidden_liquidity REAL DEFAULT 0,
			reserved_liquidity REAL DEFAULT 0,
			expected_correlation REAL DEFAULT 0.5,
			actual_correlation REAL DEFAULT 0,
			correlation_deviation REAL DEFAULT 0,
			last_odds REAL,
			is_bait_line BOOLEAN DEFAULT FALSE,
			last_probe_success BOOLEAN,
			bait_detection_count INTEGER DEFAULT 0,
			parent_node_id TEXT,
			last_updated INTEGER,
			PRIMARY KEY (snapshot_timestamp, node_id)
		)
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS shadow_edges_history (
			snapshot_timestamp INTEGER NOT NULL,
			edge_id TEXT NOT NULL,
			from_node_id TEXT NOT NULL,
			to_node_id TEXT NOT NULL,
			edge_type TEXT CHECK(edge_type IN ('visible', 'dark', 'temporal_lag')),
			latency_ms REAL,
			propagation_rate REAL DEFAULT 0,
			hidden_arbitrage BOOLEAN DEFAULT FALSE,
			last_arb_profit REAL,
			arb_detection_count INTEGER DEFAULT 0,
			reliability_score REAL DEFAULT 0,
			latency_stddev REAL DEFAULT 0,
			PRIMARY KEY (snapshot_timestamp, edge_id)
		)
	`);

	// Line movements tracking
	db.exec(`
		CREATE TABLE IF NOT EXISTS line_movements (
			movement_id INTEGER PRIMARY KEY AUTOINCREMENT,
			node_id TEXT NOT NULL,
			line REAL NOT NULL,
			odds REAL NOT NULL,
			timestamp INTEGER NOT NULL,
			movement_size REAL DEFAULT 0,
			bet_size REAL,
			execution_time_ms INTEGER,
			FOREIGN KEY (node_id) REFERENCES shadow_nodes(node_id)
		)
	`);

	// Hidden node predictions
	db.exec(`
		CREATE TABLE IF NOT EXISTS hidden_node_predictions (
			prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_id TEXT NOT NULL,
			bookmaker TEXT NOT NULL,
			market_type TEXT NOT NULL,
			period TEXT NOT NULL,
			predicted_probability REAL NOT NULL,
			features TEXT NOT NULL,
			predicted_at INTEGER NOT NULL,
			verified BOOLEAN DEFAULT FALSE,
			verification_result BOOLEAN DEFAULT FALSE,
			verification_timestamp INTEGER,
			node_id TEXT
		)
	`);

	// Create indexes for new tables
	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_history_event ON shadow_nodes_history(event_id, snapshot_timestamp);
		CREATE INDEX IF NOT EXISTS idx_history_bookmaker ON shadow_nodes_history(bookmaker, snapshot_timestamp);
		CREATE INDEX IF NOT EXISTS idx_history_edge_event ON shadow_edges_history(from_node_id, snapshot_timestamp);
		CREATE INDEX IF NOT EXISTS idx_movements_node_time ON line_movements(node_id, timestamp DESC);
		CREATE INDEX IF NOT EXISTS idx_movements_timestamp ON line_movements(timestamp DESC);
		CREATE INDEX IF NOT EXISTS idx_predictions_event ON hidden_node_predictions(event_id, predicted_at DESC);
		CREATE INDEX IF NOT EXISTS idx_predictions_unverified ON hidden_node_predictions(verified, predicted_at DESC);
		CREATE INDEX IF NOT EXISTS idx_reliability ON shadow_edges(reliability_score DESC);
	`);

	// Public betting data (for RLM detection)
	db.exec(`
		CREATE TABLE IF NOT EXISTS public_betting_data (
			data_id INTEGER PRIMARY KEY AUTOINCREMENT,
			node_id TEXT NOT NULL,
			ticket_percent REAL NOT NULL,
			money_percent REAL NOT NULL,
			timestamp INTEGER NOT NULL,
			source TEXT,
			FOREIGN KEY (node_id) REFERENCES shadow_nodes(node_id),
			INDEX idx_public_node_time (node_id, timestamp DESC)
		)
	`);

	// Temporal patterns
	db.exec(`
		CREATE TABLE IF NOT EXISTS temporal_patterns (
			pattern_id INTEGER PRIMARY KEY AUTOINCREMENT,
			sport TEXT NOT NULL,
			hour_of_day INTEGER NOT NULL,
			day_of_week INTEGER NOT NULL,
			days_before_game INTEGER NOT NULL,
			hidden_steam_events INTEGER DEFAULT 0,
			sample_size INTEGER DEFAULT 0,
			UNIQUE(sport, hour_of_day, day_of_week, days_before_game)
		)
	`);

	// Hidden steam events (for temporal analysis)
	db.exec(`
		CREATE TABLE IF NOT EXISTS hidden_steam_events (
			event_id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_uuid TEXT NOT NULL,
			sport TEXT NOT NULL,
			timestamp INTEGER NOT NULL,
			severity REAL NOT NULL,
			INDEX idx_steam_sport_time (sport, timestamp DESC)
		)
	`);

	// Cross-event correlations
	db.exec(`
		CREATE TABLE IF NOT EXISTS cross_event_correlations (
			correlation_id INTEGER PRIMARY KEY AUTOINCREMENT,
			event_id_a TEXT NOT NULL,
			event_id_b TEXT NOT NULL,
			correlation_type TEXT NOT NULL,
			correlation_score REAL NOT NULL,
			last_updated INTEGER NOT NULL,
			UNIQUE(event_id_a, event_id_b, correlation_type),
			INDEX idx_corr_events (event_id_a, event_id_b)
		)
	`);

	// Behavioral signatures
	db.exec(`
		CREATE TABLE IF NOT EXISTS behavioral_signatures (
			signature_id INTEGER PRIMARY KEY AUTOINCREMENT,
			ip_hash TEXT NOT NULL,
			user_agent_hash TEXT NOT NULL,
			bot_likelihood REAL NOT NULL,
			first_seen INTEGER NOT NULL,
			last_seen INTEGER NOT NULL,
			UNIQUE(ip_hash, user_agent_hash),
			INDEX idx_signature_ip (ip_hash)
		)
	`);

	// Bet requests (for rate limiting analysis)
	db.exec(`
		CREATE TABLE IF NOT EXISTS bet_requests (
			request_id INTEGER PRIMARY KEY AUTOINCREMENT,
			ip_hash TEXT NOT NULL,
			timestamp INTEGER NOT NULL,
			node_id TEXT,
			INDEX idx_requests_ip_time (ip_hash, timestamp DESC)
		)
	`);
}

/**
 * Convert database row to ShadowNode
 */
export function rowToShadowNode(row: ShadowNodeRow): ShadowNode {
	return {
		nodeId: row.node_id,
		eventId: row.event_id,
		marketId: row.market_id,
		bookmaker: row.bookmaker,
		visibility: row.visibility as NodeVisibility,
		displayedLiquidity: row.displayed_liquidity,
		hiddenLiquidity: row.hidden_liquidity,
		reservedLiquidity: row.reserved_liquidity,
		expectedCorrelation: row.expected_correlation,
		actualCorrelation: row.actual_correlation,
		correlationDeviation: row.correlation_deviation,
		lastOdds: row.last_odds ?? undefined,
		isBaitLine: row.is_bait_line,
		lastProbeSuccess: row.last_probe_success,
		baitDetectionCount: row.bait_detection_count,
		parentNodeId: row.parent_node_id,
		lastUpdated: row.last_updated || Date.now(),
	};
}

/**
 * Convert ShadowNode to database row
 */
export function shadowNodeToRow(node: ShadowNode): ShadowNodeRow {
	return {
		node_id: node.nodeId,
		event_id: node.eventId,
		market_id: node.marketId,
		bookmaker: node.bookmaker,
		visibility: node.visibility,
		displayed_liquidity: node.displayedLiquidity,
		hidden_liquidity: node.hiddenLiquidity,
		reserved_liquidity: node.reservedLiquidity,
		expected_correlation: node.expectedCorrelation,
		actual_correlation: node.actualCorrelation,
		correlation_deviation: node.correlationDeviation,
		last_odds: node.lastOdds ?? null,
		is_bait_line: node.isBaitLine,
		last_probe_success: node.lastProbeSuccess,
		bait_detection_count: node.baitDetectionCount,
		parent_node_id: node.parentNodeId,
		last_updated: node.lastUpdated,
	};
}

/**
 * Convert database row to ShadowEdge
 */
export function rowToShadowEdge(row: ShadowEdgeRow): ShadowEdge {
	return {
		edgeId: row.edge_id,
		fromNodeId: row.from_node_id,
		toNodeId: row.to_node_id,
		edgeType: row.edge_type as "visible" | "dark" | "temporal_lag",
		latencyMs: row.latency_ms,
		propagationRate: row.propagation_rate,
		hiddenArbitrage: row.hidden_arbitrage,
		lastArbProfit: row.last_arb_profit,
		arbDetectionCount: row.arb_detection_count,
		reliabilityScore: row.reliability_score,
		latencyStdDev: row.latency_stddev,
	};
}

/**
 * Convert ShadowEdge to database row
 */
export function shadowEdgeToRow(edge: ShadowEdge): ShadowEdgeRow {
	return {
		edge_id: edge.edgeId,
		from_node_id: edge.fromNodeId,
		to_node_id: edge.toNodeId,
		edge_type: edge.edgeType,
		latency_ms: edge.latencyMs,
		propagation_rate: edge.propagationRate,
		hidden_arbitrage: edge.hiddenArbitrage,
		last_arb_profit: edge.lastArbProfit,
		arb_detection_count: edge.arbDetectionCount,
		reliability_score: edge.reliabilityScore ?? 0,
		latency_stddev: edge.latencyStdDev ?? 0,
	};
}

/**
 * Generate shadow node ID
 *
 * Format: event:market:bookmaker:period:visibility
 * Example: "nfl-2025-001:total_q1:draftkings:q1:dark"
 *
 * @param eventId - Event identifier (e.g., "nfl-2025-001")
 * @param marketId - Market identifier (e.g., "total_q1")
 * @param bookmaker - Bookmaker name (e.g., "draftkings")
 * @param period - Period identifier (e.g., "q1", "full", "live")
 * @param visibility - Node visibility state
 * @returns Formatted node ID string
 */
export function generateShadowNodeId(
	eventId: string,
	marketId: string,
	bookmaker: string,
	period: string,
	visibility: NodeVisibility,
): string {
	return `${eventId}:${marketId}:${bookmaker}:${period}:${visibility}`;
}

/**
 * Generate shadow edge ID
 *
 * Format: from_node_id:to_node_id
 * Example: "nfl-2025-001:total_q1:dk:q1:dark:nfl-2025-001:total_full:dk:full:display"
 *
 * @param fromNodeId - Source shadow node ID
 * @param toNodeId - Target shadow node ID
 * @returns Formatted edge ID string
 */
export function generateShadowEdgeId(
	fromNodeId: string,
	toNodeId: string,
): string {
	return `${fromNodeId}:${toNodeId}`;
}

/**
 * Parse shadow node ID into components
 *
 * @param nodeId - Shadow node ID to parse
 * @returns Parsed components or null if invalid format
 */
export function parseShadowNodeId(nodeId: string): {
	eventId: string;
	marketId: string;
	bookmaker: string;
	period: string;
	visibility: NodeVisibility;
} | null {
	const parts = nodeId.split(":");
	if (parts.length !== 5) {
		return null;
	}

	const [eventId, marketId, bookmaker, period, visibility] = parts;

	if (!Object.values(NodeVisibility).includes(visibility as NodeVisibility)) {
		return null;
	}

	return {
		eventId,
		marketId,
		bookmaker,
		period,
		visibility: visibility as NodeVisibility,
	};
}

/**
 * Generate node ID (backward compatibility alias)
 * @deprecated Use generateShadowNodeId instead
 */
export function generateNodeId(
	eventId: string,
	marketId: string,
	bookmaker: string,
	period: string,
	visibility: NodeVisibility,
): string {
	return generateShadowNodeId(eventId, marketId, bookmaker, period, visibility);
}

/**
 * Generate edge ID (backward compatibility alias)
 * @deprecated Use generateShadowEdgeId instead
 */
export function generateEdgeId(fromNodeId: string, toNodeId: string): string {
	return generateShadowEdgeId(fromNodeId, toNodeId);
}
