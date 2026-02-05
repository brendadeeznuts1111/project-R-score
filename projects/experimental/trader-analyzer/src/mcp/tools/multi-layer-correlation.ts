/**
 * @fileoverview MCP Tools for Multi-Layer Correlation Analysis
 * @description Research tools for multi-layer graph building and analysis
 * @module mcp/tools/multi-layer-correlation
 */

import { Database } from "bun:sqlite";
import { MultiLayerCorrelationGraph } from "../../arbitrage/shadow-graph/multi-layer-correlation-graph";
import { TimezoneService } from "../../core/timezone";
import { EnhancedMultiLayerCorrelationGraph } from "../../arbitrage/shadow-graph/multi-layer-enhanced-graph";
import { CompleteMultiLayerSystem } from "../../arbitrage/shadow-graph/multi-layer-complete-system";
import { PropagationPredictionEngine } from "../../arbitrage/shadow-graph/propagation-prediction-engine";
import {
	BuildGraphInputSchema,
	QueryLayerAnomaliesInputSchema,
	PredictPropagationInputSchema,
	FindCrossSportEdgesInputSchema,
	StreamAnomaliesInputSchema,
	GenerateVisualizationInputSchema,
	validateInput,
} from "../../arbitrage/shadow-graph/multi-layer-validation";
import { batchInsertCorrelations } from "../../arbitrage/shadow-graph/multi-layer-batch-operations";
import type { MCPServer } from "../../mcp/server";
import type {
	EnhancedMultiLayerGraph,
	HiddenEdge,
} from "../../arbitrage/shadow-graph/multi-layer-enhanced-types";
import { mcpToolLogger } from "../../utils/logger";

/**
 * Helper functions for visualization and analysis
 */

/**
 * Extract nodes for visualization
 */
async function extractNodesForVisualization(
	graph: EnhancedMultiLayerGraph,
	layers: number[],
): Promise<any[]> {
	const nodes: any[] = [];
	const nodeSet = new Set<string>();

	// Extract nodes from each layer
	if (layers.includes(1) && graph.layer1 && graph.layer1.direct_pairs) {
		for (const pair of graph.layer1.direct_pairs) {
			if (!nodeSet.has(pair.parent_market)) {
				nodes.push({ id: pair.parent_market, layer: 1, type: "parent" });
				nodeSet.add(pair.parent_market);
			}
			if (!nodeSet.has(pair.child_market)) {
				nodes.push({ id: pair.child_market, layer: 1, type: "child" });
				nodeSet.add(pair.child_market);
			}
		}
	}

	if (layers.includes(2)) {
		for (const pair of graph.layer2.market_pairs) {
			if (!nodeSet.has(pair.market1)) {
				nodes.push({ id: pair.market1, layer: 2, type: "market" });
				nodeSet.add(pair.market1);
			}
			if (!nodeSet.has(pair.market2)) {
				nodes.push({ id: pair.market2, layer: 2, type: "market" });
				nodeSet.add(pair.market2);
			}
		}
	}

	if (layers.includes(3) && graph.layer3 && graph.layer3.event_pairs) {
		for (const pair of graph.layer3.event_pairs) {
			if (!nodeSet.has(pair.event1_id)) {
				nodes.push({ id: pair.event1_id, layer: 3, type: "event" });
				nodeSet.add(pair.event1_id);
			}
			if (!nodeSet.has(pair.event2_id)) {
				nodes.push({ id: pair.event2_id, layer: 3, type: "event" });
				nodeSet.add(pair.event2_id);
			}
		}
	}

	if (layers.includes(4) && graph.layer4 && graph.layer4.sport_pairs) {
		for (const pair of graph.layer4.sport_pairs) {
			const nodeId1 = `${pair.sport1}:${pair.market1}`;
			const nodeId2 = `${pair.sport2}:${pair.market2}`;
			if (!nodeSet.has(nodeId1)) {
				nodes.push({ id: nodeId1, layer: 4, type: "sport" });
				nodeSet.add(nodeId1);
			}
			if (!nodeSet.has(nodeId2)) {
				nodes.push({ id: nodeId2, layer: 4, type: "sport" });
				nodeSet.add(nodeId2);
			}
		}
	}

	return nodes;
}

