/**
 * ML Intelligence Layer Types
 * API stubs for high-frequency model integration
 *
 * Components #71-88: Real-time risk adjustments within millisecond windows
 * Built atop Delta-Update-Aggregator (#37)
 *
 * SYSCALL: ML_INTELLIGENCE_TYPES
 */

// ============================================================================
// Processing Tiers
// ============================================================================

/**
 * ML Model Processing Tiers
 * Determines latency budget and execution context
 */
export enum MLProcessingTier {
  /** High-frequency tick loop integration (<200ms) */
  TIER_1_HF = 1,
  /** Quantitative models with moderate latency (800ms-1.3s) */
  TIER_2_QUANT = 2,
  /** Statistical models with higher compute (0.9s-1.85s) */
  TIER_3_STATS = 3,
  /** Synchronization models with window-based processing (5s) */
  TIER_4_SYNC = 4,
}

/**
 * Tier configuration with SLA targets
 */
export const ML_TIER_CONFIG: Record<MLProcessingTier, {
  name: string;
  maxLatencyMs: number;
  featureFlag: string;
  stability: 'STABLE' | 'BETA' | 'EXPERIMENTAL';
}> = {
  [MLProcessingTier.TIER_1_HF]: {
    name: 'High-Frequency',
    maxLatencyMs: 200,
    featureFlag: 'PREMIUM',
    stability: 'STABLE',
  },
  [MLProcessingTier.TIER_2_QUANT]: {
    name: 'Quantitative',
    maxLatencyMs: 1300,
    featureFlag: 'BETA_FEATURES',
    stability: 'STABLE',
  },
  [MLProcessingTier.TIER_3_STATS]: {
    name: 'Statistical',
    maxLatencyMs: 1850,
    featureFlag: 'BETA_FEATURES',
    stability: 'STABLE',
  },
  [MLProcessingTier.TIER_4_SYNC]: {
    name: 'Synchronization',
    maxLatencyMs: 5000,
    featureFlag: 'DEBUG',
    stability: 'EXPERIMENTAL',
  },
} as const;

// ============================================================================
// Model Component IDs
// ============================================================================

/**
 * ML Model Component IDs (#71-88)
 */
export enum MLModelId {
  /** Asymmetric Prop - GARCH Spillover with Markov States */
  ASYMMETRIC_PROP = 71,
  /** Provider Glitch - Time-Shift Correlation */
  PROVIDER_GLITCH = 74,
  /** Velocity Convexity - In-Play Main → Half Market Sync */
  VELOCITY_CONVEXITY = 75,
  /** MM Compression - Exchange Line → Main → Team Total */
  MM_COMPRESSION = 76,
  /** Regulatory Delay - State Lag → Cross-Book Sync */
  REGULATORY_DELAY = 77,
  /** Momentum Transfer - Behavioral Carryover */
  MOMENTUM_TRANSFER = 82,
  /** Prop Beta Skew - Quantile Regression */
  PROP_BETA_SKEW = 73,
  /** Liquidity Mirage - Exchange Lay → Steam Fingerprint */
  LIQUIDITY_MIRAGE = 85,
  /** Source ID Classifier - Velocity RF on dP/dt */
  SOURCE_ID_CLASSIFIER = 88,
  /** Emotional Carryover - Behavioral Steam Tracking */
  EMOTIONAL_CARRYOVER = 79,
}

/**
 * Model metadata registry
 */
