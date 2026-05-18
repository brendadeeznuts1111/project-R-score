/**
 * Syndicate Analysis System - Main Export
 * 
 * Advanced syndicate group analysis with pattern recognition and real-time monitoring
 */

// Core Database
export { SyndicateDatabase } from './database';

// Types
export * from './types';

// Pattern Registry
export {
  PATTERN_REGISTRY,
  getPatternMetadata,
  getPatternsByGrading,
  getPatternsByPriority,
  getPatternsByCategory,
  getCriticalPatterns,
  getRealTimePatterns,
  getFraudPatterns,
  isValidPatternType,
  getPatternsByImplementationOrder,
  getEnhancedPatternMetadata
} from './pattern-registry';

// Real-Time Components
export { SyndicateWebSocketServer } from './real-time/websocket-server';
export type {
  WebSocketMessage,
  PatternDetectedMessage,
  BetRecordedMessage,
  EmergingPatternMessage,
  AlertMessage
} from './real-time/websocket-server';

// Event System
export { SyndicateEventBus, eventBus } from './events/event-bus';
export type {
  PatternDetectedEvent,
  BetRecordedEvent,
  EmergingPatternEvent,
  AlertEvent,
  SyndicateEvent
} from './events/event-bus';

// Caching
export { SyndicateCacheManager, cacheManager } from './cache/cache-manager';
export type { CacheStats } from './cache/cache-manager';

// Analytics
export { AnomalyDetector, anomalyDetector } from './analytics/anomaly-detector';
export type {
  AnomalyResult,
  StatisticalBaseline
} from './analytics/anomaly-detector';

export { CorrelationAnalyzer, correlationAnalyzer } from './analytics/correlation-analyzer';
export type {
  CorrelationResult,
  CrossSyndicateCorrelation
} from './analytics/correlation-analyzer';

// Monitoring
export { MetricsCollector, metricsCollector } from './monitoring/metrics';
export type {
  SystemMetrics,
  PatternMetrics,
  PerformanceMetrics
} from './monitoring/metrics';

// Pattern Matrix
export {
  PATTERN_PROPERTIES,
  CROSS_REFERENCE_MATRIX,
  SUBMARKETS,
  TENSION_ANALYSIS,
  getCrossReferences,
  areCrossReferenced,
  getReverseCrossReferences,
  getSubmarketsForPattern,
  getPatternsForSubmarket,
  getSubmarketsByCategory,
  getTensionAnalysis,
  getTensionsByType,
  buildCrossReferenceMatrix,
  getPatternCluster,
  analyzePatternRelationships
} from './pattern-matrix';

// Enhanced Pattern Matrix
export {
  PATTERN_PROPERTIES_DETAILED,
  PATTERN_KEY_METRICS,
  CROSS_REFERENCE_DETAILS,
  RESOLUTION_STRATEGIES,
  TENSIONS_DETAILED,
  getDetailedProperties,
  getKeyMetrics,
  getCrossReferenceDetails,
  getResolutionStrategy,
  getDetailedTension
} from './pattern-matrix-enhanced';

export type {
  PatternCrossReference,
  Submarket,
  TensionAnalysis
} from './types';

// Matrix Visualization
export {
  generateCrossReferenceMatrixASCII,
  generateSubmarketReport,
  generateTensionReport,
  generatePatternGraphDOT,
  generatePatternMatrixReport,
  getPatternSummary,
  exportMatrixAsJSON
} from './matrix-visualization';

// Re-export commonly used types for convenience
export type {
  SyndicateGroup,
  SyndicateBet,
  SyndicatePattern,
  PlatformActivity,
  EmergingPattern,
  PatternType,
  BetResult,
  Platform,
  OS,
  BetType,
  SyndicateStats,
  PatternAnalysis,
  EdgeOpportunity
} from './types';
