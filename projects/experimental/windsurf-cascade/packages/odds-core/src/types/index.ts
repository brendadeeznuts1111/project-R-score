// Core types for odds protocol
export interface OddsTick {
  id: string;
  timestamp: number;
  symbol: string;
  price: number;
  size: number;
  exchange: string;
  side: 'buy' | 'sell';
  sport?: string;
  event?: string;
  odds?: number;
  bookmaker?: string;
}

export interface MarketData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
  sequence: number;
}

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  exchange1: string;
  exchange2: string;
  price1: number;
  price2: number;
  profit: number;
  confidence: number;
  timestamp: number;
  sport?: string;
  event?: string;
  opportunities?: any[];
  isArbitrage?: boolean;
  totalImpliedProbability?: number;
  profitMargin?: number;
}

export interface SharpDetectionResult {
  symbol: string;
  isSharp: boolean;
  confidence: number;
  reasoning: string;
  timestamp: number;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: number | string;
  sequence: number;
}

export interface MarketHours {
  open: string;
  close: string;
  timezone: string;
  days: number[];
}

// Export new topics and enhanced types
export * from './topics';
export * from './enhanced';
export { ProcessingMetadata } from './topics';
export * from './lightweight';
export * from './strict';
export * from './realtime';
export * from './analytics';
export * from './lifecycle';

// Explicit re-exports to avoid naming conflicts
export type { PricePoint as EnhancedPricePoint } from './enhanced-odds';
export type { MarketType as V1MarketType } from './synthetic-arbitrage-v1';

// Export incremental synthetic arbitrage types with explicit names
export {
  validateSyntheticArbitrageV1 as validateV1SyntheticArbitrage
} from './synthetic-arbitrage-v1';
export {
  validateSyntheticArbitrageV2 as validateV2SyntheticArbitrage
} from './synthetic-arbitrage-v2';
export {
  validateSyntheticArbitrageV3 as validateV3SyntheticArbitrage,
  validateCorrelationMatrix as validateV3CorrelationMatrix,
  validateExecutionPlan as validateV3ExecutionPlan
} from './synthetic-arbitrage-v3';
export * from './synthetic-validation-v2';

// Export comprehensive rotation number system
export * from './rotation-numbers';
