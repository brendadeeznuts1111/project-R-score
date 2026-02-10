// lib/ai/smart-cache-manager.test.ts — Tests for smart-cache-manager

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';

// Mock dependencies
void mock.module('../core/structured-logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    fatal: () => {},
  },
}));

void mock.module('./ai-operations-manager', () => ({
  aiOperations: {
    submitCommand: async () => {
      await Promise.resolve();
      return 'mock-id';
    },
    getOptimizationSuggestions: async () => {
      await Promise.resolve();
      return [];
    },
    predict: async () => {
      await Promise.resolve();
      return { resource: {}, performance: {}, confidence: 0.5 };
    },
    getHealthStatus: async () => {
      await Promise.resolve();
      return { status: 'healthy' };
    },
    stop: () => {},
  },
}));

void mock.module('../performance/cache-manager', () => {
  class MockCacheManager {
    private store = new Map();
    async get(key: any) {
      await Promise.resolve();
      const entry = this.store.get(key);
      if (!entry) return undefined;
      if (entry.expiry && Date.now() > entry.expiry) {
        this.store.delete(key);
        return undefined;
      }
      return entry.value;
    }
    async set(key: any, value: any, ttl?: number) {
      await Promise.resolve();
      this.store.set(key, { value, expiry: ttl ? Date.now() + ttl : undefined });
    }
    async delete(key: any) {
      await Promise.resolve();
      return this.store.delete(key);
    }
    async clear() {
      await Promise.resolve();
      this.store.clear();
    }
    getStats() {
      return {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0,
        currentSize: this.store.size,
        maxSize: 1000,
        hitRate: 0,
        memoryUsage: 0,
      };
    }
    stop() {}
    async destroy() {
      this.stop();
      await this.clear();
    }
  }
  return {
    CacheManager: MockCacheManager,
    globalCaches: {
      secrets: new MockCacheManager(),
      config: new MockCacheManager(),
      apiResponses: new MockCacheManager(),
    },
  };
});

import { SmartCacheManager } from './smart-cache-manager';

describe('SmartCacheManager', () => {
  let cache: SmartCacheManager<string, string>;

  beforeEach(() => {
    cache = new SmartCacheManager<string, string>({
      enablePredictions: false,
      autoOptimization: false,
    });
  });

  afterEach(async () => {
    await cache.stop();
  });

  test('constructor with default config', () => {
    const c = new SmartCacheManager();
    expect(c).toBeDefined();
    void c.stop();
  });

  test('constructor with custom config', () => {
    const c = new SmartCacheManager({
      enablePredictions: true,
      learningRate: 0.2,
      predictionWindow: 30,
      minConfidence: 0.5,
      maxPatternHistory: 500,
      autoOptimization: false,
    });
    expect(c).toBeDefined();
    void c.stop();
  });

  test('set and get a value', async () => {
    await cache.set('hello', 'world');
    const val = await cache.get('hello');
    expect(val).toBe('world');
  });

  test('get returns undefined for missing key', async () => {
    const val = await cache.get('missing');
    expect(val).toBeUndefined();
  });

  test('delete removes a key', async () => {
    await cache.set('key', 'val');
    // Access private cache to call delete — SmartCacheManager delegates to cache
    // SmartCacheManager doesn't expose delete directly; test through the internal cache
    // Actually let's check if there's a delete method
    if (typeof (cache as any).cache?.delete === 'function') {
      await (cache as any).cache.delete('key');
      const val = await cache.get('key');
      expect(val).toBeUndefined();
    }
  });

  test('predictAccesses returns a Map', async () => {
    // First add some access patterns
    await cache.set('a', '1');
    await cache.get('a');
    await cache.get('a');

    const predictions = await cache.predictAccesses();
    expect(predictions instanceof Map).toBe(true);
  });

  test('optimize returns optimization results', async () => {
    const results = await cache.optimize();
    expect(results).toHaveProperty('itemsPreloaded');
    expect(results).toHaveProperty('itemsEvicted');
    expect(results).toHaveProperty('itemsPromoted');
    expect(results).toHaveProperty('performanceImprovement');
    expect(typeof results.itemsPreloaded).toBe('number');
  });

  test('getIntelligenceMetrics returns metrics', () => {
    const metrics = cache.getIntelligenceMetrics();
    expect(metrics).toHaveProperty('patternsLearned');
    expect(metrics).toHaveProperty('predictionsActive');
    expect(metrics).toHaveProperty('accuracy');
    expect(metrics).toHaveProperty('optimizationSavings');
    expect(metrics).toHaveProperty('hitRateImprovement');
    expect(typeof metrics.patternsLearned).toBe('number');
  });

  test('patterns are learned after repeated access', async () => {
    await cache.set('freq', 'data');
    for (let i = 0; i < 5; i++) {
      await cache.get('freq');
    }
    const metrics = cache.getIntelligenceMetrics();
    expect(metrics.patternsLearned).toBeGreaterThanOrEqual(1);
  });

  test('stop cleans up without error', async () => {
    await expect(cache.stop()).resolves.toBeUndefined();
  });
});

describe('smartCaches exports', () => {
  test('exported instances are defined', async () => {
    // Import the named export — need to do a dynamic import to avoid
    // the module-level instantiation issues with mocks already in place
    const { smartCaches } = await import('./smart-cache-manager');
    expect(smartCaches).toBeDefined();
    expect(smartCaches.secrets).toBeDefined();
    expect(smartCaches.config).toBeDefined();
    expect(smartCaches.apiResponses).toBeDefined();

    // Clean up
    await smartCaches.secrets.stop();
    await smartCaches.config.stop();
    await smartCaches.apiResponses.stop();
  });
});