export const ML_MODEL_DEFINITIONS: Record<MLModelId, {
  id: MLModelId;
  name: string;
  tier: MLProcessingTier;
  targetSlaMs: number;
  bunApi: string;
  logicType: string;
  description: string;
}> = {
  [MLModelId.MM_COMPRESSION]: {
    id: MLModelId.MM_COMPRESSION,
    name: 'MM Compression',
    tier: MLProcessingTier.TIER_1_HF,
    targetSlaMs: 150,
    bunApi: 'Bun.hash.wyhash()',
    logicType: 'Exchange Line → Main → Team Total',
    description: 'Market maker compression detection via hash-based change tracking',
  },
  [MLModelId.VELOCITY_CONVEXITY]: {
    id: MLModelId.VELOCITY_CONVEXITY,
    name: 'Velocity Convexity',
    tier: MLProcessingTier.TIER_1_HF,
    targetSlaMs: 200,
    bunApi: 'Bun.nanoseconds()',
    logicType: 'In-Play Main → Half Market Sync',
    description: 'Detects convexity in odds velocity for in-play synchronization',
  },
  [MLModelId.LIQUIDITY_MIRAGE]: {
    id: MLModelId.LIQUIDITY_MIRAGE,
    name: 'Liquidity Mirage',
    tier: MLProcessingTier.TIER_1_HF,
    targetSlaMs: 100,
    bunApi: 'Bun.peek()',
    logicType: 'Exchange Lay → Steam Fingerprint',
    description: 'Identifies phantom liquidity via non-blocking memory inspection',
  },
  [MLModelId.PROVIDER_GLITCH]: {
    id: MLModelId.PROVIDER_GLITCH,
    name: 'Provider Glitch',
    tier: MLProcessingTier.TIER_2_QUANT,
    targetSlaMs: 800,
    bunApi: 'S3Client.stat()',
    logicType: 'Time-Shift Correlation (τ=20s)',
    description: 'Detects provider feed glitches via time-shift correlation analysis',
  },
  [MLModelId.ASYMMETRIC_PROP]: {
    id: MLModelId.ASYMMETRIC_PROP,
    name: 'Asymmetric Prop',
    tier: MLProcessingTier.TIER_2_QUANT,
    targetSlaMs: 1300,
    bunApi: 'DataView.getFloat32()',
    logicType: 'GARCH Spillover (Markov States)',
    description: 'GARCH-based volatility spillover with Markov state transitions',
  },
  [MLModelId.PROP_BETA_SKEW]: {
    id: MLModelId.PROP_BETA_SKEW,
    name: 'Prop Beta Skew',
    tier: MLProcessingTier.TIER_3_STATS,
    targetSlaMs: 1850,
    bunApi: 'Bun.ArrayBuffer',
    logicType: 'Quantile Regression (Usage)',
    description: 'Quantile regression for prop market beta estimation',
  },
  [MLModelId.SOURCE_ID_CLASSIFIER]: {
    id: MLModelId.SOURCE_ID_CLASSIFIER,
    name: 'Source ID Classifier',
    tier: MLProcessingTier.TIER_3_STATS,
    targetSlaMs: 900,
    bunApi: 'Bun.CryptoHasher',
    logicType: 'Velocity Classifier (RF on dP/dt)',
    description: 'Random forest classifier on price velocity derivatives',
  },
  [MLModelId.REGULATORY_DELAY]: {
    id: MLModelId.REGULATORY_DELAY,
    name: 'Regulatory Delay',
    tier: MLProcessingTier.TIER_4_SYNC,
    targetSlaMs: 5000,
    bunApi: 'Bun.dns.prefetch()',
    logicType: 'State Lag → Cross-Book Sync',
    description: 'Cross-book synchronization accounting for regulatory delays',
  },
  [MLModelId.MOMENTUM_TRANSFER]: {
    id: MLModelId.MOMENTUM_TRANSFER,
    name: 'Momentum Transfer',
    tier: MLProcessingTier.TIER_3_STATS,
    targetSlaMs: 1600,
    bunApi: 'Redis.hgetall()',
    logicType: 'Behavioral Carryover (2min window)',
    description: 'Cross-event momentum transfer tracking',
  },
  [MLModelId.EMOTIONAL_CARRYOVER]: {
    id: MLModelId.EMOTIONAL_CARRYOVER,
    name: 'Emotional Carryover',
    tier: MLProcessingTier.TIER_3_STATS,
    targetSlaMs: 1600,
    bunApi: 'Redis.hgetall()',
    logicType: 'Behavioral Steam Tracking',
    description: 'Tracks behavioral patterns in steam move sequences',
  },
} as const;

// ============================================================================
// Model Input/Output Types
// ============================================================================

/**
 * Base input for all ML models
 */
export interface MLModelInput {
  /** Current price buffer */
  readonly currentBuffer: Uint32Array;
  /** Previous price buffer */
  readonly previousBuffer: Uint32Array;
  /** Timestamp in nanoseconds */
  readonly timestampNs: bigint;
  /** Market ID */
  readonly marketId: string;
  /** Bookmaker source */
  readonly bookmaker: string;
}

/**
 * Base output from all ML models
 */
export interface MLModelOutput {
  /** Model ID that produced this output */
  readonly modelId: MLModelId;
  /** Prediction confidence (0-1) */
  readonly confidence: number;
  /** Predicted action/signal */
  readonly signal: MLSignal;
  /** Processing latency in microseconds */
  readonly latencyUs: number;
  /** Whether SLA was met */
  readonly slaMetadata: SLAMetadata;
  /** Model-specific payload */
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * ML Signal types
 */
export enum MLSignal {
  /** No action needed */
  HOLD = 0,
  /** Adjust line up */
  ADJUST_UP = 1,
  /** Adjust line down */
  ADJUST_DOWN = 2,
  /** Flag for review */
  REVIEW = 3,
  /** Suspend market */
  SUSPEND = 4,
  /** Sync with source */
  SYNC = 5,
}

/**
 * SLA tracking metadata
 */
export interface SLAMetadata {
  /** Target latency in ms */
  readonly targetMs: number;
  /** Actual latency in ms */
  readonly actualMs: number;
  /** Whether SLA was met */
  readonly met: boolean;
  /** Tier for this model */
  readonly tier: MLProcessingTier;
}

// ============================================================================
// Model Interface
// ============================================================================

/**
 * ML Model interface (stub implementation)
 */
export interface MLModel {
  /** Model ID */
  readonly id: MLModelId;
  /** Model name */
  readonly name: string;
  /** Processing tier */
  readonly tier: MLProcessingTier;
  /** Target SLA in milliseconds */
  readonly targetSlaMs: number;

