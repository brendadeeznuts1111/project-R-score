/**
 * @fileoverview MultiLayerCorrelationGraph with Layered Interfaces and Propagation Prediction
 * @description Multi-layer correlation detection system for hidden edge discovery
 * @module arbitrage/shadow-graph/multi-layer-correlation-graph
 */

import { Database } from "bun:sqlite";
import {
	CorrelationConfigService,
	type CorrelationConfig,
} from "./multi-layer-config";
import { CircuitBreaker, safeBuildLayer } from "./multi-layer-resilience";
import { ObservabilityService } from "./multi-layer-observability";
import { batchInsertCorrelations } from "./multi-layer-batch-operations";
import { TimezoneService, type TimezoneKey } from "../../core/timezone";

/**
 * 1.1.1.1.4.1.1: MultiLayerGraph Interface Definition
 */
export interface MultiLayerGraph {
	layer1: Layer1DirectCorrelations;
	layer2: Layer2CrossMarketCorrelations;
	layer3: Layer3CrossEventCorrelations;
	layer4: Layer4CrossSportCorrelations;
	detection_priority: Array<(graph: MultiLayerGraph) => Promise<HiddenEdge[]>>;
}

/**
 * 1.1.1.1.4.1.2: Layer4 Cross-Sport Correlation Schema
 */
export interface Layer4CrossSportCorrelations {
	sport1: string;
	sport2: string[]; // Fixed: Use array instead of comma-joined string
	correlations: CrossSportCorrelation[];
}

export interface CrossSportCorrelation {
	shared_entity: string; // e.g., "LeBron James", "Lakers"
	sport1_market: string;
	sport2_market: string;
	strength: number; // 0-1
	latency: number; // ms
	last_update: number;
}

/**
 * 1.1.1.1.4.1.3: Layer3 Cross-Event Correlation Schema
 */
export interface Layer3CrossEventCorrelations {
	event_id_a: string;
	event_id_b: string;
	correlation_type: "team_futures" | "player_fatigue" | "coach_strategy";
	correlations: CrossEventCorrelation[];
}

export interface CrossEventCorrelation {
	entity: string;
	strength: number;
	temporal_distance: number; // hours between events
	expected_propagation: number; // points
}

/**
 * 1.1.1.1.4.1.4: Layer2 Cross-Market Correlation Schema
 */
export interface Layer2CrossMarketCorrelations {
	event_id: string;
	correlations: CrossMarketCorrelation[];
}

export interface CrossMarketCorrelation {
	market1: string; // e.g., "total"
	market2: string; // e.g., "spread"
	base_correlation: number; // historical correlation
	current_deviation: number; // current deviation from base
	correlation_break: boolean;
	break_magnitude: number;
}

/**
 * 1.1.1.1.4.1.5: Layer1 Direct Correlation Schema
 */
export interface Layer1DirectCorrelations {
	event_id: string;
	correlations: DirectCorrelation[];
}

export interface DirectCorrelation {
	parent_node: string; // e.g., "full_game"
	child_node: string; // e.g., "q1"
	expected_ratio: number; // e.g., 0.5 (Q1 should be ~50% of full)
	actual_ratio: number;
	latency: number;
	deviation: number;
	is_anomaly: boolean;
}

/**
 * 1.1.1.1.4.1.6: HiddenEdge Detection Result Type
 */
export interface HiddenEdge {
	type: "cross_sport" | "cross_event" | "cross_market" | "direct_latency";
	layer: number;
	confidence: number;
	source: string;
	target: string;
	correlation: number;
	latency: number;
	expected_propagation: number;
	timestamp: number;
	hidden_steam_confirmed?: boolean;
	steam_severity?: number;
}

/**
 * 1.1.1.1.4.1.7: Propagation Prediction Engine
 */
export interface PropagationPath {
	source: string;
	target: string;
	layer: number;
	impact: number;
	latency: number;
	confidence: number;
}

/**
 * MultiLayerCorrelationGraph Class
 */
export class MultiLayerCorrelationGraph {
	private db: Database;
	private config: CorrelationConfigService;
	private observability: ObservabilityService;
	private correlationBreaker: CircuitBreaker;
	private marketNodeBreaker: CircuitBreaker;
	private readonly timezoneService: TimezoneService;

