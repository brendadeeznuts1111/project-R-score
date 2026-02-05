/**
 * @fileoverview Enhanced Multi-Layer Correlation Graph Builder
 * @description Enhanced implementation with detailed schemas and SQL-based queries
 * @module arbitrage/shadow-graph/multi-layer-enhanced-graph
 */

import { Database } from "bun:sqlite";
import type {
	EnhancedMultiLayerGraph,
	Layer4CrossSportData,
	Layer3CrossEventData,
	Layer2CrossMarketData,
	Layer1DirectData,
	CrossSportCorrelation,
	CrossEventCorrelation,
	CrossMarketCorrelation,
	DirectCorrelation,
	HiddenEdgesCollection,
	PropagationPredictions,
	AnomalyQueue,
	Anomaly,
	HiddenEdge,
	RiskAssessment,
} from "./multi-layer-enhanced-types";
import { CorrelationConfigService } from "./multi-layer-config";
import { CircuitBreaker, safeBuildLayer } from "./multi-layer-resilience";
import { ObservabilityService } from "./multi-layer-observability";

/**
 * Event Data
 */
interface EventData {
	id: string;
	sport: string;
	home_team_id: string;
	away_team_id: string;
	venue_id: string;
	start_time: string;
}

/**
 * Market Data
 */
interface MarketData {
	marketId: string;
	type: string;
	period: string;
}

/**
 * 1.1.1.1.4.2.1: Enhanced MultiLayerCorrelationGraph Constructor
 */
export class EnhancedMultiLayerCorrelationGraph {
	private db: Database;
	private eventCache: Map<string, EventData>;
	private sportCache: Map<string, any>;
	private config: CorrelationConfigService;
	private observability: ObservabilityService;
	private circuitBreaker: CircuitBreaker;

	constructor(db: Database) {
		this.db = db;
		this.eventCache = new Map();
		this.sportCache = new Map();
		this.config = new CorrelationConfigService();
		this.observability = new ObservabilityService();
		this.circuitBreaker = new CircuitBreaker(
			async () => {},
			{
				timeout: 5000,
				errorThresholdPercentage: 50,
				resetTimeout: 30000,
			},
		);
	}

	/**
	 * 1.1.1.1.4.2.7: Full Multi-Layer Graph Assembly
	 */
	async buildMultiLayerGraph(eventId: string): Promise<EnhancedMultiLayerGraph> {
		const startTime = Date.now();
		const spanId = this.observability.startSpan("buildMultiLayerGraph", {
			eventId,
		});

		try {
			// Build all layers in parallel
			const [layer1, layer2, layer3, layer4] = await Promise.all([
				safeBuildLayer(() => this.buildLayer1(eventId), {
					layer: 1,
					fallback: this.getEmptyLayer1(),
				}),
				safeBuildLayer(() => this.buildLayer2(eventId), {
					layer: 2,
					fallback: this.getEmptyLayer2(),
				}),
				safeBuildLayer(() => this.buildLayer3(eventId), {
					layer: 3,
					fallback: this.getEmptyLayer3(),
				}),
				safeBuildLayer(() => this.buildLayer4(eventId), {
					layer: 4,
					fallback: this.getEmptyLayer4(),
				}),
			]);

			// 1.1.1.1.4.2.6: Anomaly Detection Priority Queue
			const anomalyQueue = await this.buildAnomalyDetectionQueue(
				layer1,
				layer2,
				layer3,
				layer4,
			);

			// Detect hidden edges from anomalies
			const hiddenEdges = await this.detectHiddenEdgesFromAnomalies(anomalyQueue);

			// Generate propagation predictions
			const propagationPredictions = await this.predictPropagation(hiddenEdges);

			const buildTime = Date.now() - startTime;
			this.observability.recordMetric("graph.build.duration", buildTime, "histogram", {
				eventId,
			});

			return {
				eventId,
				timestamp: Date.now(),
				layer1,
				layer2,
				layer3,
				layer4,
				hidden_edges: hiddenEdges,
				propagation_predictions: propagationPredictions,
				build_time_ms: buildTime,
			};
		} finally {
			this.observability.endSpan(spanId);
		}
	}