/**
 * Extract edges for visualization
 */
async function extractEdgesForVisualization(
	graph: EnhancedMultiLayerGraph,
	layers: number[],
): Promise<any[]> {
	const edges: any[] = [];

	if (layers.includes(1) && graph.layer1 && graph.layer1.direct_pairs) {
		for (const pair of graph.layer1.direct_pairs) {
			edges.push({
				source: pair.parent_market,
				target: pair.child_market,
				layer: 1,
				strength: pair.actual_correlation,
				type: "direct",
			});
		}
	}

	if (layers.includes(2) && graph.layer2 && graph.layer2.market_pairs) {
		for (const pair of graph.layer2.market_pairs) {
			edges.push({
				source: pair.market1,
				target: pair.market2,
				layer: 2,
				strength: pair.correlation_strength,
				type: "cross_market",
			});
		}
	}

	if (layers.includes(3) && graph.layer3 && graph.layer3.event_pairs) {
		for (const pair of graph.layer3.event_pairs) {
			edges.push({
				source: pair.event1_id,
				target: pair.event2_id,
				layer: 3,
				strength: pair.correlation_metrics?.combined || 0,
				type: "cross_event",
			});
		}
	}

	if (layers.includes(4) && graph.layer4 && graph.layer4.sport_pairs) {
		for (const pair of graph.layer4.sport_pairs) {
			edges.push({
				source: `${pair.sport1}:${pair.market1}`,
				target: `${pair.sport2}:${pair.market2}`,
				layer: 4,
				strength: pair.correlation_coefficient,
				type: "cross_sport",
			});
		}
	}

	// Add hidden edges
	for (const edge of [
		...graph.hidden_edges.layer1_edges,
		...graph.hidden_edges.layer2_edges,
		...graph.hidden_edges.layer3_edges,
		...graph.hidden_edges.layer4_edges,
	]) {
		const layerNum = parseInt(edge.source_layer.slice(-1));
		if (layers.includes(layerNum)) {
			edges.push({
				source: edge.source_node,
				target: edge.target_node,
				layer: layerNum,
				strength: edge.confidence,
				type: "hidden",
				hidden: true,
			});
		}
	}

	return edges;
}

/**
 * Count nodes in a specific layer
 */
function countNodesInLayer(graph: EnhancedMultiLayerGraph, layer: number): number {
	switch (layer) {
		case 1:
			if (!graph.layer1 || !graph.layer1.direct_pairs) return 0;
			return new Set([
				...graph.layer1.direct_pairs.map((p) => p.parent_market),
				...graph.layer1.direct_pairs.map((p) => p.child_market),
			]).size;
		case 2:
			if (!graph.layer2 || !graph.layer2.market_pairs) return 0;
			return new Set([
				...graph.layer2.market_pairs.map((p) => p.market1),
				...graph.layer2.market_pairs.map((p) => p.market2),
			]).size;
		case 3:
			if (!graph.layer3 || !graph.layer3.event_pairs) return 0;
			return new Set([
				...graph.layer3.event_pairs.map((p) => p.event1_id),
				...graph.layer3.event_pairs.map((p) => p.event2_id),
			]).size;
		case 4:
			if (!graph.layer4 || !graph.layer4.sport_pairs) return 0;
			return new Set([
				...graph.layer4.sport_pairs.map(
					(p) => `${p.sport1}:${p.market1}`,
				),
				...graph.layer4.sport_pairs.map(
					(p) => `${p.sport2}:${p.market2}`,
				),
			]).size;
		default:
			return 0;
	}
}

/**
 * Count edges in a specific layer
 */
function countEdgesInLayer(graph: EnhancedMultiLayerGraph, layer: number): number {
	switch (layer) {
		case 1:
			return graph.layer1?.direct_pairs?.length || 0;
		case 2:
			return graph.layer2?.market_pairs?.length || 0;
		case 3:
			return graph.layer3?.event_pairs?.length || 0;
		case 4:
			return graph.layer4?.sport_pairs?.length || 0;
		default:
			return 0;
	}
}

