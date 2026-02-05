// packages/odds-core/src/index-consolidated.ts - Consolidated exports for synthetic arbitrage platform

// ===== CORE TYPES =====
export type {
    // Synthetic Arbitrage Types (V1-V3)
    SyntheticArbitrageV1,
    SyntheticArbitrageV2,
    SyntheticArbitrageV3,

    // Market and Position Types
    MarketLeg,
    SportMarket,
    SyntheticPosition,

    // Risk and Analytics Types
    RiskMetrics,
    ExecutionPlan,
    CorrelationMatrix,
    PortfolioMetrics,
    RiskAlert,

    // Detection and Processing Types
    DetectionCriteria,
    DetectionResult,
    MarketOpportunity,
    MultiPeriodMarketStream,
    PeriodSyntheticArbitrage,

    // Configuration Types
    StreamProcessorConfig,
    PositionTrackerConfig,
    ProcessingMetrics,

    // Historical Data Types
    HistoricalDataPoint,
    CovarianceMatrixResult,
    HedgeRatioResult,

    // Metadata Types
    ValidationRule,
    ValidationSchema,
    ValidationResult,
    ValidationContext,
    EnhancedMetadata
} from './types';

// ===== SYNTHETIC ARBITRAGE DETECTION =====
export {
    SyntheticArbitrageDetector,
    SyntheticArbitrageDetectorFactory
} from './detectors/synthetic-arbitrage-detector';

// ===== MULTI-PERIOD STREAM PROCESSING =====
export {
    MultiPeriodStreamProcessor,
    MultiPeriodStreamProcessorFactory
} from './processors/multi-period-stream-processor';

// ===== POSITION TRACKING & RISK MANAGEMENT =====
export {
    SyntheticPositionTracker,
    SyntheticPositionTrackerFactory
} from './trackers/synthetic-position-tracker';

// ===== CORE UTILITIES =====
export {
    // Basic utilities
    cleanInput,
    rapidHash,
    generateId,
    americanToImpliedProbability,
    calculateArbitrageEdge,
    calculateTickVelocity,
    validateOddsTick,
    getMemoryStats,
    forceGarbageCollection,

    // Metadata utilities
    MetadataBuilder,
    TopicAnalyzer,
    QualityAssessor,
    MetadataValidator,
    MetadataUtils,

    // Mathematical utilities
    CovarianceMatrixCalculator,
    HistoricalDataFactory,
    RotationNumberUtils,
    RotationNumberRegistry,

    // Performance utilities
    PerformanceMonitor,
    PerformanceBenchmark,
    PerformanceCache,
    PerformanceUtils,

    // Real-time processing
    RealtimeMetadataStream,
    RealtimeEventEmitter,
    RealtimeMetadataProcessor,

    // Analytics
    PredictiveAnalyticsEngine
} from './utils/index-streamlined';

// ===== FACTORY FUNCTIONS =====
export {
    SyntheticArbitrageV1Factory,
    SyntheticArbitrageV2Factory,
    SyntheticArbitrageV3Factory,
    SyntheticArbitrageBatchFactory
} from '@testing/factories/incremental-synthetic-factory';

// ===== CONFIGURATION =====
export { DEFAULTS, PERFORMANCE_THRESHOLDS } from './constants';

// ===== VALIDATION =====
export {
    validateSyntheticArbitrageComplete,
    validateSyntheticArbitrageV1,
    validateSyntheticArbitrageV2,
    validateSyntheticArbitrageV3
} from './types';

// ===== EXAMPLES =====
export { SyntheticArbitrageUnifiedExamples } from './examples/synthetic-arbitrage-unified';

// ===== WEBSOCKET SERVER =====
export { BunV13WebSocketServer } from '@odds-websocket/server-v13';

// ===== ERROR HANDLING =====
export {
    SyntheticArbitrageError,
    ValidationError,
    ProcessingError
} from './errors';