	/**
	 * 1.1.1.1.4.2.2: Cross-Sport Graph Builder
	 */
	private async buildLayer4(eventId: string): Promise<Layer4CrossSportData> {
		const event = await this.getEvent(eventId);
		const sport = event.sport;

		// Find correlated sports from database
		const query = this.db.query(`
			SELECT sport2, correlation, sample_size, lag_ms as avg_lag_ms, 
			       hidden_signal_strength, predictive_power
			FROM cross_sport_correlations
			WHERE sport1 = ? 
			  AND correlation > ?
			  AND sample_size > 100
			GROUP BY sport2
			ORDER BY correlation DESC
			LIMIT 10
		`);

		const correlatedSports = query.all(sport, this.config.getThreshold(4)) as Array<{
			sport2: string;
			correlation: number;
			sample_size: number;
			avg_lag_ms: number;
			hidden_signal_strength: number;
			predictive_power: number;
		}>;

		const sportPairs: CrossSportCorrelation[] = [];

		for (const row of correlatedSports) {
			// Get specific markets that correlate
			const marketQuery = this.db.query(`
				SELECT market1, market2, correlation, lag_ms, sample_size, p_value,
				       time_of_day, day_of_week, hidden_signal_strength, last_signal_detected
				FROM cross_sport_correlations
				WHERE sport1 = ? AND sport2 = ?
				  AND correlation > ?
				ORDER BY hidden_signal_strength DESC
				LIMIT 20
			`);

			const marketCorrelations = marketQuery.all(
				sport,
				row.sport2,
				this.config.getThreshold(4),
			) as Array<{
				market1: string;
				market2: string;
				correlation: number;
				lag_ms: number;
				sample_size: number;
				p_value: number;
				time_of_day: string;
				day_of_week: string;
				hidden_signal_strength: number;
				last_signal_detected: number;
			}>;

			for (const marketCorr of marketCorrelations) {
				sportPairs.push({
					sport1: sport as any,
					sport2: row.sport2 as any,
					market1: marketCorr.market1,
					market2: marketCorr.market2,
					correlation_coefficient: marketCorr.correlation,
					lag_ms: marketCorr.lag_ms,
					sample_size: marketCorr.sample_size,
					p_value: marketCorr.p_value || 0.05,
					context: {
						time_of_day: marketCorr.time_of_day || "unknown",
						day_of_week: marketCorr.day_of_week || "unknown",
						seasonality_factor: await this.getSeasonalityFactor(sport, row.sport2),
						news_trigger: false, // Would check news sources
					},
					hidden_signal_strength: marketCorr.hidden_signal_strength || 0,
					last_detected: marketCorr.last_signal_detected || Date.now(),
				});
			}
		}

		// Detect hidden signals in cross-sport correlations
		const hiddenSignals = await this.detectCrossSportHiddenSignals(sportPairs);

		return {
			sport_pairs: sportPairs,
			correlation_threshold: this.config.getThreshold(4),
			time_window_ms: 3600000, // 1 hour
			hidden_signals: hiddenSignals,
		};
	}

	/**
	 * 1.1.1.1.4.2.3: Cross-Event Graph Builder
	 */
	private async buildLayer3(eventId: string): Promise<Layer3CrossEventData> {
		const event = await this.getEvent(eventId);

		// Find correlated events using SQL
		const query = this.db.query(`
			WITH event_teams AS (
				SELECT home_team_id, away_team_id, venue_id, start_time
				FROM events 
				WHERE id = ?
			)
			SELECT 
				e2.id,
				e2.sport,
				e2.start_time,
				e2.home_team_id,
				e2.away_team_id,
				e2.venue_id,
				-- Team-based correlation
				CASE 
					WHEN e2.home_team_id IN (SELECT home_team_id FROM event_teams) 
						OR e2.away_team_id IN (SELECT away_team_id FROM event_teams) THEN 0.9
					WHEN e2.home_team_id IN (SELECT away_team_id FROM event_teams) 
						OR e2.away_team_id IN (SELECT home_team_id FROM event_teams) THEN 0.7
					ELSE 0.3
				END as team_correlation,
				-- Venue-based correlation
				CASE WHEN e2.venue_id = (SELECT venue_id FROM event_teams) THEN 0.8 ELSE 0.2 END as venue_correlation,
				-- Temporal proximity
				1.0 / (1.0 + ABS((julianday(e2.start_time) - julianday((SELECT start_time FROM event_teams))) * 24)) as temporal_correlation
			FROM events e2
			WHERE e2.id != ?
				AND datetime(e2.start_time) BETWEEN 
					datetime((SELECT start_time FROM event_teams), '-24 hours') AND
					datetime((SELECT start_time FROM event_teams), '+24 hours')
			ORDER BY (team_correlation + venue_correlation + temporal_correlation) / 3 DESC
			LIMIT 20
		`);

		const correlatedEvents = query.all(eventId, eventId) as Array<{
			id: string;
			sport: string;
			start_time: string;
			team_correlation: number;
			venue_correlation: number;
			temporal_correlation: number;
		}>;

		const eventPairs: CrossEventCorrelation[] = [];

		for (const row of correlatedEvents) {
			const marketCorrelation = await this.calculateMarketCorrelation(eventId, row.id);

			eventPairs.push({
				event1_id: eventId,
				event2_id: row.id,
				sport1: event.sport as any,
				sport2: row.sport as any,
				correlation_metrics: {
					team_based: row.team_correlation,
					venue_based: row.venue_correlation,
					temporal: row.temporal_correlation,
					market_based: marketCorrelation,
					combined:
						(row.team_correlation +
							row.venue_correlation +
							row.temporal_correlation +
							marketCorrelation) /
						4,
				},
				hidden_patterns: await this.detectCrossEventHiddenPatterns(eventId, row.id),
				temporal_distance_hours: Math.abs(
					(new Date(row.start_time).getTime() - new Date(event.start_time).getTime()) /
						3600000,
				),
				predictive_power: await this.crossEventPredictivePower(eventId, row.id),
			});
		}

		return {
			event_pairs: eventPairs,
			team_based: true,
			venue_based: true,
			temporal_proximity_hours: 24,
		};
	}

