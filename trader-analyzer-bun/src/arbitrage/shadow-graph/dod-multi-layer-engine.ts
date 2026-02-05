/**
 * @fileoverview DoD-Grade Multi-Layer Correlation Engine
 * @description Mission-critical correlation engine with defense-grade resilience
 * @module arbitrage/shadow-graph/dod-multi-layer-engine
 * 
 * [DoD][DOMAIN:SportsBetting][SCOPE:MultiLayerCorrelation][TYPE:CoreEngine]
 * [META:{latency:ms, confidence:0-1, propagation:bps}][CLASS:MissionCritical]
 * [#REF:STANAG-4609]
 */

import { Database } from "bun:sqlite";
import { z } from "zod";
import type { HiddenEdge } from "./multi-layer-enhanced-types";

// ==================== [DoD][CLASS:InputValidation] ====================
export const DoD_VALIDATION = {
	eventId: z.string().regex(/^[A-Z]{3,4}-\d{8}-\d{4}$/, "INVALID_EVENT_ID"),
	nodeId: z.string().min(10).max(128),
	correlationStrength: z.number().min(-1).max(1),
	confidenceThreshold: z.number().min(0).max(1),
	timestamp: z.number().int().positive(),
} as const;

// ==================== [DoD][CLASS:CircuitBreaker] ====================
class ResilienceGovernor {
	private breakers = new Map<
		string,
		{ failures: number; lastFailure: number; open: boolean }
	>();

	async execute<T>(
		key: string,
		fn: () => Promise<T>,
		fallback: T,
	): Promise<T> {
		const state =
			this.breakers.get(key) || { failures: 0, lastFailure: 0, open: false };

		if (state.open && Date.now() - state.lastFailure < 30000) {
			console.warn(`[CIRCUIT_OPEN] ${key}`);
			return fallback;
		}

		try {
			const result = await fn();
			this.breakers.set(key, { failures: 0, lastFailure: 0, open: false });
			return result;
		} catch (e) {
			state.failures++;
			state.lastFailure = Date.now();
			if (state.failures >= 3) state.open = true;
			this.breakers.set(key, state);
			console.error(`[CIRCUIT_FAILURE] ${key}:`, e);
			return fallback;
		}
	}

	getStatus(): Record<string, { open: boolean; failures: number }> {
		const status: Record<string, { open: boolean; failures: number }> = {};
		for (const [key, state] of this.breakers.entries()) {
			status[key] = { open: state.open, failures: state.failures };
		}
		return status;
	}
}

// ==================== [DoD][CLASS:AuditTrail] ====================
class AuditLogger {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
		this.db.run(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        operation TEXT NOT NULL,
        event_id TEXT NOT NULL,
        layer INTEGER NOT NULL,
        outcome TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        user_context TEXT,
        INDEX idx_audit_time (timestamp)
      )
    `);
	}

	log(
		operation: string,
		eventId: string,
		layer: number,
		outcome: string,
		latency: number,
		userContext: string = "system",
	) {
		this.db.run(
			`INSERT INTO audit_log (timestamp, operation, event_id, layer, outcome, latency_ms, user_context) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[Date.now(), operation, eventId, layer, outcome, latency, userContext],
		);
	}

	getRecentLogs(limit: number = 100): Array<{
		timestamp: number;
		operation: string;
		event_id: string;
		layer: number;
		outcome: string;
		latency_ms: number;
	}> {
		const query = this.db.query(`
      SELECT timestamp, operation, event_id, layer, outcome, latency_ms
      FROM audit_log
      ORDER BY timestamp DESC
      LIMIT ?
    `);
		return query.all(limit) as any[];
	}
}

// ==================== [DoD][CLASS:MultiLayerGraph] ====================
export class DoDMultiLayerCorrelationGraph {
	private readonly db: Database;
	private readonly governor: ResilienceGovernor;
	private readonly auditor: AuditLogger;
	private readonly config = {
		thresholds: { layer4: 0.85, layer3: 0.75, layer2: 0.65, layer1: 0.55 },
		windows: { crossSport: 3_600_000, crossEvent: 604_800_000 },
		maxPropagationDepth: 4,
		auditEnabled: true,
	} as const;

	constructor(db: Database) {
		this.db = db;
		this.governor = new ResilienceGovernor();
		this.auditor = new AuditLogger(db);
		this.initializeSchema();
	}

