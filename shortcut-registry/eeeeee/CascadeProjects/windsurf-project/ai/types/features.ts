/**
 * Feature Engineering Type Definitions
 * Comprehensive type system for fraud detection features
 */

// ============================================================================
// CORE FEATURE INTERFACES
// ============================================================================

/**
 * Complete feature vector for fraud detection
 */
export interface FeatureVector {
	// Device Security Features
	readonly root_detected: number;
	readonly vpn_active: number;
	readonly device_integrity: number;
	readonly jailbroken: number;
	readonly developer_mode: number;

	// Behavioral Features
	readonly thermal_spike: number;
	readonly biometric_fail: number;
	readonly unusual_activity: number;
	readonly time_pattern_anomaly: number;
	readonly interaction_speed: number;

	// Network Features
	readonly proxy_hop_count: number;
	readonly network_latency: number;
	readonly connection_type: number;
	readonly ip_risk_score: number;
	readonly dns_anomaly: number;

	// Device Profile Features
	readonly device_age_hours: number;
	readonly app_install_count: number;
	readonly battery_drain_rate: number;
	readonly storage_usage: number;
	readonly screen_time: number;

	// Location Features
	readonly location_velocity: number;
	readonly geolocation_risk: number;
	readonly cross_border_activity: number;
	readonly location_consistency: number;
	readonly timezone_anomaly: number;

	// Transaction Features
	readonly transaction_frequency: number;
	readonly amount_deviation: number;
	readonly merchant_risk: number;
	readonly payment_method_risk: number;
	readonly chargeback_history: number;
}

/**
 * Extended feature vector with advanced features
 */
export interface ExtendedFeatureVector extends FeatureVector {
	// Advanced Behavioral Features
	readonly typing_pattern_score: number;
	readonly mouse_movement_anomaly: number;
	readonly touch_pressure_variance: number;
	readonly orientation_changes: number;
	readonly background_app_usage: number;

	// Social Network Features
	readonly social_graph_anomaly: number;
	readonly connection_similarity: number;
	readonly group_behavior_score: number;
	readonly referral_pattern_risk: number;
	readonly social_media_activity: number;

	// Historical Features
	readonly historical_risk_score: number;
	readonly fraud_history_count: number;
	readonly dispute_frequency: number;
	readonly account_age_days: number;
	readonly verification_level: number;

	// Biometric Features
	readonly face_recognition_confidence: number;
	readonly voice_pattern_score: number;
	readonly fingerprint_quality: number;
	readonly behavioral_biometric_score: number;
	readonly liveness_detection_score: number;
}

// ============================================================================
// FEATURE METADATA
// ============================================================================

/**
 * Feature metadata and configuration
 */
export interface FeatureMetadata {
	readonly name: string;
	readonly type: FeatureType;
	readonly category: FeatureCategory;
	readonly weight: number;
	readonly threshold: number;
	readonly range: ValueRange;
	readonly importance: FeatureImportance;
	readonly description: string;
	readonly collection: FeatureCollection;
	readonly validation: FeatureValidation;
	readonly processing: FeatureProcessing;
}

/**
 * Feature data types
 */
export type FeatureType =
	| "numeric"
	| "categorical"
	| "binary"
	| "ordinal"
	| "text"
	| "image"
	| "time-series"
	| "geospatial";

/**
 * Feature categories for organization
 */
export type FeatureCategory =
	| "device-security"
	| "behavioral"
	| "network"
	| "device-profile"
	| "location"
	| "transaction"
	| "social"
	| "historical"
	| "biometric"
	| "environmental";

/**
 * Feature importance levels
 */
export type FeatureImportance =
	| "critical"
	| "high"
	| "medium"
	| "low"
	| "informational";

/**
 * Value range for numeric features
 */
export interface ValueRange {
	readonly min: number;
	readonly max: number;
	readonly mean: number;
	readonly std: number;
	readonly distribution?: DistributionType;
}

/**
 * Statistical distribution types
 */
export type DistributionType =
	| "normal"
	| "uniform"
	| "exponential"
	| "poisson"
	| "binomial"
	| "beta"
	| "gamma";

/**
 * Feature collection information
 */
export interface FeatureCollection {
	readonly source: FeatureSource;
	readonly frequency: CollectionFrequency;
	readonly latency: number;
	readonly reliability: number;
	readonly cost: number;
}

/**
 * Feature sources
 */
export type FeatureSource =
	| "device-sensors"
	| "network-logs"
	| "user-input"
	| "third-party-api"
	| "behavioral-tracking"
	| "biometric-sensors"
	| "location-services"
	| "transaction-systems";

/**
 * Collection frequencies
 */
export type CollectionFrequency =
	| "real-time"
	| "per-session"
	| "per-transaction"
	| "hourly"
	| "daily"
	| "on-demand";

/**
 * Feature validation rules
 */