/**
 * Count anomalies in a specific layer
 */
function countAnomaliesInLayer(graph: EnhancedMultiLayerGraph, layer: number): number {
	if (!graph.hidden_edges) return 0;
	switch (layer) {
		case 1:
			return graph.hidden_edges.layer1_edges?.length || 0;
		case 2:
			return graph.hidden_edges.layer2_edges?.length || 0;
		case 3:
			return graph.hidden_edges.layer3_edges?.length || 0;
		case 4:
			return graph.hidden_edges.layer4_edges?.length || 0;
		default:
			return 0;
	}
}

/**
 * Calculate average confidence across all hidden edges
 */
function calculateAverageConfidence(graph: EnhancedMultiLayerGraph): number {
	if (!graph.hidden_edges) return 0;
	
	const allEdges: HiddenEdge[] = [
		...(graph.hidden_edges.layer1_edges || []),
		...(graph.hidden_edges.layer2_edges || []),
		...(graph.hidden_edges.layer3_edges || []),
		...(graph.hidden_edges.layer4_edges || []),
	];

	if (allEdges.length === 0) return 0;

	const sum = allEdges.reduce((acc, edge) => acc + (edge.confidence || 0), 0);
	return sum / allEdges.length;
}

/**
 * 1.1.1.1.4.5.1: Research Multi-Layer Graph Builder Tool
 */
