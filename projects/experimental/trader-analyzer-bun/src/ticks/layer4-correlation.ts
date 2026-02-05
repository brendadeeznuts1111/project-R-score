/**
 * @fileoverview Layer 4 Cross-Sport Tick Correlation
 * @description First platform to detect cross-sport arbitrage via tick microstructure
 * @module ticks/layer4-correlation
 * @version 1.0.0
 */

import type { TickCorrelationMetrics } from "./correlation-engine-17";

/**
 * Layer 4 anomaly detected from tick correlation
 */
export interface Layer4Anomaly {
	anomalyId: string;
	layer: number;
	source: string;
	target: string;
	detectionTime: number;
	confidence: number;
	strength: number; // Inverse of latency (lower latency = stronger signal)
	description: string;
}

/**
 * Layer 4 cross-sport tick correlation detector
 * 
 * Analyzes tick latency and correlation strength between cross-sport markets
 * to detect predictive signals (e.g., NFL spread ticks → NBA moneyline movement)
 */
export class Layer4TickCorrelationDetector {
	private tickCorrelationEngine: any; // TickCorrelationEngine17
	private multiLayerGraph: any; // ProfilingMultiLayerGraphSystem17

	constructor(tickCorrelationEngine: any, multiLayerGraph: any) {
		this.tickCorrelationEngine = tickCorrelationEngine;
		this.multiLayerGraph = multiLayerGraph;
	}

	/**
	 * Detect cross-sport tick correlations for an event
	 */
	async detectCrossSportTickCorrelations(
		sourceEventId: string,
		targetEventId: string
	): Promise<Layer4Anomaly | null> {
		// Get Layer 4 correlations (cross-sport links)
		const layer4Links = await this.getLayer4Links(sourceEventId, targetEventId);

		if (layer4Links.length === 0) {
			return null;
		}

		// Analyze tick latency for each cross-sport link
		const anomalies: Layer4Anomaly[] = [];

		for (const link of layer4Links) {
			const metrics = await this.tickCorrelationEngine.calculateTickCorrelations(
				link.sourceNodeId, // e.g., "NFL-2025-001-spread"
				link.targetNodeId,  // e.g., "NBA-2025-001-moneyline"
				60000 // 1-minute window
			);

			// High correlation strength + low latency = predictive signal
			if (metrics.tick_correlation_strength > 0.7 && metrics.avgTickLatency_ms < 100) {
				anomalies.push({
					anomalyId: `layer4-tick-${sourceEventId}-${targetEventId}-${Date.now()}`,
					layer: 4,
					source: link.sourceNodeId,
					target: link.targetNodeId,
					detectionTime: Date.now(),
					confidence: metrics.tick_correlation_strength,
					strength: 1 / metrics.avgTickLatency_ms, // Lower latency = stronger signal
					description: `Cross-sport tick correlation: ${metrics.avgTickLatency_ms}ms latency`
				});
			}
		}

		if (anomalies.length === 0) {
			return null;
		}

		// Return highest confidence anomaly
		return anomalies.sort((a, b) => b.confidence - a.confidence)[0];
	}

	/**
	 * Get Layer 4 links between two events (cross-sport correlations)
	 */
	private async getLayer4Links(
		sourceEventId: string,
		targetEventId: string
	): Promise<Array<{ sourceNodeId: string; targetNodeId: string }>> {
		// This would query the multi-layer graph system for Layer 4 links
		// For now, return mock structure
		// In production, this would call: this.multiLayerGraph.getLayer4Links(sourceEventId, targetEventId)
		
		return [
			{
				sourceNodeId: `${sourceEventId}-spread`,
				targetNodeId: `${targetEventId}-moneyline`
			}
		];
	}
}
