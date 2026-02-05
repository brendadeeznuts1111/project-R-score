/**
 * @fileoverview MLGS MultiLayerGraph - Sportsbook Production Ready
 * @description MultiLayerCorrelationGraph for live arbitrage detection with 5-layer shadow graph
 * @module graphs/MLGSGraph
 * @version 1.0.0
 *
 * [MLGS][SPORTSBOOK][SHADOW-GRAPH][L1-L4]
 * MultiLayerCorrelationGraph - Live Arbitrage Detection
 *
 * @see {@link https://tools.ietf.org/html/rfc7230 RFC 7230}
 */

import { Database } from "bun:sqlite";

/**
 * Graph Layer Definition
 */
export interface GraphLayer {
	id: string;
	name: string;
	level: number;
	description: string;
	correlationRules: CorrelationRule[];
	weight: number;
	maxNodes?: number;
	edgeConstraints?: EdgeConstraint[];
	anomalyThreshold: number;
}

/**
 * Correlation Rule
 */
export interface CorrelationRule {
	type: "arb_threshold" | "pearson" | "time_decay" | "causal_inference";
	value?: number;
	threshold?: number;
	halfLife?: number;
	pValue?: number;
}

/**
 * Edge Constraint
 */
export interface EdgeConstraint {
	minWeight?: number;
	maxLatency?: number;
	confidence?: number;
}

/**
 * Graph Node
 */
export interface GraphNode {
	id: string;
	type: string;
	data: Record<string, unknown>;
	metadata: Record<string, unknown>;
	layerWeights?: Record<string, number>;
	anomalyScore?: number;
	lastUpdated: number;
}

/**
 * Graph Edge
 */
export interface GraphEdge {
	id: string;
	source: string;
	target: string;
	type: string;
	weight: number;
	confidence: number;
	latency: number;
	metadata: Record<string, unknown>;
	detectedAt: number;
	lastVerified: number;
}

/**
 * Cross-Layer Connection
 */
export interface CrossLayerConnection {
	sourceNode: GraphNode;
	targetNode: GraphNode;
	edge: GraphEdge;
	sourceLayer: string;
	targetLayer: string;
}

/**
 * Signal Propagation Result
 */
export interface SignalPropagationResult {
	propagatedNodes: GraphNode[];
	affectedEdges: GraphEdge[];
	confidenceDecay: number;
	totalLatency: number;
}

/**
 * Propagation Rules
 */
export interface PropagationRules {
	decayRate?: number;
	maxLayers?: number;
	minConfidence?: number;
}

/**
 * Hidden Edge Criteria
 */
export interface HiddenEdgeCriteria {
	minWeight?: number;
	layer?: string;
	maxAge?: number;
}

/**
 * Hidden Edge Result
 */
export interface HiddenEdgeResult {
	edge: GraphEdge;
	sourceData: Record<string, unknown>;
	targetData: Record<string, unknown>;
	anomalyScore: number;
	arbitragePercent: number;
}

/**
 * Anomaly Pattern
 */
export interface AnomalyPattern {
	layer: string;
	edgeCount: number;
	avgRisk: number;
	maxProfitPct: number;
	arbPriority: number;
}

/**
 * Graph Metrics
 */
export interface GraphMetrics {
	nodeCount: number;
	edgeCount: number;
	hiddenEdges: number;
	liveArbs: number;
	scanTimestamp: number;
}

/**
 * MultiLayerGraph Interface
 */
export interface MultiLayerGraph<N extends GraphNode, E extends GraphEdge> {
	addNode(layerId: string, node: N): Promise<void>;
	addEdge(layerId: string, edge: E): Promise<void>;
	findCrossLayerConnections(
		sourceNodeId: string,
		sourceLayer: string,
		targetLayer: string,
	): Promise<CrossLayerConnection[]>;
	propagateSignal(
		sourceNode: N,
		layers: string[],
		propagationRules: PropagationRules,
	): Promise<SignalPropagationResult>;
	findHiddenEdges(
		criteria: HiddenEdgeCriteria,
		confidenceThreshold?: number,
	): Promise<HiddenEdgeResult[]>;
	detectAnomalyPatterns(): Promise<AnomalyPattern[]>;
	getGraphMetrics(): GraphMetrics;
	buildFullGraph(league: string): Promise<void>;
}

/**
 * MLGS MultiLayerGraph Implementation
 * Production-ready sportsbook arbitrage detection system
 */