export interface FeatureValidation {
	readonly required: boolean;
	readonly nullable: boolean;
	readonly constraints: ValidationConstraints;
	readonly sanitization: SanitizationRule[];
}

/**
 * Validation constraints
 */
export interface ValidationConstraints {
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly pattern?: string;
	readonly allowedValues?: any[];
	readonly customValidators?: string[];
}

/**
 * Data sanitization rules
 */
export interface SanitizationRule {
	readonly type: SanitizationType;
	readonly parameters: Record<string, any>;
}

/**
 * Sanitization types
 */
export type SanitizationType =
	| "normalize"
	| "standardize"
	| "encode"
	| "hash"
	| "encrypt"
	| "anonymize"
	| "filter"
	| "transform";

/**
 * Feature processing configuration
 */
export interface FeatureProcessing {
	readonly preprocessing: PreprocessingStep[];
	readonly encoding: FeatureEncoding;
	readonly scaling: ScalingMethod;
	readonly selection: FeatureSelection;
	readonly engineering: FeatureEngineering;
}

/**
 * Preprocessing steps
 */
export interface PreprocessingStep {
	readonly type: PreprocessingType;
	readonly order: number;
	readonly parameters: Record<string, any>;
}

/**
 * Preprocessing types
 */
export type PreprocessingType =
	| "missing-value-imputation"
	| "outlier-detection"
	| "noise-reduction"
	| "smoothing"
	| "filtering"
	| "normalization";

/**
 * Feature encoding methods
 */
export interface FeatureEncoding {
	readonly method: EncodingMethod;
	readonly parameters: Record<string, any>;
}

/**
 * Encoding methods
 */
export type EncodingMethod =
	| "one-hot"
	| "label-encoding"
	| "target-encoding"
	| "binary-encoding"
	| "hashing"
	| "embedding"
	| "frequency-encoding";

/**
 * Scaling methods
 */
export type ScalingMethod =
	| "standard-scaler"
	| "min-max-scaler"
	| "robust-scaler"
	| "normalizer"
	| "quantile-transformer"
	| "power-transformer";

/**
 * Feature selection configuration
 */
export interface FeatureSelection {
	readonly method: SelectionMethod;
	readonly parameters: Record<string, any>;
	readonly maxFeatures: number;
	readonly threshold: number;
}

/**
 * Feature selection methods
 */
export type SelectionMethod =
	| "variance-threshold"
	| "chi-square"
	| "anova"
	| "mutual-information"
	| "recursive-feature-elimination"
	| "lasso"
	| "tree-based"
	| "correlation";

/**
 * Feature engineering configuration
 */
export interface FeatureEngineering {
	readonly enabled: boolean;
	readonly techniques: EngineeringTechnique[];
	readonly interactionTerms: InteractionTerm[];
	readonly polynomialFeatures: PolynomialConfig;
}

/**
 * Feature engineering techniques
 */
export type EngineeringTechnique =
	| "polynomial-features"
	| "interaction-terms"
	| "binning"
	| "log-transformation"
	| "power-transformation"
	| "time-decay"
	| "moving-averages"
	| "lag-features";

/**
 * Interaction term configuration
 */
export interface InteractionTerm {
	readonly features: string[];
	readonly type: InteractionType;
	readonly degree: number;
}

/**
 * Interaction types
 */
export type InteractionType =
	| "multiplication"
	| "division"
	| "addition"
	| "subtraction"
	| "custom";

/**
 * Polynomial feature configuration
 */
export interface PolynomialConfig {
	readonly degree: number;
	readonly includeBias: boolean;
	readonly interactionOnly: boolean;
}

// ============================================================================
// FEATURE STORE TYPES
// ============================================================================

/**
 * Feature store configuration
 */
export interface FeatureStore {
	readonly name: string;
	readonly version: string;
	readonly features: FeatureDefinition[];
	readonly storage: StorageConfig;
	readonly serving: ServingConfig;
	readonly monitoring: MonitoringConfig;
}

/**
 * Individual feature definition
 */
export interface FeatureDefinition {
	readonly name: string;
	readonly metadata: FeatureMetadata;
	readonly computation: FeatureComputation;
	readonly lineage: FeatureLineage;
	readonly quality: FeatureQuality;
}

/**
 * Feature computation logic
 */
export interface FeatureComputation {
	readonly type: ComputationType;
	readonly source: string;
	readonly logic: string;
	readonly dependencies: string[];
	readonly refreshInterval: number;
}

/**
 * Computation types
 */
export type ComputationType =
	| "sql"
	| "python"
	| "spark"
	| "streaming"
	| "batch"
	| "real-time";

/**
 * Feature lineage tracking
 */
export interface FeatureLineage {
	readonly upstream: FeatureDependency[];
	readonly downstream: FeatureDependency[];
	readonly transformations: Transformation[];
}