	/**
	 * 1.1.1.1.4.2.4: Cross-Market Graph Builder
	 */
	private async buildLayer2(eventId: string): Promise<Layer2CrossMarketData> {
		const eventMarkets = await this.getEventMarkets(eventId);
		const marketPairs: CrossMarketCorrelation[] = [];

		// Generate all market pairs
		for (let i = 0; i < eventMarkets.length; i++) {
			for (let j = i + 1; j < eventMarkets.length; j++) {
				const market1 = eventMarkets[i];
				const market2 = eventMarkets[j];

				// Skip same market type
				if (market1.type === market2.type && market1.period === market2.period) {
					continue;
				}

				const correlation = await this.calculateMarketPairCorrelation(
					market1,
					market2,
				);

				if (correlation.strength > 0.5) {
					marketPairs.push({
						market1: market1.marketId,
						market2: market2.marketId,
						market1_type: market1.type as any,
						market2_type: market2.type as any,
						correlation_strength: correlation.strength,
						lag_ms: correlation.lag_ms,
						direction: correlation.direction,
						propagation_patterns: await this.analyzePropagationPatterns(
							market1.marketId,
							market2.marketId,
						),
						hidden_arbitrage: await this.checkCrossMarketArbitrage(market1, market2),
						context_factors: {
							game_state_dependent: await this.isGameStateDependent(
								market1.type,
								market2.type,
							),
							liquidity_dependent: correlation.liquidity_factor || 0.5,
							sharp_money_indicator: correlation.sharp_indicator || 0.5,
						},
					});
				}
			}
		}

		return {
			market_pairs: marketPairs,
			market_types: [...new Set(eventMarkets.map((m) => m.type))] as any[],
			correlation_strength: 0.5,
			propagation_patterns: await this.aggregatePropagationPatterns(marketPairs),
		};
	}

	/**
	 * 1.1.1.1.4.2.5: Direct Correlation Graph Builder
	 */
	private async buildLayer1(eventId: string): Promise<Layer1DirectData> {
		const eventMarkets = await this.getEventMarkets(eventId);
		const directPairs: DirectCorrelation[] = [];
		const parentChildEdges: any[] = [];

		for (const market of eventMarkets) {
			// Find parent markets (e.g., full game is parent of Q1)
			const parentMarkets = await this.findParentMarkets(market);

			for (const parent of parentMarkets) {
				const correlation = await this.calculateDirectCorrelation(
					parent.marketId,
					market.marketId,
				);

				directPairs.push({
					parent_market: parent.marketId,
					child_market: market.marketId,
					expected_correlation: this.getExpectedCorrelation(parent.type, market.type),
					actual_correlation: correlation.strength,
					correlation_deviation: Math.abs(
						this.getExpectedCorrelation(parent.type, market.type) -
							correlation.strength,
					),
					lag_ms: correlation.lag_ms,
					sample_size: correlation.sample_size,
				});

				parentChildEdges.push({
					parent_id: parent.marketId,
					child_id: market.marketId,
					relationship_type: this.getRelationshipType(parent.type, market.type),
					strength: correlation.strength,
					last_updated: Date.now(),
				});
			}
		}

		return {
			direct_pairs: directPairs,
			parent_child_relationships: parentChildEdges,
			expected_correlations: await this.calculateExpectedCorrelations(eventMarkets),
			deviation_metrics: await this.calculateDeviationMetrics(directPairs),
		};
	}

