/**
 * @fileoverview Real-Time Anomaly Streaming for Multi-Layer Correlation Graph
 * @description Stream anomalies as they are detected across layers
 * @module arbitrage/shadow-graph/multi-layer-streaming
 */

import { EventEmitter } from "events";
import type {
	MultiLayerGraph,
	HiddenEdge,
} from "./multi-layer-correlation-graph";
import type { Database } from "bun:sqlite";

/**
 * 1.1.1.1.4.5.6: Real-Time Anomaly Streaming
 */
export interface AnomalyStreamEvent {
	type:
		| "anomaly-detected"
		| "anomaly-updated"
		| "anomaly-verified"
		| "anomaly-expired";
	layer: number;
	anomaly: HiddenEdge;
	timestamp: number;
	metadata?: Record<string, any>;
}

/**
 * Stream configuration
 */
export interface StreamConfig {
	layers?: number[]; // Which layers to stream (default: all)
	minConfidence?: number; // Minimum confidence threshold
	maxLatency?: number; // Maximum latency in ms
	includeMetadata?: boolean;
}

/**
 * Real-Time Anomaly Streamer
 */
export class RealTimeAnomalyStreamer extends EventEmitter {
	private db: Database;
	private activeStreams: Map<string, NodeJS.Timeout> = new Map();
	private anomalyCache: Map<string, HiddenEdge> = new Map();

	constructor(db: Database) {
		super();
		this.db = db;
	}

	/**
	 * Start streaming anomalies for an event
	 */
	async startStreaming(
		eventId: string,
		graph: MultiLayerGraph,
		config: StreamConfig = {},
	): Promise<void> {
		const streamId = `stream-${eventId}-${Date.now()}`;

		// Clear existing stream if any
		if (this.activeStreams.has(eventId)) {
			this.stopStreaming(eventId);
		}

		// Initial detection
		await this.detectAndEmit(eventId, graph, config);

		// Set up periodic detection
		const interval = setInterval(async () => {
			await this.detectAndEmit(eventId, graph, config);
		}, 5000); // Check every 5 seconds

		this.activeStreams.set(eventId, interval);

		this.emit("stream-started", { eventId, streamId });
	}

	/**
	 * Stop streaming for an event
	 */
	stopStreaming(eventId: string): void {
		const interval = this.activeStreams.get(eventId);
		if (interval) {
			clearInterval(interval);
			this.activeStreams.delete(eventId);
			this.emit("stream-stopped", { eventId });
		}
	}

	/**
	 * Detect and emit anomalies
	 */
	private async detectAndEmit(
		eventId: string,
		graph: MultiLayerGraph,
		config: StreamConfig,
	): Promise<void> {
		const layers = config.layers || [1, 2, 3, 4];
		const minConfidence = config.minConfidence || 0.5;
		const maxLatency = config.maxLatency || Infinity;

		for (let i = 0; i < graph.detection_priority.length; i++) {
			const layer = 4 - i; // Inverse mapping
			if (!layers.includes(layer)) continue;

			const anomalies = await graph.detection_priority[i](graph);

			for (const anomaly of anomalies) {
				// Apply filters
				if (anomaly.confidence < minConfidence) continue;
				if (anomaly.latency > maxLatency) continue;

				// Check if new or updated
				const cacheKey = `${anomaly.source}-${anomaly.target}-${anomaly.layer}`;
				const cached = this.anomalyCache.get(cacheKey);

				if (!cached) {
					// New anomaly
					this.anomalyCache.set(cacheKey, anomaly);
					this.emit("anomaly-detected", {
						type: "anomaly-detected",
						layer: anomaly.layer,
						anomaly,
						timestamp: Date.now(),
						metadata: config.includeMetadata
							? this.getMetadata(anomaly)
							: undefined,
					} as AnomalyStreamEvent);
				} else if (this.hasAnomalyChanged(cached, anomaly)) {
					// Updated anomaly
					this.anomalyCache.set(cacheKey, anomaly);
					this.emit("anomaly-updated", {
						type: "anomaly-updated",
						layer: anomaly.layer,
						anomaly,
						timestamp: Date.now(),
						metadata: config.includeMetadata
							? this.getMetadata(anomaly)
							: undefined,
					} as AnomalyStreamEvent);
				}
			}
		}
	}

	/**
	 * Check if anomaly has changed significantly
	 */
	private hasAnomalyChanged(old: HiddenEdge, current: HiddenEdge): boolean {
		return (
			Math.abs(old.confidence - current.confidence) > 0.1 ||
			Math.abs(old.correlation - current.correlation) > 0.1 ||
			Math.abs(old.expected_propagation - current.expected_propagation) > 0.1
		);
	}

	/**
	 * Get metadata for anomaly
	 */
	private getMetadata(anomaly: HiddenEdge): Record<string, any> {
		return {
			sourceType: anomaly.source.split(":")[0],
			targetType: anomaly.target.split(":")[0],
			edgeType: anomaly.type,
			confidenceLevel: this.getConfidenceLevel(anomaly.confidence),
			riskLevel: this.getRiskLevel(anomaly),
		};
	}

	/**
	 * Get confidence level label
	 */
	private getConfidenceLevel(confidence: number): string {
		if (confidence >= 0.8) return "high";
		if (confidence >= 0.6) return "medium";
		return "low";
	}

	/**
	 * Get risk level
	 */
	private getRiskLevel(anomaly: HiddenEdge): string {
		const riskScore = anomaly.confidence * anomaly.expected_propagation;
		if (riskScore >= 0.5) return "high";
		if (riskScore >= 0.3) return "medium";
		return "low";
	}

	/**
	 * Verify anomaly (mark as verified)
	 */
	async verifyAnomaly(
		anomaly: HiddenEdge,
		accuracy: number,
		profit?: number,
	): Promise<void> {
		// Store verification in database
		const query = this.db.query(`
			INSERT INTO hidden_edge_verifications (
				edge_id, predicted_at, verified_at, prediction_accuracy, profit_captured
			) VALUES (?, ?, ?, ?, ?)
		`);

		query.run(
			`${anomaly.source}-${anomaly.target}`,
			anomaly.timestamp,
			Date.now(),
			accuracy,
			profit || 0,
		);

		this.emit("anomaly-verified", {
			type: "anomaly-verified",
			layer: anomaly.layer,
			anomaly,
			timestamp: Date.now(),
			metadata: { accuracy, profit },
		} as AnomalyStreamEvent);
	}

	/**
	 * Get active streams
	 */
	getActiveStreams(): string[] {
		return Array.from(this.activeStreams.keys());
	}

	/**
	 * Stop all streams
	 */
	stopAllStreams(): void {
		for (const eventId of this.activeStreams.keys()) {
			this.stopStreaming(eventId);
		}
	}
}