/**
 * Feature dependency
 */
export interface FeatureDependency {
	readonly feature: string;
	readonly type: DependencyType;
	readonly strength: number;
}

/**
 * Dependency types
 */
export type DependencyType = "direct" | "indirect" | "optional" | "required";

/**
 * Data transformation
 */
export interface Transformation {
	readonly type: TransformationType;
	readonly parameters: Record<string, any>;
	readonly timestamp: Date;
}

/**
 * Transformation types
 */
export type TransformationType =
	| "aggregation"
	| "filtering"
	| "joining"
	| "pivoting"
	| "windowing"
	| "sampling";

/**
 * Feature quality metrics
 */
export interface FeatureQuality {
	readonly completeness: number;
	readonly uniqueness: number;
	readonly validity: number;
	readonly consistency: number;
	readonly timeliness: number;
	readonly accuracy: number;
	readonly lastUpdated: Date;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
	readonly type: StorageType;
	readonly format: StorageFormat;
	readonly partitioning: PartitioningConfig;
	readonly retention: RetentionPolicy;
}

/**
 * Storage types
 */
export type StorageType =
	| "file-system"
	| "database"
	| "data-lake"
	| "object-storage"
	| "in-memory"
	| "distributed";

/**
 * Storage formats
 */
export type StorageFormat =
	| "parquet"
	| "avro"
	| "orc"
	| "json"
	| "csv"
	| "delta-lake"
	| "iceberg";

/**
 * Partitioning configuration
 */
export interface PartitioningConfig {
	readonly enabled: boolean;
	readonly columns: string[];
	readonly strategy: PartitioningStrategy;
}

/**
 * Partitioning strategies
 */
export type PartitioningStrategy =
	| "hash"
	| "range"
	| "list"
	| "round-robin"
	| "composite";

/**
 * Retention policy
 */
export interface RetentionPolicy {
	readonly duration: number;
	readonly unit: TimeUnit;
	readonly coldStorage: boolean;
	readonly archival: boolean;
}

/**
 * Time units
 */
export type TimeUnit =
	| "seconds"
	| "minutes"
	| "hours"
	| "days"
	| "weeks"
	| "months"
	| "years";

/**
 * Serving configuration
 */
export interface ServingConfig {
	readonly enabled: boolean;
	readonly endpoints: ServingEndpoint[];
	readonly caching: CachingConfig;
	readonly rateLimit: RateLimitConfig;
}

/**
 * Serving endpoint
 */
export interface ServingEndpoint {
	readonly name: string;
	readonly url: string;
	readonly method: HttpMethod;
	readonly authentication: boolean;
	readonly features: string[];
}

/**
 * HTTP methods
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Caching configuration
 */
export interface CachingConfig {
	readonly enabled: boolean;
	readonly ttl: number;
	readonly maxSize: number;
	readonly strategy: CachingStrategy;
}

/**
 * Caching strategies
 */
export type CachingStrategy = "lru" | "lfu" | "fifo" | "random" | "ttl-based";

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
	readonly enabled: boolean;
	readonly requestsPerSecond: number;
	readonly burstSize: number;
	readonly algorithm: RateLimitAlgorithm;
}

/**
 * Rate limiting algorithms
 */
export type RateLimitAlgorithm =
	| "token-bucket"
	| "leaky-bucket"
	| "fixed-window"
	| "sliding-window";

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
	readonly enabled: boolean;
	readonly metrics: MonitoringMetric[];
	readonly alerts: AlertConfig[];
	readonly dashboards: DashboardConfig[];
}

/**
 * Monitoring metrics
 */
export type MonitoringMetric =
	| "request-count"
	| "response-time"
	| "error-rate"
	| "feature-drift"
	| "data-quality"
	| "cache-hit-rate";

/**
 * Alert configuration
 */
export interface AlertConfig {
	readonly name: string;
	readonly condition: string;
	readonly severity: AlertSeverity;
	readonly channels: NotificationChannel[];
}

/**
 * Alert severity levels
 */
export type AlertSeverity = "info" | "warning" | "error" | "critical";

/**
 * Notification channels
 */
export type NotificationChannel =
	| "email"
	| "slack"
	| "pagerduty"
	| "webhook"
	| "sms";

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
	readonly name: string;
	readonly url: string;
	readonly refreshInterval: number;
	readonly widgets: WidgetConfig[];
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
	readonly type: WidgetType;
	readonly title: string;
	readonly query: string;
	readonly visualization: VisualizationType;
}

/**
 * Widget types
 */
export type WidgetType = "chart" | "table" | "metric" | "gauge" | "heatmap";

/**
 * Visualization types
 */
export type VisualizationType =
	| "line-chart"
	| "bar-chart"
	| "pie-chart"
	| "scatter-plot"
	| "heatmap"
	| "histogram";
