// packages/odds-core/src/types/enhanced.ts - Enhanced data structures with topics and metadata

import type {
  MarketTopic,
  DataCategory,
  EnhancedMetadata,
  TopicAnalysis,
  MarketContext,
  DataSource,
  MarketSession,
  LiquidityLevel,
  VolatilityLevel,
  DataQuality
} from './topics';

import type { ProcessingMetadata } from './lightweight';


/**
 * Enhanced Trade Tick with comprehensive metadata and topic information
 */
export interface EnhancedTradeTick {
  // Original fields
  id: string;
  timestamp: number;
  symbol: string;
  price: number;
  size: number;
  exchange: string;
  side: 'buy' | 'sell';

  // Enhanced fields
  metadata: EnhancedMetadata;
  topics: MarketTopic[];
  category: DataCategory;

  // Market context
  marketContext: {
    session: MarketSession;
    liquidity: LiquidityLevel;
    volatility: VolatilityLevel;
    relatedMarkets: string[];
    impactFactors: {
      news: number;
      sentiment: number;
      technical: number;
      fundamental: number;
    };
  };

  // Quality metrics
  quality: DataQuality;


  // Processing info
  processing: ProcessingMetadata;
}


/**
 * Enhanced MarketData with topics and metadata
 */
export interface EnhancedMarketData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
  sequence: number;

  // Enhanced fields
  metadata: EnhancedMetadata;
  topics: MarketTopic[];
  category: DataCategory;

  // Market depth analysis
  depth: {
    bidDepth: number;
    askDepth: number;
    spread: number;
    spreadPercentage: number;
    imbalance: number; // -1 to 1
  };

  // Context information
  context: {
    volume: number;
    high24h: number;
    low24h: number;
    change24h: number;
    changePercent24h: number;
  };
}

/**
 * Enhanced ArbitrageOpportunity with comprehensive metadata
 */
export interface EnhancedArbitrageOpportunity {
  id: string;
  symbol: string;
  exchange1: string;
  exchange2: string;
  price1: number;
  price2: number;
  profit: number;
  confidence: number;
  timestamp: number;

  // Enhanced fields
  metadata: EnhancedMetadata;
  topics: MarketTopic[];
  category: DataCategory;

  // Detailed analysis
  analysis: {
    edge: number; // percentage
    kellyFraction: number;
    expectedValue: number;
    risk: number;
    liquidityRisk: number;
    executionRisk: number;
    timeDecay: number;
  };

  // Market conditions
  conditions: {
    marketVolatility: 'high' | 'medium' | 'low';
    liquidityLevel: 'high' | 'medium' | 'low';
    spreadTightness: 'tight' | 'normal' | 'wide';
    volumeProfile: 'high' | 'normal' | 'low';
  };

  // Execution parameters
  execution: {
    estimatedSlippage: number;
    requiredCapital: number;
    maxPosition: number;
    optimalEntry: number;
    optimalExit: number;
  };
}

/**
 * Enhanced SharpDetectionResult with topics and metadata
 */
export interface EnhancedSharpDetectionResult {
  symbol: string;
  isSharp: boolean;
  confidence: number;
  reasoning: string;
  timestamp: number;

  // Enhanced fields
  metadata: EnhancedMetadata;
  topics: MarketTopic[];
  category: DataCategory;

  // Detailed analysis
  features: {
    reverseLineMovement: number;
    volumeImbalance: number;
    velocity: number;
    anomalyScore: number;
    sentimentScore: number;
    newsImpact: number;
    socialVolume: number;
  };

  // Signal classification
  classification: {
    strength: 'weak' | 'moderate' | 'strong' | 'extreme';
    duration: 'short' | 'medium' | 'long';
    reliability: number; // 0-1
    historicalAccuracy: number; // 0-1
  };

  // Related signals
  relatedSignals: {
    correlatedSymbols: string[];
    sectorSignals: string[];
    marketSignals: string[];
  };
}

/**
 * Enhanced TradingSignal with comprehensive metadata
 */
export interface EnhancedTradingSignal {
  id: string;
  type: 'arbitrage' | 'sharp' | 'momentum' | 'mean_reversion' | 'breakout' | 'sentiment';
  symbol: string;
  confidence: number;
  expectedReturn: number;
  risk: number;
  timestamp: number;
  expiry: number;

  // Enhanced fields
  metadata: EnhancedMetadata;
  topics: MarketTopic[];
  category: DataCategory;

  // Signal reasoning
  reasoning: {
    primary: string;
    secondary: string[];
    confidence: number;
    evidence: {
      technical: number;
      fundamental: number;
      sentiment: number;
      flow: number;
    };
  };

  // Risk metrics
  riskMetrics: {
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    beta: number;
    correlation: number;
  };

  // Execution parameters
  execution: {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    timeHorizon: number; // in hours
  };
}

/**
 * Enhanced WebSocketMessage with topics and metadata
 */
export interface EnhancedWebSocketMessage {
  type: string;
  data: unknown;
  timestamp: number;
  id?: string;

  // Enhanced fields
  metadata: EnhancedMetadata;
  topics: MarketTopic[];
  category: DataCategory;

  // Message routing
  routing: {
    targetTopics: MarketTopic[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    ttl: number; // time to live in seconds
    retryCount: number;
  };

  // Performance metrics
  performance: {
    size: number; // in bytes
    compression: string;
    encoding: string;
    transmissionTime: number; // in milliseconds
  };
}

/**
 * Topic subscription configuration
 */
export interface TopicSubscription {
  id: string;
  topics: MarketTopic[];
  filters: {
    exchanges?: string[];
    symbols?: string[];
    confidence?: number; // minimum confidence
    quality?: number; // minimum quality score
  };
  callback: (message: EnhancedWebSocketMessage) => void;
  active: boolean;
  createdAt: number;
  lastActivity: number;
}

/**
 * Topic analytics data
 */
export interface TopicAnalytics {
  topic: MarketTopic;
  timeframe: {
    start: number;
    end: number;
    duration: number; // in seconds
  };

  // Volume metrics
  volume: {
    total: number;
    average: number;
    peak: number;
    trend: 'rising' | 'falling' | 'stable';
  };

  // Quality metrics
  quality: {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  };

  // Performance metrics
  performance: {
    latency: {
      average: number;
      p95: number;
      p99: number;
    };
    throughput: {
      messages: number;
      bytes: number;
      rate: number; // messages per second
    };
  };

  // Relationships
  relationships: {
    correlatedTopics: Array<{
      topic: MarketTopic;
      correlation: number;
      significance: number;
    }>;
    parentTopics: MarketTopic[];
    childTopics: MarketTopic[];
  };
}

/**
 * Topic configuration for system-wide settings
 */
export interface TopicConfiguration {
  topic: MarketTopic;
  enabled: boolean;
  priority: number; // 1-10
  retention: number; // in days
  compression: string;
  encryption: boolean;
  access: {
    read: string[];
    write: string[];
    admin: string[];
  };
  processing: {
    pipeline: string[];
    enrichments: string[];
    validations: string[];
  };
  monitoring: {
    alerts: boolean;
    thresholds: {
      latency: number;
      errorRate: number;
      quality: number;
    };
  };
}
