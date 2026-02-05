/**
 * AI Model Type Definitions
 * Comprehensive type system for fraud detection models
 */

// ============================================================================
// CORE MODEL INTERFACES
// ============================================================================

/**
 * Base interface for all ML models
 */
export interface BaseModel {
	readonly name: string;
	readonly version: string;
	readonly type: ModelType;
	readonly accuracy: number;
	readonly trainedAt: Date;
	readonly features: string[];
}

/**
 * Model types supported by the system
 */
export type ModelType =
	| "neural-network"
	| "random-forest"
	| "gradient-boosting"
	| "ensemble"
	| "logistic-regression"
	| "svm"
	| "knn"
	| "isolation-forest";

/**
 * Ensemble model configuration
 */
export interface EnsembleModel extends BaseModel {
	readonly type: "ensemble";
	readonly models: ModelReference[];
	readonly weights: number[];
	readonly aggregationMethod: AggregationMethod;
}

/**
 * Individual model reference in ensemble
 */
export interface ModelReference {
	readonly model: BaseModel;
	readonly weight: number;
	readonly enabled: boolean;
}

/**
 * Aggregation methods for ensemble models
 */
export type AggregationMethod =
	| "weighted-average"
	| "majority-vote"
	| "stacking"
	| "boosting"
	| "bayesian";

// ============================================================================
// NEURAL NETWORK TYPES
// ============================================================================

/**
 * Neural network architecture configuration
 */
export interface NeuralNetworkConfig {
	readonly layers: LayerConfig[];
	readonly activation: ActivationFunction;
	readonly optimizer: OptimizerConfig;
	readonly lossFunction: LossFunction;
	readonly regularization: RegularizationConfig;
	readonly dropout: number;
}

/**
 * Individual layer configuration
 */
export interface LayerConfig {
	readonly type: LayerType;
	readonly size: number;
	readonly activation?: ActivationFunction;
	readonly dropout?: number;
	readonly batchNormalization?: boolean;
}

/**
 * Layer types for neural networks
 */
export type LayerType =
	| "dense"
	| "convolutional"
	| "recurrent"
	| "lstm"
	| "gru"
	| "attention"
	| "embedding"
	| "batch-normalization"
	| "dropout";

/**
 * Activation functions
 */
export type ActivationFunction =
	| "relu"
	| "sigmoid"
	| "tanh"
	| "softmax"
	| "leaky-relu"
	| "elu"
	| "swish"
	| "gelu";

/**
 * Optimizer configuration
 */
export interface OptimizerConfig {
	readonly type: OptimizerType;
	readonly learningRate: number;
	readonly momentum?: number;
	readonly decay?: number;
	readonly beta1?: number;
	readonly beta2?: number;
	readonly epsilon?: number;
}

/**
 * Optimizer types
 */
export type OptimizerType =
	| "adam"
	| "sgd"
	| "rmsprop"
	| "adagrad"
	| "adamax"
	| "nadam";

/**
 * Loss functions
 */
export type LossFunction =
	| "binary-crossentropy"
	| "categorical-crossentropy"
	| "mse"
	| "mae"
	| "huber"
	| "hinge"
	| "kullback-leibler";

/**
 * Regularization configuration
 */
export interface RegularizationConfig {
	readonly type: RegularizationType;
	readonly strength: number;
	readonly l1Ratio?: number;
}

/**
 * Regularization types
 */
export type RegularizationType =
	| "l1"
	| "l2"
	| "elastic-net"
	| "dropout"
	| "batch-normalization";

// ============================================================================
// TREE-BASED MODELS
// ============================================================================

/**
 * Random forest configuration
 */
export interface RandomForestConfig {
	readonly nEstimators: number;
	readonly maxDepth: number;
	readonly minSamplesSplit: number;
	readonly minSamplesLeaf: number;
	readonly maxFeatures: MaxFeatures;
	readonly bootstrap: boolean;
	readonly oobScore: boolean;
}

/**
 * Gradient boosting configuration
 */
export interface GradientBoostingConfig {
	readonly nEstimators: number;
	readonly learningRate: number;
	readonly maxDepth: number;
	readonly minSamplesSplit: number;
	readonly minSamplesLeaf: number;
	readonly maxFeatures: MaxFeatures;
	readonly subsample: number;
}

/**
 * Max features options for tree models
 */
export type MaxFeatures = "auto" | "sqrt" | "log2" | number;

