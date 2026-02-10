// lib/ai/ai-operations-manager.test.ts — Tests for ai-operations-manager

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';

// Mock dependencies before importing the module under test
void mock.module('../core/structured-logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    fatal: () => {},
  },
}));

void mock.module('../performance/cache-manager', () => ({
  globalCaches: {
    secrets: {
      getStats: () => ({
        hits: 50,
        misses: 10,
        sets: 60,
        deletes: 0,
        evictions: 0,
        currentSize: 60,
        maxSize: 500,
        hitRate: 0.83,
        memoryUsage: 1024,
      }),
    },
    config: { getStats: () => ({ hitRate: 0.9 }) },
    apiResponses: { getStats: () => ({ hitRate: 0.75 }) },
  },
}));

import { AdvancedLRUCache, AIOperationsManager } from './ai-operations-manager';

// ────────────────────────────────────────────────────
// AdvancedLRUCache
// ────────────────────────────────────────────────────
describe('AdvancedLRUCache', () => {
  let cache: AdvancedLRUCache<string>;

  beforeEach(() => {
    cache = new AdvancedLRUCache<string>({
      maxSize: 5,
      defaultTTL: 60_000,
      cleanupInterval: 600_000,
    });
  });

  afterEach(() => {
    cache.stop();
  });

  test('set and get basic operations', () => {
    cache.set('a', 'hello');
    expect(cache.get('a')).toBe('hello');
  });

  test('get returns null for missing key', () => {
    expect(cache.get('missing')).toBeNull();
  });

  test('has returns true for existing key', () => {
    cache.set('x', 'val');
    expect(cache.has('x')).toBe(true);
  });

  test('has returns false for missing key', () => {
    expect(cache.has('nope')).toBe(false);
  });

  test('delete removes an entry', () => {
    cache.set('k', 'v');
    expect(cache.delete('k')).toBe(true);
    expect(cache.get('k')).toBeNull();
  });

  test('delete returns false for missing key', () => {
    expect(cache.delete('nope')).toBe(false);
  });

  test('clear removes all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.getSize()).toBe(0);
    expect(cache.get('a')).toBeNull();
  });

  test('TTL expiration', async () => {
    cache.set('short', 'lived', 50); // 50ms TTL
    expect(cache.get('short')).toBe('lived');
    await Bun.sleep(80);
    expect(cache.get('short')).toBeNull();
  });

  test('has returns false for expired key', async () => {
    cache.set('exp', 'val', 30);
    await Bun.sleep(60);
    expect(cache.has('exp')).toBe(false);
  });

  test('LRU eviction when full', () => {
    // Fill cache to capacity (maxSize=5)
    for (let i = 0; i < 5; i++) {
      cache.set(`k${i}`, `v${i}`);
    }
    expect(cache.getSize()).toBe(5);

    // Adding one more should evict the LRU item (k0)
    cache.set('k5', 'v5');
    expect(cache.getSize()).toBe(5);
    expect(cache.get('k0')).toBeNull(); // evicted
    expect(cache.get('k5')).toBe('v5');
  });

  test('accessing an item prevents its eviction', () => {
    for (let i = 0; i < 5; i++) {
      cache.set(`k${i}`, `v${i}`);
    }
    // Access k0 to move it to head
    cache.get('k0');
    // Add new item — should evict k1 (now the LRU), not k0
    cache.set('k5', 'v5');
    expect(cache.get('k0')).toBe('v0');
    expect(cache.get('k1')).toBeNull();
  });

  test('getStats returns accurate statistics', async () => {
    cache.set('a', '1');
    cache.get('a'); // hit
    cache.get('b'); // miss

    // Stats are updated asynchronously via mutex — give them time to settle
    await Bun.sleep(20);

    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.maxSize).toBe(5);
    expect(stats.totalSets).toBeGreaterThanOrEqual(1);
    expect(stats.totalGets).toBeGreaterThanOrEqual(2);
  });

  test('getSize returns current size', () => {
    expect(cache.getSize()).toBe(0);
    cache.set('a', '1');
    expect(cache.getSize()).toBe(1);
  });

  test('isFull returns correct state', () => {
    expect(cache.isFull()).toBe(false);
    for (let i = 0; i < 5; i++) cache.set(`k${i}`, `v${i}`);
    expect(cache.isFull()).toBe(true);
  });

  test('getLoadFactor returns ratio', () => {
    expect(cache.getLoadFactor()).toBe(0);
    cache.set('a', '1');
    expect(cache.getLoadFactor()).toBe(0.2); // 1/5
  });

  test('eviction event is emitted', () => {
    let evicted = false;
    cache.on('cache:evict', () => {
      evicted = true;
    });

    for (let i = 0; i < 6; i++) {
      cache.set(`k${i}`, `v${i}`);
    }
    expect(evicted).toBe(true);
  });

  test('update existing key in-place', () => {
    cache.set('a', 'old');
    cache.set('a', 'new');
    expect(cache.get('a')).toBe('new');
    expect(cache.getSize()).toBe(1);
  });

  test('constructor rejects invalid maxSize', () => {
    expect(() => new AdvancedLRUCache({ maxSize: 0 })).toThrow();
    expect(() => new AdvancedLRUCache({ maxSize: -1 })).toThrow();
  });
});