	/**
	 * 1.1.1.1.4.2.6: Anomaly Detection Priority Queue
	 */
	private async buildAnomalyDetectionQueue(
		layer1: Layer1DirectData,
		layer2: Layer2CrossMarketData,
		layer3: Layer3CrossEventData,
		layer4: Layer4CrossSportData,
	): Promise<AnomalyQueue> {
		const queue: AnomalyQueue = {
			high_priority: [],
			medium_priority: [],
			low_priority: [],
		};

		// 1.1.1.1.4.3.1: Layer4 Anomaly Detection Algorithm
		const layer4Anomalies = await this.detectLayer4Anomalies(layer4);
		queue.high_priority.push(...layer4Anomalies);

		// 1.1.1.1.4.3.2: Layer3 Anomaly Detection Algorithm
		const layer3Anomalies = await this.detectLayer3Anomalies(layer3);
		queue.high_priority.push(
			...layer3Anomalies.filter((a) => a.confidence > 0.8),
		);
		queue.medium_priority.push(
			...layer3Anomalies.filter((a) => a.confidence <= 0.8),
		);

		// 1.1.1.1.4.3.3: Layer2 Anomaly Detection Algorithm
		const layer2Anomalies = await this.detectLayer2Anomalies(layer2);
		queue.medium_priority.push(...layer2Anomalies);

		// 1.1.1.1.4.3.4: Layer1 Anomaly Detection Algorithm
		const layer1Anomalies = await this.detectLayer1Anomalies(layer1);
		queue.low_priority.push(...layer1Anomalies);

		// Sort by anomaly score
		queue.high_priority.sort((a, b) => b.anomaly_score - a.anomaly_score);
		queue.medium_priority.sort((a, b) => b.anomaly_score - a.anomaly_score);
		queue.low_priority.sort((a, b) => b.anomaly_score - a.anomaly_score);

		return queue;
	}

	/**
	 * 1.1.1.1.4.3.1: Layer4 Anomaly Detection Algorithm
	 */
	private async detectLayer4Anomalies(layer4: Layer4CrossSportData): Promise<Anomaly[]> {
		const anomalies: Anomaly[] = [];

		// Handle null/undefined layer4
		if (!layer4 || !layer4.sport_pairs || !Array.isArray(layer4.sport_pairs)) {
			return anomalies;
		}

		for (const sportPair of layer4.sport_pairs) {
			// Check for unusual correlation strength
			if (sportPair.correlation_coefficient > 0.9) {
				anomalies.push({
					type: "cross_sport_high_correlation",
					source: `${sportPair.sport1}:${sportPair.market1}`,
					target: `${sportPair.sport2}:${sportPair.market2}`,
					anomaly_score: this.calculateAnomalyScore(sportPair),
					confidence: (sportPair.p_value || 0.05) < 0.05 ? 0.9 : 0.5,
					detected_at: Date.now(),
					metadata: {
						correlation: sportPair.correlation_coefficient,
						lag_ms: sportPair.lag_ms,
						hidden_signal_strength: sportPair.hidden_signal_strength,
					},
				});
			}

			// Check for hidden signals
			if (sportPair.hidden_signal_strength > 0.7) {
				anomalies.push({
					type: "cross_sport_hidden_signal",
					source: `${sportPair.sport1}:${sportPair.market1}`,
					target: `${sportPair.sport2}:${sportPair.market2}`,
					anomaly_score: sportPair.hidden_signal_strength,
					confidence: 0.8,
					detected_at: Date.now(),
					metadata: {
						signal_strength: sportPair.hidden_signal_strength,
						context: sportPair.context,
					},
				});
			}
		}

		// Check for time-of-day anomalies
		const timeAnomalies = await this.detectCrossSportTimeAnomalies(layer4);
		anomalies.push(...timeAnomalies);

		return anomalies;
	}

