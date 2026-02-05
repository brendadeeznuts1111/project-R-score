/**
 * @fileoverview 1.1.1.1.1.5.0: Shadow Arbitrage Scanner
 * @description Scans shadow-graph for arbitrage opportunities
 * @module arbitrage/shadow-graph/shadow-arb-scanner
 */

import type {
	ShadowGraph,
	ShadowArbMatrix,
	ShadowArbEntry,
	ShadowNode,
	ShadowEdge,
} from "./types";
import {
	MIN_ARB_PROFIT,
	MIN_LIQUIDITY_CAPACITY,
	MAX_ARB_WINDOW_MS,
} from "./shadow-graph-constants";

/**
 * Shadow arbitrage opportunity interface
 */
export interface ShadowArbitrageOpportunity {
	edgeId: string;
	profit: number;
	capacity: number;
	windowMs: number;
	confidence: number;
	darkNode: ShadowNode;
	visibleNode: ShadowNode;
	detectedAt: number;
}

/**
 * 1.1.1.1.1.5.1: Shadow-Arb Matrix Class
 *
 * ShadowArbitrageScanner scans shadow-graph for hidden arbitrage opportunities
 * between dark/API-only nodes and visible display nodes
 */
export class ShadowArbitrageScanner {
	private shadowArbitrageOpportunities: ShadowArbitrageOpportunity[] = [];

	constructor(
		private buildShadowGraph: (eventId: string) => Promise<ShadowGraph>,
		private estimateArbWindow: (edge: ShadowEdge) => Promise<number>,
	) {}

	/**
	 * 1.1.1.1.1.5.2: Scan-Shadow-Arb Method
	 *
	 * Scans shadow-graph for arbitrage opportunities
	 * Returns opportunities sorted by profit (descending)
	 */
	async scanShadowArb(eventId: string): Promise<ShadowArbitrageOpportunity[]> {
		const graph = await this.buildShadowGraph(eventId);
		const opportunities: ShadowArbitrageOpportunity[] = [];

		// Find all hidden arbitrage edges
		const arbEdges = Array.from(graph.edges.values()).filter(
			(edge) => edge.hiddenArbitrage,
		);

		for (const edge of arbEdges) {
			// Parse edge ID: format is "from_node:to_node"
			// Edge ID format is "from_node_id:to_node_id" where node IDs are "event:market:bookmaker:period:visibility"
			// Since node IDs contain colons, we need to split carefully
			// The edge ID format ensures the last part before the final ':' is the separator
			// So we'll use sourceId and targetId directly from the edge
			const darkNode = graph.nodes.get(edge.sourceId);
			const visibleNode = graph.nodes.get(edge.targetId);

			// Try reverse direction if not found (edge might be bidirectional)
			const actualDarkNode = darkNode || graph.nodes.get(edge.targetId);
			const actualVisibleNode = visibleNode || graph.nodes.get(edge.sourceId);

			if (!actualDarkNode || !actualVisibleNode) continue;

			// Ensure we have dark and visible nodes
			const isDarkFirst =
				actualDarkNode.visibility === "dark" ||
				actualDarkNode.visibility === "api_only";
			const finalDarkNode = isDarkFirst ? actualDarkNode : actualVisibleNode;
			const finalVisibleNode = isDarkFirst ? actualVisibleNode : actualDarkNode;

			// Skip if both are not the right visibility types
			if (
				finalDarkNode.visibility !== "dark" &&
				finalDarkNode.visibility !== "api_only"
			) {
				continue;
			}
			if (finalVisibleNode.visibility !== "display") {
				continue;
			}

			// 1.1.1.1.1.5.3: True-Arb-Profit Weighting
			const profit = this.calculateTrueArbProfit(
				finalDarkNode,
				finalVisibleNode,
			);

			// 1.1.1.1.1.5.4: Liquidity-Capacity Clamp
			const capacity = this.calculateArbCapacity(
				finalDarkNode,
				finalVisibleNode,
			);

			// 1.1.1.1.1.5.5: Arb-Window Estimator
			const windowMs = await this.estimateArbWindow(edge);

			// 1.1.1.1.1.5.6: Confidence-Score Fusion
			const confidence = this.calculateConfidenceScore(
				edge,
				finalDarkNode,
				finalVisibleNode,
			);

			// 1% min profit, $100 min capacity
			if (profit > 0.01 && capacity > 100) {
				opportunities.push({
					edgeId: edge.id,
					profit,
					capacity,
					windowMs,
					confidence,
					darkNode: finalDarkNode,
					visibleNode: finalVisibleNode,
					detectedAt: Date.now(),
				});
			}
		}

		// 1.1.1.1.1.5.7: Descending-Profit Sort
		return opportunities.sort((a, b) => b.profit - a.profit);
	}

	/**
	 * 1.1.1.1.1.5.3: True-Arb-Profit Weighting
	 *
	 * Calculates true arbitrage profit weighted by liquidity depth
	 */
	private calculateTrueArbProfit(
		dark: ShadowNode,
		visible: ShadowNode,
	): number {
		// Weight by liquidity depth
		const darkImplied = this.impliedProbability(dark.lastOdds);
		const visibleImplied = this.impliedProbability(visible.lastOdds);

		const darkWeight = dark.hiddenLiquidity;
		const visibleWeight = visible.displayedLiquidity;
		const totalWeight = darkWeight + visibleWeight;

		if (totalWeight === 0) return 0;

		const weightedProb =
			(darkImplied * darkWeight + visibleImplied * visibleWeight) / totalWeight;
		return Math.max(0, 1 - weightedProb);
	}

