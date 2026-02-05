/**
 * @fileoverview Edge Reliability Analyzer for Shadow-Graph System
 * @description Analyzes propagation reliability and latency patterns for shadow edges
 * @module arbitrage/shadow-graph/edge-reliability-analyzer
 */

import { Database } from "bun:sqlite";
import type { ShadowEdge } from "./types";

/**
 * Reliability analysis results
 */
export interface EdgeReliabilityAnalysis {
	reliabilityScore: number; // 0-1: ratio of movements that propagated
	avgLatency: number; // Average latency when propagation occurs
	latencyStdDev: number; // Standard deviation of latency
	totalMovements: number; // Total movements in dark node
	propagatedMovements: number; // Movements that propagated to visible node
	analysisWindowHours: number;
}

/**
 * Edge Reliability Analyzer
 *
 * Computes reliability scores and latency statistics for shadow edges
 * by analyzing historical line movement data
 */
export class EdgeReliabilityAnalyzer {
	constructor(private db: Database) {}

	/**
	 * Analyze reliability for a specific edge
	 *
	 * @param edge - Shadow edge to analyze
	 * @param windowHours - Hours of history to analyze (default: 24)
	 * @returns Reliability analysis results
	 */
	async analyzeEdge(
		edge: { fromNodeId: string; toNodeId: string; latencyMs: number | null },
		windowHours: number = 24,
	): Promise<EdgeReliabilityAnalysis> {
		const darkMovements = this.getMovements(edge.fromNodeId, windowHours);
		const visibleMovements = this.getMovements(edge.toNodeId, windowHours);

		let propagatedCount = 0;
		const latencies: number[] = [];

		// Expected latency window: avg ± 2 stddev, or fixed window
		const expectedLatencyWindow = edge.latencyMs
			? Math.max(30000, edge.latencyMs * 2) // At least 30s, or 2x avg latency
			: 60000; // Default 60s window

		// For each dark movement, check if there's a corresponding visible movement
		for (const darkMove of darkMovements) {
			const visibleMove = this.findCorrespondingMovement(
				darkMove,
				visibleMovements,
				expectedLatencyWindow,
			);

			if (visibleMove) {
				propagatedCount++;
				const latency = visibleMove.timestamp - darkMove.timestamp;
				latencies.push(latency);
			}
		}

		const reliabilityScore =
			darkMovements.length > 0 ? propagatedCount / darkMovements.length : 0;
		const avgLatency =
			latencies.length > 0
				? latencies.reduce((a, b) => a + b, 0) / latencies.length
				: 0;
		const latencyStdDev =
			latencies.length > 0 ? this.calculateStdDev(latencies, avgLatency) : 0;

		return {
			reliabilityScore,
			avgLatency,
			latencyStdDev,
			totalMovements: darkMovements.length,
			propagatedMovements: propagatedCount,
			analysisWindowHours: windowHours,
		};
	}

	/**
	 * Analyze all edges for an event and update database
	 *
	 * Computes reliability scores and updates shadow_edges table
	 */
	async analyzeAndUpdateAllEdges(
		eventId: string,
		windowHours: number = 24,
	): Promise<void> {
		console.log(`🔍 Analyzing edge reliability for event ${eventId}...`);

		// Get all edges for the event
		const edges = this.db
			.query<
				{
					edge_id: string;
					from_node_id: string;
					to_node_id: string;
					latency_ms: number | null;
				},
				[string]
			>(
				`SELECT e.edge_id, e.from_node_id, e.to_node_id, e.latency_ms
				 FROM shadow_edges e
				 JOIN shadow_nodes n1 ON e.from_node_id = n1.node_id
				 JOIN shadow_nodes n2 ON e.to_node_id = n2.node_id
				 WHERE n1.event_id = ?1 AND n2.event_id = ?1
				   AND n1.visibility IN ('dark', 'api_only')
				   AND n2.visibility = 'display'`,
			)
			.all(eventId);

		let updatedCount = 0;

		for (const edgeRow of edges) {
			const analysis = await this.analyzeEdge(
				{
					fromNodeId: edgeRow.from_node_id,
					toNodeId: edgeRow.to_node_id,
					latencyMs: edgeRow.latency_ms,
				},
				windowHours,
			);

			// Update edge in database
			this.db
				.prepare(
					`UPDATE shadow_edges 
					 SET reliability_score = ?, latency_stddev = ?
					 WHERE edge_id = ?`,
				)
				.run(analysis.reliabilityScore, analysis.latencyStdDev, edge.edgeId);

			updatedCount++;
		}

		console.log(`✅ Updated reliability scores for ${updatedCount} edges`);
	}

	/**
	 * Get line movements for a node
	 */
	private getMovements(
		nodeId: string,
		windowHours: number,
	): Array<{ timestamp: number; line: number; odds: number }> {
		const windowMs = windowHours * 60 * 60 * 1000;
		const cutoffTime = Date.now() - windowMs;

		return this.db
			.query<
				{ timestamp: number; line: number; odds: number },
				[string, number]
			>(
				`SELECT timestamp, line, odds 
				 FROM line_movements 
				 WHERE node_id = ?1 AND timestamp >= ?2
				 ORDER BY timestamp ASC`,
			)
			.all(nodeId, cutoffTime);
	}

	/**
	 * Find corresponding visible movement for a dark movement
	 *
	 * Looks for a movement in the visible node within the expected latency window
	 */
	private findCorrespondingMovement(
		darkMove: { timestamp: number; line: number; odds: number },
		visibleMovements: Array<{ timestamp: number; line: number; odds: number }>,
		latencyWindow: number,
	): { timestamp: number; line: number; odds: number } | null {
		// Look for movements in visible node within latency window
		for (const visibleMove of visibleMovements) {
			const timeDiff = visibleMove.timestamp - darkMove.timestamp;

			// Movement must be after dark movement and within latency window
			if (timeDiff >= 0 && timeDiff <= latencyWindow) {
				// Check if there's a significant line/odds change
				const lineChange = Math.abs(visibleMove.line - darkMove.line);
				const oddsChange = Math.abs(visibleMove.odds - darkMove.odds);

				// Consider it a propagation if there's a meaningful change
				if (lineChange > 0.1 || oddsChange > 0.01) {
					return visibleMove;
				}
			}
		}

		return null;
	}

	/**
	 * Calculate standard deviation
	 */
	private calculateStdDev(values: number[], mean: number): number {
		if (values.length === 0) return 0;

		const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
		const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
		return Math.sqrt(variance);
	}

	/**
	 * Get edges with low reliability scores
	 *
	 * Useful for identifying unreliable propagation paths
	 */
	getLowReliabilityEdges(
		eventId: string,
		threshold: number = 0.5,
	): Array<{
		edge_id: string;
		from_node_id: string;
		to_node_id: string;
		reliability_score: number;
		latency_ms: number | null;
	}> {
		return this.db
			.query<
				{
					edge_id: string;
					from_node_id: string;
					to_node_id: string;
					reliability_score: number;
					latency_ms: number | null;
				},
				[string, number]
			>(
				`SELECT e.edge_id, e.from_node_id, e.to_node_id, e.reliability_score, e.latency_ms
				 FROM shadow_edges e
				 JOIN shadow_nodes n1 ON e.from_node_id = n1.node_id
				 JOIN shadow_nodes n2 ON e.to_node_id = n2.node_id
				 WHERE n1.event_id = ?1 AND n2.event_id = ?1
				   AND e.reliability_score < ?2
				 ORDER BY e.reliability_score ASC`,
			)
			.all(eventId, threshold);
	}
}
