/**
 * Prediction Result Type Definitions
 * Comprehensive type system for fraud detection predictions
 */

// ============================================================================
// CORE PREDICTION INTERFACES
// ============================================================================

/**
 * Base prediction result interface
 */
export interface BasePrediction {
	readonly id: string;
	readonly sessionId: string;
	readonly merchantId: string;
	readonly timestamp: Date;
	readonly modelVersion: string;
	readonly features: string[];
	readonly confidence: number;
	readonly processingTime: number;
}

/**
 * Risk prediction result
 */
export interface RiskPrediction extends BasePrediction {
	readonly score: number;
	readonly riskLevel: RiskLevel;
	readonly blocked: boolean;
	readonly reason: string;
	readonly factors: RiskFactor[];
	readonly recommendations: Recommendation[];
	readonly metadata: PredictionMetadata;
}

/**
 * Batch prediction result
 */
export interface BatchPrediction {
	readonly id: string;
	readonly sessionId: string[];
	readonly merchantId: string;
	readonly timestamp: Date;
	readonly predictions: RiskPrediction[];
	readonly summary: BatchSummary;
	readonly processingTime: number;
	readonly modelVersion: string;
}

/**
 * Real-time prediction stream
 */
export interface PredictionStream {
	readonly streamId: string;
	readonly sessionId: string;
	readonly merchantId: string;
	readonly startTime: Date;
	readonly predictions: StreamPrediction[];
	readonly status: StreamStatus;
	readonly metrics: StreamMetrics;
}

/**
 * Individual stream prediction
 */
export interface StreamPrediction extends RiskPrediction {
	readonly sequenceNumber: number;
	readonly streamTimestamp: Date;
	readonly windowSize: number;
}

// ============================================================================
// RISK ASSESSMENT TYPES
// ============================================================================

/**
 * Risk level classification
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Risk factor contributing to prediction
 */
export interface RiskFactor {
	readonly name: string;
	readonly value: number;
	readonly weight: number;
	readonly contribution: number;
	readonly threshold: number;
	readonly severity: FactorSeverity;
	readonly description: string;
}

/**
 * Risk factor severity levels
 */
export type FactorSeverity = "none" | "low" | "medium" | "high" | "critical";

/**
 * Action recommendation based on risk assessment
 */
export interface Recommendation {
	readonly type: RecommendationType;
	readonly priority: RecommendationPriority;
	readonly action: string;
	readonly description: string;
	readonly automated: boolean;
	readonly confidence: number;
}

/**
 * Recommendation types
 */
export type RecommendationType =
	| "block"
	| "monitor"
	| "verify"
	| "investigate"
	| "allow"
	| "escalate"
	| "educate"
	| "notify";

/**
 * Recommendation priority levels
 */
export type RecommendationPriority =
	| "low"
	| "medium"
	| "high"
	| "urgent"
	| "critical";

/**
 * Prediction metadata
 */
export interface PredictionMetadata {
	readonly modelId: string;
	readonly modelType: string;
	readonly version: string;
	readonly environment: Environment;
	readonly features: FeatureMetadata[];
	readonly ensemble: EnsembleMetadata;
	readonly performance: PerformanceMetadata;
}

/**
 * Environment types
 */
export type Environment = "development" | "staging" | "production" | "testing";

/**
 * Feature metadata in prediction
 */
export interface FeatureMetadata {
	readonly name: string;
	readonly value: number;
	readonly normalized: number;
	readonly weight: number;
	readonly importance: number;
}

/**
 * Ensemble prediction metadata
 */
export interface EnsembleMetadata {
	readonly models: ModelPrediction[];
	readonly weights: number[];
	readonly aggregationMethod: string;
	readonly variance: number;
	readonly consensus: number;
}

/**
 * Individual model prediction in ensemble
 */
export interface ModelPrediction {
	readonly modelId: string;
	readonly modelName: string;
	readonly prediction: number;
	readonly confidence: number;
	readonly processingTime: number;
}

/**
 * Performance metadata
 */
export interface PerformanceMetadata {
	readonly totalProcessingTime: number;
	readonly featureExtractionTime: number;
	readonly modelInferenceTime: number;
	readonly postProcessingTime: number;
	readonly memoryUsage: number;
	readonly cacheHits: number;
}

// ============================================================================
// BATCH PROCESSING TYPES
// ============================================================================

/**
 * Batch prediction summary
 */
export interface BatchSummary {
	readonly totalPredictions: number;
	readonly averageScore: number;
	readonly riskDistribution: RiskDistribution;
	readonly processingTime: number;
	readonly throughput: number;
	readonly errors: BatchError[];
}