	/**
	 * Calculate implied probability from odds
	 * If odds not available, use correlation as fallback
	 */
	private impliedProbability(odds?: number): number {
		if (odds && odds > 0) {
			// Convert odds to implied probability
			return 1 / odds;
		}
		// Fallback: use default probability if odds not available
		return 0.5;
	}

	/**
	 * 1.1.1.1.1.5.4: Liquidity-Capacity Clamp
	 *
	 * Calculates maximum arbitrage capacity
	 * Capacity limited by smaller liquidity pool
	 */
	private calculateArbCapacity(dark: ShadowNode, visible: ShadowNode): number {
		return Math.min(
			dark.hiddenLiquidity,
			visible.displayedLiquidity * 0.9, // 90% of displayed to avoid detection
		);
	}

	/**
	 * 1.1.1.1.1.5.5: Arb-Window Estimator
	 *
	 * Estimates how long the arbitrage window will remain open
	 */
	private async estimateArbWindowInternal(
		shadowEdge: ShadowEdge,
	): Promise<number> {
		return await this.estimateArbWindow(shadowEdge);
	}

	/**
	 * 1.1.1.1.1.5.6: Confidence-Score Fusion
	 *
	 * Calculates confidence score combining multiple factors
	 * Fusion of multiple confidence factors with weighted average
	 */
	private calculateConfidenceScore(
		edge: ShadowEdge,
		dark: ShadowNode,
		visible: ShadowNode,
	): number {
		// Fusion of multiple confidence factors
		const factors = {
			propagation: edge.latency.propagationRate || 0,
			correlation: dark.actualCorrelation || 0,
			liquidity: Math.min(
				dark.hiddenLiquidity / 100000, // Normalize
				visible.displayedLiquidity / 100000,
			),
			stability: Math.max(0, 1 - (edge.latency.latencyMs || 0) / 60000), // More stable = higher confidence
		};

		// Weighted average
		return Math.min(
			1,
			factors.propagation * 0.4 +
				factors.correlation * 0.3 +
				factors.liquidity * 0.2 +
				factors.stability * 0.1,
		);
	}

	/**
	 * Legacy scan method (for backward compatibility)
	 */
	scanShadowArbLegacy(graph: ShadowGraph): ShadowArbMatrix {
		const opportunities: ShadowArbEntry[] = [];

		// Iterate through all edges
		for (const edge of Array.from(graph.edges.values())) {
			if (!edge.hiddenArbitrage) continue;

			const sourceNode = graph.nodes.get(edge.sourceId);
			const targetNode = graph.nodes.get(edge.targetId);

			if (!sourceNode || !targetNode) continue;

			// Calculate true arbitrage profit
			const trueArbProfit = this.calculateTrueArbProfit(sourceNode, targetNode);

			if (trueArbProfit < MIN_ARB_PROFIT) continue;

			// Calculate liquidity capacity
			const liquidityCapacity = this.calculateLiquidityCapacity(
				sourceNode,
				targetNode,
			);

			if (liquidityCapacity < MIN_LIQUIDITY_CAPACITY) continue;

			// Estimate arbitrage window
			const arbWindowMs = this.estimateArbWindowSync(
				edge,
				sourceNode,
				targetNode,
			);

			// Calculate confidence score
			const confidenceScore = this.calculateConfidenceScore(
				edge,
				sourceNode,
				targetNode,
			);

			opportunities.push({
				id: `arb-${edge.id}-${Date.now()}`,
				sourceNodeId: sourceNode.nodeId,
				targetNodeId: targetNode.nodeId,
				trueArbProfit,
				liquidityCapacity,
				arbWindowMs,
				confidenceScore,
				timestamp: Date.now(),
			});
		}

		// Sort by profit (descending)
		opportunities.sort((a, b) => b.trueArbProfit - a.trueArbProfit);

		return {
			opportunities,
			totalCount: opportunities.length,
			scannedAt: Date.now(),
		};
	}

	/**
	 * Calculate liquidity capacity (legacy method)
	 */
	private calculateLiquidityCapacity(
		sourceNode: ShadowNode,
		targetNode: ShadowNode,
	): number {
		return (
			this.getMaxLiquidityAtOdds(sourceNode, 0) +
			this.getMaxLiquidityAtOdds(targetNode, 0)
		);
	}

	/**
	 * Get maximum liquidity at specific odds (legacy method)
	 */
	private getMaxLiquidityAtOdds(node: ShadowNode, targetOdds: number): number {
		return (
			node.displayedLiquidity + node.hiddenLiquidity + node.reservedLiquidity
		);
	}

	/**
	 * Estimate arbitrage window (synchronous fallback)
	 */
	private estimateArbWindowSync(
		edge: ShadowEdge,
		sourceNode: ShadowNode,
		targetNode: ShadowNode,
	): number {
		const latencyMs = edge.latency.latencyMs || 1000;
		const correlationStrength =
			1 -
			Math.max(
				sourceNode.correlationDeviation,
				targetNode.correlationDeviation,
			);
		const baseWindow = latencyMs * correlationStrength * 10;
		return Math.min(MAX_ARB_WINDOW_MS, Math.max(1000, baseWindow));
	}

	/**
	 * Get sorted opportunities (legacy method)
	 */
	getSortedOpportunities(): ShadowArbEntry[] {
		// Convert ShadowArbitrageOpportunity[] to ShadowArbEntry[]
		return this.shadowArbitrageOpportunities.map((opp) => ({
			id: opp.edgeId,
			sourceNodeId: opp.darkNode.nodeId,
			targetNodeId: opp.visibleNode.nodeId,
			trueArbProfit: opp.profit,
			liquidityCapacity: opp.capacity,
			arbWindowMs: opp.windowMs,
			confidenceScore: opp.confidence,
			timestamp: opp.detectedAt,
		})).sort((a, b) => b.trueArbProfit - a.trueArbProfit);
	}
}