	// [DoD][FIX:MemoryLeak] Detectors bound once in constructor to prevent memory leaks
	// Fixes memory leak risk from .bind() creating new function instances on every call
	private readonly detectors: ReadonlyArray<(graph: MultiLayerGraph) => Promise<HiddenEdge[]>>;

	/**
	 * 1.1.1.1.4.2.1: MultiLayerCorrelationGraph Constructor
	 * [DoD][TIMEZONE] Added timezone service for timezone-aware timestamp handling
	 * 
	 * @param db - Database instance
	 * @param timezoneService - TimezoneService instance (required for DoD compliance)
	 * @param config - Optional correlation configuration
	 * @param observability - Optional observability service
	 */
	constructor(
		db: Database,
		timezoneService: TimezoneService,
		config?: Partial<CorrelationConfig>,
		observability?: ObservabilityService,
	) {
		this.db = db;
		this.timezoneService = timezoneService;
		this.config = new CorrelationConfigService(config);
		this.observability = observability || new ObservabilityService();
		this.initializeDatabase();

		// Initialize circuit breakers
		this.correlationBreaker = new CircuitBreaker(
			this.calculateCrossCorrelation.bind(this),
			{
				timeout: this.config.getQueryTimeout(),
				errorThresholdPercentage: this.config.getCircuitBreakerThreshold(),
				resetTimeout: 30000,
			},
		);

		this.marketNodeBreaker = new CircuitBreaker(this.getMarketNode.bind(this), {
			timeout: this.config.getQueryTimeout(),
			errorThresholdPercentage: this.config.getCircuitBreakerThreshold(),
			resetTimeout: 30000,
		});

		// Bind detectors once in constructor to prevent memory leaks
		this.detectors = [
			this.detectLayer4Anomalies.bind(this),
			this.detectLayer3Anomalies.bind(this),
			this.detectLayer2Anomalies.bind(this),
			this.detectLayer1Anomalies.bind(this),
		] as const;
	}

	/**
	 * Initialize database schema
	 */
	private initializeDatabase(): void {
		// Schema initialization handled by database.ts
		// This method can be used for additional setup if needed
	}

	/**
	 * 1.1.1.1.4.2.7: Full Multi-Layer Graph Assembly
	 */
	async buildMultiLayerGraph(eventId: string): Promise<MultiLayerGraph> {
		// Input validation
		if (!this.config.validateEventId(eventId)) {
			throw new Error(`Invalid eventId: ${eventId}`);
		}

		const spanId = this.observability.startSpan("buildMultiLayerGraph", {
			eventId,
		});

		try {
			const timestamp = Date.now();

			// 1.1.1.1.4.2.2 Cross-Sport Graph Builder (with error handling)
			const layer4 = await safeBuildLayer(
				() => this.buildCrossSportCorrelations(eventId),
				{ sport1: "", sport2: [], correlations: [] },
				"Layer4",
				this.observability as any,
			);

			// 1.1.1.1.4.2.3 Cross-Event Graph Builder
			const layer3 = await safeBuildLayer(
				() => this.buildCrossEventCorrelations(eventId),
				{
					event_id_a: eventId,
					event_id_b: "",
					correlation_type: "player_fatigue",
					correlations: [],
				},
				"Layer3",
				this.observability as any,
			);

			// 1.1.1.1.4.2.4 Cross-Market Graph Builder
			const layer2 = await safeBuildLayer(
				() => this.buildCrossMarketCorrelations(eventId),
				{ event_id: eventId, correlations: [] },
				"Layer2",
				this.observability as any,
			);

			// 1.1.1.1.4.2.5 Direct Correlation Graph Builder
			const layer1 = await safeBuildLayer(
				() => this.buildDirectCorrelations(eventId),
				{ event_id: eventId, correlations: [] },
				"Layer1",
				this.observability as any,
			);

			this.observability.recordMetric(
				"graph.build.duration",
				Date.now() - timestamp,
				"histogram",
				{
					eventId,
				},
			);

			return {
				layer1,
				layer2,
				layer3,
				layer4,
				detection_priority: this.detectors, // Use pre-bound detectors (memory leak fix)
			};
		} finally {
			this.observability.endSpan(spanId);
		}
	}