	/**
	 * 1.1.1.1.4.3.2: Layer3 Anomaly Detection Algorithm
	 */
	private async detectLayer3Anomalies(layer3: Layer3CrossEventData): Promise<Anomaly[]> {
		const anomalies: Anomaly[] = [];

		// Handle null/undefined layer3
		if (!layer3 || !layer3.event_pairs || !Array.isArray(layer3.event_pairs)) {
			return anomalies;
		}

		for (const eventPair of layer3.event_pairs) {
			// Check for predictive anomalies
			if (eventPair.predictive_power > 0.8) {
				anomalies.push({
					type: "cross_event_predictive_anomaly",
					source: eventPair.event1_id,
					target: eventPair.event2_id,
					anomaly_score: eventPair.predictive_power,
					confidence: 0.85,
					detected_at: Date.now(),
					metadata: {
						combined_correlation: eventPair.correlation_metrics.combined,
						predictive_power: eventPair.predictive_power,
						hidden_patterns: eventPair.hidden_patterns,
					},
				});
			}

			// Check for hidden patterns
			if (eventPair.hidden_patterns.length > 0) {
				for (const pattern of eventPair.hidden_patterns) {
					if (pattern.confidence > 0.7) {
						anomalies.push({
							type: "cross_event_hidden_pattern",
							source: eventPair.event1_id,
							target: eventPair.event2_id,
							anomaly_score: pattern.strength,
							confidence: pattern.confidence,
							detected_at: Date.now(),
							metadata: {
								pattern_type: pattern.type,
								strength: pattern.strength,
								sample_size: pattern.sample_size,
							},
						});
					}
				}
			}
		}

		return anomalies;
	}

	/**
	 * 1.1.1.1.4.3.3: Layer2 Anomaly Detection Algorithm
	 */
	private async detectLayer2Anomalies(layer2: Layer2CrossMarketData): Promise<Anomaly[]> {
		const anomalies: Anomaly[] = [];

		// Handle null/undefined layer2
		if (!layer2 || !layer2.market_pairs || !Array.isArray(layer2.market_pairs)) {
			return anomalies;
		}

		for (const marketPair of layer2.market_pairs) {
			// Check for high correlation with low latency (hidden edge indicator)
			if (marketPair.correlation_strength > 0.8 && marketPair.lag_ms < 1000) {
				anomalies.push({
					type: "cross_market_fast_correlation",
					source: marketPair.market1,
					target: marketPair.market2,
					anomaly_score: marketPair.correlation_strength * (1000 / marketPair.lag_ms),
					confidence: 0.75,
					detected_at: Date.now(),
					metadata: {
						correlation: marketPair.correlation_strength,
						lag_ms: marketPair.lag_ms,
						propagation_patterns: marketPair.propagation_patterns,
					},
				});
			}

			// Check for hidden arbitrage
			if (marketPair.hidden_arbitrage.detected) {
				anomalies.push({
					type: "cross_market_hidden_arb",
					source: marketPair.market1,
					target: marketPair.market2,
					anomaly_score: marketPair.hidden_arbitrage.profit_potential * 10,
					confidence: marketPair.hidden_arbitrage.confidence,
					detected_at: Date.now(),
					metadata: {
						profit_potential: marketPair.hidden_arbitrage.profit_potential,
						window_ms: marketPair.hidden_arbitrage.window_ms,
						sharp_indicator: marketPair.context_factors.sharp_money_indicator,
					},
				});
			}
		}

		return anomalies;
	}

	/**
	 * 1.1.1.1.4.3.4: Layer1 Anomaly Detection Algorithm
	 */
	private async detectLayer1Anomalies(layer1: Layer1DirectData): Promise<Anomaly[]> {
		const anomalies: Anomaly[] = [];

		// Handle null/undefined layer1
		if (!layer1 || !layer1.direct_pairs || !Array.isArray(layer1.direct_pairs)) {
			return anomalies;
		}

		for (const pair of layer1.direct_pairs) {
			// Check for correlation deviation (parent-child mismatch)
			if (pair.correlation_deviation > 0.3) {
				anomalies.push({
					type: "direct_correlation_deviation",
					source: pair.parent_market,
					target: pair.child_market,
					anomaly_score: pair.correlation_deviation * 3,
					confidence: 0.7,
					detected_at: Date.now(),
					metadata: {
						expected: pair.expected_correlation,
						actual: pair.actual_correlation,
						deviation: pair.correlation_deviation,
						lag_ms: pair.lag_ms,
					},
				});
			}
		}

		return anomalies;
	}

