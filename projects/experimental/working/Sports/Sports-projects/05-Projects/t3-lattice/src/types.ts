/**
 * T3-Lattice Type Definitions
 * Core types for fractal edge detection system
 */

// Market Data Types
export interface MarketFeed {
  id: string;
  tipoff: string;
  opening: {
    spread: number;
    ml: number;
    total: number;
  };
}

export interface OddsTick {
  time: number;
  spread: number;
  ml: number;
  total: number;
  volume: number;
}

export interface TickBatch {
  gameId: string;
  timestamp: number;
  ticks: OddsTick[];
}

// Fractal Analysis Types
export interface FDResult {
  fd: number;
  computationTime: number;
  method: string;
}

export interface HurstResult {
  hurst: number;
  computationTime: number;
}

// Edge Detection Types
export type EdgeType = 'TREND_CONTINUATION' | 'MEAN_REVERSION' | 'VOLATILITY_ARB' | 'BLACK_SWAN';

export interface LatticeEdge {
  id: string;
  market: string;
  type: EdgeType;
  description: string;
  confidence: number;
  fd: number;
  hurst: number;
  glyph: string;
  requiresReview: boolean;
  timestamp: number;
}

// Alert Types
export interface BlackSwanAlert {
  id: string;
  gameId: string;
  fd: number;
  cause: string;
  requiresReview: boolean;
  timestamp: number;
}

// Glyph Pattern Types
export interface GlyphPattern {
  pattern: string;
  name: string;
  unicode: string[];
  description: string;
  fdRange: [number, number];
  useCase: string;
}

// Audit Types
export interface AuditEntry {
  type: string;
  gameId?: string;
  personaId?: string;
  eventType?: string;
  fd?: number;
  hurst?: number;
  glyph?: string;
  confidence?: number;
  data?: unknown;
  timestamp: number;
}

// Worker Message Types
export interface WorkerMessage {
  type: 'fd_box_counting' | 'hurst_rs';
  series: number[];
  resolution?: number;
  segmentSize?: number;
}

// Configuration Types
export interface LatticeConfig {
  fdCriticalThreshold: number;
  edgeConfidenceMinimum: number;
  maxWorkers: number;
  tickRateLimit: number;
  slaLatencyMs: number;
}

export const DEFAULT_CONFIG: LatticeConfig = {
  fdCriticalThreshold: 2.5,
  edgeConfidenceMinimum: 0.85,
  maxWorkers: 4,
  tickRateLimit: 100,
  slaLatencyMs: 50,
};