	/**
	 * 1.1.1.1.4.2.2: Cross-Sport Graph Builder (Optimized with bulk operations)
	 */
	private async buildCrossSportCorrelations(
		eventId: string,
	): Promise<Layer4CrossSportCorrelations> {
		const spanId = this.observability.startSpan("buildCrossSportCorrelations", {
			eventId,
		});

		try {
			const sport = this.extractSportFromEvent(eventId);
			const relatedSports = await this.getRelatedSportsDynamic(sport); // Use dynamic lookup

			const correlations: CrossSportCorrelation[] = [];

			// Bulk fetch shared entities
			const allSharedEntities = await this.getSharedEntitiesBulk(
				sport,
				relatedSports,
			);

			// Bulk fetch markets
			const markets = await this.getMarketsBulk(
				eventId,
				sport,
				relatedSports,
				allSharedEntities,
			);

			// Process correlations in batches
			const batchSize = this.config.getBatchSize();
			for (let i = 0; i < markets.length; i += batchSize) {
				const batch = markets.slice(i, i + batchSize);
				const batchCorrelations = await Promise.all(
					batch.map(async ({ sport1Market, sport2Market, entity }) => {
						if (!sport1Market || !sport2Market) return null;

						try {
							const strength = await this.correlationBreaker.fire(
								sport1Market.nodeId,
								sport2Market.nodeId,
								3600000,
							);

							const latency = await this.measureCrossSportLatency(
								sport1Market.nodeId,
								sport2Market.nodeId,
							);

							this.observability.recordMetric(
								"correlation.strength",
								strength,
								"histogram",
								{
									layer: "4",
									sport: sport,
								},
							);

							return {
								shared_entity: entity,
								sport1_market: sport1Market.nodeId,
								sport2_market: sport2Market.nodeId,
								strength,
								latency,
								last_update: Date.now(),
							};
						} catch (error) {
							this.observability.recordMetric(
								"correlation.error",
								1,
								"counter",
								{
									layer: "4",
									error: (error as Error).message,
								},
							);
							return null;
						}
					}),
				);

				correlations.push(
					...batchCorrelations.filter(
						(c): c is CrossSportCorrelation => c !== null,
					),
				);
			}

			return { sport1: sport, sport2: relatedSports, correlations };
		} finally {
			this.observability.endSpan(spanId);
		}
	}

	/**
	 * 1.1.1.1.4.2.3: Cross-Event Graph Builder
	 */
	private async buildCrossEventCorrelations(
		eventId: string,
	): Promise<Layer3CrossEventCorrelations> {
		const team = await this.getEventTeam(eventId);
		// [DoD][TIMEZONE] Detect event timezone for accurate temporal distance calculation
		const eventTz = this.timezoneService.detectEventTimezone(eventId);
		const now = Date.now();
		const localNow = this.timezoneService.convertTimestamp(now, "UTC", eventTz)
			.local;

		// Use local time for temporal distance calculations
		// This ensures "hours between events" is accurate for the event's timezone
		const withinHours = 168; // Next 7 days
		const futureEvents = await this.getFutureEvents(team, withinHours, eventTz);

		const correlations: CrossEventCorrelation[] = [];

		for (const futureEvent of futureEvents) {
			// [DoD][TIMEZONE] Use timezone-aware timestamps for accurate temporal distance
			const futureEventLocal = this.timezoneService.convertTimestamp(
				futureEvent.startTime,
				"UTC",
				eventTz,
			).local;
			const temporalDistance = (futureEventLocal - localNow) / 3600000;

			// Check for player fatigue patterns
			const fatigueCorrelation = await this.calculateFatigueImpact(
				eventId,
				futureEvent.eventId,
			);

			// Check for team strategy adjustments
			const strategyCorrelation = await this.calculateStrategyAdjustment(
				eventId,
				futureEvent.eventId,
			);

			if (fatigueCorrelation > 0.3) {
				correlations.push({
					entity: team,
					strength: fatigueCorrelation,
					temporal_distance: temporalDistance,
					expected_propagation: this.predictFatiguePropagation(
						fatigueCorrelation,
						temporalDistance,
					),
				});
			}
		}

		return {
			event_id_a: eventId,
			event_id_b: futureEvents.map((e) => e.eventId).join(","),
			correlation_type: "player_fatigue",
			correlations,
		};
	}