/**
 * Risk distribution in batch
 */
export interface RiskDistribution {
	readonly low: number;
	readonly medium: number;
	readonly high: number;
	readonly critical: number;
	readonly blocked: number;
}

/**
 * Batch processing error
 */
export interface BatchError {
	readonly index: number;
	readonly sessionId: string;
	readonly error: string;
	readonly timestamp: Date;
}

/**
 * Batch processing configuration
 */
export interface BatchConfig {
	readonly batchSize: number;
	readonly maxConcurrency: number;
	readonly timeout: number;
	readonly retryPolicy: RetryPolicy;
	readonly progressTracking: boolean;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
	readonly maxRetries: number;
	readonly backoffStrategy: BackoffStrategy;
	readonly baseDelay: number;
	readonly maxDelay: number;
}

/**
 * Backoff strategies
 */
export type BackoffStrategy = "fixed" | "exponential" | "linear" | "polynomial";

// ============================================================================
// STREAMING TYPES
// ============================================================================

/**
 * Stream status
 */
export type StreamStatus =
	| "connecting"
	| "connected"
	| "streaming"
	| "paused"
	| "error"
	| "disconnected"
	| "completed";

/**
 * Stream metrics
 */
export interface StreamMetrics {
	readonly predictionsPerSecond: number;
	readonly averageLatency: number;
	readonly errorRate: number;
	readonly bufferUtilization: number;
	readonly memoryUsage: number;
	readonly uptime: number;
}

/**
 * Streaming configuration
 */
export interface StreamConfig {
	readonly bufferSize: number;
	readonly windowSize: number;
	readonly samplingRate: number;
	readonly compression: boolean;
	readonly encryption: boolean;
	readonly retryPolicy: RetryPolicy;
}

/**
 * Stream event types
 */
export type StreamEventType =
	| "prediction"
	| "error"
	| "status"
	| "metrics"
	| "heartbeat"
	| "disconnect";

/**
 * Stream event
 */
