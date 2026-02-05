/**
 * @fileoverview Market Signal Types
 * @description Types for market signals and propagation
 * @module graphs/multilayer/types/signals
 * @version 1.1.1.1.4.1.7
 */

export type SignalType =
  | 'price_anomaly'
  | 'volume_spike'
  | 'correlation_break'
  | 'arbitrage_opportunity'
  | 'market_efficiency'
  | 'synchronization';

export interface MarketSignal {
  id: string;
  type: SignalType;
  marketId: string;
  strength: number; // 0-1
  detectedAt: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface PropagationResult {
  signalId: string;
  propagatedNodes: string[];
  propagationPath: PropagationStep[];
  totalImpact: number;
  confidence: number;
  timestamp: number;
}

export interface PropagationStep {
  step: number;
  nodeId: string;
  layer: number;
  infectionProbability: number;
  estimatedTime: number;
}

export interface WeightedSignal {
  signalId: string;
  baseStrength: number;
  weightedStrength: number;
  latency: number;
  latencyPenalty: number;
  temporalRelevance: number;
  propagationFactor: number;
  sourceReliability: number;
  calculationTime: number;
  expiryTime: number;
}