// ────────────────────────────────────────────────────
// AIOperationsManager
// ────────────────────────────────────────────────────
describe('AIOperationsManager', () => {
  let manager: AIOperationsManager;

  beforeEach(() => {
    manager = AIOperationsManager.getInstance();
  });

  afterEach(() => {
    manager.stop();
    // Reset singleton so next test gets a fresh instance
    (AIOperationsManager as any).instance = undefined;
  });

  test('getInstance returns a singleton', () => {
    const a = AIOperationsManager.getInstance();
    const b = AIOperationsManager.getInstance();
    expect(a).toBe(b);
    a.stop();
    (AIOperationsManager as any).instance = undefined;
  });

  test('submitCommand returns a command ID', async () => {
    const id = await manager.submitCommand({
      type: 'analyze',
      input: 'test input',
      priority: 'medium',
    });
    expect(typeof id).toBe('string');
    expect(id.startsWith('ai-')).toBe(true);
  });

  test('submitCommand validates command type', async () => {
    await expect(
      manager.submitCommand({
        type: 'invalid' as any,
        input: 'test',
        priority: 'medium',
      })
    ).rejects.toThrow('Invalid command type');
  });

  test('submitCommand validates input', async () => {
    await expect(
      manager.submitCommand({
        type: 'analyze',
        input: '',
        priority: 'medium',
      })
    ).rejects.toThrow('Invalid input');
  });

  test('submitCommand validates priority', async () => {
    await expect(
      manager.submitCommand({
        type: 'analyze',
        input: 'test',
        priority: 'invalid' as any,
      })
    ).rejects.toThrow('Invalid priority');
  });

  test('getOptimizationSuggestions returns AIInsight[]', async () => {
    const suggestions = await manager.getOptimizationSuggestions();
    expect(Array.isArray(suggestions)).toBe(true);
  });

  test('predict returns predictions for each timeframe', async () => {
    for (const tf of ['hour', 'day', 'week'] as const) {
      const pred = await manager.predict(tf);
      expect(pred).toHaveProperty('resource');
      expect(pred).toHaveProperty('performance');
      expect(typeof pred.confidence).toBe('number');
      expect(pred.resource).toHaveProperty('cpu');
      expect(pred.resource).toHaveProperty('memory');
      expect(pred.resource).toHaveProperty('storage');
      expect(pred.performance).toHaveProperty('responseTime');
      expect(pred.performance).toHaveProperty('throughput');
      expect(pred.performance).toHaveProperty('errorRate');
    }
  });

  test('getHealthStatus returns health metrics', async () => {
    const health = await manager.getHealthStatus();
    expect(health).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    expect(health).toHaveProperty('checks');
    expect(health).toHaveProperty('uptime');
    expect(health).toHaveProperty('version');
    expect(health).toHaveProperty('timestamp');
  });

  test('stop cleans up resources without error', () => {
    expect(() => manager.stop()).not.toThrow();
  });
});
