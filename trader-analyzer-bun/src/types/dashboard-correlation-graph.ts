/**
 * TypeScript types for Dashboard Correlation Graph API
 * Part of 4.2.2.4.0.0.0 Frontend Implementation & Interaction
 * 
 * @see 4.2.2.2.0.0.0 Data Structures & Properties for Graphing
 */

// 4.2.2.2.0.0.0: MultiLayerCorrelationGraphData
/**
 * 4.2.2.2.0.0.0: Interface representing the data structure for the Multi-Layer Correlation Graph.
 * This graph visualizes relationships between nodes from different Hyper-Bun subsystems.
 */
export interface MultiLayerCorrelationGraphData {
	/**
	 * 4.2.2.2.0.0.0.1: A unique identifier for this specific instance of the correlation graph.
	 */
	graph_id: string;

	/**
	 * 4.2.2.2.0.0.0.2: The primary event or context identifier this graph is focused on (e.g., an `event_identifier`).
	 */
	primary_context_id: string;

	/**
	 * 4.2.2.2.0.0.0.3: An array of all nodes present in the correlation graph.
	 * Nodes can represent various entities (market nodes, anomaly events, performance tests).
	 * @see CorrelationGraphNode
	 */
	nodes: CorrelationGraphNode[];

	/**
	 * 4.2.2.2.0.0.0.4: An array of all edges (correlations) between the nodes in the graph.
	 * @see CorrelationGraphEdge
	 */
	edges: CorrelationGraphEdge[];

	/**
	 * 4.2.2.2.0.0.0.5: Metadata about the layers represented in the graph (e.g., 'Market Data', 'Anomalies', 'System Metrics').
	 * @see GraphLayerMetadata
	 */
	layers_metadata: GraphLayerMetadata[];
}

// Referenced Type: CorrelationGraphNode
/**
 * 4.2.2.2.0.0.0.6: Interface for a single node within the Multi-Layer Correlation Graph.
 * Each node represents an entity from a Hyper-Bun subsystem.
 */
export interface CorrelationGraphNode {
	/**
	 * 4.2.2.2.0.0.0.6.1: Unique identifier for this node (e.g., 'market_node:dk:nfl-001:total_q1', 'anomaly:covert-steam-X').
	 */
	node_id: string;

	/**
	 * 4.2.2.2.0.0.0.6.2: The user-friendly label for display on the graph.
	 */
	label: string;

	/**
	 * 4.2.2.2.0.0.0.6.3: The Hyper-Bun subsystem or layer this node belongs to.
	 * @example 'market_data', 'anomaly_detection', 'performance_monitoring', 'external_feed'
	 */
	layer: string;

	/**
	 * 4.2.2.2.0.0.0.6.4: An icon or color hint for visual identification on the graph.
	 */
	icon_hint?: string;

	/**
	 * 4.2.2.2.0.0.0.6.5: Optional deep-link URL to view detailed information about this node's source.
	 * @example Link to a specific `CovertSteamEventRecord` in the dashboard, or a `MarketOfferingNode`.
	 */
	deeplink_url?: string;

	/**
	 * 4.2.2.2.0.0.0.6.6: Optional summary statistics or key values for quick display (e.g., average latency, anomaly count).
	 */
	summary_data?: Record<string, string | number>;
}

// Referenced Type: CorrelationGraphEdge
/**
 * 4.2.2.2.0.0.0.7: Interface for an edge (correlation) between two nodes in the graph.
 * Represents a measured statistical or logical relationship.
 */
export interface CorrelationGraphEdge {
	/**
	 * 4.2.2.2.0.0.0.7.1: The source node's ID.
	 */
	source_node_id: string;

	/**
	 * 4.2.2.2.0.0.0.7.2: The target node's ID.
	 */
	target_node_id: string;

	/**
	 * 4.2.2.2.0.0.0.7.3: The strength of the correlation (e.g., Pearson correlation coefficient, p-value inverse).
	 * @example `0.85` for strong positive, `-0.6` for moderate negative.
	 */
	correlation_strength: number;

	/**
	 * 4.2.2.2.0.0.0.7.4: The type of correlation (e.g., 'statistical_mean', 'temporal_lag', 'causal_inference').
	 */
	correlation_type: string;

	/**
	 * 4.2.2.2.0.0.0.7.5: The statistical significance (p-value) of this correlation.
	 * @see 6.7.1A.0.0.0.0 for statistical methods.
	 */
	p_value?: number;

	/**
	 * 4.2.2.2.0.0.0.7.6: Directionality of the relationship if known (e.g., 'A influences B').
	 * @example 'source_to_target', 'bidirectional', 'undirected'
	 */
	direction?: 'source_to_target' | 'target_to_source' | 'bidirectional' | 'undirected';

	/**
	 * 4.2.2.2.0.0.0.7.7: Optional descriptive text for the correlation.
	 */
	description?: string;
}

// Referenced Type: GraphLayerMetadata
/**
 * 4.2.2.2.0.0.0.8: Interface for metadata about each layer in the graph.
 */
export interface GraphLayerMetadata {
	/**
	 * 4.2.2.2.0.0.0.8.1: The unique identifier for the layer (matches `CorrelationGraphNode.layer`).
	 */
	id: string;

	/**
	 * 4.2.2.2.0.0.0.8.2: A user-friendly name for the layer (e.g., "Market Data Flows").
	 */
	name: string;

	/**
	 * 4.2.2.2.0.0.0.8.3: A default color to use for nodes/edges in this layer.
	 */
	color_hex?: string;

	/**
	 * 4.2.2.2.0.0.0.8.4: Description of the data type represented by this layer.
	 */
	description?: string;
}

// Legacy types for backward compatibility with existing implementation
// These may be deprecated in favor of the canonical types above
export interface CorrelationNode {
	id: string;
	label: string;
	layer: 1 | 2 | 3 | 4;
	bookmaker?: string;
	severity: "low" | "medium" | "high" | "critical";
	correlationStrength: number; // 0-1
	summaryData: NodeSummaryData;
	deeplinkUrl: string; // Cross-reference: 9.1.1.9.1.0.0
}

export interface CorrelationEdge {
	id: string;
	source: string;
	target: string;
	layer: 1 | 2 | 3 | 4;
	correlationStrength: number;
	latency?: number;
	confidence: number;
}

export interface NodeSummaryData {
	anomalyCount?: number;
	movementCount?: number;
	avgLatency?: number;
	threatLevel?: string;
	lastSeen?: number;
}

export interface LayerSummary {
	layer: number;
	nodeCount: number;
	edgeCount: number;
	avgCorrelationStrength: number;
}

export interface GraphStatistics {
	totalNodes: number;
	totalEdges: number;
	avgCorrelationStrength: number;
	maxCorrelationStrength: number;
	bookmakers: string[];
	timeRange: { start: number; end: number };
}
