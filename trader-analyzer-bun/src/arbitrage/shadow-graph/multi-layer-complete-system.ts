/**
 * @fileoverview Complete Multi-Layer System Integration
 * @description Complete system integration for multi-layer correlation analysis
 * @module arbitrage/shadow-graph/multi-layer-complete-system
 */

import { Database } from "bun:sqlite";
import { EnhancedMultiLayerCorrelationGraph } from "./multi-layer-enhanced-graph";
import type {
	EnhancedMultiLayerGraph,
	HiddenEdge,
	RiskAssessment,
} from "./multi-layer-enhanced-types";
import { PropagationPredictionEngine } from "./propagation-prediction-engine";

/**
 * Complete Analysis Result
 */
export interface CompleteAnalysis {
	success: boolean;
	analysisId: string;
	summary: {
		layersAnalyzed: number;
		anomaliesDetected: number;
		hiddenEdgesFound: number;
		tradingSignalsGenerated: number;
		analysisTimeMs: number;
	};
}

/**
 * Trading Signal
 */
export interface TradingSignal {
	signal_id: string;
	edge_id: string;
	type: "buy" | "sell" | "hedge";
	confidence: number;
	profit_potential: number;
	risk_score: number;
	execution_window_ms: number;
	timestamp: number;
}

/**
 * Anomaly Detection Engine
 */
class AnomalyDetectionEngine {
	constructor(private db: Database) {}

	async detectAllLayerAnomalies(graph: EnhancedMultiLayerGraph): Promise<any[]> {
		// Extract all anomalies from the graph's hidden edges
		const anomalies: any[] = [];

		for (const edge of [
			...graph.hidden_edges.layer1_edges,
			...graph.hidden_edges.layer2_edges,
			...graph.hidden_edges.layer3_edges,
			...graph.hidden_edges.layer4_edges,
		]) {
			anomalies.push({
				anomaly_id: edge.edge_id,
				layer: edge.source_layer,
				type: edge.detection_method,
				confidence: edge.confidence,
				anomaly_score: edge.signal_strength,
				detected_at: Date.now(),
				metadata: {
					source: edge.source_node,
					target: edge.target_node,
					latency_ms: edge.latency_ms,
				},
			});
		}

		return anomalies;
	}
}

/**
 * Research Tool Manager
 */
class ResearchToolManager {
	constructor(private tools: any[]) {}

	async executeTool(toolName: string, args: any): Promise<any> {
		const tool = this.tools.find((t) => t.name === toolName);
		if (!tool) {
			throw new Error(`Tool ${toolName} not found`);
		}
		return await tool.execute(args);
	}
}

/**
 * Complete Multi-Layer System
 */
export class CompleteMultiLayerSystem {
	private graphBuilder: EnhancedMultiLayerCorrelationGraph;
	private anomalyDetector: AnomalyDetectionEngine;
	private propagationPredictor: PropagationPredictionEngine;
	private researchTools: ResearchToolManager;

	constructor(db: Database) {
		this.graphBuilder = new EnhancedMultiLayerCorrelationGraph(db);
		this.anomalyDetector = new AnomalyDetectionEngine(db);
		this.propagationPredictor = new PropagationPredictionEngine(db);
		this.researchTools = new ResearchToolManager([]);
	}

	/**
	 * Run complete analysis
	 */
	async runCompleteAnalysis(eventId: string): Promise<CompleteAnalysis> {
		const startTime = Date.now();

		// 1. Build multi-layer graph
		const graph = await this.graphBuilder.buildMultiLayerGraph(eventId);

		// 2. Detect anomalies in all layers
		const anomalies = await this.anomalyDetector.detectAllLayerAnomalies(graph);

		// 3. Extract hidden edges from anomalies (already in graph)
		const hiddenEdges = [
			...graph.hidden_edges.layer1_edges,
			...graph.hidden_edges.layer2_edges,
			...graph.hidden_edges.layer3_edges,
			...graph.hidden_edges.layer4_edges,
		];

		// 4. Predict propagation patterns (already in graph)
		const propagationPredictions = graph.propagation_predictions;

		// 5. Calculate risk assessments (already in graph)
		const riskAssessments = graph.hidden_edges.risk_assessments;

		// 6. Generate trading signals
		const tradingSignals = await this.generateTradingSignals(
			hiddenEdges,
			propagationPredictions,
			riskAssessments,
		);

		// 7. Store results
		await this.storeAnalysisResults({
			eventId,
			timestamp: Date.now(),
			graph,
			anomalies,
			hiddenEdges,
			propagationPredictions,
			riskAssessments,
			tradingSignals,
		});

		// 8. Stream to research dashboard
		await this.streamToDashboard({
			eventId,
			hiddenEdgeCount: hiddenEdges.length,
			highConfidenceEdges: hiddenEdges.filter((e) => e.confidence > 0.8).length,
			avgLatency: this.calculateAverageLatency(hiddenEdges),
			riskAdjustedReturn: this.calculateRiskAdjustedReturn(tradingSignals),
		});

		const analysisId = this.generateAnalysisId(eventId, Date.now());

		return {
			success: true,
			analysisId,
			summary: {
				layersAnalyzed: 4,
				anomaliesDetected: anomalies.length,
				hiddenEdgesFound: hiddenEdges.length,
				tradingSignalsGenerated: tradingSignals.length,
				analysisTimeMs: Date.now() - startTime,
			},
		};
	}

