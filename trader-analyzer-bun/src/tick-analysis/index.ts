/**
 * @fileoverview HyperTick Analysis Subsystem
 * @description High-frequency tick data analysis subsystem exports
 * @module tick-analysis
 * @version 6.1.1.2.2.8.1.1.2.9
 */

export { HyperTickArchitecture } from './core/arch';
export type { HyperTickConfig, TickArchitectureMetrics } from './core/arch';

export { TickDataPoint } from './types/tick-point';
export type { TickDataPointInput } from './types/tick-point';

export { HyperTickCollector } from './collector/collector';
export type { CollectorStats, IngestResult } from './collector/collector';

export { RingBuffer } from './collector/ring-buffer';

export { HyperTickCorrelationEngine } from './correlation/engine';
export type {
    AlignedTicks,
    ArbitrageDetection, CorrelationResult, LatencyMetrics, SpoofingDetection
} from './correlation/engine';

export { HyperTickRouter } from './api/router';
