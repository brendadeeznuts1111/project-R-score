/**
 * @fileoverview Shadow-Graph Module Exports
 * @description Shadow-graph arbitrage detection system
 * @module arbitrage/shadow-graph
 */

// Core classes
export { ShadowMarketProber } from "./shadow-graph-builder";
export { ShadowSteamDetector } from "./hidden-steam-detector";
export {
	ShadowArbitrageScanner,
	type ShadowArbitrageOpportunity,
} from "./shadow-arb-scanner";
export { ShadowGraphAlertSystem } from "./alert-system";
export { ShadowGraphOrchestrator } from "./shadow-graph-orchestrator";
export {
	MultiLayerCorrelationGraph,
	type MultiLayerGraph,
	type Layer1DirectCorrelations,
	type Layer2CrossMarketCorrelations,
	type Layer3CrossEventCorrelations,
	type Layer4CrossSportCorrelations,
	type HiddenEdge,
	type DirectCorrelation,
	type CrossMarketCorrelation,
	type CrossEventCorrelation,
	type CrossSportCorrelation,
} from "./multi-layer-correlation-graph";
export {
	PropagationPredictionEngine,
	type PropagationPath,
} from "./propagation-prediction-engine";
export {
	RealTimeAnomalyStreamer,
	type AnomalyStreamEvent,
	type StreamConfig,
} from "./multi-layer-streaming";
export {
	MultiLayerVisualizationGenerator,
	type VisualizationData,
	type VisualizationNode,
	type VisualizationEdge,
	type LayerVisualization,
	type VisualizationStatistics,
	type VisualizationMetadata,
} from "./multi-layer-visualization";
export {
	CorrelationConfigService,
	type CorrelationConfig,
	DEFAULT_CORRELATION_CONFIG,
} from "./multi-layer-config";
export {
	CircuitBreaker,
	safeBuildLayer,
	retryWithBackoff,
	type CircuitBreakerOptions,
	type CircuitState,
} from "./multi-layer-resilience";
export {
	ObservabilityService,
	type Metric,
	type Span,
	type Logger,
	type MetricType,
} from "./multi-layer-observability";
export {
	batchInsertCorrelations,
	batchInsertSafe,
	bulkQueryNodes,
} from "./multi-layer-batch-operations";
export {
	validateInput,
	EventIdSchema,
	NodeIdSchema,
	LayerSchema,
	ConfidenceSchema,
	BuildGraphInputSchema,
	QueryLayerAnomaliesInputSchema,
	PredictPropagationInputSchema,
	FindCrossSportEdgesInputSchema,
	StreamAnomaliesInputSchema,
	GenerateVisualizationInputSchema,
} from "./multi-layer-validation";
export {
	MultiLayerSnapshotSystem,
	type SnapshotMetadata,
} from "./multi-layer-snapshot";

// Advanced analysis components
export { HistoricalDataCollector } from "./historical-data-collector";
export {
	HiddenNodePredictor,
	type HiddenNodeTrainingExample,
	type HiddenNodeFeatures,
} from "./hidden-node-predictor";
export {
	EdgeReliabilityAnalyzer,
	type EdgeReliabilityAnalysis,
} from "./edge-reliability-analyzer";

// Advanced detection components
export {
	ReverseLineMovementDetector,
	type RLMDetectionResult,
} from "./reverse-line-movement-detector";
export {
	SteamOriginationGraph,
	type SteamOriginationResult,
} from "./steam-origination-graph";
export {
	DerivativeMarketCorrelator,
	type DerivativeCorrelationResult,
	type HedgeRecommendation,
} from "./derivative-market-correlator";
export {
	TemporalPatternEngine,
	type TemporalPatternResult,
} from "./temporal-pattern-engine";
export {
	CrossSportArbitrage,
	type CrossSportEdge,
} from "./cross-sport-arbitrage";
export {
	LimitOrderBookReconstructor,
	type ReconstructedOrderBook,
} from "./limit-order-book-reconstructor";
export {
	BehavioralPatternClassifier,
	type BetClassification,
	type BehavioralEdgeScore,
} from "./behavioral-pattern-classifier";
export {
	AdvancedResearchOrchestrator,
	type ResearchReport,
} from "./advanced-research-orchestrator";

// DoD-Grade Engine
export {
	DoDMultiLayerCorrelationGraph,
	DoD_VALIDATION,
	type ValidatedGraph,
	type EnrichedEdge,
	type PropagationPath,
	type HealthStatus,
} from "./dod-multi-layer-engine";

// Types and utilities
export * from "./types";
export * from "./shadow-graph-constants";
export * from "./shadow-graph-database";
export * from "./shadow-graph-case-study";
