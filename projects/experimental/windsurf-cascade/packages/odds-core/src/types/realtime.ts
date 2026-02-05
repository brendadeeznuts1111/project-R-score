// packages/odds-core/src/types/realtime.ts - Real-time metadata types

import { MarketTopic, DataCategory, DataQuality, MarketSession, LiquidityLevel, VolatilityLevel, EnhancedMetadata } from './topics';



/**
 * Real-time metadata interface extending Phase 1 enhanced metadata
 */
export interface RealtimeMetadata extends EnhancedMetadata {
  // Real-time processing information
  realtime: {
    lastUpdated: number;
    updateFrequency: number;
    dataFreshness: number;
    streamId: string;
    timestamp: number;
  };

  // Stream metadata
  stream: {
    source: string;
    latency: number;
    isLive: boolean;
    quality: StreamQuality;
  };
}

/**
 * Stream quality metrics
 */
export interface StreamQuality {
  bandwidth: number;
  packetLoss: number;
  jitter: number;
  reliability: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Real-time market data update
 */
export interface RealtimeMarketUpdate {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  source: string;
  updateType: 'trade' | 'quote' | 'depth' | 'ticker';
}

/**
 * Stream configuration
 */
export interface StreamConfig {
  symbols: string[];
  exchanges: string[];
  updateTypes: UpdateType[];
  bufferSize: number;
  maxLatency: number;
  retryAttempts: number;
}

/**
 * Update types for real-time streams
 */
export type UpdateType = 'trade' | 'quote' | 'depth' | 'ticker' | 'news' | 'sentiment';

/**
 * Stream statistics
 */
export interface StreamStats {
  messagesPerSecond: number;
  averageLatency: number;
  totalMessages: number;
  errors: number;
  reconnects: number;
  uptime: number;
}

/**
 * Real-time event types
 */
export interface RealtimeEvent {
  id: string;
  type: 'metadata_update' | 'quality_change' | 'topic_change' | 'stream_status';
  timestamp: number;
  data: any;
  metadata?: RealtimeMetadata;
}

/**
 * Processing pipeline step
 */
export interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  latency?: number;
  error?: string;
}

/**
 * Real-time processing metrics
 */
export interface RealtimeMetrics {
  processingLatency: number;
  queueDepth: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}
