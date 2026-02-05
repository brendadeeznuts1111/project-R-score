/**
 * @fileoverview 1.1.1.1.1.3.0: Hidden Steam Detector
 * @description Detects hidden steam (sharp money) movements
 * @module arbitrage/shadow-graph/hidden-steam-detector
 */

import type { HiddenSteamEvent, ShadowNode, ShadowGraph } from "./types";
import { NodeVisibility } from "./types";
import { LAG_THRESHOLD_SECONDS, DEVIATION_THRESHOLD } from "./shadow-graph-constants";

/**
 * Dark movement data
 */
interface DarkMovement {
	size: number; // Line movement size (e.g., 0.5 points)
	timestamp: number;
	betSize?: number;
	executionTimeMs?: number;
}

/**
 * Visible response data
 */
interface VisibleResponse {
	lagMs: number;
	moveSize?: number;
	timestamp: number;
}

/**
 * 1.1.1.1.1.3.4: Monitor-Hidden-Steam Loop
 *
 * ShadowSteamDetector class for detecting hidden steam (sharp money) movements
 * Monitors dark nodes and compares with visible counterparts to detect sharp money signals
 */
export class ShadowSteamDetector {
	private readonly LAG_THRESHOLD_MS = 30000; // 1.1.1.1.1.3.2: 30 seconds
	private readonly DEVIATION_THRESHOLD = 0.3; // 1.1.1.1.1.3.3: 30% correlation deviation

	constructor(
		private buildShadowGraph: (eventId: string) => Promise<ShadowGraph>,
		private getRecentMovement: (
			node: ShadowNode,
		) => Promise<DarkMovement | null>,
		private getVisibleResponse: (
			node: ShadowNode,
			timestamp: number,
		) => Promise<VisibleResponse | null>,
		private classifySharpMoney: (
			movement: DarkMovement,
		) => Promise<"confirmed" | "suspected" | "false">,
		private checkArbitrage: (
			darkNode: ShadowNode,
			visibleNode: ShadowNode,
		) => Promise<boolean>,
	) {}

	/**
	 * 1.1.1.1.1.3.4: Monitor-Hidden-Steam Loop
	 *
	 * Monitors for hidden steam events by comparing visible and hidden markets
	 */
	async monitorHiddenSteam(eventId: string): Promise<HiddenSteamEvent[]> {
		const events: HiddenSteamEvent[] = [];
		const shadowGraph = await this.buildShadowGraph(eventId);

		// Scan all dark nodes
		const darkNodes = Array.from(shadowGraph.nodes.values()).filter(
			(node) => node.visibility === NodeVisibility.DARK,
		);

		for (const darkNode of darkNodes) {
			// 1.1.1.1.1.3.5: Visible-Counterpart Resolver
			const visibleNode = this.findVisibleCounterpart(
				darkNode,
				shadowGraph.nodes,
			);
			if (!visibleNode) continue;

			// Check for movement in dark node
			const darkMovement = await this.getRecentMovement(darkNode);
			if (!darkMovement || darkMovement.size < 0.25) continue;

			// Check visible node response
			const visibleResponse = await this.getVisibleResponse(
				visibleNode,
				darkMovement.timestamp,
			);
			const lagMs = visibleResponse?.lagMs || Infinity;

			if (lagMs > this.LAG_THRESHOLD_MS) {
				// 1.1.1.1.1.3.6: Sharp-Money Classifier
				const sharpIndicator = await this.classifySharpMoney(darkMovement);

				// 1.1.1.1.1.3.7: Severity-Score Formula
				const severity = this.calculateSeverityScore(
					darkMovement.size,
					lagMs,
					darkNode.correlationDeviation,
					sharpIndicator,
				);

				if (severity >= 5) {
					events.push({
						eventId,
						hiddenNodeId: darkNode.nodeId,
						visibleNodeId: visibleNode.nodeId,
						detectedAt: Date.now(),
						severity,
						hiddenMoveSize: darkMovement.size,
						visibleLagMs: lagMs,
						correlationDeviation: darkNode.correlationDeviation,
						sharpMoneyIndicator: sharpIndicator,
						arbitrageOpportunity: await this.checkArbitrage(
							darkNode,
							visibleNode,
						),
					});
				}
			}
		}

		return events;
	}

	/**
	 * 1.1.1.1.1.3.5: Visible-Counterpart Resolver
	 *
	 * Finds the visible counterpart for a hidden node
	 */
	private findVisibleCounterpart(
		darkNode: ShadowNode,
		allNodes: Map<string, ShadowNode>,
	): ShadowNode | undefined {
		// Find node with same market but visible
		return Array.from(allNodes.values()).find(
			(node) =>
				node.marketId === darkNode.marketId &&
				node.visibility === NodeVisibility.DISPLAY &&
				node.bookmaker === darkNode.bookmaker,
		);
	}