// ============================================================================
// MODEL TRAINING TYPES
// ============================================================================

/**
 * Training configuration
 */
export interface TrainingConfig {
	readonly algorithm: ModelType;
	readonly validationSplit: number;
	readonly crossValidationFolds: number;
	readonly earlyStopping: EarlyStoppingConfig;
	readonly hyperparameterTuning: HyperparameterConfig;
	readonly metrics: TrainingMetric[];
}

/**
 * Early stopping configuration
 */
export interface EarlyStoppingConfig {
	readonly enabled: boolean;
	readonly patience: number;
	readonly minDelta: number;
	readonly monitor: TrainingMetric;
	readonly restoreBestWeights: boolean;
}

/**
 * Hyperparameter tuning configuration
 */
export interface HyperparameterConfig {
	readonly enabled: boolean;
	readonly method: TuningMethod;
	readonly nTrials: number;
	readonly timeout: number;
	readonly parameters: ParameterSpace[];
}

/**
 * Tuning methods
 */
export type TuningMethod =
	| "grid-search"
	| "random-search"
	| "bayesian-optimization"
	| "hyperopt"
	| "optuna";

/**
 * Parameter space for hyperparameter tuning
 */
export interface ParameterSpace {
	readonly name: string;
	readonly type: ParameterType;
	readonly range: ParameterRange;
}

/**
 * Parameter types
 */
export type ParameterType = "categorical" | "integer" | "float" | "boolean";

/**
 * Parameter range definition
 */
export interface ParameterRange {
	readonly values?: any[];
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	readonly distribution?: "uniform" | "log-uniform" | "normal";
}

/**
 * Training metrics
 */
export type TrainingMetric =
	| "accuracy"
	| "precision"
	| "recall"
	| "f1"
	| "auc"
	| "loss"
	| "val-accuracy"
	| "val-loss"
	| "mse"
	| "mae";

// ============================================================================
// MODEL EVALUATION TYPES
// ============================================================================

/**
 * Model evaluation results
 */
export interface ModelEvaluation {
	readonly modelId: string;
	readonly timestamp: Date;
	readonly metrics: EvaluationMetrics;
	readonly confusionMatrix: ConfusionMatrix;
	readonly rocCurve: ROCCurve;
	readonly precisionRecallCurve: PrecisionRecallCurve;
	readonly featureImportance: FeatureImportance[];
}

/**
 * Evaluation metrics
 */
export interface EvaluationMetrics {
	readonly accuracy: number;
	readonly precision: number;
	readonly recall: number;
	readonly f1Score: number;
	readonly auc: number;
	readonly specificity: number;
	readonly sensitivity: number;
	readonly falsePositiveRate: number;
	readonly falseNegativeRate: number;
}

/**
 * Confusion matrix
 */
export interface ConfusionMatrix {
	readonly truePositives: number;
	readonly trueNegatives: number;
	readonly falsePositives: number;
	readonly falseNegatives: number;
}

/**
 * ROC curve data points
 */
export interface ROCCurve {
	readonly fpr: number[];
	readonly tpr: number[];
	readonly thresholds: number[];
	readonly auc: number;
}

/**
 * Precision-Recall curve data points
 */
export interface PrecisionRecallCurve {
	readonly precision: number[];
	readonly recall: number[];
	readonly thresholds: number[];
	readonly averagePrecision: number;
}

/**
 * Feature importance ranking
 */
export interface FeatureImportance {
	readonly feature: string;
	readonly importance: number;
	readonly rank: number;
}

// ============================================================================
// MODEL MONITORING TYPES
// ============================================================================

/**
 * Model performance monitoring data
 */
export interface ModelMonitoring {
	readonly modelId: string;
	readonly timestamp: Date;
	readonly performance: PerformanceMetrics;
	readonly drift: DriftMetrics;
	readonly dataQuality: DataQualityMetrics;
	readonly alerts: MonitoringAlert[];
}

/**
 * Real-time performance metrics
 */
export interface PerformanceMetrics {
	readonly predictionTime: number;
	readonly throughput: number;
	readonly memoryUsage: number;
	readonly cpuUsage: number;
	readonly errorRate: number;
	readonly accuracy: number;
}

/**
 * Concept drift metrics
 */
export interface DriftMetrics {
	readonly featureDrift: FeatureDrift[];
	readonly predictionDrift: number;
	readonly dataDrift: number;
	readonly conceptDrift: number;
	readonly driftDetected: boolean;
}