  /**
   * Evaluate model on input
   * Returns prediction output
   */
  evaluate(input: MLModelInput): MLModelOutput;

  /**
   * Check if model is ready
   */
  isReady(): boolean;

  /**
   * Get model statistics
   */
  getStats(): MLModelStats;

  /**
   * Reset model state
   */
  reset(): void;
}

/**
 * Model runtime statistics
 */
export interface MLModelStats {
  /** Total evaluations */
  readonly evaluations: number;
  /** SLA violations count */
  readonly slaViolations: number;
  /** Average latency in microseconds */
  readonly avgLatencyUs: number;
  /** P99 latency in microseconds */
  readonly p99LatencyUs: number;
  /** Last evaluation timestamp */
  readonly lastEvaluation: number;
  /** Signal distribution */
  readonly signalDistribution: Readonly<Record<MLSignal, number>>;
}

// ============================================================================
// Telemetry Types
// ============================================================================

/**
 * ML Telemetry snapshot for dashboard
 */
export interface MLTelemetrySnapshot {
  /** Timestamp of snapshot */
  readonly timestamp: number;
  /** Per-model statistics */
  readonly models: ReadonlyMap<MLModelId, MLModelStats>;
  /** Per-tier aggregate statistics */
  readonly tierStats: ReadonlyMap<MLProcessingTier, TierStats>;
  /** Overall health status */
  readonly health: MLHealthStatus;
  /** Active SLA violations */
  readonly activeViolations: readonly SLAViolation[];
}

/**
 * Tier-level aggregate statistics
 */
export interface TierStats {
  /** Tier ID */
  readonly tier: MLProcessingTier;
  /** Total models in tier */
  readonly modelCount: number;
  /** Models meeting SLA */
  readonly modelsMeetingSLA: number;
  /** Aggregate evaluation count */
  readonly totalEvaluations: number;
  /** Aggregate SLA violation count */
  readonly totalViolations: number;
  /** Tier-wide average latency */
  readonly avgLatencyUs: number;
}

/**
 * Overall ML system health
 */
export enum MLHealthStatus {
  /** All models meeting SLA */
  HEALTHY = 'HEALTHY',
  /** Some models degraded */
  DEGRADED = 'DEGRADED',
  /** Critical SLA violations */
  CRITICAL = 'CRITICAL',
  /** System unavailable */
  OFFLINE = 'OFFLINE',
}

/**
 * SLA violation record
 */
export interface SLAViolation {
  /** Model that violated SLA */
  readonly modelId: MLModelId;
  /** Target latency */
  readonly targetMs: number;
  /** Actual latency */
  readonly actualMs: number;
  /** Violation timestamp */
  readonly timestamp: number;
  /** Consecutive violations */
  readonly consecutiveCount: number;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * ML Intelligence Layer configuration
 */
export interface MLConfig {
  /** Enable ML layer */
  readonly enabled: boolean;
  /** Tier 1 timeout in ms */
  readonly tier1Timeout: number;
  /** GARCH Markov state sensitivity */
  readonly garchMarkovState: number;
  /** Regulatory lag window in ms */
  readonly regulatoryLagWindow: number;
  /** Beta skew quantile target */
  readonly betaSkewQuantile: number;
  /** Momentum transfer window in ms */
  readonly momentumWindow: number;
  /** Enable SLA violation alerts */
  readonly enableSLAAlerts: boolean;
  /** Max consecutive violations before alert */
  readonly maxConsecutiveViolations: number;
}

/**
 * Default ML configuration
 */
export const DEFAULT_ML_CONFIG: MLConfig = {
  enabled: true,
  tier1Timeout: 200,
  garchMarkovState: 0.3,
  regulatoryLagWindow: 5000,
  betaSkewQuantile: 0.75,
  momentumWindow: 120_000, // 2 minutes
  enableSLAAlerts: true,
  maxConsecutiveViolations: 3,
} as const;

// ============================================================================
// Type Guards
// ============================================================================

export function isValidMLModelId(value: number): value is MLModelId {
  return Object.values(MLModelId).includes(value);
}

export function isValidMLProcessingTier(value: number): value is MLProcessingTier {
  return value >= 1 && value <= 4;
}

export function isValidMLSignal(value: number): value is MLSignal {
  return value >= 0 && value <= 5;
}