export const multiLayerCorrelationTools = [
	{
		name: "research-build-multi-layer-graph",
		description: "Build complete multi-layer correlation graph",
		// 1.1.1.1.4.5.5: Input Schema Definitions
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string" },
				layers: {
					type: "string",
					enum: ["1", "2", "3", "4", "all"],
					default: "all",
				},
				includeHiddenEdges: { type: "boolean", default: true },
				maxNodesPerLayer: { type: "number", default: 100 },
			},
			required: ["eventId"],
		},
		execute: async (args: Record<string, any>) => {
			const toolExecutionId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			mcpToolLogger.info("Starting multi-layer graph build", {
				toolExecutionId,
				eventId: args.eventId,
				layers: args.layers || "all",
				includeHiddenEdges: args.includeHiddenEdges ?? true,
			});

			// Input validation
			const validated = validateInput(BuildGraphInputSchema, args);

			const db = new Database("./data/research.db", { create: true });

			// Use enhanced graph builder
			const mlGraph = new EnhancedMultiLayerCorrelationGraph(db);
			mcpToolLogger.debug("Building multi-layer graph", {
				toolExecutionId,
				eventId: validated.eventId,
				graphBuilder: "EnhancedMultiLayerCorrelationGraph",
			});

			const graph = await mlGraph.buildMultiLayerGraph(validated.eventId);

			// Extract visualization data
			const layers = args.layers === 'all' ? [1, 2, 3, 4] : 
				(args.layers ? args.layers.split(',').map((l: string) => parseInt(l)) : [1, 2, 3, 4]);

			const visualizationData = {
				nodes: await extractNodesForVisualization(graph, layers),
				edges: await extractEdgesForVisualization(graph, layers),
				layers: layers.map((l: number) => ({
					layer: l,
					nodeCount: countNodesInLayer(graph, l),
					edgeCount: countEdgesInLayer(graph, l),
					anomalyCount: countAnomaliesInLayer(graph, l),
				})),
				summary: {
					totalHiddenEdges: graph.hidden_edges.layer1_edges.length +
						graph.hidden_edges.layer2_edges.length +
						graph.hidden_edges.layer3_edges.length +
						graph.hidden_edges.layer4_edges.length,
					avgConfidence: calculateAverageConfidence(graph),
					buildTime: graph.build_time_ms,
				},
			};

			return {
				content: [
					{
						type: "text",
						text:
							`🌐 Multi-Layer Graph Built\n` +
							`Event: ${args.eventId}\n` +
							`Layers: ${layers.join(', ')}\n` +
							`Total Nodes: ${visualizationData.nodes.length}\n` +
							`Total Edges: ${visualizationData.edges.length}\n` +
							`Hidden Edges: ${visualizationData.summary.totalHiddenEdges}\n` +
							`Build Time: ${graph.build_time_ms}ms`,
					},
				],
				binary: Buffer.from(JSON.stringify(visualizationData)),
			};
		},
	},

	/**
	 * 1.1.1.1.4.5.2: Research Query Layer Anomalies Tool
	 */
	{
		name: "research-query-layer-anomalies",
		description: "Query anomalies from specific layers",
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string" },
				layer: {
					type: "string",
					enum: ["1", "2", "3", "4", "all"],
					default: "all",
				},
				minConfidence: {
					type: "number",
					minimum: 0,
					maximum: 1,
					default: 0.7,
				},
				timeWindow: {
					type: "string",
					enum: ["1h", "6h", "24h", "7d"],
					default: "24h",
				},
				anomalyType: { type: "string" }, // optional filter
			},
			required: ["eventId"],
		},
		execute: async (args: Record<string, any>) => {
			const db = new Database("./data/research.db", { create: true });

			// Parse time window
			const timeWindowMap: Record<string, string> = {
				"1h": "-1 hour",
				"6h": "-6 hours",
				"24h": "-24 hours",
				"7d": "-7 days",
			};
			const timeWindowSql = timeWindowMap[args.timeWindow || "24h"] || "-24 hours";

			const anomalies = db.query(`
				SELECT 
					a.anomaly_id,
					a.layer,
					a.type,
					a.confidence,
					a.anomaly_score,
					a.detected_at,
					a.metadata,
					COUNT(v.verification_id) as verification_count,
					AVG(CASE WHEN v.result = 'confirmed' THEN 1.0 ELSE 0.0 END) as confirmation_rate
				FROM layer_anomalies a
				LEFT JOIN hidden_edge_verification v ON a.anomaly_id = v.edge_id
				WHERE a.event_id = ?
					AND a.detected_at > unixepoch('now', '${timeWindowSql}')
					${args.layer !== "all" ? `AND a.layer = 'layer${args.layer}'` : ""}
					${args.anomalyType ? `AND a.type = '${args.anomalyType}'` : ""}
					AND a.confidence >= ?
				GROUP BY a.anomaly_id
				ORDER BY a.anomaly_score DESC
				LIMIT 50
			`);

			// Note: layer_anomalies table may not exist, so we'll use a fallback approach
			// For now, build the graph and extract anomalies
			const mlGraph = new EnhancedMultiLayerCorrelationGraph(db);
			const graph = await mlGraph.buildMultiLayerGraph(args.eventId);

			// Extract anomalies from hidden edges
			const allAnomalies: any[] = [];
			const layerMap: Record<string, HiddenEdge[]> = {
				layer1: graph.hidden_edges.layer1_edges,
				layer2: graph.hidden_edges.layer2_edges,
				layer3: graph.hidden_edges.layer3_edges,
				layer4: graph.hidden_edges.layer4_edges,
			};

			const targetLayers =
				args.layer === "all"
					? ["layer1", "layer2", "layer3", "layer4"]
					: [`layer${args.layer}`];

			for (const layer of targetLayers) {
				const edges = layerMap[layer] || [];
				for (const edge of edges) {
					if (
						edge.confidence >= (args.minConfidence || 0.7) &&
						(!args.anomalyType || edge.detection_method === args.anomalyType)
					) {
						allAnomalies.push({
							anomaly_id: edge.edge_id,
							layer: layer,
							type: edge.detection_method,
							confidence: edge.confidence,
							anomaly_score: edge.signal_strength,
							detected_at: Date.now(),
							metadata: {
								source: edge.source_node,
								target: edge.target_node,
								latency_ms: edge.latency_ms,
							},
							verification_count: edge.verification_count,
							confirmation_rate: edge.verified ? 1.0 : 0.0,
						});
					}
				}
			}

			// Sort by anomaly score
			allAnomalies.sort((a, b) => b.anomaly_score - a.anomaly_score);

			// 1.1.1.1.4.5.6: Real-Time Anomaly Streaming
			if (allAnomalies.length > 0) {
				// Stream anomalies to research dashboard (placeholder)
				// await this.streamAnomaliesToResearchDashboard(allAnomalies);
			}

			return {
				content: [
					{
						type: "text",
						text:
							`🔍 Layer Anomalies Found: ${allAnomalies.length}\n` +
							allAnomalies
								.map(
									(a) =>
										`• Layer ${a.layer.slice(-1)} | ${a.type} | ` +
										`Score: ${a.anomaly_score.toFixed(2)} | ` +
										`Confidence: ${(a.confidence * 100).toFixed(0)}% | ` +
										`Confirmed: ${(a.confirmation_rate * 100).toFixed(0)}%`,
								)
								.join("\n"),
					},
				],
			};
		},
	},

	/**
	 * 1.1.1.1.4.5.3: Research Propagation Prediction Tool
	 */
	{
		name: "research-predict-propagation",
		description: "Predict propagation of hidden edges across layers",
		inputSchema: {
			type: "object",
			properties: {
				sourceNode: { type: "string" },
				targetLayer: {
					type: "string",
					enum: ["1", "2", "3", "4"],
					required: true,
				},
				predictionHorizon: {
					type: "string",
					enum: ["5min", "15min", "1h", "6h"],
					default: "15min",
				},
				includeConfidenceInterval: { type: "boolean", default: true },
			},
			required: ["sourceNode", "targetLayer"],
		},
		execute: async (args: Record<string, any>) => {
			const db = new Database("./data/research.db", { create: true });
			const predictor = new PropagationPredictionEngine(db);

			// Parse time horizon
			const horizonMap: Record<string, number> = {
				"5min": 5 * 60 * 1000,
				"15min": 15 * 60 * 1000,
				"1h": 60 * 60 * 1000,
				"6h": 6 * 60 * 60 * 1000,
			};
			const horizon = horizonMap[args.predictionHorizon || "15min"] || 15 * 60 * 1000;

			const predictions = await predictor.predictPropagation({
				sourceNode: args.sourceNode,
				targetLayer: parseInt(args.targetLayer),
				horizon: horizon,
				includeConfidenceInterval: args.includeConfidenceInterval !== false,
			});

			return {
				content: [
					{
						type: "text",
						text:
							`🔮 Propagation Predictions\n` +
							`Source: ${args.sourceNode}\n` +
							`Target Layer: ${args.targetLayer}\n` +
							`Horizon: ${args.predictionHorizon || "15min"}\n\n` +
							predictions
								.map(
									(p: any) =>
										`• ${p.targetNode} | Expected Latency: ${p.expectedLatencyMs}ms | ` +
										`Confidence: ${(p.confidence * 100).toFixed(0)}% | ` +
										`Impact: ${p.impactScore.toFixed(2)}`,
								)
								.join("\n"),
					},
				],
				binary: Buffer.from(JSON.stringify(predictions)),
			};
		},
	},

	/**
	 * 1.1.1.1.4.5.5: Input Schema Definitions
	 * All tools use consistent input schemas defined above
	 */

	/**
	 * 1.1.1.1.4.5.4: Research Cross-Sport Edge Finder Tool
	 */
	{
		name: "research-find-cross-sport-edges",
		description: "Find hidden edges between different sports",
		inputSchema: {
			type: "object",
			properties: {
				sport1: { type: "string" },
				sport2: { type: "string" },
				minCorrelation: { type: "number", default: 0.7 },
				timeWindowDays: { type: "number", default: 30 },
			},
		},
		execute: async (args: Record<string, any>) => {
			const db = new Database("./data/research.db", { create: true });
			const query = db.query(`
				WITH cross_sport_data AS (
					SELECT 
						sport1, sport2, market1, market2,
						correlation, lag_ms, hidden_signal_strength,
						predictive_power, accuracy_30d,
						last_signal_detected,
						signal_count
					FROM cross_sport_correlations
					WHERE 
						((sport1 = ? AND sport2 = ?) OR
						(sport1 = ? AND sport2 = ?))
						AND correlation >= ?
						AND last_signal_detected > unixepoch('now', '-${args.timeWindowDays || 30} days')
					ORDER BY hidden_signal_strength DESC
					LIMIT 50
				)
				SELECT *,
					CASE 
						WHEN hidden_signal_strength > 0.8 THEN 'HIGH'
						WHEN hidden_signal_strength > 0.6 THEN 'MEDIUM'
						ELSE 'LOW'
					END as signal_strength_category,
					CASE 
						WHEN predictive_power > 0.8 THEN 'STRONG_PREDICTIVE'
						WHEN predictive_power > 0.6 THEN 'MODERATE_PREDICTIVE'
						ELSE 'WEAK_PREDICTIVE'
					END as predictive_category
				FROM cross_sport_data
			`);

			const edges = query.all(
				args.sport1,
				args.sport2,
				args.sport2,
				args.sport1,
				args.minCorrelation || 0.7,
			) as any[];

			// Group by signal strength
			const grouped = edges.reduce(
				(acc: Record<string, any[]>, edge: any) => {
					const key = edge.signal_strength_category;
					if (!acc[key]) acc[key] = [];
					acc[key].push(edge);
					return acc;
				},
				{} as Record<string, any[]>,
			);

			return {
				content: [
					{
						type: "text",
						text:
							`🏈⚾ Cross-Sport Hidden Edges\n` +
							`Sport Pair: ${args.sport1} ↔ ${args.sport2}\n` +
							`Time Window: ${args.timeWindowDays || 30} days\n` +
							`Min Correlation: ${args.minCorrelation || 0.7}\n\n` +
							Object.entries(grouped)
								.map(
									([category, categoryEdges]) =>
										`${category} Signal Strength (${categoryEdges.length} edges):\n` +
										categoryEdges
											.slice(0, 3)
											.map(
												(e: any) =>
													`  ${e.market1} → ${e.market2} | ` +
													`Corr: ${e.correlation.toFixed(2)} | ` +
													`Lag: ${e.lag_ms}ms | ` +
													`Predictive: ${(e.predictive_power * 100).toFixed(0)}%`,
											)
											.join("\n"),
								)
								.join("\n\n"),
					},
				],
			};
		},
	},

	/**
	 * 1.1.1.1.4.5.6: Real-Time Anomaly Streaming Tool
	 */
	{
		name: "research-stream-anomalies",
		description: "Stream anomalies in real-time as they are detected",
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string", description: "Event ID to stream" },
				layers: {
					type: "array",
					items: { type: "number", enum: [1, 2, 3, 4] },
					description: "Layers to stream (default: all)",
				},
				minConfidence: {
					type: "number",
					default: 0.5,
					description: "Minimum confidence threshold",
				},
				duration: {
					type: "number",
					default: 60,
					description: "Stream duration in seconds",
				},
			},
			required: ["eventId"],
		},
		execute: async (args: Record<string, any>) => {
			// Input validation
			const validated = validateInput(StreamAnomaliesInputSchema, args);
			const { RealTimeAnomalyStreamer } = await import(
				"../../arbitrage/shadow-graph/multi-layer-streaming"
			);
			const db = new Database("./data/research.db", { create: true });
			const timezoneService = new TimezoneService(db);
			const mlGraph = new MultiLayerCorrelationGraph(db, timezoneService);
			const streamer = new RealTimeAnomalyStreamer(db);

			const graph = await mlGraph.buildMultiLayerGraph(validated.eventId);

			const anomalies: any[] = [];

			streamer.on("anomaly-detected", (event) => {
				anomalies.push(event.anomaly);
			});

			await streamer.startStreaming(validated.eventId, graph, {
				layers: validated.layers,
				minConfidence: validated.minConfidence || 0.5,
			});

			// Stream for specified duration
			await new Promise((resolve) =>
				setTimeout(resolve, (validated.duration || 60) * 1000),
			);

			streamer.stopStreaming(validated.eventId);

			// Batch insert anomalies
			if (anomalies.length > 0) {
				await batchInsertCorrelations(db, anomalies, validated.eventId);
			}

			return {
				content: [
					{
						type: "text",
						text:
							`📡 Real-Time Anomaly Stream: ${validated.eventId}\n\n` +
								`Duration: ${validated.duration || 60}s\n` +
								`Anomalies Detected: ${anomalies.length}\n\n` +
								anomalies
									.map(
										(a, i) =>
											`${i + 1}. Layer ${a.layer}: ${a.source} → ${a.target}\n` +
											`   Confidence: ${(a.confidence * 100).toFixed(1)}%\n` +
											`   Type: ${a.type}\n`,
									)
									.join("\n") || "No anomalies detected during stream period",
					},
				],
			};
		},
	},

	/**
	 * 1.1.1.1.4.5.7: Multi-Layer Visualization Data Tool
	 */
	{
		name: "research-generate-visualization",
		description:
			"Generate visualization data for multi-layer correlation graph",
		inputSchema: {
			type: "object",
			properties: {
				eventId: { type: "string", description: "Event ID" },
				layout: {
					type: "string",
					enum: ["force", "hierarchical", "circular"],
					default: "hierarchical",
					description: "Layout algorithm",
				},
				format: {
					type: "string",
					enum: ["json", "graphml"],
					default: "json",
					description: "Output format",
				},
			},
			required: ["eventId"],
		},
		execute: async (args: Record<string, any>) => {
			const toolExecutionId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			mcpToolLogger.info("Starting visualization generation", {
				toolExecutionId,
				eventId: args.eventId,
				layout: args.layout || "hierarchical",
				format: args.format || "json",
			});

			// Input validation
			const validated = validateInput(GenerateVisualizationInputSchema, args);

			const { MultiLayerVisualizationGenerator } = await import(
				"../../arbitrage/shadow-graph/multi-layer-visualization"
			);
			const db = new Database("./data/research.db", { create: true });
			const timezoneService = new TimezoneService(db);
			const mlGraph = new MultiLayerCorrelationGraph(db, timezoneService);
			const generator = new MultiLayerVisualizationGenerator(db);

			const graph = await mlGraph.buildMultiLayerGraph(validated.eventId);
			mcpToolLogger.debug("Graph built, generating visualization", {
				toolExecutionId,
				eventId: validated.eventId,
				graphLayers: graph ? Object.keys(graph).length : 0,
			});

			const visualization = await generator.generateVisualizationData(
				graph,
				validated.eventId,
				validated.layout || "hierarchical",
			);

			let output: string;
			if (validated.format === "graphml") {
				output = await generator.exportToGraphML(visualization);
			} else {
				output = await generator.exportToJSON(visualization);
			}

			mcpToolLogger.info("Visualization generation completed", {
				toolExecutionId,
				eventId: validated.eventId,
				format: validated.format,
				outputSize: output.length,
				totalNodes: visualization.statistics.totalNodes,
				totalEdges: visualization.statistics.totalEdges,
			});

			return {
				content: [
					{
						type: "text",
						text:
							`📊 Visualization Data Generated\n\n` +
							`Event: ${validated.eventId}\n` +
							`Layout: ${validated.layout || "hierarchical"}\n` +
							`Format: ${validated.format || "json"}\n\n` +
							`Statistics:\n` +
							`  Total Nodes: ${visualization.statistics.totalNodes}\n` +
							`  Total Edges: ${visualization.statistics.totalEdges}\n` +
							`  Total Anomalies: ${visualization.statistics.totalAnomalies}\n` +
							`  Average Latency: ${(visualization.statistics.averageLatency / 1000).toFixed(2)}s\n\n` +
							`Layer Distribution:\n` +
							Object.entries(visualization.statistics.layerDistribution)
								.map(([layer, count]) => `  Layer ${layer}: ${count}`)
								.join("\n"),
					},
				],
				binary: new TextEncoder().encode(output),
			};
		},
	},
];

/**
 * Register tools with MCP server
 */
export function registerMultiLayerCorrelationTools(server: MCPServer): void {
	for (const tool of multiLayerCorrelationTools) {
		server.registerTool(tool);
	}
}