/**
 * Individual feature drift
 */
export interface FeatureDrift {
	readonly feature: string;
	readonly klDivergence: number;
	readonly wassersteinDistance: number;
	readonly populationStabilityIndex: number;
	readonly driftDetected: boolean;
}

/**
 * Data quality metrics
 */
export interface DataQualityMetrics {
	readonly completeness: number;
	readonly uniqueness: number;
	readonly validity: number;
	readonly consistency: number;
	readonly timeliness: number;
}

/**
 * Monitoring alerts
 */
export interface MonitoringAlert {
	readonly id: string;
	readonly type: AlertType;
	readonly severity: AlertSeverity;
	readonly message: string;
	readonly timestamp: Date;
	readonly resolved: boolean;
}

/**
 * Alert types
 */
export type AlertType =
	| "performance-degradation"
	| "accuracy-drop"
	| "drift-detected"
	| "data-quality-issue"
	| "model-failure"
	| "resource-exhaustion";

/**
 * Alert severity levels
 */
export type AlertSeverity = "low" | "medium" | "high" | "critical";

// ============================================================================
// MODEL DEPLOYMENT TYPES
// ============================================================================

/**
 * Model deployment configuration
 */
export interface ModelDeployment {
	readonly modelId: string;
	readonly version: string;
	readonly environment: DeploymentEnvironment;
	readonly endpoint: string;
	readonly scaling: ScalingConfig;
	readonly monitoring: boolean;
	readonly rollback: boolean;
	readonly deployedAt: Date;
}

/**
 * Deployment environments
 */
export type DeploymentEnvironment =
	| "development"
	| "staging"
	| "production"
	| "testing";

/**
 * Auto-scaling configuration
 */
export interface ScalingConfig {
	readonly enabled: boolean;
	readonly minInstances: number;
	readonly maxInstances: number;
	readonly targetCpuUtilization: number;
	readonly targetMemoryUtilization: number;
	readonly scaleUpCooldown: number;
	readonly scaleDownCooldown: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Model registry entry
 */
export interface ModelRegistry {
	readonly models: ModelEntry[];
	readonly activeModel: string;
	readonly lastUpdated: Date;
}

/**
 * Individual model entry in registry
 */
export interface ModelEntry {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly type: ModelType;
	readonly status: ModelStatus;
	readonly metadata: ModelMetadata;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

/**
 * Model status
 */
export type ModelStatus =
	| "training"
	| "trained"
	| "validating"
	| "deployed"
	| "failed"
	| "archived";

/**
 * Model metadata
 */
export interface ModelMetadata {
	readonly description: string;
	readonly author: string;
	readonly tags: string[];
	readonly dataset: string;
	readonly framework: string;
	readonly hardware: string;
	readonly trainingTime: number;
	readonly parameters: number;
	readonly size: number;
}

/**
 * Model comparison result
 */
export interface ModelComparison {
	readonly models: string[];
	readonly metrics: ComparisonMetrics;
	readonly winner: string;
	readonly statisticalSignificance: boolean;
	readonly recommendation: string;
}

/**
 * Comparison metrics for multiple models
 */
export interface ComparisonMetrics {
	readonly accuracy: Record<string, number>;
	readonly precision: Record<string, number>;
	readonly recall: Record<string, number>;
	readonly f1Score: Record<string, number>;
	readonly auc: Record<string, number>;
	readonly predictionTime: Record<string, number>;
}

/**
 * Model configuration interface
 */
export interface ModelConfig {
	readonly algorithm: ModelType;
	readonly parameters: Record<string, any>;
	readonly hyperparameters: Record<string, any>;
	readonly features: string[];
	readonly target: string;
	readonly validation: ValidationConfig;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
	readonly validationSplit: number;
	readonly crossValidationFolds: number;
	readonly metrics: TrainingMetric[];
}

/**
 * Model export format
 */
export interface ModelExport {
	readonly model: BaseModel;
	readonly weights: number[];
	readonly config: ModelConfig;
	readonly metadata: ModelMetadata;
	readonly format: ExportFormat;
	readonly exportedAt: Date;
}

/**
 * Export formats
 */
export type ExportFormat =
	| "pickle"
	| "onnx"
	| "tensorflow"
	| "pytorch"
	| "json"
	| "protobuf";