export class MLGSGraph<N extends GraphNode, E extends GraphEdge>
	implements MultiLayerGraph<N, E>
{
	private db: Database;
	public readonly layers: GraphLayer[];

	constructor(dbPath: string) {
		this.db = new Database(dbPath, {
			create: true,
			readwrite: true,
			strict: true,
			wal: true,
		});
		this.layers = this.defineSportsbookLayers();
		this.initSchema();
	}

	/**
	 * 1.1.1.1.4.1.1 Layer Definitions → Sportsbook Reality
	 */
	private defineSportsbookLayers(): GraphLayer[] {
		return [
			// L1: Direct arbitrage scanner
			{
				id: "L1_DIRECT",
				name: "Direct Arbitrage",
				level: 1,
				description: "BookieA ↔ BookieB price differences >2.5%",
				correlationRules: [{ type: "arb_threshold", value: 2.5 }],
				weight: 1.0,
				maxNodes: 10000,
				edgeConstraints: [{ minWeight: 0.025, confidence: 0.95 }],
				anomalyThreshold: 0.1,
			},
			// L2: Cross-market (spread ↔ total)
			{
				id: "L2_MARKET",
				name: "Cross-Market Correlation",
				level: 2,
				description: "Spread ↔ O/U line movement correlation",
				correlationRules: [{ type: "pearson", threshold: 0.7 }],
				weight: 0.8,
				edgeConstraints: [{ maxLatency: 500 }],
				anomalyThreshold: 0.15,
			},
			// L3: Cross-event steam propagation
			{
				id: "L3_EVENT",
				name: "Cross-Event Steam",
				level: 3,
				description: "Q1 sharp money → Q4 line move prediction",
				correlationRules: [{ type: "time_decay", halfLife: 300000 }], // 5min
				weight: 0.6,
				anomalyThreshold: 0.2,
			},
			// L4: Cross-sport hidden edges
			{
				id: "L4_SPORT",
				name: "Cross-Sport Edges",
				level: 4,
				description: "NBA injury → NFL prop line impact",
				correlationRules: [{ type: "causal_inference", pValue: 0.01 }],
				weight: 0.4,
				anomalyThreshold: 0.25,
			},
		];
	}

	/**
	 * Initialize database schema
	 */
	private initSchema(): void {
		// Nodes table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS nodes (
				id TEXT PRIMARY KEY,
				layer_id TEXT NOT NULL,
				node_id TEXT NOT NULL,
				type TEXT NOT NULL,
				data TEXT NOT NULL,
				metadata TEXT NOT NULL,
				layer_weights TEXT,
				anomaly_score REAL DEFAULT 0,
				last_updated INTEGER NOT NULL,
				UNIQUE(layer_id, node_id)
			)
		`);

		// Edges table
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS edges (
				id TEXT PRIMARY KEY,
				layer_id TEXT NOT NULL,
				edge_id TEXT NOT NULL,
				source TEXT NOT NULL,
				target TEXT NOT NULL,
				type TEXT NOT NULL,
				weight REAL NOT NULL,
				confidence REAL NOT NULL,
				latency INTEGER NOT NULL,
				metadata TEXT NOT NULL,
				detected_at INTEGER NOT NULL,
				last_verified INTEGER NOT NULL,
				FOREIGN KEY(source) REFERENCES nodes(node_id),
				FOREIGN KEY(target) REFERENCES nodes(node_id)
			)
		`);

		// Indexes for performance
		this.db.exec(`
			CREATE INDEX IF NOT EXISTS idx_nodes_layer ON nodes(layer_id);
			CREATE INDEX IF NOT EXISTS idx_edges_layer ON edges(layer_id);
			CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source);
			CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target);
			CREATE INDEX IF NOT EXISTS idx_edges_weight ON edges(weight DESC);
			CREATE INDEX IF NOT EXISTS idx_edges_confidence ON edges(confidence DESC);
			CREATE INDEX IF NOT EXISTS idx_edges_detected ON edges(detected_at DESC);
		`);
	}

	/**
	 * Add node to graph
	 */
	async addNode(layerId: string, node: N): Promise<void> {
		const id = `${layerId}:${node.id}`;
		await this.db
			.query(
				`
			INSERT OR REPLACE INTO nodes (id, layer_id, node_id, type, data, metadata, 
			                             layer_weights, anomaly_score, last_updated)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			)
			.run(
				id,
				layerId,
				node.id,
				node.type,
				JSON.stringify(node.data),
				JSON.stringify(node.metadata),
				node.layerWeights ? JSON.stringify(node.layerWeights) : null,
				node.anomalyScore ?? 0,
				node.lastUpdated,
			);
	}

	/**
	 * Add edge to graph
	 */
	async addEdge(layerId: string, edge: E): Promise<void> {
		const id = `${layerId}:${edge.id}`;
		await this.db
			.query(
				`
			INSERT OR REPLACE INTO edges (id, layer_id, edge_id, source, target, type, weight, 
			                            confidence, latency, metadata, detected_at, last_verified)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			)
			.run(
				id,
				layerId,
				edge.id,
				edge.source,
				edge.target,
				edge.type,
				edge.weight,
				edge.confidence,
				edge.latency,
				JSON.stringify(edge.metadata),
				edge.detectedAt,
				edge.lastVerified,
			);
	}

	/**
	 * Find cross-layer connections
	 */
	async findCrossLayerConnections(
		sourceNodeId: string,
		sourceLayer: string,
		targetLayer: string,
	): Promise<CrossLayerConnection[]> {
		const results = await this.db
			.query(
				`
			SELECT 
				e.*,
				n1.data as source_data, n1.metadata as source_metadata,
				n2.data as target_data, n2.metadata as target_metadata
			FROM edges e
			JOIN nodes n1 ON e.source = n1.node_id AND n1.layer_id = ?
			JOIN nodes n2 ON e.target = n2.node_id AND n2.layer_id = ?
			WHERE n1.node_id = ?
			ORDER BY e.weight DESC, e.confidence DESC
		`,
			)
			.all(sourceLayer, targetLayer, sourceNodeId);

		return results.map((row: any) => ({
			sourceNode: {
				id: sourceNodeId,
				type: "",
				data: JSON.parse(row.source_data),
				metadata: JSON.parse(row.source_metadata),
				lastUpdated: 0,
			},
			targetNode: {
				id: row.target,
				type: "",
				data: JSON.parse(row.target_data),
				metadata: JSON.parse(row.target_metadata),
				lastUpdated: 0,
			},
			edge: {
				id: row.edge_id,
				source: row.source,
				target: row.target,
				type: row.type,
				weight: row.weight,
				confidence: row.confidence,
				latency: row.latency,
				metadata: JSON.parse(row.metadata),
				detectedAt: row.detected_at,
				lastVerified: row.last_verified,
			},
			sourceLayer,
			targetLayer,
		}));
	}

	/**
	 * 1.1.1.1.4.1.7 Propagation Prediction → STEAM MOVES
	 */
	async propagateSignal(
		sourceNode: N,
		layers: string[],
		propagationRules: PropagationRules,
	): Promise<SignalPropagationResult> {
		const result: SignalPropagationResult = {
			propagatedNodes: [],
			affectedEdges: [],
			confidenceDecay: 1.0,
			totalLatency: 0,
		};

		const decayRate = propagationRules.decayRate ?? 0.95;
		const minConfidence = propagationRules.minConfidence ?? 0.5;

		for (const layer of layers) {
			const connections = await this.findCrossLayerConnections(
				sourceNode.id,
				"L1_DIRECT",
				layer,
			);

			for (const conn of connections) {
				if (conn.edge.confidence >= minConfidence) {
					result.propagatedNodes.push(conn.targetNode);
					result.affectedEdges.push(conn.edge);
					result.confidenceDecay *= conn.edge.confidence * decayRate; // Decay per layer
					result.totalLatency += conn.edge.latency;
				}
			}
		}

		return result;
	}

	/**
	 * 1.1.1.1.4.1.6 HiddenEdge Detection → INVISIBLE ARB
	 */
	async findHiddenEdges(
		criteria: HiddenEdgeCriteria,
		confidenceThreshold: number = 0.85,
	): Promise<HiddenEdgeResult[]> {
		const minWeight = criteria.minWeight ?? 0.02;
		const layerFilter = criteria.layer ? `AND e.layer_id = '${criteria.layer}'` : "";
		const ageFilter = criteria.maxAge
			? `AND e.detected_at > ${Date.now() - criteria.maxAge}`
			: `AND e.detected_at > ${Date.now() - 3600000}`; // 1 hour ago

		const results = await this.db
			.query(
				`
			SELECT 
				e.id, e.layer_id, e.edge_id, e.source, e.target, e.type, e.weight, 
				e.confidence, e.latency, e.metadata, e.detected_at, e.last_verified,
				n1.data as source_data,
				n2.data as target_data,
				(e.weight * e.confidence * 
				 COALESCE((SELECT weight FROM edges e2 
				          WHERE e2.source = e.target 
				          ORDER BY e2.detected_at DESC LIMIT 1), 1.0)) as anomaly_score
			FROM edges e
			JOIN nodes n1 ON e.source = n1.node_id
			JOIN nodes n2 ON e.target = n2.node_id
			WHERE e.confidence > ? 
			  AND e.layer_id IN ('L4_SPORT', 'L3_EVENT')
			  AND e.weight > ?
			  ${layerFilter}
			  ${ageFilter}
			ORDER BY anomaly_score DESC
			LIMIT 100
		`,
			)
			.all(confidenceThreshold, minWeight);

		return results.map((row: any) => ({
			edge: {
				id: row.edge_id,
				source: row.source,
				target: row.target,
				type: row.type,
				weight: row.weight,
				confidence: row.confidence,
				latency: row.latency,
				metadata: JSON.parse(row.metadata),
				detectedAt: row.detected_at,
				lastVerified: row.last_verified,
			},
			sourceData: JSON.parse(row.source_data),
			targetData: JSON.parse(row.target_data),
			anomalyScore: row.anomaly_score,
			arbitragePercent: row.weight * 100,
		}));
	}

	/**
	 * 1.1.1.1.4.3.7 Multi-Layer Risk Assessment
	 */
	async detectAnomalyPatterns(): Promise<AnomalyPattern[]> {
		const patterns = await this.db
			.query(
				`
			WITH anomaly_edges AS (
				SELECT 
					e.*,
					(e.weight * e.confidence * (1.0 - CAST(e.latency AS REAL)/1000.0)) as risk_score
				FROM edges e
				WHERE e.layer_id IN ('L1_DIRECT', 'L4_SPORT')
				  AND EXISTS (
				    SELECT 1 FROM nodes n 
				    WHERE n.node_id = e.source AND n.anomaly_score > 0.2
				  )
			)
			SELECT 
				ae.layer_id as layer,
				COUNT(*) as edge_count,
				AVG(ae.risk_score) as avg_risk,
				MAX(ae.weight) as max_profit_pct
			FROM anomaly_edges ae
			GROUP BY ae.layer_id
			HAVING edge_count > 3
			ORDER BY avg_risk DESC
		`,
			)
			.all();

		return patterns.map((p: any) => ({
			layer: p.layer,
			edgeCount: p.edge_count,
			avgRisk: p.avg_risk,
			maxProfitPct: p.max_profit_pct,
			arbPriority: p.avg_risk * p.edge_count, // Execute score
		}));
	}

	/**
	 * Production Metrics
	 */
	getGraphMetrics(): GraphMetrics {
		const nodeCount = this.db
			.query("SELECT COUNT(*) as count FROM nodes")
			.get() as { count: number };

		const edgeCount = this.db
			.query("SELECT COUNT(*) as count FROM edges")
			.get() as { count: number };

		const hiddenEdges = this.db
			.query(
				"SELECT COUNT(*) as count FROM edges WHERE confidence > 0.9 AND layer_id IN ('L4_SPORT', 'L3_EVENT')",
			)
			.get() as { count: number };

		const liveArbs = this.db
			.query(
				"SELECT COUNT(*) as count FROM edges WHERE layer_id = 'L1_DIRECT' AND weight > 0.025",
			)
			.get() as { count: number };

		return {
			nodeCount: nodeCount.count,
			edgeCount: edgeCount.count,
			hiddenEdges: hiddenEdges.count,
			liveArbs: liveArbs.count,
			scanTimestamp: Date.now(),
		};
	}

	/**
	 * Build full graph for a league
	 */
	async buildFullGraph(league: string): Promise<void> {
		// This would integrate with your existing graph builders
		// For now, it's a placeholder that can be extended
		console.log(`[MLGS] Building full graph for league: ${league}`);
		// TODO: Integrate with layer builders
	}
}

/**
 * Default instance factory
 */
export function createMLGSGraph(dbPath: string = "data/mlgs.db"): MLGSGraph<GraphNode, GraphEdge> {
	return new MLGSGraph(dbPath);
}
