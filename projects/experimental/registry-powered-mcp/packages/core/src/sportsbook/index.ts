/**
 * Sportsbook Protocol Module
 * High-frequency odds feed, risk management, and compliance infrastructure
 *
 * Golden Matrix Entry:
 * | Infrastructure ID | Logic Tier | Resource Tax | Parity Lock | Status |
 * |:------------------|:-----------|:-------------|:------------|:-------|
 * | **Sportsbook-Protocol** | **Level 1: State** | `CPU: <2%` | `sha256-...` | **ACTIVE** |
 *
 * Performance Targets:
 * - 15,000 odds updates/sec
 * - 50,000 orders/sec matching
 * - <1ms arbitrage detection
 * - Quantum-resistant ML-DSA signatures
 *
 * @module sportsbook
 */

// Types
export {
  // Enums
  MarketStatus,
  OddsFormat,
  BetType,
  OrderStatus,
  Jurisdiction,
  MessageType,

  // Core interfaces
  type EnhancedOddsEntry,
  type AggregatedMarket,
  type AggregatedSelection,
  type SourcedOdds,
  type OddsMovement,

  // Arbitrage
  type ArbitrageOpportunity,
  type ArbitrageStake,

  // Risk management
  type RiskAssessment,
  type RiskFactor,
  type SmartMoneyPattern,
  type VolumeProfile,

  // Order matching
  type BetOrder,
  type MatchedBet,
  type OrderBook,
  type OrderBookLevel,

  // Regulatory
  type RegulatoryReport,
  type AuditEntry,

  // Metrics
  type SportsbookMetrics,
  type WireHeader,

  // Constants
  SPORTSBOOK_PERFORMANCE_TARGETS,
  SPORTSBOOK_FEATURES,
  SPORTSBOOK_MAGIC,
  SPORTSBOOK_PROTOCOL_VERSION,

  // Type guards
  isValidMarketStatus,
  isValidOddsFormat,
  isValidMessageType,
  isArbitrageOpportunity,
} from './types';

// Risk Management
export {
  RiskManagementEngine,
  type RiskConfig,
  DEFAULT_RISK_CONFIG,
} from './risk-management';

// Odds Feed
export {
  HighFrequencyOddsFeed,
  ConnectionState,
  type OddsFeedConfig,
  type OddsUpdateCallback,
  DEFAULT_FEED_CONFIG,
  createMockOddsFeed,
} from './odds-feed';

// Type Adapters (Wire Protocol → Dashboard Display)
export {
  // Display types
  type DisplayOddsEntry,
  type DisplayMarket,
  type DisplayRiskAssessment,
  type DisplayArbitrage,
  type WsMessage,

  // Conversion functions
  toDisplayOddsEntry,
  toDisplayMarket,
  toDisplayRiskAssessment,
  toDisplayArbitrage,

  // Utility functions
  uuidToNumericId,
  signatureToHex,
  decimalToAmerican,
  oddsToImpliedProbability,

  // WebSocket message creators
  createOddsUpdateMessage,
  createRiskAlertMessage,
  createArbitrageMessage,
  createHeartbeatMessage,
  batchToDisplayEntries,
} from './adapters';

// Exchange Handler (WebSocket + REST endpoints)
export {
  ExchangeHandler,
  type ExchangeHandlerConfig,
  DEFAULT_EXCHANGE_CONFIG,
  createExchangeWebSocketHandlers,
  parseWebSocketUpgradeData,
} from './exchange-handler';

// PTY Debug Shell (Bun v1.3.5+)
export {
  PTYShellManager,
  createPTYShellManager,
  createPTYShellHandlers,
  DEFAULT_PTY_CONFIG,
  loadPTYConfig,
  getPTYConfigSummary,
  type PTYShellConfig,
} from './pty-shell';

// Environment Configuration
export {
  isExchangeEnabled,
  loadExchangeConfig,
  getExchangeConfigSummary,
  validateExchangeConfig,
} from './env-config';