	/**
	 * Detect hidden edges from anomalies
	 */
	private async detectHiddenEdgesFromAnomalies(
		anomalyQueue: AnomalyQueue,
	): Promise<HiddenEdgesCollection> {
		const allAnomalies = [
			...anomalyQueue.high_priority,
			...anomalyQueue.medium_priority,
			...anomalyQueue.low_priority,
		];

		const hiddenEdges: HiddenEdge[] = [];
		const confidenceScores: any[] = [];
		const riskAssessments: RiskAssessment[] = [];

		for (const anomaly of allAnomalies) {
			const confidence = await this.calculateHiddenEdgeConfidence(anomaly);
			const hiddenEdge: HiddenEdge = {
				edge_id: `${anomaly.source}:${anomaly.target}:${anomaly.type}`,
				source_layer: this.getLayerFromAnomalyType(anomaly.type),
				target_layer: this.getLayerFromAnomalyType(anomaly.type),
				source_node: anomaly.source,
				target_node: anomaly.target,
				detection_method: anomaly.type,
				confidence,
				latency_ms: anomaly.metadata?.lag_ms || 0,
				signal_strength: anomaly.anomaly_score,
				verified: false,
				verification_count: 0,
				false_positive_rate: 0,
				risk_score: 0,
				profit_potential: anomaly.metadata?.profit_potential || 0,
				execution_window_ms: anomaly.metadata?.window_ms || 60000,
			};

			hiddenEdges.push(hiddenEdge);

			// Calculate confidence score
			confidenceScores.push({
				edge_id: hiddenEdge.edge_id,
				score: confidence,
				components: {
					anomaly_score: anomaly.anomaly_score,
					sample_size: anomaly.metadata?.sample_size || 0,
					latency_factor: Math.max(0, 1 - (hiddenEdge.latency_ms / 60000)),
					historical_accuracy: 0.7, // Would query from database
				},
			});

			// Calculate risk assessment
			const riskAssessment = await this.assessMultiLayerRisk(hiddenEdge);
			riskAssessments.push(riskAssessment);
		}

		// Group by layer
		const layer4Edges = hiddenEdges.filter((e) => e.source_layer === "layer4");
		const layer3Edges = hiddenEdges.filter((e) => e.source_layer === "layer3");
		const layer2Edges = hiddenEdges.filter((e) => e.source_layer === "layer2");
		const layer1Edges = hiddenEdges.filter((e) => e.source_layer === "layer1");

		return {
			layer4_edges: layer4Edges,
			layer3_edges: layer3Edges,
			layer2_edges: layer2Edges,
			layer1_edges: layer1Edges,
			cross_layer_edges: [],
			confidence_scores: confidenceScores,
			risk_assessments: riskAssessments,
		};
	}

	/**
	 * 1.1.1.1.4.3.5: Hidden Edge Confidence Scoring
	 */
	private async calculateHiddenEdgeConfidence(anomaly: Anomaly): Promise<number> {
		let confidence = 0;

		// Base confidence from anomaly score
		confidence += Math.min(anomaly.anomaly_score, 1.0) * 0.4;

		// Layer weighting (higher layers more confident)
		const layerWeights: Record<string, number> = {
			layer4: 1.0,
			layer3: 0.8,
			layer2: 0.6,
			layer1: 0.4,
		};

		const layer = this.getLayerFromAnomalyType(anomaly.type);
		confidence += (anomaly.confidence || 0.5) * 0.3 * (layerWeights[layer] || 0.5);

		// Sample size factor
		if ((anomaly.metadata?.sample_size || 0) > 100) {
			confidence += 0.2;
		}

		// 1.1.1.1.4.3.6: Latency-Weighted Signal Strength
		if (anomaly.metadata?.lag_ms) {
			const latencyFactor = Math.max(0, 1 - (anomaly.metadata.lag_ms / 60000));
			confidence += latencyFactor * 0.1;
		}

		return Math.min(confidence, 1.0);
	}

	/**
	 * 1.1.1.1.4.3.7: Multi-Layer Risk Assessment
	 */
	private async assessMultiLayerRisk(hiddenEdge: HiddenEdge): Promise<RiskAssessment> {
		const risks: any[] = [];
		let overallRisk = 0;

		// Layer-specific risks
		if (hiddenEdge.source_layer === "layer4") {
			risks.push({
				type: "cross_sport_uncertainty",
				score: 0.3,
				description: "Cross-sport correlations can be volatile",
			});
		}

		if (hiddenEdge.confidence < 0.7) {
			risks.push({
				type: "low_confidence",
				score: 0.4,
				description: `Confidence score ${hiddenEdge.confidence} below threshold`,
			});
		}

		if (hiddenEdge.latency_ms > 30000) {
			risks.push({
				type: "high_latency",
				score: 0.25,
				description: `Latency ${hiddenEdge.latency_ms}ms may reduce opportunity window`,
			});
		}

		// Calculate overall risk
		if (risks.length > 0) {
			overallRisk = risks.reduce((sum, risk) => sum + risk.score, 0) / risks.length;
		}

		return {
			edge_id: hiddenEdge.edge_id,
			risk_factors: risks,
			overall_risk: overallRisk,
			risk_adjusted_profit: hiddenEdge.profit_potential * (1 - overallRisk),
			mitigation_strategies: await this.suggestMitigationStrategies(risks),
		};
	}

