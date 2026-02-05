// packages/odds-core/src/processors/index.ts - Multi-period stream processing system exports

// Main processor class
export { MultiPeriodStreamProcessor } from './multi-period-stream-processor';

// Factory for different processor configurations
export { MultiPeriodStreamProcessorFactory } from './multi-period-stream-processor';

// Type exports
export type {
    MultiPeriodMarketStream,
    PeriodSyntheticArbitrage,
    StreamProcessorConfig,
    ProcessingMetrics
} from './multi-period-stream-processor';