	/**
	 * 1.1.1.1.4.2.4: Cross-Market Graph Builder
	 */
	private async buildCrossMarketCorrelations(
		eventId: string,
	): Promise<Layer2CrossMarketCorrelations> {
		const markets = ["total", "spread", "moneyline", "team_total"];
		const correlations: CrossMarketCorrelation[] = [];

		for (let i = 0; i < markets.length; i++) {
			for (let j = i + 1; j < markets.length; j++) {
				const market1 = markets[i];
				const market2 = markets[j];

				const baseCorrelation = await this.getHistoricalCorrelation(
					eventId,
					market1,
					market2,
					30, // lookbackDays
				);

				const currentDeviation = await this.calculateCurrentDeviation(
					eventId,
					market1,
					market2,
				);

				correlations.push({
					market1,
					market2,
					base_correlation: baseCorrelation,
					current_deviation: currentDeviation,
					correlation_break: Math.abs(currentDeviation) > 0.3,
					break_magnitude: Math.abs(currentDeviation),
				});
			}
		}

		return { event_id: eventId, correlations };
	}

	/**
	 * 1.1.1.1.4.2.5: Direct Correlation Graph Builder
	 */
	private async buildDirectCorrelations(
		eventId: string,
	): Promise<Layer1DirectCorrelations> {
		const nodePairs = await this.getParentChildNodes(eventId);
		const correlations: DirectCorrelation[] = [];

		for (const { parent, child } of nodePairs) {
			const expectedRatio = this.getExpectedRatio(child.period);
			const actualRatio = await this.calculateActualRatio(
				parent.nodeId,
				child.nodeId,
			);

			const latency = await this.measurePropagationLatency(
				parent.nodeId,
				child.nodeId,
			);
			const deviation = Math.abs(expectedRatio - actualRatio);

			correlations.push({
				parent_node: parent.nodeId,
				child_node: child.nodeId,
				expected_ratio: expectedRatio,
				actual_ratio: actualRatio,
				latency,
				deviation,
				is_anomaly: deviation > 0.15 && latency > 30000, // 30s latency threshold
			});
		}

		return { event_id: eventId, correlations };
	}

	/**
	 * 1.1.1.1.4.3.1: Layer4 Anomaly Detection Algorithm
	 */
	private async detectLayer4Anomalies(
		graph: MultiLayerGraph,
	): Promise<HiddenEdge[]> {
		const anomalies: HiddenEdge[] = [];

		for (const correlation of graph.layer4.correlations) {
			// 1.1.1.1.4.3.5 Hidden Edge Confidence Scoring
			const confidence =
				(correlation.strength * (1000 - Math.min(correlation.latency, 1000))) /
				1000;

			if (correlation.strength > this.config.getThreshold(4)) {
				anomalies.push({
					type: "cross_sport",
					layer: 4,
					confidence,
					source: correlation.sport1_market,
					target: correlation.sport2_market,
					correlation: correlation.strength,
					latency: correlation.latency,
					expected_propagation:
						correlation.strength *
						this.config.getPropagationFactor("cross_sport"),
					timestamp: Date.now(),
				});
			}
		}

		return anomalies;
	}

	/**
	 * 1.1.1.1.4.3.2: Layer3 Anomaly Detection Algorithm
	 */
	private async detectLayer3Anomalies(
		graph: MultiLayerGraph,
	): Promise<HiddenEdge[]> {
		const anomalies: HiddenEdge[] = [];

		for (const correlation of graph.layer3.correlations) {
			// 1.1.1.1.4.3.6 Latency-Weighted Signal Strength (Fixed: Proper normalization)
			const { normalizationHours } = this.config.getTemporalDecay();
			const signalStrength =
				correlation.strength *
				Math.exp(-correlation.temporal_distance / normalizationHours);

			if (signalStrength > this.config.getThreshold(3)) {
				anomalies.push({
					type: "cross_event",
					layer: 3,
					confidence: signalStrength,
					source: graph.layer3.event_id_a,
					target: graph.layer3.event_id_b,
					correlation: correlation.strength,
					latency: correlation.temporal_distance * 3600000, // Temporal gap (not propagation latency)
					expected_propagation: correlation.expected_propagation,
					timestamp: Date.now(),
				});
			}
		}

		return anomalies;
	}

