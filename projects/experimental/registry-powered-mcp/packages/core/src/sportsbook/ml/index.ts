/**
 * ML Intelligence Layer
 * API stubs for high-frequency model integration
 *
 * Components #71-88: Real-time risk adjustments within millisecond windows
 * Built atop Delta-Update-Aggregator (#37)
 *
 * @module ml
 */

// Core types
export {
  // Enums
  MLProcessingTier,
  MLModelId,
  MLSignal,
  MLHealthStatus,

  // Constants
  ML_TIER_CONFIG,
  ML_MODEL_DEFINITIONS,
  DEFAULT_ML_CONFIG,

  // Interfaces
  type MLModel,
  type MLModelInput,
  type MLModelOutput,
  type MLModelStats,
  type SLAMetadata,
  type MLTelemetrySnapshot,
  type TierStats,
  type SLAViolation,
  type MLConfig,

  // Type guards
  isValidMLModelId,
  isValidMLProcessingTier,
  isValidMLSignal,
} from './types';

// Model base class
export { MLModelBase } from './model-base';

// Model implementations
export {
  // Tier 1: High-Frequency (<200ms)
  MMCompressionModel,
  VelocityConvexityModel,
  LiquidityMirageModel,

  // Tier 2: Quantitative (800ms-1.3s)
  ProviderGlitchModel,
  AsymmetricPropModel,

  // Tier 3: Statistical (0.9s-1.85s)
  PropBetaSkewModel,
  SourceIDClassifierModel,
  MomentumTransferModel,
  EmotionalCarryoverModel,

  // Tier 4: Synchronization (5s window)
  RegulatoryDelayModel,
} from './models';

// Registry
export {
  MLModelRegistry,
  createMLRegistry,
  getSharedRegistry,
  resetSharedRegistry,
} from './registry';
