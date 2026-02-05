// packages/odds-core/src/types.ts - Core types for odds protocol

export type Sport = 'nba' | 'nfl' | 'premier-league' | 'mlb' | 'nhl' | 'soccer' | 'tennis' | 'golf';

export interface Result<T, E> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface OddsTick {
  exchange: string;
  gameId: string;
  line: number;
  juice: number;
  timestamp: Date;
  price?: number;
  size?: number;
  ask?: number;
  bid?: number;
}

export interface ArbitrageOpportunity {
  id: string;
  exchangeA: string;
  exchangeB: string;
  lineA: number;
  lineB: number;
  juiceA: number;
  juiceB: number;
  edge: number;
  kellyFraction: number;
  timestamp: Date;
  expiry: Date;
}

export interface SharpSignal {
  isSharp: boolean;
  confidence: number;
  features: {
    reverseLineMovement: number;
    volumeImbalance: number;
    velocity: number;
    anomalyScore: number;
  };
  triggers: string[];
}

export interface MarketData {
  symbol: string;
  price: number;
  size: number;
  timestamp: Date;
  exchange: string;
}

export interface OrderBook {
  symbol: string;
  exchange: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: Date;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: Date;
  exchange: string;
}

export interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  timestamp: Date;
}

export interface RiskMetrics {
  totalExposure: number;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
}

export interface TradingSignal {
  id: string;
  type: 'arbitrage' | 'sharp' | 'momentum' | 'mean_reversion';
  symbol: string;
  confidence: number;
  expectedReturn: number;
  risk: number;
  timestamp: Date;
  expiry: Date;
  metadata: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface ConnectionStats {
  id: string;
  connectedAt: number;
  messagesReceived: number;
  messagesSent: number;
  lastActivity: number;
  subscriptions: string[];
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface MarketMetrics {
  symbol: string;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volatility: number;
  trend: 'up' | 'down' | 'sideways';
  timestamp: Date;
}

export interface ArbitrageMetrics {
  totalOpportunities: number;
  averageEdge: number;
  maxEdge: number;
  totalProfit: number;
  winRate: number;
  avgHoldingTime: number;
  timestamp: Date;
}

export interface SharpMetrics {
  totalSignals: number;
  truePositives: number;
  falsePositives: number;
  accuracy: number;
  precision: number;
  recall: number;
  averageConfidence: number;
  timestamp: Date;
}
