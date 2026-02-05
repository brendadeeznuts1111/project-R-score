/**
 * @fileoverview Multi-Layer Visualization Data Generator
 * @description Generate visualization data for multi-layer correlation graphs
 * @module arbitrage/shadow-graph/multi-layer-visualization
 */

import type {
	MultiLayerGraph,
	HiddenEdge,
} from "./multi-layer-correlation-graph";
import type { Database } from "bun:sqlite";

/**
 * 1.1.1.1.4.5.7: Multi-Layer Visualization Data
 */
export interface VisualizationData {
	nodes: VisualizationNode[];
	edges: VisualizationEdge[];
	layers: LayerVisualization[];
	statistics: VisualizationStatistics;
	metadata: VisualizationMetadata;
}

/**
 * Visualization node
 */
export interface VisualizationNode {
	id: string;
	label: string;
	layer: number;
	type: "event" | "market" | "sport" | "entity";
	x?: number;
	y?: number;
	size?: number;
	color?: string;
	metadata?: Record<string, any>;
}

/**
 * Visualization edge
 */
export interface VisualizationEdge {
	id: string;
	source: string;
	target: string;
	layer: number;
	type: string;
	weight: number;
	confidence: number;
	latency: number;
	color?: string;
	width?: number;
	metadata?: Record<string, any>;
}

/**
 * Layer visualization
 */
export interface LayerVisualization {
	layer: number;
	name: string;
	nodes: VisualizationNode[];
	edges: VisualizationEdge[];
	anomalyCount: number;
	averageConfidence: number;
}

/**
 * Visualization statistics
 */
export interface VisualizationStatistics {
	totalNodes: number;
	totalEdges: number;
	totalAnomalies: number;
	layerDistribution: Record<number, number>;
	confidenceDistribution: {
		high: number;
		medium: number;
		low: number;
	};
	averageLatency: number;
}

/**
 * Visualization metadata
 */
export interface VisualizationMetadata {
	eventId: string;
	generatedAt: number;
	version: string;
	layout: "force" | "hierarchical" | "circular";
}

/**
 * Multi-Layer Visualization Generator
 */
export class MultiLayerVisualizationGenerator {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Generate visualization data from multi-layer graph
	 */
	async generateVisualizationData(
		graph: MultiLayerGraph,
		eventId: string,
		layout: "force" | "hierarchical" | "circular" = "hierarchical",
	): Promise<VisualizationData> {
		// Collect all anomalies
		const allAnomalies: HiddenEdge[] = [];
		for (const detector of graph.detection_priority) {
			const anomalies = await detector(graph);
			allAnomalies.push(...anomalies);
		}

		// Generate nodes
		const nodes = this.generateNodes(graph, allAnomalies);

		// Generate edges
		const edges = this.generateEdges(allAnomalies);

		// Generate layer visualizations
		const layers = this.generateLayerVisualizations(graph, allAnomalies);

		// Calculate statistics
		const statistics = this.calculateStatistics(allAnomalies, nodes, edges);

		// Generate metadata
		const metadata: VisualizationMetadata = {
			eventId,
			generatedAt: Date.now(),
			version: "1.0.0",
			layout,
		};

		return {
			nodes,
			edges,
			layers,
			statistics,
			metadata,
		};
	}

	/**
	 * Generate nodes from graph
	 */
	private generateNodes(
		graph: MultiLayerGraph,
		anomalies: HiddenEdge[],
	): VisualizationNode[] {
		const nodeMap = new Map<string, VisualizationNode>();

		// Extract nodes from anomalies
		for (const anomaly of anomalies) {
			// Source node
			if (!nodeMap.has(anomaly.source)) {
				nodeMap.set(anomaly.source, {
					id: anomaly.source,
					label: this.extractLabel(anomaly.source),
					layer: anomaly.layer,
					type: this.extractNodeType(anomaly.source),
					size: 10,
					color: this.getLayerColor(anomaly.layer),
				});
			}

			// Target node
			if (!nodeMap.has(anomaly.target)) {
				nodeMap.set(anomaly.target, {
					id: anomaly.target,
					label: this.extractLabel(anomaly.target),
					layer: anomaly.layer,
					type: this.extractNodeType(anomaly.target),
					size: 10,
					color: this.getLayerColor(anomaly.layer),
				});
			}
		}

		// Update node sizes based on connections
		for (const edge of anomalies) {
			const sourceNode = nodeMap.get(edge.source);
			const targetNode = nodeMap.get(edge.target);

			if (sourceNode) {
				sourceNode.size = (sourceNode.size || 10) + 2;
			}
			if (targetNode) {
				targetNode.size = (targetNode.size || 10) + 2;
			}
		}

		return Array.from(nodeMap.values());
	}

	/**
	 * Generate edges from anomalies
	 */
	private generateEdges(anomalies: HiddenEdge[]): VisualizationEdge[] {
		return anomalies.map((anomaly, index) => ({
			id: `edge-${index}`,
			source: anomaly.source,
			target: anomaly.target,
			layer: anomaly.layer,
			type: anomaly.type,
			weight: anomaly.correlation,
			confidence: anomaly.confidence,
			latency: anomaly.latency,
			color: this.getEdgeColor(anomaly.confidence),
			width: anomaly.confidence * 5,
			metadata: {
				expected_propagation: anomaly.expected_propagation,
				timestamp: anomaly.timestamp,
			},
		}));
	}