export interface StreamEvent {
	readonly type: StreamEventType;
	readonly timestamp: Date;
	readonly data: any;
	readonly metadata: Record<string, any>;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Prediction validation result
 */
export interface PredictionValidation {
	readonly valid: boolean;
	readonly errors: ValidationError[];
	readonly warnings: ValidationWarning[];
	readonly score: number;
	readonly confidence: number;
	readonly recommendations: ValidationRecommendation[];
}

/**
 * Validation error
 */
export interface ValidationError {
	readonly field: string;
	readonly message: string;
	readonly code: string;
	readonly severity: ErrorSeverity;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
	readonly field: string;
	readonly message: string;
	readonly code: string;
	readonly impact: string;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
	readonly action: string;
	readonly description: string;
	readonly priority: RecommendationPriority;
}

// ============================================================================
// ENSEMBLE TYPES
// ============================================================================

/**
 * Ensemble prediction configuration
 */
export interface EnsembleConfig {
	readonly models: ModelConfig[];
	readonly weights: number[];
	readonly aggregationMethod: AggregationMethod;
	readonly votingThreshold: number;
	readonly diversityThreshold: number;
}

/**
 * Individual model configuration
 */
export interface ModelConfig {
	readonly id: string;
	readonly name: string;
	readonly type: string;
	readonly weight: number;
	readonly enabled: boolean;
	readonly parameters: Record<string, any>;
}

/**
 * Ensemble aggregation methods
 */
export type AggregationMethod =
	| "weighted-average"
	| "majority-vote"
	| "stacking"
	| "bayesian"
	| "dynamic-weighting";

/**
 * Ensemble prediction result
 */
export interface EnsembleResult {
	readonly finalPrediction: number;
	readonly individualPredictions: ModelPrediction[];
	readonly consensus: number;
	readonly variance: number;
	readonly disagreement: number;
	readonly confidence: number;
}

// ============================================================================
// MONITORING TYPES
// ============================================================================

/**
 * Prediction monitoring data
 */
export interface PredictionMonitoring {
	readonly timestamp: Date;
	readonly totalPredictions: number;
	readonly averageScore: number;
	readonly riskDistribution: RiskDistribution;
	readonly performance: PredictionPerformance;
	readonly alerts: PredictionAlert[];
}

/**
 * Prediction performance metrics
 */
export interface PredictionPerformance {
	readonly averageLatency: number;
	readonly throughput: number;
	readonly errorRate: number;
	readonly memoryUsage: number;
	readonly cpuUsage: number;
	readonly cacheHitRate: number;
}

/**
 * Prediction alert
 */
export interface PredictionAlert {
	readonly id: string;
	readonly type: AlertType;
	readonly severity: AlertSeverity;
	readonly message: string;
	readonly timestamp: Date;
	readonly resolved: boolean;
	readonly metadata: Record<string, any>;
}

/**
 * Alert types
 */
export type AlertType =
	| "high-latency"
	| "high-error-rate"
	| "model-drift"
	| "accuracy-drop"
	| "resource-exhaustion"
	| "anomaly-detected";

/**
 * Alert severity levels
 */
export type AlertSeverity = "info" | "warning" | "error" | "critical";

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Prediction export configuration
 */
export interface PredictionExport {
	readonly format: ExportFormat;
	readonly compression: boolean;
	readonly encryption: boolean;
	readonly fields: string[];
	readonly filters: ExportFilter[];
	readonly dateRange: DateRange;
}

/**
 * Export formats
 */
export type ExportFormat =
	| "csv"
	| "json"
	| "parquet"
	| "avro"
	| "excel"
	| "xml";

/**
 * Export filter
 */
export interface ExportFilter {
	readonly field: string;
	readonly operator: FilterOperator;
	readonly value: any;
}

/**
 * Filter operators
 */
export type FilterOperator =
	| "equals"
	| "not-equals"
	| "greater-than"
	| "less-than"
	| "contains"
	| "starts-with"
	| "ends-with"
	| "in"
	| "not-in";

/**
 * Date range for export
 */
export interface DateRange {
	readonly start: Date;
	readonly end: Date;
	readonly timezone: string;
}

/**
 * Export result
 */
export interface ExportResult {
	readonly id: string;
	readonly format: ExportFormat;
	readonly size: number;
	readonly recordCount: number;
	readonly url: string;
	readonly expiresAt: Date;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

/**
 * Prediction analytics data
 */
export interface PredictionAnalytics {
	readonly timeRange: DateRange;
	readonly totalPredictions: number;
	readonly riskDistribution: RiskDistribution;
	readonly trends: PredictionTrends;
	readonly patterns: PredictionPattern[];
	readonly insights: PredictionInsight[];
}

/**
 * Prediction trends over time
 */
export interface PredictionTrends {
	readonly riskScoreTrend: TrendData[];
	readonly volumeTrend: TrendData[];
	readonly accuracyTrend: TrendData[];
	readonly latencyTrend: TrendData[];
}

/**
 * Trend data point
 */
export interface TrendData {
	readonly timestamp: Date;
	readonly value: number;
	readonly change: number;
	readonly changePercent: number;
}

/**
 * Detected prediction pattern
 */
export interface PredictionPattern {
	readonly id: string;
	readonly type: PatternType;
	readonly description: string;
	readonly confidence: number;
	readonly frequency: number;
	readonly impact: string;
}

/**
 * Pattern types
 */
export type PatternType =
	| "seasonal"
	| "trend"
	| "anomaly"
	| "correlation"
	| "outlier"
	| "cluster";

/**
 * Prediction insight
 */
export interface PredictionInsight {
	readonly id: string;
	readonly category: InsightCategory;
	readonly title: string;
	readonly description: string;
	readonly impact: InsightImpact;
	readonly recommendations: string[];
	readonly confidence: number;
}

/**
 * Insight categories
 */
export type InsightCategory =
	| "performance"
	| "accuracy"
	| "risk"
	| "behavior"
	| "operational";

/**
 * Insight impact levels
 */
export type InsightImpact = "low" | "medium" | "high" | "critical";

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Prediction request
 */
export interface PredictionRequest {
	readonly sessionId: string;
	readonly merchantId: string;
	readonly features: Record<string, number>;
	readonly options: PredictionOptions;
}

/**
 * Prediction options
 */
export interface PredictionOptions {
	readonly includeMetadata?: boolean;
	readonly includeFactors?: boolean;
	readonly includeRecommendations?: boolean;
	readonly timeout?: number;
	readonly priority?: Priority;
}

/**
 * Priority levels
 */
export type Priority = "low" | "normal" | "high" | "urgent";

/**
 * Prediction response wrapper
 */
export interface PredictionResponse {
	readonly success: boolean;
	readonly prediction?: RiskPrediction;
	readonly error?: string;
	readonly metadata: ResponseMetadata;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
	readonly requestId: string;
	readonly timestamp: Date;
	readonly processingTime: number;
	readonly version: string;
	readonly environment: Environment;
}
