// packages/odds-core/src/utils/realtime-stream.ts - Real-time metadata streaming

import { EventEmitter } from 'events';
import { WebSocket, WebSocketServer } from 'ws';
import { 
  RealtimeMetadata, 
  RealtimeMarketUpdate, 
  StreamConfig, 
  StreamStats,
  StreamQuality,
  RealtimeEvent,
  ProcessingStep,
  RealtimeMetrics
} from '../types/realtime';
import { 
  EnhancedMetadata, 
  MetadataBuilder 
} from './metadata';
import { 
  QualityAssessorFactory 
} from './lazy-quality';
import { 
  TopicServiceFactory 
} from './topic-services';

/**
 * Real-time metadata stream manager
 */
export class RealtimeMetadataStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private wsServer: WebSocketServer | null = null;
  private streams: Map<string, StreamState> = new Map();
  private metrics: RealtimeMetrics;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private config: StreamConfig) {
    super();
    this.metrics = {
      processingLatency: 0,
      queueDepth: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  /**
   * Start real-time streaming
   */
  async startStream(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Stream is already running');
    }

    try {
      this.isRunning = true;
      await this.initializeWebSocket();
      await this.startMetricsCollection();
      
      this.emit('streamStarted', { timestamp: Date.now() });
      console.log('🚀 Real-time metadata stream started');
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop real-time streaming
   */
  async stopStream(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }

    this.streams.clear();
    this.emit('streamStopped', { timestamp: Date.now() });
    console.log('🛑 Real-time metadata stream stopped');
  }

  /**
   * Subscribe to symbol updates
   */
  async subscribeSymbol(symbol: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Stream must be started before subscribing');
    }

    const streamState: StreamState = {
      symbol,
      lastUpdate: 0,
      updateCount: 0,
      errors: 0,
      isActive: true
    };

    this.streams.set(symbol, streamState);
    
    // Send subscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        symbol,
        types: this.config.updateTypes
      }));
    }

    this.emit('symbolSubscribed', { symbol, timestamp: Date.now() });
  }

  /**
   * Unsubscribe from symbol updates
   */
  async unsubscribeSymbol(symbol: string): Promise<void> {
    this.streams.delete(symbol);
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        symbol
      }));
    }

    this.emit('symbolUnsubscribed', { symbol, timestamp: Date.now() });
  }

  /**
   * Get stream statistics
   */
  getStreamStats(): StreamStats {
    const totalMessages = Array.from(this.streams.values())
      .reduce((sum, stream) => sum + stream.updateCount, 0);
    
    const totalErrors = Array.from(this.streams.values())
      .reduce((sum, stream) => sum + stream.errors, 0);

    return {
      messagesPerSecond: this.metrics.throughput,
      averageLatency: this.metrics.processingLatency,
      totalMessages,
      errors: totalErrors,
      reconnects: this.reconnectAttempts,
      uptime: this.isRunning ? Date.now() - (this as any).startTime : 0
    };
  }

  /**
   * Get real-time metrics
   */
  getMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  /**
   * Process incoming market data update
   */
  private async processMarketUpdate(update: RealtimeMarketUpdate): Promise<RealtimeMetadata> {
    const startTime = performance.now();

    try {
      // Create base metadata
      const builder = new MetadataBuilder(`realtime_${update.symbol}_${Date.now()}`)
        .setTopics([this.getTopicForSymbol(update.symbol)])
        .setSource({ 
          provider: update.source, 
          reliability: this.calculateReliability(update) 
        });

      // Add real-time information
      const metadata = builder.build() as RealtimeMetadata;
      metadata.realtime = {
        lastUpdated: update.timestamp,
        updateFrequency: this.calculateUpdateFrequency(update.symbol),
        dataFreshness: this.calculateDataFreshness(update.timestamp),
        streamId: this.generateStreamId(update.symbol),
        timestamp: Date.now()
      };

      metadata.stream = {
        source: update.source,
        latency: this.metrics.processingLatency,
        isLive: true,
        quality: this.calculateStreamQuality(update)
      };

      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime);

      // Update stream state
      const streamState = this.streams.get(update.symbol);
      if (streamState) {
        streamState.lastUpdate = update.timestamp;
        streamState.updateCount++;
      }

      this.emit('metadataProcessed', metadata);
      return metadata;

    } catch (error) {
      this.metrics.errorRate++;
      const streamState = this.streams.get(update.symbol);
      if (streamState) {
        streamState.errors++;
      }
      throw error;
    }
  }

  /**
   * Initialize WebSocket connection
   */
  private async initializeWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://ws.example.com/marketdata'); // Example endpoint

      this.ws.on('open', () => {
        console.log('🔌 WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('message', async (data: WebSocket.Data) => {
        try {
          const update: RealtimeMarketUpdate = JSON.parse(data.toString());
          const metadata = await this.processMarketUpdate(update);
          this.emit('data', metadata);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          this.emit('error', error);
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('disconnected');
        
        if (this.isRunning) {
          this.attemptReconnect();
        }
      });

      // Set connection timeout
      setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, this.config.maxLatency);
    });
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(async () => {
      try {
        await this.initializeWebSocket();
        console.log('✅ Reconnected successfully');
        this.emit('reconnected');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Start metrics collection
   */
  private async startMetricsCollection(): Promise<void> {
    setInterval(() => {
      this.collectMetrics();
    }, 1000); // Collect metrics every second
  }

  /**
   * Collect system metrics
   */
  private collectMetrics(): void {
    // Simulate metric collection
    this.metrics.memoryUsage = Math.random() * 100;
    this.metrics.cpuUsage = Math.random() * 100;
    this.metrics.queueDepth = this.streams.size;
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(processingTime: number): void {
    // Update latency (exponential moving average)
    this.metrics.processingLatency = 
      this.metrics.processingLatency * 0.9 + processingTime * 0.1;

    // Update throughput
    this.metrics.throughput = 
      this.metrics.throughput * 0.9 + (1000 / processingTime) * 0.1;
  }

  /**
   * Get topic for symbol
   */
  private getTopicForSymbol(symbol: string): any {
    // Use Phase 1 topic service
    const mapper = TopicServiceFactory.getMapper();
    const topics = mapper.mapSymbol(symbol);
    return topics[0] || 'unknown';
  }

  /**
   * Calculate reliability based on update
   */
  private calculateReliability(update: RealtimeMarketUpdate): number {
    // Simple reliability calculation
    const age = Date.now() - update.timestamp;
    return Math.max(0, 1 - (age / 10000)); // Decay over 10 seconds
  }

  /**
   * Calculate update frequency
   */
  private calculateUpdateFrequency(symbol: string): number {
    const streamState = this.streams.get(symbol);
    if (!streamState || streamState.updateCount === 0) {
      return 0;
    }

    const timeDiff = Date.now() - (streamState.firstUpdate || Date.now());
    return timeDiff > 0 ? (streamState.updateCount / timeDiff) * 1000 : 0;
  }

  /**
   * Calculate data freshness
   */
  private calculateDataFreshness(timestamp: number): number {
    const age = Date.now() - timestamp;
    return Math.max(0, 1 - (age / 5000)); // Fresh over 5 seconds
  }

  /**
   * Generate stream ID
   */
  private generateStreamId(symbol: string): string {
    return `stream_${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate stream quality
   */
  private calculateStreamQuality(update: RealtimeMarketUpdate): StreamQuality {
    const latency = this.metrics.processingLatency;
    const age = Date.now() - update.timestamp;

    // Simple quality calculation
    const reliability = Math.max(0, 1 - (age / 10000));
    const bandwidth = 1000 / Math.max(latency, 1);
    const packetLoss = Math.random() * 0.01; // Simulated
    const jitter = Math.random() * 10; // Simulated

    let status: StreamQuality['status'] = 'excellent';
    if (latency > 100 || age > 5000) status = 'good';
    if (latency > 500 || age > 10000) status = 'fair';
    if (latency > 1000 || age > 30000) status = 'poor';

    return {
      bandwidth,
      packetLoss,
      jitter,
      reliability,
      status
    };
  }
}

/**
 * Stream state interface
 */
interface StreamState {
  symbol: string;
  lastUpdate: number;
  firstUpdate?: number;
  updateCount: number;
  errors: number;
  isActive: boolean;
}

/**
 * Real-time event emitter for metadata changes
 */
export class RealtimeEventEmitter extends EventEmitter {
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Emit metadata change event
   */
  emitMetadataChange(metadata: RealtimeMetadata): void {
    const event: RealtimeEvent = {
      id: this.generateEventId(),
      type: 'metadata_update',
      timestamp: Date.now(),
      data: metadata,
      metadata
    };

    this.addToHistory(event);
    this.emit('metadataChange', event);
  }

  /**
   * Emit quality change event
   */
  emitQualityChange(metadata: RealtimeMetadata, oldQuality: QualityMetrics, newQuality: QualityMetrics): void {
    const event: RealtimeEvent = {
      id: this.generateEventId(),
      type: 'quality_change',
      timestamp: Date.now(),
      data: { metadata, oldQuality, newQuality },
      metadata
    };

    this.addToHistory(event);
    this.emit('qualityChange', event);
  }

  /**
   * Emit topic change event
   */
  emitTopicChange(metadata: RealtimeMetadata, oldTopics: any[], newTopics: any[]): void {
    const event: RealtimeEvent = {
      id: this.generateEventId(),
      type: 'topic_change',
      timestamp: Date.now(),
      data: { metadata, oldTopics, newTopics },
      metadata
    };

    this.addToHistory(event);
    this.emit('topicChange', event);
  }

  /**
   * Emit stream status event
   */
  emitStreamStatus(status: 'connected' | 'disconnected' | 'error', details?: any): void {
    const event: RealtimeEvent = {
      id: this.generateEventId(),
      type: 'stream_status',
      timestamp: Date.now(),
      data: { status, details }
    };

    this.addToHistory(event);
    this.emit('streamStatus', event);
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number): RealtimeEvent[] {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Add event to history
   */
  private addToHistory(event: RealtimeEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