	private initializeSchema() {
		// [DoD][REF:SCHEMA-MLC-001]
		this.db.run(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA cache_size = -64000; -- 64MB cache
      
      CREATE TABLE IF NOT EXISTS multi_layer_correlations (
        correlation_id INTEGER PRIMARY KEY,
        layer INTEGER NOT NULL CHECK(layer BETWEEN 1 AND 4),
        event_id TEXT NOT NULL,
        source_node TEXT NOT NULL CHECK(length(source_node) >= 10),
        target_node TEXT NOT NULL CHECK(length(target_node) >= 10),
        correlation_type TEXT NOT NULL,
        correlation_score REAL NOT NULL CHECK(correlation_score BETWEEN -1 AND 1),
        latency_ms INTEGER NOT NULL CHECK(latency_ms >= 0),
        expected_propagation REAL NOT NULL,
        detected_at INTEGER NOT NULL,
        confidence REAL NOT NULL CHECK(confidence BETWEEN 0 AND 1),
        severity_level TEXT CHECK(severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        INDEX idx_layer_confidence (layer, confidence),
        INDEX idx_event_detection (event_id, detected_at),
        UNIQUE(event_id, source_node, target_node, detected_at)
      )
    `);
	}

	// ==================== [DoD][SCOPE:BuildOps] ====================
	async buildMultiLayerGraph(eventId: string): Promise<ValidatedGraph | null> {
		const start = performance.now();
		const validation = DoD_VALIDATION.eventId.safeParse(eventId);

		if (!validation.success) {
			this.auditor.log(
				"BUILD_GRAPH",
				eventId,
				0,
				"VALIDATION_FAILED",
				performance.now() - start,
			);
			return null;
		}

		const layers = await Promise.all([
			this.governor.execute("L4_BUILD", () => this.buildLayer4(eventId), null),
			this.governor.execute("L3_BUILD", () => this.buildLayer3(eventId), null),
			this.governor.execute("L2_BUILD", () => this.buildLayer2(eventId), null),
			this.governor.execute("L1_BUILD", () => this.buildLayer1(eventId), null),
		]);

		const graph: ValidatedGraph = {
			eventId,
			timestamp: Date.now(),
			layers: {
				L4: layers[0],
				L3: layers[1],
				L2: layers[2],
				L1: layers[3],
			},
			metrics: {
				buildLatency: performance.now() - start,
				layerSuccessRate:
					layers.filter((l) => l !== null).length / 4,
			},
		};

		this.auditor.log(
			"BUILD_GRAPH",
			eventId,
			0,
			"SUCCESS",
			graph.metrics.buildLatency,
		);
		return graph;
	}

	// ==================== [DoD][SCOPE:Layer4CrossSport] ====================
	private async buildLayer4(eventId: string): Promise<LayerData | null> {
		try {
			const sport = this.extractSport(eventId);
			const sql = `
      WITH shared_entities AS (
        SELECT entity_name, sport_b, correlation_baseline, games_played
        FROM cross_sport_index
        WHERE sport_a = ? AND last_calculated > ?
      )
      SELECT 
        se.entity_name as shared_entity,
        cse.source_node,
        cse.target_node,
        cse.correlation_score as strength,
        cse.latency_ms as latency,
        se.correlation_baseline as baseline,
        (cse.correlation_score - se.correlation_baseline) as deviation
      FROM multi_layer_correlations cse
      JOIN shared_entities se ON cse.source_node LIKE '%' || se.entity_name || '%'
      WHERE cse.layer = 4 AND cse.event_id = ?
      ORDER BY deviation DESC
      LIMIT 50
    `;

			const correlations = this.db.prepare(sql).all(
				sport,
				Date.now() - 86400000,
				eventId,
			) as any[];

			return {
				layer: 4,
				correlations,
				status: "OPERATIONAL" as const,
			};
		} catch (e) {
			console.error("[LAYER4_BUILD_ERROR]", e);
			return null;
		}
	}

	// ==================== [DoD][SCOPE:Layer3CrossEvent] ====================
	private async buildLayer3(eventId: string): Promise<LayerData | null> {
		try {
			const sql = `
      SELECT 
        event1_id as source_node,
        event2_id as target_node,
        correlation_strength as strength,
        lag_ms as latency,
        confidence
      FROM cross_event_edges
      WHERE event1_id = ? OR event2_id = ?
      ORDER BY correlation_strength DESC
      LIMIT 50
    `;

			const correlations = this.db.prepare(sql).all(eventId, eventId) as any[];

			return {
				layer: 3,
				correlations,
				status: "OPERATIONAL" as const,
			};
		} catch (e) {
			console.error("[LAYER3_BUILD_ERROR]", e);
			return null;
		}
	}

	// ==================== [DoD][SCOPE:Layer2CrossMarket] ====================
	private async buildLayer2(eventId: string): Promise<LayerData | null> {
		try {
			const sql = `
      SELECT 
        market1 as source_node,
        market2 as target_node,
        correlation_strength as strength,
        lag_ms as latency,
        confidence
      FROM multi_layer_correlations
      WHERE layer = 2 AND event_id = ?
      ORDER BY correlation_strength DESC
      LIMIT 50
    `;

			const correlations = this.db.prepare(sql).all(eventId) as any[];

			return {
				layer: 2,
				correlations,
				status: "OPERATIONAL" as const,
			};
		} catch (e) {
			console.error("[LAYER2_BUILD_ERROR]", e);
			return null;
		}
	}

	// ==================== [DoD][SCOPE:Layer1Direct] ====================
	private async buildLayer1(eventId: string): Promise<LayerData | null> {
		try {
			const sql = `
      SELECT 
        parent_market as source_node,
        child_market as target_node,
        actual_correlation as strength,
        lag_ms as latency,
        confidence
      FROM multi_layer_correlations
      WHERE layer = 1 AND event_id = ?
      ORDER BY actual_correlation DESC
      LIMIT 50
    `;

			const correlations = this.db.prepare(sql).all(eventId) as any[];

			return {
				layer: 1,
				correlations,
				status: "OPERATIONAL" as const,
			};
		} catch (e) {
			console.error("[LAYER1_BUILD_ERROR]", e);
			return null;
		}
	}

	// ==================== [DoD][SCOPE:AnomalyDetection] ====================
	async detectAnomalies(
		graph: ValidatedGraph,
		minConfidence = 0.6,
	): Promise<EnrichedEdge[]> {
		const edges: EnrichedEdge[] = [];

		for (const [layerKey, layerData] of Object.entries(graph.layers)) {
			if (!layerData) continue;

			const layerNum = parseInt(layerKey.replace("L", ""));
			const detector = this.getDetector(layerNum);
			const detected = await this.governor.execute(
				`L${layerNum}_DETECT`,
				() => detector(layerData),
				[],
			);

			edges.push(
				...detected.map((e) => ({
					...e,
					severity: this.calculateSeverity(e.confidence, e.layer),
					timestamp: Date.now(),
					eventId: graph.eventId,
				})),
			);
		}

		// Persist critical anomalies
		const critical = edges.filter((e) => e.severity === "CRITICAL");
		if (critical.length > 0) {
			this.persistEdges(critical);
		}

		return edges.filter((e) => e.confidence >= minConfidence);
	}

	private getDetector(layer: number): (data: LayerData) => Promise<EnrichedEdge[]> {
		return async (data: LayerData) => {
			const edges: EnrichedEdge[] = [];

			for (const corr of data.correlations || []) {
				const confidence = corr.confidence || corr.strength || 0.5;
				const threshold =
					this.config.thresholds[
						`layer${layer}` as keyof typeof this.config.thresholds
					];

				if (confidence > threshold) {
					edges.push({
						edge_id: `${corr.source_node}:${corr.target_node}:${Date.now()}`,
						source_layer: `layer${layer}` as any,
						target_layer: `layer${layer}` as any,
						source_node: corr.source_node,
						target_node: corr.target_node,
						detection_method: `layer${layer}_detector`,
						confidence,
						latency_ms: corr.latency || 0,
						signal_strength: corr.strength || 0,
						verified: false,
						verification_count: 0,
						false_positive_rate: 0,
						risk_score: 1 - confidence,
						profit_potential: corr.strength || 0,
						execution_window_ms: 60000,
						layer,
						type: `layer${layer}_correlation`,
						source: corr.source_node,
						target: corr.target_node,
						correlation: corr.strength || 0,
						expected_propagation: corr.strength || 0,
						severity: this.calculateSeverity(confidence, layer),
						eventId: "",
						timestamp: Date.now(),
					});
				}
			}

			return edges;
		};
	}

	private calculateSeverity(confidence: number, layer: number): Severity {
		const threshold =
			this.config.thresholds[`layer${layer}` as keyof typeof this.config.thresholds];
		if (confidence > threshold + 0.2) return "CRITICAL";
		if (confidence > threshold + 0.1) return "HIGH";
		if (confidence > threshold) return "MEDIUM";
		return "LOW";
	}

	// ==================== [DoD][SCOPE:Persistence] ====================
	private persistEdges(edges: EnrichedEdge[]): void {
		const stmt = this.db.prepare(`
      INSERT INTO multi_layer_correlations 
      (layer, event_id, source_node, target_node, correlation_type, correlation_score, 
       latency_ms, expected_propagation, detected_at, confidence, severity_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_id, source_node, target_node, detected_at) DO UPDATE SET
        correlation_score = excluded.correlation_score,
        confidence = excluded.confidence,
        severity_level = excluded.severity_level
    `);

		const insert = this.db.transaction((rows: any[]) => {
			for (const row of rows) stmt.run(...row);
		});

		insert(
			edges.map((e) => [
				e.layer,
				e.eventId,
				e.source,
				e.target,
				e.type,
				e.correlation,
				e.latency_ms,
				e.expected_propagation,
				e.timestamp,
				e.confidence,
				e.severity,
			]),
		);
	}

	// ==================== [DoD][CLASS:PropagationEngine] ====================
	async predictPropagationPath(
		sourceNode: string,
		targetNode: string,
		maxDepth = 4,
	): Promise<PropagationPath> {
		const paths = this.db
			.prepare(`
      WITH RECURSIVE propagation_path AS (
        SELECT 
          source_node, target_node, correlation_score, latency_ms, layer, 1 as depth,
          CAST(correlation_score AS REAL) as cumulative_impact
        FROM multi_layer_correlations
        WHERE source_node = ? AND detected_at > ?
        
        UNION ALL
        
        SELECT 
          mc.source_node, mc.target_node, mc.correlation_score, mc.latency_ms, mc.layer,
          pp.depth + 1, pp.cumulative_impact * mc.correlation_score
        FROM multi_layer_correlations mc
        JOIN propagation_path pp ON mc.source_node = pp.target_node
        WHERE pp.depth < ? AND mc.detected_at > ?
      )
      SELECT * FROM propagation_path
      WHERE target_node = ?
      ORDER BY cumulative_impact DESC
      LIMIT 1
    `)
			.all(
				sourceNode,
				Date.now() - 300000,
				maxDepth,
				Date.now() - 300000,
				targetNode,
			) as Array<{
			source_node: string;
			target_node: string;
			latency_ms: number;
			cumulative_impact: number;
		}>;

		return {
			path: paths.map((p) => ({
				source: p.source_node,
				target: p.target_node,
				impact: p.cumulative_impact,
				latency: p.latency_ms,
			})),
			totalLatency: paths.reduce((a, b) => a + b.latency_ms, 0),
			finalImpact: paths[paths.length - 1]?.cumulative_impact || 0,
			confidence: Math.pow(0.9, paths.length), // Exponential decay
		};
	}

	// ==================== [DoD][CLASS:Utility] ====================
	private extractSport(eventId: string): string {
		return eventId.split("-")[0].toUpperCase();
	}

	private getRelatedSports(sport: string): string[] {
		const map: Record<string, string[]> = {
			NFL: ["NBA", "NHL"],
			NBA: ["NFL", "NHL", "MLB"],
			MLB: ["NBA", "NFL"],
			NHL: ["NFL", "NBA"],
		};
		return map[sport] || [];
	}

	// ==================== [DoD][CLASS:HealthCheck] ====================
	getHealthStatus(): HealthStatus {
		const circuitStatus = this.governor.getStatus();
		const openCircuits = Object.values(circuitStatus).filter((s) => s.open).length;
		const recentLogs = this.auditor.getRecentLogs(10);
		const failures = recentLogs.filter((l) => l.outcome === "FAILED").length;

		// Measure DB latency
		const dbStart = performance.now();
		this.db.prepare("SELECT 1").get();
		const dbLatency = performance.now() - dbStart;

		return {
			status:
				dbLatency < 100 && openCircuits < 2 && failures < 3
					? "HEALTHY"
					: "DEGRADED",
			timestamp: Date.now(),
			metrics: {
				dbLatency,
				openCircuits,
				recentFailures: failures,
				circuitBreakers: circuitStatus,
			},
			failover:
				process.env.FAILOVER_ENABLED === "true" && openCircuits >= 3,
		};
	}
}

// ==================== [DoD][EXPORT:ModuleInterface] ====================
export interface ValidatedGraph {
	eventId: string;
	timestamp: number;
	layers: {
		L4: LayerData | null;
		L3: LayerData | null;
		L2: LayerData | null;
		L1: LayerData | null;
	};
	metrics: { buildLatency: number; layerSuccessRate: number };
}

export interface EnrichedEdge extends HiddenEdge {
	severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
	eventId: string;
	timestamp: number;
	layer: number;
	type: string;
	source: string;
	target: string;
	correlation: number;
	expected_propagation: number;
}

export interface PropagationPath {
	path: Array<{ source: string; target: string; impact: number; latency: number }>;
	totalLatency: number;
	finalImpact: number;
	confidence: number;
}

export interface HealthStatus {
	status: "HEALTHY" | "DEGRADED" | "CRITICAL";
	timestamp: number;
	metrics: {
		dbLatency: number;
		openCircuits: number;
		recentFailures: number;
		circuitBreakers: Record<string, { open: boolean; failures: number }>;
	};
	failover: boolean;
}

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type LayerData = {
	layer: number;
	correlations: any[];
	status: "OPERATIONAL" | "DEGRADED" | "FAILED";
};
