// Utility functions
export { formatTimestamp } from './time';
export { calculateSpread } from './math';
export { compressMessage } from './compression';
export { generateId } from './id';
export {
    calculateArbitrageOpportunity,
    calculateKellyFraction,
    cleanInput,
    rapidHash,
    americanToImpliedProbability,
    calculateArbitrageEdge,
    calculateTickVelocity,
    validateTickQuality as validateOddsTick,
    getMemoryStats,
    forceGarbageCollection
} from '../utils';

// Metadata utilities
export {
    MetadataBuilder,
    TopicAnalyzer,
    QualityAssessor,
    MetadataValidator,
    MetadataUtils
} from './metadata';

// Performance and single responsibility utilities
export {
    LazyQualityAssessor,
    QuickQualityAssessor,
    QualityAssessorFactory,
    LazyQualityUtils
} from './lazy-quality';

export {
    TopicMapper,
    TopicValidator,
    TopicAnalysisService,
    TopicServiceFactory,
    TopicServiceUtils
} from './topic-services';

// Polished utilities with comprehensive documentation
export {
    MetadataBuilder as DocumentedMetadataBuilder,
    TopicAnalyzer as DocumentedTopicAnalyzer
} from './documented-metadata';

// Defensive programming utilities
export {
    SafeTypeChecker,
    SafePropertyAccess,
    SafeArrayOperations,
    SafeStringOperations,
    SafeMathOperations,
    SafeObjectOperations,
    DefensiveMetadataWrapper
} from './defensive';

// Performance monitoring and benchmarking
export {
    PerformanceMonitor,
    PerformanceBenchmark,
    PerformanceCache,
    PerformanceUtils,
    performanceMonitor
} from './performance';

// Real-time processing utilities (Phase 2.1)
export {
    RealtimeMetadataStream,
    RealtimeEventEmitter
} from './realtime-stream';

export {
    RealtimeMetadataProcessor
} from './realtime-processor';

// Advanced analytics utilities (Phase 2.11)
export {
    PredictiveAnalyticsEngine
} from './predictive-analytics';

export {
    SmartNotificationsEngine
} from './smart-notifications';

// Lifecycle management utilities (Phase 2.2)
export {
    MetadataLifecycleManager
} from './lifecycle-manager';

export {
    InMemoryLifecycleStorage
} from './lifecycle-storage';

// Testing utilities (Time handling)
export {
    TimeTestHelper,
    LifecycleTimeTester,
    TimeAssertions,
    TEST_DATES,
    TEST_TIMEZONES,
    setupBusinessTimeTesting,
    setupUTCTimeTesting,
    setupFixedTimeTesting,
    createTestMetadataWithTimestamp,
    createTimeSeriesMetadata
} from './test-time-helpers';

// Rotation number utilities (Phase 3.1)
export {
    RotationNumberUtils
} from './rotation-utils';

export type {
    RotationNumberRegistry
} from '../types/rotation-numbers';

// Covariance matrix utilities (Phase 3.2)
export {
    CovarianceMatrixCalculator,
    HistoricalDataFactory
} from './covariance-matrix';

export type {
    HistoricalDataPoint,
    CovarianceMatrixResult,
    HedgeRatioResult,
    CovariancePerformanceMetrics
} from './covariance-matrix';

// Synthetic arbitrage detection system (Phase 3.3)
export {
    SyntheticArbitrageDetector,
    SyntheticArbitrageDetectorFactory
} from '../detectors/synthetic-arbitrage-detector';

export type {
    DetectionCriteria,
    DetectionResult,
    MarketOpportunity
} from '../detectors/synthetic-arbitrage-detector';

// Multi-period stream processing system (Phase 3.4)
export {
    MultiPeriodStreamProcessor,
    MultiPeriodStreamProcessorFactory
} from '../processors/multi-period-stream-processor';

export type {
    MultiPeriodMarketStream,
    PeriodSyntheticArbitrage,
    StreamProcessorConfig,
    ProcessingMetrics
} from '../processors/multi-period-stream-processor';

// Synthetic position tracking system (Phase 3.5)
export {
    SyntheticPositionTracker,
    SyntheticPositionTrackerFactory
} from '../trackers/synthetic-position-tracker';

export type {
    SyntheticPosition,
    PortfolioMetrics,
    RiskAlert,
    PositionTrackerConfig
} from '../trackers/synthetic-position-tracker';
