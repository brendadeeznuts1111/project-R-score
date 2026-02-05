// packages/odds-core/src/trackers/index.ts - Synthetic position tracking and risk management system exports

// Main tracker class
export { SyntheticPositionTracker } from './synthetic-position-tracker';

// Factory for different tracker configurations
export { SyntheticPositionTrackerFactory } from './synthetic-position-tracker';

// Type exports
export type {
    SyntheticPosition,
    PortfolioMetrics,
    RiskAlert,
    PositionTrackerConfig
} from './synthetic-position-tracker';