	/**
	 * Generate trading signals
	 */
	private async generateTradingSignals(
		hiddenEdges: HiddenEdge[],
		propagationPredictions: any,
		riskAssessments: RiskAssessment[],
	): Promise<TradingSignal[]> {
		const signals: TradingSignal[] = [];

		for (const edge of hiddenEdges) {
			const riskAssessment = riskAssessments.find((r) => r.edge_id === edge.edge_id);
			const riskScore = riskAssessment?.overall_risk || 0.5;

			// Only generate signals for high-confidence edges with positive profit potential
			if (edge.confidence > 0.7 && edge.profit_potential > 0) {
				signals.push({
					signal_id: `signal_${edge.edge_id}_${Date.now()}`,
					edge_id: edge.edge_id,
					type: edge.profit_potential > 0.05 ? "buy" : "hedge",
					confidence: edge.confidence,
					profit_potential: edge.profit_potential,
					risk_score: riskScore,
					execution_window_ms: edge.execution_window_ms,
					timestamp: Date.now(),
				});
			}
		}

		return signals;
	}

	/**
	 * Store analysis results
	 */
	private async storeAnalysisResults(results: {
		eventId: string;
		timestamp: number;
		graph: EnhancedMultiLayerGraph;
		anomalies: any[];
		hiddenEdges: HiddenEdge[];
		propagationPredictions: any;
		riskAssessments: RiskAssessment[];
		tradingSignals: TradingSignal[];
	}): Promise<void> {
		// Store in enhanced multi_layer_correlations_enhanced table
		const db = (this.graphBuilder as any).db as Database;
		const analysisId = this.generateAnalysisId(results.eventId, results.timestamp);

		// Compress layer data (simplified - would use actual compression)
		const layer1Data = Buffer.from(JSON.stringify(results.graph.layer1));
		const layer2Data = Buffer.from(JSON.stringify(results.graph.layer2));
		const layer3Data = Buffer.from(JSON.stringify(results.graph.layer3));
		const layer4Data = Buffer.from(JSON.stringify(results.graph.layer4));

		const query = db.query(`
			INSERT INTO multi_layer_correlations_enhanced (
				id, event_id, created_at,
				layer1_data, layer2_data, layer3_data, layer4_data,
				total_nodes, total_edges, anomaly_count, avg_confidence,
				build_time_ms, memory_usage_mb
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		const avgConfidence =
			results.hiddenEdges.length > 0
				? results.hiddenEdges.reduce((sum, e) => sum + e.confidence, 0) /
					results.hiddenEdges.length
				: 0;

		query.run(
			analysisId,
			results.eventId,
			results.timestamp,
			layer1Data,
			layer2Data,
			layer3Data,
			layer4Data,
			0, // total_nodes - would calculate
			results.hiddenEdges.length,
			results.anomalies.length,
			avgConfidence,
			results.graph.build_time_ms,
			0, // memory_usage_mb - would measure
		);
	}

	/**
	 * Stream to dashboard
	 */
	private async streamToDashboard(data: {
		eventId: string;
		hiddenEdgeCount: number;
		highConfidenceEdges: number;
		avgLatency: number;
		riskAdjustedReturn: number;
	}): Promise<void> {
		// Placeholder - would stream to WebSocket or event bus
		console.log("📊 Dashboard Update:", data);
	}

	/**
	 * Calculate average latency
	 */
	private calculateAverageLatency(edges: HiddenEdge[]): number {
		if (edges.length === 0) return 0;
		return edges.reduce((sum, e) => sum + e.latency_ms, 0) / edges.length;
	}

	/**
	 * Calculate risk-adjusted return
	 */
	private calculateRiskAdjustedReturn(signals: TradingSignal[]): number {
		return signals.reduce(
			(sum, s) => sum + s.profit_potential * (1 - s.risk_score),
			0,
		);
	}

	/**
	 * Generate analysis ID
	 */
	private generateAnalysisId(eventId: string, timestamp: number): string {
		// Simple ID generation - would use uuidv5 in production
		return `analysis_${eventId}_${timestamp}`;
	}
}
