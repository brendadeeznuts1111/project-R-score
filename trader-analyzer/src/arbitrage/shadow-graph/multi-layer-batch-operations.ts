/**
 * @fileoverview Batch Database Operations for Multi-Layer Correlation Graph
 * @description Optimized batch inserts and queries
 * @module arbitrage/shadow-graph/multi-layer-batch-operations
 */

import { Database } from "bun:sqlite";
import type { HiddenEdge } from "./multi-layer-correlation-graph";

/**
 * Batch insert correlations
 */
export async function batchInsertCorrelations(
	db: Database,
	edges: HiddenEdge[],
	eventId: string,
): Promise<void> {
	if (edges.length === 0) return;

	const stmt = db.prepare(`
		INSERT INTO multi_layer_correlations (
			layer, event_id, source_node, target_node, correlation_type,
			correlation_score, latency_ms, expected_propagation,
			detected_at, confidence
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);

	const insertMany = db.transaction((edges: HiddenEdge[]) => {
		for (const edge of edges) {
			stmt.run(
				edge.layer,
				eventId,
				edge.source,
				edge.target,
				edge.type,
				edge.correlation,
				edge.latency,
				edge.expected_propagation,
				edge.timestamp,
				edge.confidence,
			);
		}
	});

	insertMany(edges);
}

/**
 * Batch insert with parameterized queries (prevents SQL injection)
 */
export async function batchInsertSafe(
	db: Database,
	table: string,
	rows: Array<Record<string, any>>,
): Promise<void> {
	if (rows.length === 0) return;

	const firstRow = rows[0];
	const columns = Object.keys(firstRow);
	const placeholders = columns.map(() => "?").join(", ");
	const columnNames = columns.join(", ");

	const stmt = db.prepare(`
		INSERT INTO ${table} (${columnNames})
		VALUES (${placeholders})
	`);

	const insertMany = db.transaction((rows: Array<Record<string, any>>) => {
		for (const row of rows) {
			const values = columns.map((col) => row[col]);
			stmt.run(...values);
		}
	});

	insertMany(rows);
}

/**
 * Bulk query nodes
 */
export async function bulkQueryNodes(
	db: Database,
	nodeIds: string[],
): Promise<Map<string, any>> {
	if (nodeIds.length === 0) return new Map();

	const placeholders = nodeIds.map(() => "?").join(", ");
	const query = db.query(`
		SELECT node_id, event_id, market_id, bookmaker, visibility,
		       displayed_liquidity, hidden_liquidity, last_odds
		FROM shadow_nodes
		WHERE node_id IN (${placeholders})
	`);

	const results = query.all(...nodeIds) as Array<{
		node_id: string;
		event_id: string;
		market_id: string;
		bookmaker: string;
		visibility: string;
		displayed_liquidity: number;
		hidden_liquidity: number;
		last_odds: number | null;
	}>;

	const nodeMap = new Map<string, any>();
	for (const result of results) {
		nodeMap.set(result.node_id, result);
	}

	return nodeMap;
}