	/**
	 * 1.1.1.1.4.3.3: Layer2 Anomaly Detection Algorithm
	 */
	private async detectLayer2Anomalies(
		graph: MultiLayerGraph,
	): Promise<HiddenEdge[]> {
		const anomalies: HiddenEdge[] = [];

		for (const correlation of graph.layer2.correlations) {
			if (correlation.correlation_break && correlation.break_magnitude > 0.3) {
				// 1.1.1.1.4.3.7 Multi-Layer Risk Assessment
				const riskScore =
					correlation.break_magnitude * correlation.base_correlation;

				anomalies.push({
					type: "cross_market",
					layer: 2,
					confidence: riskScore,
					source: `${graph.layer2.event_id}:${correlation.market1}`,
					target: `${graph.layer2.event_id}:${correlation.market2}`,
					correlation: correlation.current_deviation,
					latency: 0, // Instant within same event
					expected_propagation:
						correlation.break_magnitude *
						this.config.getPropagationFactor("cross_market"),
					timestamp: Date.now(),
				});
			}
		}

		return anomalies;
	}

	/**
	 * 1.1.1.1.4.3.4: Layer1 Anomaly Detection Algorithm
	 */
	private async detectLayer1Anomalies(
		graph: MultiLayerGraph,
	): Promise<HiddenEdge[]> {
		const anomalies: HiddenEdge[] = [];

		for (const correlation of graph.layer1.correlations) {
			if (correlation.is_anomaly) {
				anomalies.push({
					type: "direct_latency",
					layer: 1,
					confidence: correlation.deviation,
					source: correlation.parent_node,
					target: correlation.child_node,
					correlation: correlation.deviation,
					latency: correlation.latency,
					expected_propagation:
						correlation.deviation * correlation.actual_ratio,
					timestamp: Date.now(),
				});
			}
		}

		return anomalies;
	}

	/**
	 * Predict propagation
	 */
	/**
	 * Enhanced propagation prediction (fixes oversimplification)
	 */
	private async predictPropagation(edge: HiddenEdge): Promise<number> {
		// 1.1.1.1.4.1.7 Propagation Prediction Engine
		const liquidity = await this.getMarketLiquidity(edge.target);
		const timeDecay = this.getTimeDecay(edge.timestamp);
		const historicalAccuracy = await this.getEdgeAccuracy(
			edge.source,
			edge.target,
		);
		const propagationFactor = this.config.getPropagationFactor(edge.type);

		return (
			edge.correlation *
			liquidity *
			timeDecay *
			historicalAccuracy *
			propagationFactor
		);
	}

	private async getMarketLiquidity(nodeId: string): Promise<number> {
		// Placeholder - would query shadow_nodes for liquidity
		return 0.8; // Default liquidity
	}

	private getTimeDecay(timestamp: number): number {
		const hoursSinceDetection = (Date.now() - timestamp) / (1000 * 60 * 60);
		return Math.exp(-hoursSinceDetection / 24); // Decay over 24 hours
	}

	private async getEdgeAccuracy(
		source: string,
		target: string,
	): Promise<number> {
		// Placeholder - would query hidden_edge_verifications for historical accuracy
		return 0.7; // Default accuracy
	}

	// Helper methods
	private extractSportFromEvent(eventId: string): string {
		return eventId.split("-")[0] || "unknown";
	}

	private getRelatedSports(sport: string): string[] {
		const sportMap: Record<string, string[]> = {
			nfl: ["nba", "nhl", "mlb"],
			nba: ["nfl", "nhl"],
			mlb: ["nfl", "nba"],
			nhl: ["nba", "nfl"],
		};
		return sportMap[sport] || [];
	}

	/**
	 * Get shared entities in bulk
	 */
	private async getSharedEntitiesBulk(
		sport1: string,
		sports2: string[],
	): Promise<Array<{ sport1: string; sport2: string; entities: string[] }>> {
		const results: Array<{
			sport1: string;
			sport2: string;
			entities: string[];
		}> = [];

		for (const sport2 of sports2) {
			const entities = await this.getSharedEntities(sport1, sport2);
			if (entities.length > 0) {
				results.push({ sport1, sport2, entities });
			}
		}

		return results;
	}

