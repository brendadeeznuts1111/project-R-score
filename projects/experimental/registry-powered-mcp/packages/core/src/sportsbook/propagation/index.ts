/**
 * Propagation Half-Life Framework
 * Monitoring latency arbitrage across derivative markets
 *
 * Entry Points:
 * - HalfLifeTracker: Main tracking engine
 * - Pattern Detectors: 20 patterns (#70-89)
 * - HalfLifeCalculator: Decay curve fitting
 *
 * Performance Targets:
 * - <1ms per update processing
 * - <8MB memory footprint
 * - O(1) EMA updates, O(20) pattern detection
 *
 * SYSCALL: PROPAGATION_HALFLIFE_MODULE
 */

// ============================================================================
// Core Types
// ============================================================================

export {
  // Enums
  MarketTier,
  PatternCategory,

  // Constants
  TIER_HALFLIFE_TARGETS,
  PATTERN_DEFINITIONS,
  DEFAULT_PROPAGATION_CONFIG,
  PROPAGATION_PERFORMANCE_TARGETS,

  // Interfaces
  type PropagationEntry,
  type HalfLifeMetrics,
  type DetectedPattern,
  type TrackingResult,
  type PropagationHeatmap,
  type HeatmapCell,
  type PropagationConfig,
  type PatternId,
  type PatternSeverity,

  // API Types
  type HalfLifeQuery,
  type PatternQuery,
  type HalfLifeResponse,
  type PatternResponse,

  // WebSocket Types
  type PropagationMessageType,
  type PropagationMessage,
  type HalfLifeUpdatePayload,
  type PatternDetectedPayload,
  type PatternExpiredPayload,
  type HeatmapUpdatePayload,

  // Type Guards
  isValidMarketTier,
  isValidPatternId,
  isValidPatternCategory,
  isValidPatternSeverity,
  isDetectedPattern,
} from './types';

// ============================================================================
// Tracker Engine
// ============================================================================

export {
  HalfLifeTracker,
  createHalfLifeTracker,
  type PatternDetector,
  type PatternDetectionContext,
} from './half-life-tracker';

// ============================================================================
// Metrics
// ============================================================================

export {
  HalfLifeCalculator,
  DelayRingBuffer,
  EMACalculator,
  calculateTheoreticalHalfLife,
  calculateDecay,
  calculateTimeToDecay,
  type CalculatorState,
} from './metrics/half-life-calculator';

// ============================================================================
// Pattern Detectors
// ============================================================================

export {
  DerivativeDelaysDetector,
  CrossBookArbitrageDetector,
  TemporalInplayDetector,
  PropComboDetector,
  SteamBehavioralDetector,
  createAllDetectors,
  registerAllDetectors,
} from './patterns';

// ============================================================================
// Factory Function with All Detectors Registered
// ============================================================================

import { HalfLifeTracker } from './half-life-tracker';
import { registerAllDetectors } from './patterns';
import type { PropagationConfig } from './types';

/**
 * Create a fully configured HalfLifeTracker with all pattern detectors
 */
export function createConfiguredTracker(
  config?: Partial<PropagationConfig>
): HalfLifeTracker {
  const tracker = new HalfLifeTracker(config);
  registerAllDetectors(tracker);
  return tracker;
}
