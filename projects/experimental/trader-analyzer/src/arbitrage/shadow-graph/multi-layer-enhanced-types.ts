/**
 * @fileoverview Enhanced Multi-Layer Correlation Graph Types
 * @description Enhanced type definitions with detailed schemas
 * @module arbitrage/shadow-graph/multi-layer-enhanced-types
 */

/**
 * Layer type
 */
export type LayerType = "layer1" | "layer2" | "layer3" | "layer4";

/**
 * Sport type
 */
export type SportType = "nfl" | "nba" | "mlb" | "nhl" | "ncaaf" | "ncaab" | "soccer" | "tennis";

/**
 * Market type
 */
export type MarketType =
	| "total"
	| "spread"
	| "moneyline"
	| "team_total"
	| "player_prop"
	| "first_half"
	| "second_half"
	| "q1"
	| "q2"
	| "q3"
	| "q4";

/**
 * 1.1.1.1.4.1.1: Enhanced MultiLayerGraph Interface Definition
 */
export interface EnhancedMultiLayerGraph {
	eventId: string;
	timestamp: number;

	// 1.1.1.1.4.1.2: Layer4 Cross-Sport Correlation Schema
	layer4: Layer4CrossSportData;

	// 1.1.1.1.4.1.3: Layer3 Cross-Event Correlation Schema
	layer3: Layer3CrossEventData;

	// 1.1.1.1.4.1.4: Layer2 Cross-Market Correlation Schema
	layer2: Layer2CrossMarketData;

	// 1.1.1.1.4.1.5: Layer1 Direct Correlation Schema
	layer1: Layer1DirectData;

	// 1.1.1.1.4.1.6: HiddenEdge Detection Result Type
	hidden_edges: HiddenEdgesCollection;

	// 1.1.1.1.4.1.7: Propagation Prediction Engine
	propagation_predictions: PropagationPredictions;

	build_time_ms: number;
}

/**
 * MultiLayerGraph interface matching exact spec
 */
export interface MultiLayerGraph {
	eventId: string;
	timestamp: number;

	// 1.1.1.1.4.1.2: Layer4 Cross-Sport Correlation Schema
	layer4: {
		sport_pairs: CrossSportCorrelation[];
		correlation_threshold: number;
		time_window_ms: number;
		hidden_signals: CrossSportHiddenSignal[];
	};

	// 1.1.1.1.4.1.3: Layer3 Cross-Event Correlation Schema
	layer3: {
		event_pairs: CrossEventCorrelation[];
		team_based: boolean;
		venue_based: boolean;
		temporal_proximity_hours: number;
	};

	// 1.1.1.1.4.1.4: Layer2 Cross-Market Correlation Schema
	layer2: {
		market_pairs: CrossMarketCorrelation[];
		market_types: MarketType[];
		correlation_strength: number;
		propagation_patterns: PropagationPattern[];
	};

	// 1.1.1.1.4.1.5: Layer1 Direct Correlation Schema
	layer1: {
		direct_pairs: DirectCorrelation[];
		parent_child_relationships: ParentChildEdge[];
		expected_correlations: ExpectedCorrelation[];
		deviation_metrics: DeviationMetrics;
	};

	// 1.1.1.1.4.1.6: HiddenEdge Detection Result Type
	hidden_edges: {
		layer4_edges: HiddenEdge[];
		layer3_edges: HiddenEdge[];
		layer2_edges: HiddenEdge[];
		layer1_edges: HiddenEdge[];

		cross_layer_edges: CrossLayerHiddenEdge[];
		confidence_scores: ConfidenceScore[];
		risk_assessments: RiskAssessment[];
	};

	// 1.1.1.1.4.1.7: Propagation Prediction Engine
	propagation_predictions: {
		layer_predictions: LayerPrediction[];
		expected_latency_ms: number;
		confidence_interval: [number, number];
		prediction_horizon_ms: number;
	};
}

/**
 * Layer4 Cross-Sport Data
 */
export interface Layer4CrossSportData {
	sport_pairs: CrossSportCorrelation[];
	correlation_threshold: number;
	time_window_ms: number;
	hidden_signals: CrossSportHiddenSignal[];
}

/**
 * Enhanced Cross-Sport Correlation
 */
export interface CrossSportCorrelation {
	sport1: SportType;
	sport2: SportType;
	market1: string;
	market2: string;

	// Correlation metrics
	correlation_coefficient: number;
	lag_ms: number;
	sample_size: number;
	p_value: number;

	// Context
	context: CrossSportContext;

	// Hidden signal detection
	hidden_signal_strength: number;
	last_detected: number;
}

/**
 * Cross-Sport Context
 */
export interface CrossSportContext {
	time_of_day: string;
	day_of_week: string;
	seasonality_factor: number;
	news_trigger: boolean;
}

/**
 * Cross-Sport Hidden Signal
 */
export interface CrossSportHiddenSignal {
	signal_id: string;
	sport1: SportType;
	sport2: SportType;
	market1: string;
	market2: string;
	strength: number;
	detected_at: number;
	context: CrossSportContext;
}

/**
 * Layer3 Cross-Event Data
 */
export interface Layer3CrossEventData {
	event_pairs: CrossEventCorrelation[];
	team_based: boolean;
	venue_based: boolean;
	temporal_proximity_hours: number;
}

/**
 * Enhanced Cross-Event Correlation
 */
export interface CrossEventCorrelation {
	event1_id: string;
	event2_id: string;
	sport1: SportType;
	sport2: SportType;

	correlation_metrics: CrossEventCorrelationMetrics;
	hidden_patterns: HiddenPattern[];
	temporal_distance_hours: number;
	predictive_power: number;
}

