/**
 * ML Model Registry
 * Manages all ML model instances and provides telemetry aggregation
 *
 * SYSCALL: ML_MODEL_REGISTRY
 */

import {
  type MLModel,
  type MLModelInput,
  type MLModelOutput,
  type MLModelStats,
  type MLTelemetrySnapshot,
  type TierStats,
  type SLAViolation,
  type MLConfig,
  MLModelId,
  MLProcessingTier,
  MLHealthStatus,
  ML_MODEL_DEFINITIONS,
  ML_TIER_CONFIG,
  DEFAULT_ML_CONFIG,
} from './types';

import {
  MMCompressionModel,
  VelocityConvexityModel,
  LiquidityMirageModel,
  ProviderGlitchModel,
  AsymmetricPropModel,
  PropBetaSkewModel,
  SourceIDClassifierModel,
  MomentumTransferModel,
  EmotionalCarryoverModel,
  RegulatoryDelayModel,
} from './models';

/**
 * Factory function to create all model instances
 */
function createAllModels(): Map<MLModelId, MLModel> {
  const models = new Map<MLModelId, MLModel>();

  // Tier 1: High-Frequency (<200ms)
  models.set(MLModelId.MM_COMPRESSION, new MMCompressionModel());
  models.set(MLModelId.VELOCITY_CONVEXITY, new VelocityConvexityModel());
  models.set(MLModelId.LIQUIDITY_MIRAGE, new LiquidityMirageModel());

  // Tier 2: Quantitative (800ms-1.3s)
  models.set(MLModelId.PROVIDER_GLITCH, new ProviderGlitchModel());
  models.set(MLModelId.ASYMMETRIC_PROP, new AsymmetricPropModel());

  // Tier 3: Statistical (0.9s-1.85s)
  models.set(MLModelId.PROP_BETA_SKEW, new PropBetaSkewModel());
  models.set(MLModelId.SOURCE_ID_CLASSIFIER, new SourceIDClassifierModel());
  models.set(MLModelId.MOMENTUM_TRANSFER, new MomentumTransferModel());
  models.set(MLModelId.EMOTIONAL_CARRYOVER, new EmotionalCarryoverModel());

  // Tier 4: Synchronization (5s window)
  models.set(MLModelId.REGULATORY_DELAY, new RegulatoryDelayModel());

  return models;
}

/**
 * ML Model Registry
 * Central management for all ML model instances
 */
export class MLModelRegistry {
  private readonly models: Map<MLModelId, MLModel>;
  private readonly config: MLConfig;
  private readonly slaViolations: SLAViolation[] = [];
  private readonly maxViolationHistory = 100;

  constructor(config: Partial<MLConfig> = {}) {
    this.config = { ...DEFAULT_ML_CONFIG, ...config };
    this.models = createAllModels();
  }

  /**
   * Get a model by ID
   */
  getModel(modelId: MLModelId): MLModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models
   */
  getAllModels(): ReadonlyMap<MLModelId, MLModel> {
    return this.models;
  }

  /**
   * Get models by tier
   */
  getModelsByTier(tier: MLProcessingTier): MLModel[] {
    const result: MLModel[] = [];
    for (const model of this.models.values()) {
      if (model.tier === tier) {
        result.push(model);
      }
    }
    return result;
  }

  /**
   * Evaluate a model and track SLA violations
   */
  evaluate(modelId: MLModelId, input: MLModelInput): MLModelOutput | null {
    if (!this.config.enabled) {
      return null;
    }

    const model = this.models.get(modelId);
    if (!model || !model.isReady()) {
      return null;
    }

    const output = model.evaluate(input);

    // Track SLA violations
    if (!output.slaMetadata.met && this.config.enableSLAAlerts) {
      this.recordViolation(modelId, output);
    }

    return output;
  }

  /**
   * Evaluate all ready models in a tier
   */
  evaluateTier(tier: MLProcessingTier, input: MLModelInput): MLModelOutput[] {
    if (!this.config.enabled) {
      return [];
    }

    const results: MLModelOutput[] = [];
    const tierConfig = ML_TIER_CONFIG[tier];

    for (const model of this.models.values()) {
      if (model.tier === tier && model.isReady()) {
        const output = model.evaluate(input);
        results.push(output);

        if (!output.slaMetadata.met && this.config.enableSLAAlerts) {
          this.recordViolation(model.id, output);
        }
      }
    }

    return results;
  }

  /**
   * Record an SLA violation
   */
  private recordViolation(modelId: MLModelId, output: MLModelOutput): void {
    // Find consecutive count
    let consecutiveCount = 1;
    for (let i = this.slaViolations.length - 1; i >= 0; i--) {
      if (this.slaViolations[i].modelId === modelId) {
        consecutiveCount = this.slaViolations[i].consecutiveCount + 1;
        break;
      }
    }

    const violation: SLAViolation = {
      modelId,
      targetMs: output.slaMetadata.targetMs,
      actualMs: output.slaMetadata.actualMs,
      timestamp: Date.now(),
      consecutiveCount,
    };

    this.slaViolations.push(violation);

    // Trim history
    if (this.slaViolations.length > this.maxViolationHistory) {
      this.slaViolations.shift();
    }
  }

