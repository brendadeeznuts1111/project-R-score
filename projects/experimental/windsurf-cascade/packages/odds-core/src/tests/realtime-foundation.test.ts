// packages/odds-core/src/tests/realtime-foundation.test.ts - Phase 2.1 Real-time Processing Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { EventEmitter } from 'events';
import { RealtimeMetadataStream, RealtimeEventEmitter } from '../utils/realtime-stream';
import { RealtimeMetadataProcessor } from '../utils/realtime-processor';
import { 
  RealtimeMetadata, 
  RealtimeMarketUpdate, 
  StreamConfig,
  StreamStats,
  RealtimeMetrics,
  ProcessingStep
} from '../types/realtime';

describe('Phase 2.1 - Real-time Processing Foundation', () => {

  describe('RealtimeMetadataStream', () => {
    let stream: RealtimeMetadataStream;
    let config: StreamConfig;

    beforeEach(() => {
      config = {
        symbols: ['BTC/USD', 'ETH/USD'],
        exchanges: ['binance', 'coinbase'],
        updateTypes: ['trade', 'quote'],
        bufferSize: 1000,
        maxLatency: 5000,
        retryAttempts: 3
      };
      stream = new RealtimeMetadataStream(config);
    });

    afterEach(async () => {
      if (stream) {
        await stream.stopStream();
      }
    });

    test('should initialize with correct configuration', () => {
      expect(stream).toBeDefined();
      const metrics = stream.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.processingLatency).toBe('number');
      expect(typeof metrics.throughput).toBe('number');
    });

    test('should handle stream lifecycle', async () => {
      // Mock WebSocket to avoid actual connection
      const originalWebSocket = global.WebSocket;
      global.WebSocket = MockWebSocket as any;

      try {
        await stream.startStream();
        expect(stream).toBeDefined();

        const stats = stream.getStreamStats();
        expect(stats).toBeDefined();
        expect(typeof stats.messagesPerSecond).toBe('number');
        expect(typeof stats.averageLatency).toBe('number');
        expect(typeof stats.totalMessages).toBe('number');

        await stream.stopStream();
      } finally {
        global.WebSocket = originalWebSocket;
      }
    });

    test('should handle symbol subscription', async () => {
      const originalWebSocket = global.WebSocket;
      global.WebSocket = MockWebSocket as any;

      try {
        await stream.startStream();
        await stream.subscribeSymbol('BTC/USD');

        // Should emit subscription event
        const subscriptionPromise = new Promise((resolve) => {
          stream.once('symbolSubscribed', resolve);
        });

        await subscriptionPromise;
        await stream.stopStream();
      } finally {
        global.WebSocket = originalWebSocket;
      }
    });

    test('should handle symbol unsubscription', async () => {
      const originalWebSocket = global.WebSocket;
      global.WebSocket = MockWebSocket as any;

      try {
        await stream.startStream();
        await stream.subscribeSymbol('BTC/USD');
        await stream.unsubscribeSymbol('BTC/USD');

        // Should emit unsubscription event
        const unsubscriptionPromise = new Promise((resolve) => {
          stream.once('symbolUnsubscribed', resolve);
        });

        await unsubscriptionPromise;
        await stream.stopStream();
      } finally {
        global.WebSocket = originalWebSocket;
      }
    });

    test('should calculate stream statistics correctly', () => {
      const stats = stream.getStreamStats();
      
      expect(stats).toHaveProperty('messagesPerSecond');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('reconnects');
      expect(stats).toHaveProperty('uptime');

      expect(typeof stats.messagesPerSecond).toBe('number');
      expect(typeof stats.averageLatency).toBe('number');
      expect(typeof stats.totalMessages).toBe('number');
      expect(typeof stats.errors).toBe('number');
      expect(typeof stats.reconnects).toBe('number');
      expect(typeof stats.uptime).toBe('number');
    });

    test('should handle stream errors gracefully', async () => {
      const originalWebSocket = global.WebSocket;
      global.WebSocket = MockWebSocket as any;

      try {
        await stream.startStream();
        
        // Simulate error
        const errorPromise = new Promise((resolve) => {
          stream.once('error', resolve);
        });

        stream.emit('error', new Error('Test error'));
        await errorPromise;
        
        await stream.stopStream();
      } finally {
        global.WebSocket = originalWebSocket;
      }
    });
  });

  describe('RealtimeMetadataProcessor', () => {
    let processor: RealtimeMetadataProcessor;

    beforeEach(() => {
      processor = new RealtimeMetadataProcessor();
    });

    afterEach(async () => {
      if (processor) {
        await processor.stop();
      }
    });

    test('should initialize with correct metrics', () => {
      expect(processor).toBeDefined();
      
      const metrics = processor.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('processingLatency');
      expect(metrics).toHaveProperty('queueDepth');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');

      expect(typeof metrics.processingLatency).toBe('number');
      expect(typeof metrics.queueDepth).toBe('number');
      expect(typeof metrics.throughput).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.cpuUsage).toBe('number');
    });

    test('should handle processor lifecycle', async () => {
      await processor.start();
      expect(processor).toBeDefined();

      const stats = processor.getProcessingStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalProcessed');
      expect(stats).toHaveProperty('queueDepth');
      expect(stats).toHaveProperty('averageLatency');
      expect(stats).toHaveProperty('throughput');
      expect(stats).toHaveProperty('errorRate');
      expect(stats).toHaveProperty('uptime');

      await processor.stop();
    });

    test('should process single market update', async () => {
      await processor.start();

      const update: RealtimeMarketUpdate = {
        symbol: 'BTC/USD',
        price: 45000,
        volume: 1000000,
        timestamp: Date.now(),
        source: 'binance',
        updateType: 'trade'
      };

      const metadata = await processor.processUpdate(update);
      
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('realtime');
      expect(metadata).toHaveProperty('stream');
      expect(metadata.realtime).toHaveProperty('lastUpdated');
      expect(metadata.realtime).toHaveProperty('streamId');
      expect(metadata.stream).toHaveProperty('source');
      expect(metadata.stream).toHaveProperty('isLive');

      await processor.stop();
    });

    test('should process batch of updates', async () => {
      await processor.start();

      const updates: RealtimeMarketUpdate[] = [
        {
          symbol: 'BTC/USD',
          price: 45000,
          volume: 1000000,
          timestamp: Date.now(),
          source: 'binance',
          updateType: 'trade'
        },
        {
          symbol: 'ETH/USD',
          price: 3000,
          volume: 500000,
          timestamp: Date.now(),
          source: 'coinbase',
          updateType: 'quote'
        }
      ];

      const results = await processor.processBatch(updates);
      
      expect(results).toHaveLength(2);
      results.forEach(metadata => {
        expect(metadata).toBeDefined();
        expect(metadata).toHaveProperty('realtime');
        expect(metadata).toHaveProperty('stream');
      });

      await processor.stop();
    });

    test('should handle processing errors gracefully', async () => {
      await processor.start();

      const invalidUpdate: RealtimeMarketUpdate = {
        symbol: '', // Invalid symbol
        price: -1, // Invalid price
        volume: 0,
        timestamp: 0, // Invalid timestamp
        source: 'test',
        updateType: 'trade'
      };

      expect(processor.processUpdate(invalidUpdate)).rejects.toThrow();
      
      await processor.stop();
    });

    test('should track processing metrics correctly', async () => {
      await processor.start();

      const initialMetrics = processor.getMetrics();
      expect(initialMetrics.queueDepth).toBe(0);

      const update: RealtimeMarketUpdate = {
        symbol: 'BTC/USD',
        price: 45000,
        volume: 1000000,
        timestamp: Date.now(),
        source: 'binance',
        updateType: 'trade'
      };

      await processor.processUpdate(update);
      
      const finalMetrics = processor.getMetrics();
      expect(finalMetrics.processingLatency).toBeGreaterThanOrEqual(0);
      expect(finalMetrics.throughput).toBeGreaterThanOrEqual(0);

      await processor.stop();
    });

    test('should handle concurrent processing', async () => {
      await processor.start();

      const updates: RealtimeMarketUpdate[] = Array.from({ length: 10 }, (_, i) => ({
        symbol: `SYMBOL_${i}`,
        price: 1000 + i,
        volume: 100000 * i,
        timestamp: Date.now(),
        source: 'test',
        updateType: 'trade' as const
      }));

      const startTime = performance.now();
      const promises = updates.map(update => processor.processUpdate(update));
      const results = await Promise.all(promises);
      const processingTime = performance.now() - startTime;

      expect(results).toHaveLength(10);
      expect(processingTime).toBeLessThan(1000); // Should process in under 1 second

      await processor.stop();
    });
  });

  describe('RealtimeEventEmitter', () => {
    let eventEmitter: RealtimeEventEmitter;

    beforeEach(() => {
      eventEmitter = new RealtimeEventEmitter();
    });

    test('should emit metadata change events', () => {
      const metadata: RealtimeMetadata = {
        id: 'test_metadata',
        timestamp: Date.now(),
        version: '1.0.0',
        source: { provider: 'test', reliability: 0.9 },
        market: { session: 'test', liquidity: 'high' },
        topics: [],
        category: 'market_data' as any,
        tags: ['test'],
        quality: { overall: 0.9, completeness: 1.0, accuracy: 0.9, freshness: 1.0, consistency: 0.9, validity: 0.9 },
        realtime: {
          lastUpdated: Date.now(),
          updateFrequency: 1,
          dataFreshness: 0.9,
          streamId: 'test_stream',
          timestamp: Date.now()
        },
        stream: {
          source: 'test',
          latency: 10,
          isLive: true,
          quality: {
            bandwidth: 1000,
            packetLoss: 0,
            jitter: 0,
            reliability: 0.95,
            status: 'excellent'
          }
        }
      };

      const eventPromise = new Promise((resolve) => {
        eventEmitter.once('metadataChange', resolve);
      });

      eventEmitter.emitMetadataChange(metadata);
      return eventPromise;
    });

    test('should emit quality change events', () => {
      const metadata: RealtimeMetadata = {} as RealtimeMetadata;
      const oldQuality = { overall: 0.8, completeness: 0.9, accuracy: 0.8, freshness: 0.9, consistency: 0.8, validity: 0.9 };
      const newQuality = { overall: 0.9, completeness: 1.0, accuracy: 0.9, freshness: 1.0, consistency: 0.9, validity: 0.9 };

      const eventPromise = new Promise((resolve) => {
        eventEmitter.once('qualityChange', resolve);
      });

      eventEmitter.emitQualityChange(metadata, oldQuality, newQuality);
      return eventPromise;
    });

    test('should emit topic change events', () => {
      const metadata: RealtimeMetadata = {} as RealtimeMetadata;
      const oldTopics = ['crypto.spot'];
      const newTopics = ['crypto.derivatives'];

      const eventPromise = new Promise((resolve) => {
        eventEmitter.once('topicChange', resolve);
      });

      eventEmitter.emitTopicChange(metadata, oldTopics, newTopics);
      return eventPromise;
    });

    test('should emit stream status events', () => {
      const eventPromise = new Promise((resolve) => {
        eventEmitter.once('streamStatus', resolve);
      });

      eventEmitter.emitStreamStatus('connected', { source: 'test' });
      return eventPromise;
    });

    test('should maintain event history', () => {
      const metadata: RealtimeMetadata = {} as RealtimeMetadata;

      // Emit multiple events
      eventEmitter.emitMetadataChange(metadata);
      eventEmitter.emitStreamStatus('connected');
      eventEmitter.emitStreamStatus('disconnected');

      const history = eventEmitter.getEventHistory();
      expect(history).toHaveLength(3);
      expect(history[0].type).toBe('metadata_update');
      expect(history[1].type).toBe('stream_status');
      expect(history[2].type).toBe('stream_status');
    });

    test('should limit event history size', () => {
      const metadata: RealtimeMetadata = {} as RealtimeMetadata;

      // Emit more events than the history size
      for (let i = 0; i < 1500; i++) {
        eventEmitter.emitMetadataChange(metadata);
      }

      const history = eventEmitter.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(1000); // Default max history size
    });

    test('should clear event history', () => {
      const metadata: RealtimeMetadata = {} as RealtimeMetadata;

      eventEmitter.emitMetadataChange(metadata);
      eventEmitter.emitStreamStatus('connected');

      expect(eventEmitter.getEventHistory()).toHaveLength(2);

      eventEmitter.clearHistory();
      expect(eventEmitter.getEventHistory()).toHaveLength(0);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should process updates within performance targets', async () => {
      const processor = new RealtimeMetadataProcessor();
      await processor.start();

      const update: RealtimeMarketUpdate = {
        symbol: 'BTC/USD',
        price: 45000,
        volume: 1000000,
        timestamp: Date.now(),
        source: 'binance',
        updateType: 'trade'
      };

      const startTime = performance.now();
      await processor.processUpdate(update);
      const processingTime = performance.now() - startTime;

      // Should process single update in under 50ms
      expect(processingTime).toBeLessThan(50);

      await processor.stop();
    });

    test('should handle high throughput scenarios', async () => {
      const processor = new RealtimeMetadataProcessor();
      await processor.start();

      const updates: RealtimeMarketUpdate[] = Array.from({ length: 100 }, (_, i) => ({
        symbol: `SYMBOL_${i}`,
        price: 1000 + i,
        volume: 100000 * i,
        timestamp: Date.now(),
        source: 'test',
        updateType: 'trade' as const
      }));

      const startTime = performance.now();
      await processor.processBatch(updates);
      const processingTime = performance.now() - startTime;

      // Should process 100 updates in under 500ms (5ms per update)
      expect(processingTime).toBeLessThan(500);

      const stats = processor.getProcessingStats();
      expect(stats.throughput).toBeGreaterThan(100); // Should process >100 updates/second

      await processor.stop();
    });

    test('should maintain memory efficiency', async () => {
      const processor = new RealtimeMetadataProcessor();
      await processor.start();

      const initialMemory = processor.getMetrics().memoryUsage;

      // Process many updates
      const updates: RealtimeMarketUpdate[] = Array.from({ length: 1000 }, (_, i) => ({
        symbol: `SYMBOL_${i}`,
        price: 1000 + i,
        volume: 100000 * i,
        timestamp: Date.now(),
        source: 'test',
        updateType: 'trade' as const
      }));

      await processor.processBatch(updates);

      const finalMemory = processor.getMetrics().memoryUsage;
      
      // Memory usage should not grow excessively
      expect(finalMemory - initialMemory).toBeLessThan(100); // Less than 100MB growth

      await processor.stop();
    });
  });
});

// Mock WebSocket for testing
class MockWebSocket extends EventEmitter {
  readyState = 1; // OPEN
  constructor(url: string) {
    super();
    // Simulate connection
    setTimeout(() => {
      this.emit('open');
    }, 10);
  }

  send(data: string) {
    // Simulate receiving data
    setTimeout(() => {
      this.emit('message', JSON.stringify({
        symbol: 'BTC/USD',
        price: 45000,
        volume: 1000000,
        timestamp: Date.now(),
        source: 'test',
        updateType: 'trade'
      }));
    }, 5);
  }

  close() {
    this.emit('close');
  }
}