	private async getSharedEntities(
		sport1: string,
		sport2: string,
	): Promise<string[]> {
		try {
			// Try database first
			const query = this.db.query(`
				SELECT DISTINCT shared_entity
				FROM cross_sport_index
				WHERE (sport_a = ? AND sport_b = ?) OR (sport_a = ? AND sport_b = ?)
				AND games_played > 5
				LIMIT 20
			`);

			const results = query.all(sport1, sport2, sport2, sport1) as Array<{
				shared_entity: string;
			}>;
			if (results.length > 0) {
				return results.map((r) => r.shared_entity);
			}
		} catch (error) {
			// Fallback to static map
		}

		// Fallback to static map
		const cityMap: Record<string, string[]> = {
			"nfl-nba": ["Lakers", "Clippers", "Knicks"],
			"nfl-mlb": ["Yankees", "Mets", "Dodgers"],
			"nba-nhl": ["Kings", "Rangers"],
		};
		return (
			cityMap[`${sport1}-${sport2}`] || cityMap[`${sport2}-${sport1}`] || []
		);
	}

	/**
	 * Get markets in bulk (fixes N+1 query problem)
	 */
	private async getMarketsBulk(
		eventId: string,
		sport1: string,
		sports2: string[],
		sharedEntities: Array<{
			sport1: string;
			sport2: string;
			entities: string[];
		}>,
	): Promise<
		Array<{
			sport1Market: { nodeId: string } | null;
			sport2Market: { nodeId: string } | null;
			entity: string;
		}>
	> {
		const markets: Array<{
			sport1Market: { nodeId: string } | null;
			sport2Market: { nodeId: string } | null;
			entity: string;
		}> = [];

		// Batch fetch all markets
		const allNodeIds: string[] = [];
		for (const { sport2, entities } of sharedEntities) {
			for (const entity of entities) {
				allNodeIds.push(`${eventId}:${sport1}:${entity}`);
				allNodeIds.push(`${eventId}:${sport2}:${entity}`);
			}
		}

		// Query database in batch
		const placeholders = allNodeIds.map(() => "?").join(",");
		const query = this.db.query(`
			SELECT node_id FROM shadow_nodes
			WHERE node_id IN (${placeholders})
		`);

		const existingNodes = new Set(
			(query.all(...allNodeIds) as Array<{ node_id: string }>).map(
				(r) => r.node_id,
			),
		);

		// Build market pairs
		for (const { sport2, entities } of sharedEntities) {
			for (const entity of entities) {
				const sport1NodeId = `${eventId}:${sport1}:${entity}`;
				const sport2NodeId = `${eventId}:${sport2}:${entity}`;

				markets.push({
					sport1Market: existingNodes.has(sport1NodeId)
						? { nodeId: sport1NodeId }
						: null,
					sport2Market: existingNodes.has(sport2NodeId)
						? { nodeId: sport2NodeId }
						: null,
					entity,
				});
			}
		}

		return markets;
	}

	private async getMarketNode(
		eventId: string,
		sport: string,
		entity: string,
	): Promise<{ nodeId: string } | null> {
		try {
			const nodeId = `${eventId}:${sport}:${entity}`;
			const query = this.db.query(`
				SELECT node_id FROM shadow_nodes
				WHERE node_id = ?
				LIMIT 1
			`);

			const result = query.get(nodeId) as { node_id: string } | undefined;
			return result ? { nodeId: result.node_id } : null;
		} catch (error) {
			this.observability.recordMetric("market.node.error", 1, "counter");
			return null;
		}
	}

	private async getCrossSportMarket(
		eventId: string,
		sport: string,
		entity: string,
	): Promise<{ nodeId: string } | null> {
		return this.getMarketNode(eventId, sport, entity);
	}