  /**
   * Get telemetry snapshot
   */
  getTelemetrySnapshot(): MLTelemetrySnapshot {
    const modelStats = new Map<MLModelId, MLModelStats>();
    const tierStats = new Map<MLProcessingTier, TierStats>();

    // Collect per-model stats
    for (const [id, model] of this.models) {
      modelStats.set(id, model.getStats());
    }

    // Compute tier aggregates
    for (const tier of [
      MLProcessingTier.TIER_1_HF,
      MLProcessingTier.TIER_2_QUANT,
      MLProcessingTier.TIER_3_STATS,
      MLProcessingTier.TIER_4_SYNC,
    ]) {
      const tierModels = this.getModelsByTier(tier);
      const tierConfig = ML_TIER_CONFIG[tier];

      let totalEvaluations = 0;
      let totalViolations = 0;
      let totalLatencyUs = 0;
      let modelsMeetingSLA = 0;

      for (const model of tierModels) {
        const stats = model.getStats();
        totalEvaluations += stats.evaluations;
        totalViolations += stats.slaViolations;
        totalLatencyUs += stats.avgLatencyUs * stats.evaluations;

        const violationRate = stats.evaluations > 0
          ? stats.slaViolations / stats.evaluations
          : 0;
        if (violationRate < 0.05) { // <5% violation rate = meeting SLA
          modelsMeetingSLA++;
        }
      }

      tierStats.set(tier, {
        tier,
        modelCount: tierModels.length,
        modelsMeetingSLA,
        totalEvaluations,
        totalViolations,
        avgLatencyUs: totalEvaluations > 0 ? totalLatencyUs / totalEvaluations : 0,
      });
    }

    // Compute overall health
    const health = this.computeHealth(tierStats);

    // Get active violations (last 10)
    const activeViolations = this.slaViolations.slice(-10);

    return {
      timestamp: Date.now(),
      models: modelStats,
      tierStats,
      health,
      activeViolations,
    };
  }

  /**
   * Compute overall health status
   */
  private computeHealth(tierStats: Map<MLProcessingTier, TierStats>): MLHealthStatus {
    let totalModels = 0;
    let modelsMeetingSLA = 0;
    let hasCriticalViolations = false;

    for (const stats of tierStats.values()) {
      totalModels += stats.modelCount;
      modelsMeetingSLA += stats.modelsMeetingSLA;

      // Check for critical violations (>20% in any tier)
      if (stats.totalEvaluations > 0) {
        const violationRate = stats.totalViolations / stats.totalEvaluations;
        if (violationRate > 0.2) {
          hasCriticalViolations = true;
        }
      }
    }

    // Check for consecutive violations exceeding threshold
    const recentViolations = this.slaViolations.slice(-10);
    const hasConsecutiveExceeded = recentViolations.some(
      v => v.consecutiveCount >= this.config.maxConsecutiveViolations
    );

    if (totalModels === 0) {
      return MLHealthStatus.OFFLINE;
    }

    if (hasCriticalViolations || hasConsecutiveExceeded) {
      return MLHealthStatus.CRITICAL;
    }

    const slaRate = modelsMeetingSLA / totalModels;
    if (slaRate >= 1.0) {
      return MLHealthStatus.HEALTHY;
    } else if (slaRate >= 0.8) {
      return MLHealthStatus.DEGRADED;
    } else {
      return MLHealthStatus.CRITICAL;
    }
  }

  /**
   * Get model count
   */
  get modelCount(): number {
    return this.models.size;
  }

  /**
   * Get ready model count
   */
  getReadyCount(): number {
    let count = 0;
    for (const model of this.models.values()) {
      if (model.isReady()) count++;
    }
    return count;
  }

  /**
   * Check if ML layer is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Reset all models
   */
  resetAll(): void {
    for (const model of this.models.values()) {
      model.reset();
    }
    this.slaViolations.length = 0;
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<MLConfig> {
    return this.config;
  }

  /**
   * Get SLA violation history
   */
  getViolationHistory(): readonly SLAViolation[] {
    return this.slaViolations;
  }
}

/**
 * Create a configured registry instance
 */
export function createMLRegistry(config?: Partial<MLConfig>): MLModelRegistry {
  return new MLModelRegistry(config);
}

/**
 * Singleton instance for shared use
 */
let sharedRegistry: MLModelRegistry | null = null;

/**
 * Get or create shared registry instance
 */
export function getSharedRegistry(config?: Partial<MLConfig>): MLModelRegistry {
  if (!sharedRegistry) {
    sharedRegistry = createMLRegistry(config);
  }
  return sharedRegistry;
}

/**
 * Reset shared registry (for testing)
 */
export function resetSharedRegistry(): void {
  if (sharedRegistry) {
    sharedRegistry.resetAll();
  }
  sharedRegistry = null;
}