// Delta-Update-Aggregator (#37)
export {
  DeltaUpdateAggregator,
  type DeltaAggregatorConfig,
  type DeltaPatch,
  type DeltaUpdateResult,
  type DeltaMetrics,
  DEFAULT_DELTA_CONFIG,
  loadDeltaConfig,
  getDeltaConfigSummary,
} from './delta-aggregator';

// CustomTypedArray - Depth-aware binary buffers for wire protocol debugging
// Supports multiple element sizes: Uint8, Uint16, Uint32, Float32, Float64, BigInt64, BigUint64
export {
  // Backwards compatible alias (use explicit types for new code)
  CustomTypedArray,

  // Concrete implementations for different element sizes
  CustomUint8Array,
  CustomUint16Array,
  CustomUint32Array,
  CustomFloat32Array,
  CustomFloat64Array,
  CustomBigInt64Array,
  CustomBigUint64Array,

  // Abstract base class (for extending)
  CustomTypedArrayBase,

  // Types
  type BunInspectOptions,
  type TypedArrayInspectInfo,
} from '../types/custom-typed-array';

// TypedArrayInspector - WeakRef-based registry for lifecycle tracking and memory profiling
export {
  TypedArrayInspector,
  getInspector,
  trackArray,
  createTracked,
  type RegistryEntry,
  type LifecycleEvent,
  type LifecycleEventType,
  type RegistryStats,
  type InspectorConfig,
  type EventListener,
  type CustomTypedArrayClass,
} from '../types/typed-array-inspector';

// Propagation Half-Life Framework (#70-89)
export {
  // Core types
  MarketTier,
  PatternCategory,
  TIER_HALFLIFE_TARGETS,
  PATTERN_DEFINITIONS,
  DEFAULT_PROPAGATION_CONFIG,
  PROPAGATION_PERFORMANCE_TARGETS,
  type PropagationEntry,
  type HalfLifeMetrics,
  type DetectedPattern,
  type TrackingResult,
  type PropagationHeatmap,
  type HeatmapCell,
  type PropagationConfig,
  type PatternId,
  type PatternSeverity,

  // API types
  type HalfLifeQuery,
  type PatternQuery,
  type HalfLifeResponse,
  type PatternResponse,
  type PropagationMessageType,
  type PropagationMessage,
  type HalfLifeUpdatePayload,
  type PatternDetectedPayload,
  type PatternExpiredPayload,
  type HeatmapUpdatePayload,

  // Type guards
  isValidMarketTier,
  isValidPatternId,
  isValidPatternCategory,
  isValidPatternSeverity,
  isDetectedPattern,

  // Tracker engine
  HalfLifeTracker,
  createHalfLifeTracker,
  createConfiguredTracker,
  type PatternDetector,
  type PatternDetectionContext,

  // Metrics
  HalfLifeCalculator,
  DelayRingBuffer,
  EMACalculator,
  calculateTheoreticalHalfLife,
  calculateDecay,
  calculateTimeToDecay,
  type CalculatorState,

  // Pattern detectors
  DerivativeDelaysDetector,
  CrossBookArbitrageDetector,
  TemporalInplayDetector,
  PropComboDetector,
  SteamBehavioralDetector,
  createAllDetectors,
  registerAllDetectors,
} from './propagation';

// ML Intelligence Layer (#71-88)
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

  // Model base class
  MLModelBase,

  // Model implementations (Tier 1: High-Frequency)
  MMCompressionModel,
  VelocityConvexityModel,
  LiquidityMirageModel,

  // Model implementations (Tier 2: Quantitative)
  ProviderGlitchModel,
  AsymmetricPropModel,

  // Model implementations (Tier 3: Statistical)
  PropBetaSkewModel,
  SourceIDClassifierModel,
  MomentumTransferModel,
  EmotionalCarryoverModel,

  // Model implementations (Tier 4: Synchronization)
  RegulatoryDelayModel,

  // Registry
  MLModelRegistry,
  createMLRegistry,
  getSharedRegistry,
  resetSharedRegistry,
} from './ml';