/**
 * Cross-Event Correlation Metrics
 */
export interface CrossEventCorrelationMetrics {
	team_based: number;
	venue_based: number;
	temporal: number;
	market_based: number;
	combined: number;
}

/**
 * Hidden Pattern
 */
export interface HiddenPattern {
	pattern_id: string;
	type: string;
	strength: number;
	confidence: number;
	sample_size: number;
	detected_at: number;
}

/**
 * Layer2 Cross-Market Data
 */
export interface Layer2CrossMarketData {
	market_pairs: CrossMarketCorrelation[];
	market_types: MarketType[];
	correlation_strength: number;
	propagation_patterns: PropagationPattern[];
}

/**
 * Enhanced Cross-Market Correlation
 */
export interface CrossMarketCorrelation {
	market1: string;
	market2: string;
	market1_type: MarketType;
	market2_type: MarketType;

	correlation_strength: number;
	lag_ms: number;
	direction: "forward" | "backward" | "bidirectional";

	propagation_patterns: PropagationPattern[];
	hidden_arbitrage: HiddenArbitrage;
	context_factors: MarketContextFactors;
}

/**
 * Propagation Pattern
 */
export interface PropagationPattern {
	pattern_id: string;
	type: "immediate" | "delayed" | "cascading" | "oscillating";
	strength: number;
	latency_ms: number;
	frequency: number;
	last_observed: number;
}

/**
 * Hidden Arbitrage
 */
export interface HiddenArbitrage {
	detected: boolean;
	profit_potential: number;
	confidence: number;
	window_ms: number;
	execution_risk: number;
}

/**
 * Market Context Factors
 */
export interface MarketContextFactors {
	game_state_dependent: boolean;
	liquidity_dependent: number;
	sharp_money_indicator: number;
}

/**
 * Layer1 Direct Data
 */
export interface Layer1DirectData {
	direct_pairs: DirectCorrelation[];
	parent_child_relationships: ParentChildEdge[];
	expected_correlations: ExpectedCorrelation[];
	deviation_metrics: DeviationMetrics;
}

/**
 * Enhanced Direct Correlation
 */
export interface DirectCorrelation {
	parent_market: string;
	child_market: string;
	expected_correlation: number;
	actual_correlation: number;
	correlation_deviation: number;
	lag_ms: number;
	sample_size: number;
}

/**
 * Parent-Child Edge
 */
export interface ParentChildEdge {
	parent_id: string;
	child_id: string;
	relationship_type: string;
	strength: number;
	last_updated: number;
}

/**
 * Expected Correlation
 */
export interface ExpectedCorrelation {
	market_pair: string;
	expected_value: number;
	confidence: number;
	based_on: string; // 'historical', 'theoretical', 'model'
}

/**
 * Deviation Metrics
 */
export interface DeviationMetrics {
	avg_deviation: number;
	max_deviation: number;
	std_deviation: number;
	anomaly_threshold: number;
}

/**
 * Hidden Edges Collection
 */
export interface HiddenEdgesCollection {
	layer4_edges: HiddenEdge[];
	layer3_edges: HiddenEdge[];
	layer2_edges: HiddenEdge[];
	layer1_edges: HiddenEdge[];

	cross_layer_edges: CrossLayerHiddenEdge[];
	confidence_scores: ConfidenceScore[];
	risk_assessments: RiskAssessment[];
}

/**
 * Enhanced Hidden Edge
 */
export interface HiddenEdge {
	edge_id: string;
	source_layer: LayerType;
	target_layer: LayerType;
	source_node: string;
	target_node: string;

	detection_method: string;
	confidence: number;
	latency_ms: number;
	signal_strength: number;

	// Verification
	verified: boolean;
	verification_count: number;
	false_positive_rate: number;

	// Risk/Profit
	risk_score: number;
	profit_potential: number;
	execution_window_ms: number;
}

/**
 * Cross-Layer Hidden Edge
 */
export interface CrossLayerHiddenEdge extends HiddenEdge {
	cross_layer_path: string[];
	path_confidence: number;
	total_latency_ms: number;
}

/**
 * Confidence Score
 */
export interface ConfidenceScore {
	edge_id: string;
	score: number;
	components: {
		anomaly_score: number;
		sample_size: number;
		latency_factor: number;
		historical_accuracy: number;
	};
}

/**
 * Risk Assessment
 */
export interface RiskAssessment {
	edge_id: string;
	risk_factors: RiskFactor[];
	overall_risk: number;
	risk_adjusted_profit: number;
	mitigation_strategies: string[];
}

/**
 * Risk Factor
 */
export interface RiskFactor {
	type: string;
	score: number;
	description: string;
}

/**
 * Propagation Predictions
 */
export interface PropagationPredictions {
	layer_predictions: LayerPrediction[];
	expected_latency_ms: number;
	confidence_interval: [number, number];
	prediction_horizon_ms: number;
}

/**
 * Layer Prediction
 */
export interface LayerPrediction {
	layer: LayerType;
	target_node: string;
	expected_latency_ms: number;
	confidence: number;
	impact_score: number;
	prediction_window_ms: number;
}

/**
 * Anomaly Queue
 */
export interface AnomalyQueue {
	high_priority: Anomaly[];
	medium_priority: Anomaly[];
	low_priority: Anomaly[];
}

/**
 * Anomaly
 */
export interface Anomaly {
	type: string;
	source: string;
	target: string;
	anomaly_score: number;
	confidence: number;
	detected_at: number;
	metadata?: Record<string, any>;
}