	/**
	 * Predict propagation
	 */
	private async predictPropagation(
		hiddenEdges: HiddenEdgesCollection,
	): Promise<PropagationPredictions> {
		const layerPredictions: any[] = [];
		let totalLatency = 0;
		let totalConfidence = 0;

		for (const edge of [
			...hiddenEdges.layer1_edges,
			...hiddenEdges.layer2_edges,
			...hiddenEdges.layer3_edges,
			...hiddenEdges.layer4_edges,
		]) {
			layerPredictions.push({
				layer: edge.source_layer,
				target_node: edge.target_node,
				expected_latency_ms: edge.latency_ms,
				confidence: edge.confidence,
				impact_score: edge.signal_strength,
				prediction_window_ms: edge.execution_window_ms,
			});

			totalLatency += edge.latency_ms;
			totalConfidence += edge.confidence;
		}

		const avgConfidence = layerPredictions.length > 0 ? totalConfidence / layerPredictions.length : 0;
		const confidenceInterval: [number, number] = [
			Math.max(0, avgConfidence - 0.1),
			Math.min(1, avgConfidence + 0.1),
		];

		return {
			layer_predictions: layerPredictions,
			expected_latency_ms: layerPredictions.length > 0 ? totalLatency / layerPredictions.length : 0,
			confidence_interval: confidenceInterval,
			prediction_horizon_ms: 3600000, // 1 hour
		};
	}

	// Helper methods
	private async getEvent(eventId: string): Promise<EventData> {
		if (this.eventCache.has(eventId)) {
			return this.eventCache.get(eventId)!;
		}

		const query = this.db.query(`
			SELECT id, sport, home_team_id, away_team_id, venue_id, start_time
			FROM events
			WHERE id = ?
		`);

		const event = query.get(eventId) as EventData | undefined;
		if (!event) {
			throw new Error(`Event ${eventId} not found`);
		}

		this.eventCache.set(eventId, event);
		return event;
	}

	private async getEventMarkets(eventId: string): Promise<MarketData[]> {
		// Placeholder - would query from shadow_nodes or markets table
		return [];
	}

	private async getCrossSportMarketCorrelations(
		sport1: string,
		sport2: string,
	): Promise<any[]> {
		// Already handled in buildLayer4
		return [];
	}

	private async getCrossSportContext(sport1: string, sport2: string): Promise<any> {
		return {
			time_of_day: "unknown",
			day_of_week: "unknown",
			seasonality_factor: 0.5,
			news_trigger: false,
		};
	}

	private async calculateHiddenSignalStrength(marketCorr: any): Promise<number> {
		return marketCorr.hidden_signal_strength || 0;
	}

	private async detectCrossSportHiddenSignals(
		sportPairs: CrossSportCorrelation[],
	): Promise<any[]> {
		return sportPairs
			.filter((p) => p.hidden_signal_strength > 0.7)
			.map((p) => ({
				signal_id: `${p.sport1}:${p.sport2}:${p.market1}:${p.market2}`,
				sport1: p.sport1,
				sport2: p.sport2,
				market1: p.market1,
				market2: p.market2,
				strength: p.hidden_signal_strength,
				detected_at: p.last_detected,
				context: p.context,
			}));
	}

	private async detectCrossSportTimeAnomalies(layer4: Layer4CrossSportData): Promise<Anomaly[]> {
		// Placeholder - would analyze time-of-day patterns
		return [];
	}

	private async calculateMarketCorrelation(eventId1: string, eventId2: string): Promise<number> {
		// Placeholder - would calculate from historical data
		return Math.random() * 0.5 + 0.3;
	}

	private async detectCrossEventHiddenPatterns(
		eventId1: string,
		eventId2: string,
	): Promise<any[]> {
		// Placeholder - would detect patterns
		return [];
	}

	private async crossEventPredictivePower(
		eventId1: string,
		eventId2: string,
	): Promise<number> {
		// Placeholder - would calculate predictive power
		return Math.random() * 0.5 + 0.5;
	}

	private async calculateMarketPairCorrelation(
		market1: MarketData,
		market2: MarketData,
	): Promise<{
		strength: number;
		lag_ms: number;
		direction: "forward" | "backward" | "bidirectional";
		liquidity_factor?: number;
		sharp_indicator?: number;
	}> {
		// Placeholder - would calculate from line movements
		return {
			strength: Math.random() * 0.5 + 0.5,
			lag_ms: Math.random() * 5000 + 1000,
			direction: "bidirectional",
			liquidity_factor: 0.5,
			sharp_indicator: 0.5,
		};
	}

