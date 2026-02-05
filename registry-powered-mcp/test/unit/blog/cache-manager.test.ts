/**
 * RedisCacheLayer Unit Tests
 * Infrastructure ID: 24 (Redis-Cache-Layer)
 * Validates cache-aside pattern with in-memory fallback
 */

import { describe, test, expect, beforeEach, afterEach } from "harness";
import { RedisCacheLayer, cacheManager } from "../../../blog/cache-manager";

describe('RedisCacheLayer', () => {
  let cache: RedisCacheLayer;

  beforeEach(() => {
    // Use default config which will fallback to memory cache
    cache = new RedisCacheLayer({
      defaultTTL: 60,
      keyPrefix: 'test:cache:',
    });
  });

  afterEach(async () => {
    await cache.disconnect();
  });

  describe('Configuration', () => {
    test('should use default configuration values', () => {
      const defaultCache = new RedisCacheLayer();
      const stats = defaultCache.getStats();

      // Verify default state
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    test('should accept custom configuration', () => {
      const customCache = new RedisCacheLayer({
        defaultTTL: 300,
        keyPrefix: 'custom:',
        maxMemoryMB: 50,
        enableCompression: false,
      });

      // Verify it initializes without error
      expect(customCache).toBeInstanceOf(RedisCacheLayer);
    });
  });

  describe('connect()', () => {
    test('should gracefully handle unavailable Redis', async () => {
      const result = await cache.connect();

      // Without Redis running, should return false but not throw
      // The cache will fallback to in-memory mode
      expect(typeof result).toBe('boolean');
    });
  });

  describe('get() / set()', () => {
    test('should store and retrieve values', async () => {
      await cache.set('test-key', { data: 'test-value' });
      const result = await cache.get<{ data: string }>('test-key');

      expect(result).toEqual({ data: 'test-value' });
    });

    test('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent-key');

      expect(result).toBeNull();
    });

    test('should handle primitive types', async () => {
      await cache.set('string-key', 'hello');
      await cache.set('number-key', 42);
      await cache.set('boolean-key', true);

      expect(await cache.get('string-key')).toBe('hello');
      expect(await cache.get('number-key')).toBe(42);
      expect(await cache.get('boolean-key')).toBe(true);
    });

    test('should handle complex objects', async () => {
      const complexData = {
        id: 1,
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: '2024-12-19T00:00:00.000Z',
      };

      await cache.set('complex-key', complexData);
      const result = await cache.get('complex-key');

      expect(result).toEqual(complexData);
    });

    test('should handle arrays', async () => {
      const array = [1, 'two', { three: 3 }];

      await cache.set('array-key', array);
      const result = await cache.get('array-key');

      expect(result).toEqual(array);
    });

    test('should respect TTL and expire entries', async () => {
      // Set with very short TTL
      const shortTTLCache = new RedisCacheLayer({
        defaultTTL: 1, // 1 second
        keyPrefix: 'ttl-test:',
      });

      await shortTTLCache.set('expiring-key', 'will expire', 1);

      // Immediate retrieval should work
      expect(await shortTTLCache.get('expiring-key')).toBe('will expire');

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      expect(await shortTTLCache.get('expiring-key')).toBeNull();

      await shortTTLCache.disconnect();
    });

    test('should update stats on get hits', async () => {
      await cache.set('stat-key', 'value');

      await cache.get('stat-key');
      await cache.get('stat-key');
      await cache.get('stat-key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });

    test('should update stats on get misses', async () => {
      await cache.get('missing-1');
      await cache.get('missing-2');

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    test('should track operation latency', async () => {
      await cache.set('latency-key', 'value');
      await cache.get('latency-key');

      const stats = cache.getStats();
      expect(stats.averageLatencyMs).toBeGreaterThan(0);
    });
  });

  describe('delete()', () => {
    test('should delete existing keys', async () => {
      await cache.set('delete-key', 'to be deleted');
      expect(await cache.get('delete-key')).toBe('to be deleted');

      const deleted = await cache.delete('delete-key');

      expect(deleted).toBe(true);
      expect(await cache.get('delete-key')).toBeNull();
    });

    test('should handle deleting non-existent keys', async () => {
      const deleted = await cache.delete('never-existed');

      expect(deleted).toBe(true); // Deleting non-existent is still "successful"
    });
  });

  describe('invalidatePattern()', () => {
    test('should invalidate keys matching pattern', async () => {
      await cache.set('user:1:profile', { name: 'Alice' });
      await cache.set('user:2:profile', { name: 'Bob' });
      await cache.set('user:1:settings', { theme: 'dark' });
      await cache.set('other:key', 'preserved');

      const deleted = await cache.invalidatePattern('user:*');

      expect(deleted).toBe(3);
      expect(await cache.get('user:1:profile')).toBeNull();
      expect(await cache.get('user:2:profile')).toBeNull();
      expect(await cache.get('user:1:settings')).toBeNull();
      expect(await cache.get('other:key')).toBe('preserved');
    });

    test('should handle pattern with no matches', async () => {
      await cache.set('existing', 'value');

      const deleted = await cache.invalidatePattern('nonexistent:*');

      expect(deleted).toBe(0);
      expect(await cache.get('existing')).toBe('value');
    });

    test('should invalidate all with wildcard', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const deleted = await cache.invalidatePattern('*');

      expect(deleted).toBe(3);
    });
  });

  describe('cached() wrapper', () => {
    test('should return cached value on hit', async () => {
      let fetcherCalls = 0;
      const fetcher = async () => {
        fetcherCalls++;
        return { computed: 'data' };
      };

      // First call - should invoke fetcher
      const first = await cache.cached('cached-key', fetcher);
      expect(first).toEqual({ computed: 'data' });
      expect(fetcherCalls).toBe(1);

      // Second call - should use cache
      const second = await cache.cached('cached-key', fetcher);
      expect(second).toEqual({ computed: 'data' });
      expect(fetcherCalls).toBe(1); // Still 1, fetcher not called again
    });

    test('should invoke fetcher on cache miss', async () => {
      let fetcherCalls = 0;
      const fetcher = async () => {
        fetcherCalls++;
        return `result-${fetcherCalls}`;
      };

      const result = await cache.cached('miss-key', fetcher);

      expect(result).toBe('result-1');
      expect(fetcherCalls).toBe(1);
    });

    test('should respect custom TTL in cached wrapper', async () => {
      const fetcher = async () => 'short-lived';

      await cache.cached('short-ttl', fetcher, 1); // 1 second TTL

      expect(await cache.get('short-ttl')).toBe('short-lived');

      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(await cache.get('short-ttl')).toBeNull();
    });

    test('should handle fetcher errors', async () => {
      const failingFetcher = async () => {
        throw new Error('Fetch failed');
      };

      await expect(cache.cached('error-key', failingFetcher)).rejects.toThrow('Fetch failed');
    });
  });

  describe('getStats()', () => {
    test('should return initial stats', () => {
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.entriesCount).toBe(0);
    });

    test('should calculate hit rate correctly', async () => {
      await cache.set('hit-key', 'value');

      // 3 hits
      await cache.get('hit-key');
      await cache.get('hit-key');
      await cache.get('hit-key');

      // 2 misses
      await cache.get('miss-1');
      await cache.get('miss-2');

      const stats = cache.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.6); // 3/5 = 0.6
    });

    test('should track entry count', async () => {
      await cache.set('entry-1', 'value1');
      await cache.set('entry-2', 'value2');
      await cache.set('entry-3', 'value3');

      const stats = cache.getStats();

      expect(stats.entriesCount).toBe(3);
    });

    test('should estimate memory usage', async () => {
      const largeData = 'x'.repeat(1024); // 1KB string

      await cache.set('large-1', largeData);
      await cache.set('large-2', largeData);

      const stats = cache.getStats();

      // Memory usage should be > 0 for in-memory cache
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });
  });

  describe('disconnect()', () => {
    test('should clear memory cache on disconnect', async () => {
      await cache.set('persist-key', 'value');
      expect(await cache.get('persist-key')).toBe('value');

      await cache.disconnect();

      // After disconnect, memory cache is cleared
      expect(cache.getStats().entriesCount).toBe(0);
    });

    test('should be safe to call multiple times', async () => {
      await cache.disconnect();
      await cache.disconnect();
      await cache.disconnect();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Memory cache eviction', () => {
    test('should evict expired entries on set', async () => {
      const shortCache = new RedisCacheLayer({
        defaultTTL: 1,
        keyPrefix: 'evict:',
      });

      await shortCache.set('will-expire', 'data', 1);

      await new Promise(resolve => setTimeout(resolve, 1100));

      // This set triggers eviction check
      await shortCache.set('new-key', 'new-data');

      // Expired key should be gone
      expect(await shortCache.get('will-expire')).toBeNull();
      expect(await shortCache.get('new-key')).toBe('new-data');

      await shortCache.disconnect();
    });
  });

  describe('Key prefixing', () => {
    test('should prefix all keys with configured prefix', async () => {
      const prefixedCache = new RedisCacheLayer({
        keyPrefix: 'myapp:v1:',
      });

      await prefixedCache.set('user', { id: 1 });

      // Internal key should be prefixed
      // We can't directly test internal keys, but we can verify it works
      expect(await prefixedCache.get('user')).toEqual({ id: 1 });

      // Different prefix = different namespace
      const otherCache = new RedisCacheLayer({
        keyPrefix: 'otherapp:',
      });

      // Should not find the key (different namespace)
      expect(await otherCache.get('user')).toBeNull();

      await prefixedCache.disconnect();
      await otherCache.disconnect();
    });
  });

  describe('Singleton export', () => {
    test('should export singleton cacheManager instance', () => {
      expect(cacheManager).toBeInstanceOf(RedisCacheLayer);
    });
  });
});