	/**
	 * 1.1.1.1.1.3.7: Severity-Score Formula
	 *
	 * Calculates severity score for a hidden steam event
	 *
	 * Scoring breakdown:
	 * - Move size component: 0-4 points
	 * - Lag component: 0-3 points
	 * - Deviation component: 0-2 points
	 * - Sharp money component: 0-1 points
	 * Total: 0-10 points
	 */
	private calculateSeverityScore(
		moveSize: number,
		lagMs: number,
		deviation: number,
		sharpIndicator: "confirmed" | "suspected" | "false",
	): number {
		let score = 0;

		// Move size component (0-4 points)
		if (moveSize >= 1.0) score += 4;
		else if (moveSize >= 0.5) score += 3;
		else if (moveSize >= 0.25) score += 2;
		else score += 1;

		// Lag component (0-3 points)
		if (lagMs >= 60000) score += 3;
		else if (lagMs >= 45000) score += 2;
		else if (lagMs >= 30000) score += 1;

		// Deviation component (0-2 points)
		if (deviation >= 0.4) score += 2;
		else if (deviation >= 0.3) score += 1;

		// Sharp money component (0-1 points)
		if (sharpIndicator === "confirmed") score += 1;

		return Math.min(score, 10);
	}
}

/**
 * 1.1.1.1.1.3.6: Sharp-Money Classifier
 *
 * Classifies whether a movement represents sharp money
 * (Kept as standalone function for backward compatibility)
 */
export function classifySharpMoney(
	node: ShadowNode,
	deviation: number,
): boolean {
	// Sharp money indicators:
	// 1. Large deviation from visible counterpart
	// 2. High liquidity (hidden or reserved)
	// 3. Not a bait line
	const hasHighDeviation = deviation > DEVIATION_THRESHOLD;
	const hasLiquidity =
		node.hiddenLiquidity > 1000 || node.reservedLiquidity > 1000;
	const isNotBait = !node.isBaitLine;

	return hasHighDeviation && hasLiquidity && isNotBait;
}

/**
 * Monitor hidden steam (standalone function for backward compatibility)
 */
export async function monitorHiddenSteam(
	visibleNodes: ShadowNode[],
	hiddenNodes: ShadowNode[],
	historicalData: Map<string, Array<{ timestamp: number; odds: number }>>,
): Promise<HiddenSteamEvent[]> {
	// Simplified implementation for backward compatibility
	const events: HiddenSteamEvent[] = [];

	for (const hiddenNode of hiddenNodes) {
		const visibleCounterpart = visibleNodes.find(
			(node) =>
				node.marketId === hiddenNode.marketId &&
				node.visibility === NodeVisibility.DISPLAY &&
				node.bookmaker !== hiddenNode.bookmaker,
		);

		if (visibleCounterpart) {
			const lagSeconds =
				Math.abs(hiddenNode.lastUpdated - visibleCounterpart.lastUpdated) /
				1000;
			const lagMs = lagSeconds * 1000;
			const deviation = hiddenNode.correlationDeviation;
			const sharpMoney = classifySharpMoney(hiddenNode, deviation);

			if (lagMs > 30000 || deviation > DEVIATION_THRESHOLD) {
				const severity = Math.min(
					10,
					Math.floor(lagSeconds / 10) +
						(deviation > 0.3 ? 3 : 0) +
						(sharpMoney ? 2 : 0),
				);

				if (severity >= 5) {
					events.push({
						eventId: hiddenNode.eventId,
						hiddenNodeId: hiddenNode.nodeId,
						visibleNodeId: visibleCounterpart.nodeId,
						detectedAt: Date.now(),
						severity,
						hiddenMoveSize: 0.5, // Default, would come from movement data
						visibleLagMs: lagMs,
						correlationDeviation: deviation,
						sharpMoneyIndicator: sharpMoney ? "confirmed" : "suspected",
						arbitrageOpportunity: false, // Would be calculated
					});
				}
			}
		}
	}

	return events;
}

/**
 * Find visible counterpart (standalone function for backward compatibility)
 */
export function findVisibleCounterpart(
	hiddenNode: ShadowNode,
	visibleNodes: ShadowNode[],
): ShadowNode | undefined {
	// Find node with same market ID but visible
	return visibleNodes.find(
		(node) =>
			node.marketId === hiddenNode.marketId &&
			node.visibility === NodeVisibility.DISPLAY &&
			node.bookmaker !== hiddenNode.bookmaker,
	);
}

/**
 * Calculate severity score (standalone function for backward compatibility)
 */
export function calculateSeverityScore(
	lagSeconds: number,
	deviation: number,
	sharpMoney: boolean,
): number {
	// Base score from lag (0-5)
	const lagScore = Math.min(5, (lagSeconds / LAG_THRESHOLD_SECONDS) * 5);

	// Deviation score (0-3)
	const deviationScore = Math.min(3, (deviation / DEVIATION_THRESHOLD) * 3);

	// Sharp money bonus (0-2)
	const sharpMoneyBonus = sharpMoney ? 2 : 0;

	return Math.min(10, lagScore + deviationScore + sharpMoneyBonus);
}