	private async analyzePropagationPatterns(
		market1: string,
		market2: string,
	): Promise<any[]> {
		// Placeholder - would analyze patterns
		return [];
	}

	private async checkCrossMarketArbitrage(
		market1: MarketData,
		market2: MarketData,
	): Promise<any> {
		// Placeholder - would check for arbitrage
		return {
			detected: false,
			profit_potential: 0,
			confidence: 0,
			window_ms: 0,
			execution_risk: 0,
		};
	}

	private async isGameStateDependent(type1: string, type2: string): Promise<boolean> {
		// Placeholder
		return false;
	}

	private async aggregatePropagationPatterns(marketPairs: CrossMarketCorrelation[]): Promise<any[]> {
		// Placeholder
		return [];
	}

	private async findParentMarkets(market: MarketData): Promise<MarketData[]> {
		// Placeholder - would find parent markets
		return [];
	}

	private async calculateDirectCorrelation(
		parentId: string,
		childId: string,
	): Promise<{ strength: number; lag_ms: number; sample_size: number }> {
		// Placeholder
		return {
			strength: Math.random() * 0.5 + 0.5,
			lag_ms: Math.random() * 30000 + 5000,
			sample_size: 100,
		};
	}

	private getExpectedCorrelation(type1: string, type2: string): number {
		// Placeholder - would return expected correlation based on market types
		return 0.5;
	}

	private getRelationshipType(type1: string, type2: string): string {
		// Placeholder
		return "parent_child";
	}

	private async calculateExpectedCorrelations(markets: MarketData[]): Promise<any[]> {
		// Placeholder
		return [];
	}

	private async calculateDeviationMetrics(pairs: DirectCorrelation[]): Promise<any> {
		if (pairs.length === 0) {
			return {
				avg_deviation: 0,
				max_deviation: 0,
				std_deviation: 0,
				anomaly_threshold: 0.3,
			};
		}

		const deviations = pairs.map((p) => p.correlation_deviation);
		const avg = deviations.reduce((a, b) => a + b, 0) / deviations.length;
		const max = Math.max(...deviations);
		const variance =
			deviations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / deviations.length;
		const std = Math.sqrt(variance);

		return {
			avg_deviation: avg,
			max_deviation: max,
			std_deviation: std,
			anomaly_threshold: 0.3,
		};
	}

	private calculateAnomalyScore(sportPair: CrossSportCorrelation): number {
		return (
			sportPair.correlation_coefficient * 0.5 +
			sportPair.hidden_signal_strength * 0.3 +
			(sportPair.p_value || 0.05) < 0.05 ? 0.2 : 0
		);
	}

	private getLayerFromAnomalyType(type: string): "layer1" | "layer2" | "layer3" | "layer4" {
		if (type.includes("layer4") || type.includes("cross_sport")) return "layer4";
		if (type.includes("layer3") || type.includes("cross_event")) return "layer3";
		if (type.includes("layer2") || type.includes("cross_market")) return "layer2";
		return "layer1";
	}

	private async suggestMitigationStrategies(risks: any[]): Promise<string[]> {
		return risks.map((r) => `Mitigate ${r.type}: ${r.description}`);
	}

	private async getSeasonalityFactor(sport1: string, sport2: string): Promise<number> {
		// Placeholder
		return 0.5;
	}

	// Empty layer fallbacks
	private getEmptyLayer1(): Layer1DirectData {
		return {
			direct_pairs: [],
			parent_child_relationships: [],
			expected_correlations: [],
			deviation_metrics: {
				avg_deviation: 0,
				max_deviation: 0,
				std_deviation: 0,
				anomaly_threshold: 0.3,
			},
		};
	}

	private getEmptyLayer2(): Layer2CrossMarketData {
		return {
			market_pairs: [],
			market_types: [],
			correlation_strength: 0.5,
			propagation_patterns: [],
		};
	}

	private getEmptyLayer3(): Layer3CrossEventData {
		return {
			event_pairs: [],
			team_based: true,
			venue_based: true,
			temporal_proximity_hours: 24,
		};
	}

	private getEmptyLayer4(): Layer4CrossSportData {
		return {
			sport_pairs: [],
			correlation_threshold: 0.7,
			time_window_ms: 3600000,
			hidden_signals: [],
		};
	}
}
