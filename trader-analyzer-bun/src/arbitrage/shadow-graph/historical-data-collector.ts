/**
 * @fileoverview Historical Data Collector for Shadow-Graph System
 * @description Collects and stores historical snapshots of shadow graph and line movements
 * @module arbitrage/shadow-graph/historical-data-collector
 */

import { Database } from "bun:sqlite";
import type { ShadowNode, ShadowEdge } from "./types";
import { shadowNodeToRow, shadowEdgeToRow } from "./shadow-graph-database";

/**
 * Historical Data Collector
 *
 * Takes periodic snapshots of the shadow graph and records line movements
 * for analysis, prediction, and reliability scoring
 */
export class HistoricalDataCollector {
	private snapshotInterval?: ReturnType<typeof setInterval>;
	private readonly SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

	constructor(private db: Database) {}

	/**
	 * Start periodic snapshot collection
	 *
	 * Takes snapshots of the shadow graph at regular intervals
	 */
	startPeriodicSnapshots(): void {
		if (this.snapshotInterval) {
			console.warn("Periodic snapshots already running");
			return;
		}

		console.log(
			`📸 Starting periodic shadow graph snapshots (every ${this.SNAPSHOT_INTERVAL_MS / 1000}s)`,
		);

		this.snapshotInterval = setInterval(async () => {
			try {
				await this.takeSnapshotForAllActiveEvents();
			} catch (error) {
				console.error("Error taking periodic snapshot:", error);
			}
		}, this.SNAPSHOT_INTERVAL_MS);

		// Take initial snapshot
		this.takeSnapshotForAllActiveEvents().catch(console.error);
	}

	/**
	 * Stop periodic snapshot collection
	 */
	stopPeriodicSnapshots(): void {
		if (this.snapshotInterval) {
			clearInterval(this.snapshotInterval);
			this.snapshotInterval = undefined;
			console.log("📸 Stopped periodic shadow graph snapshots");
		}
	}

	/**
	 * Take snapshot for all active events
	 */
	async takeSnapshotForAllActiveEvents(): Promise<void> {
		const activeEvents = this.db
			.query<{ id: string }, []>(
				`SELECT id FROM events WHERE status IN ('scheduled', 'live')`,
			)
			.all();

		for (const event of activeEvents) {
			await this.takeSnapshot(event.id);
		}
	}

