// packages/odds-core/src/detectors/index.ts - Synthetic arbitrage detection system exports

// Main detector class
export { SyntheticArbitrageDetector } from './synthetic-arbitrage-detector';

// Factory for different detector strategies
export { SyntheticArbitrageDetectorFactory } from './synthetic-arbitrage-detector';

// Type exports
export type {
    DetectionCriteria,
    DetectionResult,
    MarketOpportunity
} from './synthetic-arbitrage-detector';