	/**
	 * Generate layer visualizations
	 */
	private generateLayerVisualizations(
		graph: MultiLayerGraph,
		anomalies: HiddenEdge[],
	): LayerVisualization[] {
		const layers: LayerVisualization[] = [];

		for (let layer = 1; layer <= 4; layer++) {
			const layerAnomalies = anomalies.filter((a) => a.layer === layer);
			const layerNodes = new Set<string>();
			const layerEdges: VisualizationEdge[] = [];

			for (const anomaly of layerAnomalies) {
				layerNodes.add(anomaly.source);
				layerNodes.add(anomaly.target);
				layerEdges.push({
					id: `${layer}-${anomaly.source}-${anomaly.target}`,
					source: anomaly.source,
					target: anomaly.target,
					layer: anomaly.layer,
					type: anomaly.type,
					weight: anomaly.correlation,
					confidence: anomaly.confidence,
					latency: anomaly.latency,
				});
			}

			const layerNodeArray: VisualizationNode[] = Array.from(layerNodes).map(
				(nodeId) => ({
					id: nodeId,
					label: this.extractLabel(nodeId),
					layer,
					type: this.extractNodeType(nodeId),
					size: 10,
					color: this.getLayerColor(layer),
				}),
			);

			const averageConfidence =
				layerAnomalies.length > 0
					? layerAnomalies.reduce((sum, a) => sum + a.confidence, 0) /
						layerAnomalies.length
					: 0;

			layers.push({
				layer,
				name: this.getLayerName(layer),
				nodes: layerNodeArray,
				edges: layerEdges,
				anomalyCount: layerAnomalies.length,
				averageConfidence,
			});
		}

		return layers;
	}

	/**
	 * Calculate statistics
	 */
	private calculateStatistics(
		anomalies: HiddenEdge[],
		nodes: VisualizationNode[],
		edges: VisualizationEdge[],
	): VisualizationStatistics {
		const layerDistribution: Record<number, number> = {
			1: 0,
			2: 0,
			3: 0,
			4: 0,
		};
		const confidenceDistribution = { high: 0, medium: 0, low: 0 };

		for (const anomaly of anomalies) {
			layerDistribution[anomaly.layer] =
				(layerDistribution[anomaly.layer] || 0) + 1;

			if (anomaly.confidence >= 0.8) confidenceDistribution.high++;
			else if (anomaly.confidence >= 0.6) confidenceDistribution.medium++;
			else confidenceDistribution.low++;
		}

		const averageLatency =
			anomalies.length > 0
				? anomalies.reduce((sum, a) => sum + a.latency, 0) / anomalies.length
				: 0;

		return {
			totalNodes: nodes.length,
			totalEdges: edges.length,
			totalAnomalies: anomalies.length,
			layerDistribution,
			confidenceDistribution,
			averageLatency,
		};
	}

	/**
	 * Extract label from node ID
	 */
	private extractLabel(nodeId: string): string {
		const parts = nodeId.split(":");
		return parts[parts.length - 1] || nodeId;
	}

	/**
	 * Extract node type from node ID
	 */
	private extractNodeType(
		nodeId: string,
	): "event" | "market" | "sport" | "entity" {
		if (nodeId.includes("sport")) return "sport";
		if (nodeId.includes("event")) return "event";
		if (nodeId.includes("market")) return "market";
		return "entity";
	}

	/**
	 * Get layer color
	 */
	private getLayerColor(layer: number): string {
		const colors: Record<number, string> = {
			1: "#FF6B6B", // Red
			2: "#4ECDC4", // Teal
			3: "#45B7D1", // Blue
			4: "#96CEB4", // Green
		};
		return colors[layer] || "#CCCCCC";
	}

	/**
	 * Get edge color based on confidence
	 */
	private getEdgeColor(confidence: number): string {
		if (confidence >= 0.8) return "#FF0000"; // Red - high confidence
		if (confidence >= 0.6) return "#FFA500"; // Orange - medium confidence
		return "#FFFF00"; // Yellow - low confidence
	}

	/**
	 * Get layer name
	 */
	private getLayerName(layer: number): string {
		const names: Record<number, string> = {
			1: "Direct Correlation",
			2: "Cross-Market",
			3: "Cross-Event",
			4: "Cross-Sport",
		};
		return names[layer] || `Layer ${layer}`;
	}

	/**
	 * Export to JSON format
	 */
	async exportToJSON(data: VisualizationData): Promise<string> {
		return JSON.stringify(data, null, 2);
	}

	/**
	 * Export to GraphML format
	 */
	async exportToGraphML(data: VisualizationData): Promise<string> {
		let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
		graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
		graphml += '  <graph id="G" edgedefault="directed">\n';

		// Add nodes
		for (const node of data.nodes) {
			graphml += `    <node id="${node.id}">\n`;
			graphml += `      <data key="label">${node.label}</data>\n`;
			graphml += `      <data key="layer">${node.layer}</data>\n`;
			graphml += `      <data key="type">${node.type}</data>\n`;
			graphml += `    </node>\n`;
		}

		// Add edges
		for (const edge of data.edges) {
			graphml += `    <edge id="${edge.id}" source="${edge.source}" target="${edge.target}">\n`;
			graphml += `      <data key="weight">${edge.weight}</data>\n`;
			graphml += `      <data key="confidence">${edge.confidence}</data>\n`;
			graphml += `      <data key="layer">${edge.layer}</data>\n`;
			graphml += `    </edge>\n`;
		}

		graphml += "  </graph>\n";
		graphml += "</graphml>";

		return graphml;
	}
}