	private async calculateCrossCorrelation(
		nodeId1: string,
		nodeId2: string,
		windowMs: number,
	): Promise<number> {
		try {
			const cutoffTime = Date.now() - windowMs;
			const query = this.db.query(`
				SELECT AVG(ABS(lm1.line - lm2.line)) as avg_diff
				FROM line_movements lm1
				JOIN line_movements lm2 ON ABS(lm1.timestamp - lm2.timestamp) < 5000
				WHERE lm1.node_id = ? AND lm2.node_id = ?
				AND lm1.timestamp > ? AND lm2.timestamp > ?
				LIMIT 100
			`);

			const result = query.get(nodeId1, nodeId2, cutoffTime, cutoffTime) as
				| {
						avg_diff: number;
				  }
				| undefined;

			if (result && result.avg_diff !== null) {
				// Convert to correlation (inverse relationship: smaller diff = higher correlation)
				return Math.max(0, 1 - result.avg_diff / 10); // Normalize to 0-1
			}

			// Fallback: use default correlation
			return 0.6;
		} catch (error) {
			this.observability.recordMetric("correlation.calc.error", 1, "counter");
			return 0.5; // Default correlation on error
		}
	}

	private async measureCrossSportLatency(
		nodeId1: string,
		nodeId2: string,
	): Promise<number> {
		try {
			const query = this.db.query(`
				SELECT AVG(ABS(lm1.timestamp - lm2.timestamp)) as avg_latency
				FROM line_movements lm1
				JOIN line_movements lm2 ON lm2.node_id = ?
				WHERE lm1.node_id = ?
				AND lm2.timestamp > lm1.timestamp
				AND ABS(lm1.timestamp - lm2.timestamp) < 300000
				LIMIT 50
			`);

			const result = query.get(nodeId2, nodeId1) as
				| { avg_latency: number }
				| undefined;

			if (result && result.avg_latency !== null) {
				return result.avg_latency;
			}

			return 30000; // Default 30 seconds
		} catch (error) {
			this.observability.recordMetric("latency.measure.error", 1, "counter");
			return 30000; // Default latency on error
		}
	}

	private async getEventTeam(eventId: string): Promise<string> {
		// Placeholder - would extract from event data
		return eventId.split("-")[1] || "unknown";
	}

	private async getFutureEvents(
		team: string,
		withinHours: number,
		eventTz?: TimezoneKey,
	): Promise<Array<{ eventId: string; startTime: number }>> {
		// [DoD][TIMEZONE] Query events with timezone awareness
		// Placeholder - would query events table with timezone filtering
		return [];
	}

	private async calculateFatigueImpact(
		eventId1: string,
		eventId2: string,
	): Promise<number> {
		// Placeholder - would calculate based on player minutes, rest days, etc.
		return Math.random() * 0.5;
	}

	private async calculateStrategyAdjustment(
		eventId1: string,
		eventId2: string,
	): Promise<number> {
		// Placeholder - would analyze coach decisions, lineup changes
		return Math.random() * 0.3;
	}

	private predictFatiguePropagation(
		fatigueCorrelation: number,
		temporalDistance: number,
	): number {
		// Decay over time
		return fatigueCorrelation * Math.exp(-temporalDistance / 48);
	}

	private async getHistoricalCorrelation(
		eventId: string,
		market1: string,
		market2: string,
		lookbackDays: number,
	): Promise<number> {
		// Placeholder - would query historical data
		return Math.random() * 0.8 + 0.2; // 0.2-1.0
	}

	private async calculateCurrentDeviation(
		eventId: string,
		market1: string,
		market2: string,
	): Promise<number> {
		// Placeholder - would calculate deviation from historical correlation
		return (Math.random() - 0.5) * 0.6; // -0.3 to 0.3
	}

	private async getParentChildNodes(
		eventId: string,
	): Promise<
		Array<{
			parent: { nodeId: string };
			child: { nodeId: string; period: string };
		}>
	> {
		// Placeholder - would query shadow_nodes for parent-child relationships
		return [];
	}

	private getExpectedRatio(period: string): number {
		const ratios: Record<string, number> = {
			q1: 0.25,
			q2: 0.25,
			q3: 0.25,
			q4: 0.25,
			h1: 0.5,
			h2: 0.5,
		};
		return ratios[period.toLowerCase()] || 0.33;
	}

	private async calculateActualRatio(
		parentNodeId: string,
		childNodeId: string,
	): Promise<number> {
		// Placeholder - would calculate from current line values
		return Math.random() * 0.4 + 0.2; // 0.2-0.6
	}

	private async measurePropagationLatency(
		parentNodeId: string,
		childNodeId: string,
	): Promise<number> {
		// Placeholder - would measure from line_movements timestamps
		return Math.random() * 60000 + 5000; // 5-65 seconds
	}
}
