/**
 * @fileoverview Propagation Prediction Engine
 * @description Predicts how hidden edges propagate across layers
 * @module arbitrage/shadow-graph/propagation-prediction-engine
 */

import { Database } from "bun:sqlite";
import type {
	PropagationPath,
	HiddenEdge,
} from "./multi-layer-correlation-graph";

/**
 * Propagation Prediction Engine
 */
export class PropagationPredictionEngine {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Predict propagation path from source to target
	 */
	async predictPropagationPath(
		sourceNodeId: string,
		targetNodeId: string,
		maxDepth: number = 4,
	): Promise<PropagationPath[]> {
		const path: PropagationPath[] = [];
		const visited = new Set<string>();
		const queue: Array<{
			nodeId: string;
			depth: number;
			path: PropagationPath[];
		}> = [{ nodeId: sourceNodeId, depth: 0, path: [] }];

		while (queue.length > 0 && path.length < maxDepth) {
			const current = queue.shift()!;

			if (visited.has(current.nodeId) || current.depth >= maxDepth) {
				continue;
			}

			visited.add(current.nodeId);

			// Find edges from current node
			const edges = await this.findEdgesFromNode(current.nodeId);

			for (const edge of edges) {
				if (edge.target === targetNodeId) {
					// Found target
					const finalPath: PropagationPath = {
						source: current.nodeId,
						target: targetNodeId,
						layer: edge.layer,
						impact: this.calculateImpact(edge),
						latency: edge.latency,
						confidence: edge.confidence,
					};
					return [...current.path, finalPath];
				}

				if (!visited.has(edge.target)) {
					const step: PropagationPath = {
						source: current.nodeId,
						target: edge.target,
						layer: edge.layer,
						impact: this.calculateImpact(edge),
						latency: edge.latency,
						confidence: edge.confidence,
					};

					queue.push({
						nodeId: edge.target,
						depth: current.depth + 1,
						path: [...current.path, step],
					});
				}
			}
		}

		return path;
	}

	/**
	 * Find edges from a node
	 */
	private async findEdgesFromNode(nodeId: string): Promise<HiddenEdge[]> {
		const query = this.db.query(`
			SELECT * FROM multi_layer_correlations
			WHERE source_node = ?
			ORDER BY confidence DESC
			LIMIT 10
		`);

		const rows = query.all(nodeId) as any[];

		return rows.map((row) => ({
			type: row.correlation_type as HiddenEdge["type"],
			layer: row.layer,
			confidence: row.confidence,
			source: row.source_node,
			target: row.target_node,
			correlation: row.correlation_score,
			latency: row.latency_ms,
			expected_propagation: row.expected_propagation,
			timestamp: row.detected_at,
		}));
	}

	/**
	 * Calculate impact of an edge
	 */
	private calculateImpact(edge: HiddenEdge): number {
		// Impact = correlation * expected_propagation * confidence
		return edge.correlation * edge.expected_propagation * edge.confidence;
	}

	/**
	 * Predict propagation time
	 */
	async predictPropagationTime(path: PropagationPath[]): Promise<number> {
		return path.reduce((total, step) => total + step.latency, 0);
	}

	/**
	 * Predict final impact
	 */
	async predictFinalImpact(path: PropagationPath[]): Promise<number> {
		if (path.length === 0) return 0;

		// Compound impact through layers
		let impact = path[0].impact;
		for (let i = 1; i < path.length; i++) {
			impact *= path[i].confidence * path[i].impact;
		}

		return impact;
	}

	/**
	 * 1.1.1.1.4.5.3: Predict propagation of hidden edges across layers
	 */
	async predictPropagation(args: {
		sourceNode: string;
		targetLayer: number;
		horizon: number;
		includeConfidenceInterval?: boolean;
	}): Promise<Array<{
		targetNode: string;
		expectedLatencyMs: number;
		confidence: number;
		impactScore: number;
	}>> {
		const predictions: Array<{
			targetNode: string;
			expectedLatencyMs: number;
			confidence: number;
			impactScore: number;
		}> = [];

		// Find all edges from source node that lead to target layer
		const query = this.db.query(`
			SELECT target_node, latency_ms, confidence, correlation_score, expected_propagation
			FROM multi_layer_correlations
			WHERE source_node = ?
				AND layer = ?
				AND detected_at > unixepoch('now', '-${args.horizon / 1000} seconds')
			ORDER BY confidence DESC
			LIMIT 50
		`);

		const edges = query.all(args.sourceNode, args.targetLayer) as Array<{
			target_node: string;
			latency_ms: number;
			confidence: number;
			correlation_score: number;
			expected_propagation: number;
		}>;

		for (const edge of edges) {
			const impactScore =
				edge.correlation_score * edge.expected_propagation * edge.confidence;

			predictions.push({
				targetNode: edge.target_node,
				expectedLatencyMs: edge.latency_ms,
				confidence: edge.confidence,
				impactScore,
			});
		}

		// If confidence interval requested, add bounds
		if (args.includeConfidenceInterval) {
			// Add confidence intervals (simplified - would calculate from historical data)
			for (const pred of predictions) {
				(pred as any).confidenceInterval = [
					Math.max(0, pred.confidence - 0.1),
					Math.min(1, pred.confidence + 0.1),
				];
			}
		}

		return predictions;
	}
}