	/**
	 * Take snapshot of shadow graph for a specific event
	 *
	 * Stores current state of all nodes and edges in history tables
	 */
	async takeSnapshot(eventId: string): Promise<void> {
		const timestamp = Date.now();

		try {
			// Get current nodes for the event
			const nodeRows = this.db
				.query<
					{
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
						last_odds: number | null;
						is_bait_line: boolean;
						last_probe_success: boolean | null;
						bait_detection_count: number;
						parent_node_id: string | null;
						last_updated: number;
					},
					[string]
				>(`SELECT * FROM shadow_nodes WHERE event_id = ?1`)
				.all(eventId);

			// Get current edges for the event
			const edgeRows = this.db
				.query<
					{
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
					},
					[string]
				>(
					`SELECT e.* 
					 FROM shadow_edges e
					 JOIN shadow_nodes n1 ON e.from_node_id = n1.node_id
					 JOIN shadow_nodes n2 ON e.to_node_id = n2.node_id
					 WHERE n1.event_id = ?1 AND n2.event_id = ?1`,
				)
				.all(eventId);

			// Store nodes in history
			const insertNodeHistory = this.db.prepare(`
				INSERT INTO shadow_nodes_history (
					snapshot_timestamp, node_id, event_id, market_id, bookmaker,
					visibility, displayed_liquidity, hidden_liquidity, reserved_liquidity,
					expected_correlation, actual_correlation, correlation_deviation,
					last_odds, is_bait_line, last_probe_success, bait_detection_count,
					parent_node_id, last_updated
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			const insertNodeHistoryTransaction = this.db.transaction((nodes) => {
				for (const node of nodes) {
					insertNodeHistory.run(
						timestamp,
						node.node_id,
						node.event_id,
						node.market_id,
						node.bookmaker,
						node.visibility,
						node.displayed_liquidity,
						node.hidden_liquidity,
						node.reserved_liquidity,
						node.expected_correlation,
						node.actual_correlation,
						node.correlation_deviation,
						node.last_odds,
						node.is_bait_line ? 1 : 0,
						node.last_probe_success === null
							? null
							: node.last_probe_success
								? 1
								: 0,
						node.bait_detection_count,
						node.parent_node_id,
						node.last_updated,
					);
				}
			});

			insertNodeHistoryTransaction(nodeRows);

			// Store edges in history
			const insertEdgeHistory = this.db.prepare(`
				INSERT INTO shadow_edges_history (
					snapshot_timestamp, edge_id, from_node_id, to_node_id, edge_type,
					latency_ms, propagation_rate, hidden_arbitrage, last_arb_profit,
					arb_detection_count, reliability_score, latency_stddev
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			const insertEdgeHistoryTransaction = this.db.transaction((edges) => {
				for (const edge of edges) {
					insertEdgeHistory.run(
						timestamp,
						edge.edge_id,
						edge.from_node_id,
						edge.to_node_id,
						edge.edge_type,
						edge.latency_ms,
						edge.propagation_rate,
						edge.hidden_arbitrage ? 1 : 0,
						edge.last_arb_profit,
						edge.arb_detection_count,
						edge.reliability_score,
						edge.latency_stddev,
					);
				}
			});

			insertEdgeHistoryTransaction(edgeRows);

			console.log(
				`📸 Snapshot taken for event ${eventId}: ${nodeRows.length} nodes, ${edgeRows.length} edges`,
			);
		} catch (error) {
			console.error(`Error taking snapshot for event ${eventId}:`, error);
			throw error;
		}
	}

	/**
	 * Record a line movement for a shadow node
	 *
	 * Called whenever a node's line or odds change
	 */
	async recordLineMovement(
		nodeId: string,
		line: number,
		odds: number,
		movementSize: number = 0,
		betSize?: number,
		executionTimeMs?: number,
	): Promise<void> {
		try {
			this.db
				.prepare(
					`INSERT INTO line_movements 
					 (node_id, line, odds, timestamp, movement_size, bet_size, execution_time_ms)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.run(
					nodeId,
					line,
					odds,
					Date.now(),
					movementSize,
					betSize ?? null,
					executionTimeMs ?? null,
				);
		} catch (error) {
			console.error(`Error recording line movement for node ${nodeId}:`, error);
			throw error;
		}
	}

	/**
	 * Get historical line movements for a node
	 *
	 * @param nodeId - Shadow node ID
	 * @param windowHours - Hours of history to retrieve
	 * @returns Array of line movements
	 */
	getLineMovements(
		nodeId: string,
		windowHours: number = 24,
	): Array<{
		movement_id: number;
		node_id: string;
		line: number;
		odds: number;
		timestamp: number;
		movement_size: number;
		bet_size: number | null;
		execution_time_ms: number | null;
	}> {
		const windowMs = windowHours * 60 * 60 * 1000;
		const cutoffTime = Date.now() - windowMs;

		return this.db
			.query<
				{
					movement_id: number;
					node_id: string;
					line: number;
					odds: number;
					timestamp: number;
					movement_size: number;
					bet_size: number | null;
					execution_time_ms: number | null;
				},
				[string, number]
			>(
				`SELECT * FROM line_movements 
				 WHERE node_id = ?1 AND timestamp >= ?2
				 ORDER BY timestamp DESC`,
			)
			.all(nodeId, cutoffTime);
	}

	/**
	 * Get historical snapshots for an event
	 *
	 * @param eventId - Event ID
	 * @param windowHours - Hours of history to retrieve
	 * @returns Array of snapshot timestamps
	 */
	getSnapshotTimestamps(eventId: string, windowHours: number = 24): number[] {
		const windowMs = windowHours * 60 * 60 * 1000;
		const cutoffTime = Date.now() - windowMs;

		return this.db
			.query<{ snapshot_timestamp: number }, [string, number]>(
				`SELECT DISTINCT snapshot_timestamp 
				 FROM shadow_nodes_history 
				 WHERE event_id = ?1 AND snapshot_timestamp >= ?2
				 ORDER BY snapshot_timestamp DESC`,
			)
			.all(eventId, cutoffTime)
			.map((row) => row.snapshot_timestamp);
	}
}
