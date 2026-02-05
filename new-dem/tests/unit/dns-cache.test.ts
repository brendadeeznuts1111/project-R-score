import { describe, test, expect } from "bun:test";
import { DNSCacheManager, dnsCacheManager } from "../../src/dns-cache";
import { mockDNSConfig } from "../fixtures/components";

describe("DNSCacheManager", () => {
  describe("constructor", () => {
    test("initializes with default config", () => {
      const manager = new DNSCacheManager();
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(DNSCacheManager);
    });

    test("initializes with custom config", () => {
      const customConfig = { ...mockDNSConfig, cacheTTL: 10 * 60 * 1000 };
      const manager = new DNSCacheManager(customConfig);
      expect(manager).toBeDefined();
    });
  });

  describe("getStats", () => {
    test("returns accurate cache statistics", () => {
      const manager = new DNSCacheManager(mockDNSConfig);
      const cache = (manager as any).cache;

      // Set up test cache entries
      cache.set('host1.com', { hostname: 'host1.com', addresses: ['1.1.1.1'], timestamp: Date.now() - 10000, hits: 5 });
      cache.set('host2.com', { hostname: 'host2.com', addresses: ['2.2.2.2'], timestamp: Date.now() - 20000, hits: 3 });

      // Add to prefetch queue
      const queue = (manager as any).prefetchQueue;
      queue.add('prefetch1.com');
      queue.add('prefetch2.com');

      const stats = manager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBe(8);
      expect(stats.prefetchQueueSize).toBe(2);
      expect(stats.averageCacheAge).toBeGreaterThan(10);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    test("calculates cache hit rate correctly", () => {
      const manager = new DNSCacheManager(mockDNSConfig);
      const cache = (manager as any).cache;

      // Set up test data: 8 hits, 2 entries
      cache.set('host1.com', { hostname: 'host1.com', addresses: ['1.1.1.1'], timestamp: Date.now(), hits: 5 });
      cache.set('host2.com', { hostname: 'host2.com', addresses: ['2.2.2.2'], timestamp: Date.now(), hits: 3 });

      const stats = manager.getStats();

      // Hit rate = totalHits / (totalHits + totalEntries) = 8 / (8 + 2) = 80%
      expect(stats.cacheHitRate).toBeCloseTo(80, 1);
    });

    test("handles empty cache gracefully", () => {
      const manager = new DNSCacheManager(mockDNSConfig);
      const stats = manager.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.prefetchQueueSize).toBe(0);
      expect(stats.averageCacheAge).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });
  });

  describe("clearExpired", () => {
    test("clears only expired entries", () => {
      const manager = new DNSCacheManager(mockDNSConfig);
      const cache = (manager as any).cache;

      // Set up mix of valid and expired entries
      cache.set('valid.com', {
        hostname: 'valid.com',
        addresses: ['valid.ip'],
        timestamp: Date.now() - 10000, // Recent
        hits: 1
      });

      cache.set('expired.com', {
        hostname: 'expired.com',
        addresses: ['expired.ip'],
        timestamp: Date.now() - mockDNSConfig.cacheTTL - 10000, // Expired
        hits: 1
      });

      const cleared = manager.clearExpired();

      expect(cleared).toBe(1);
      expect(cache.has('valid.com')).toBe(true);
      expect(cache.has('expired.com')).toBe(false);
    });

    test("returns correct count of cleared entries", () => {
      const manager = new DNSCacheManager(mockDNSConfig);
      const cache = (manager as any).cache;

      // Add multiple expired entries
      cache.set('expired1.com', {
        hostname: 'expired1.com',
        addresses: ['expired1.ip'],
        timestamp: Date.now() - mockDNSConfig.cacheTTL - 10000,
        hits: 1
      });

      cache.set('expired2.com', {
        hostname: 'expired2.com',
        addresses: ['expired2.ip'],
        timestamp: Date.now() - mockDNSConfig.cacheTTL - 20000,
        hits: 1
      });

      const cleared = manager.clearExpired();
      expect(cleared).toBe(2);
    });

    test("returns zero when no expired entries", () => {
      const manager = new DNSCacheManager(mockDNSConfig);
      const cache = (manager as any).cache;

      cache.set('fresh.com', {
        hostname: 'fresh.com',
        addresses: ['fresh.ip'],
        timestamp: Date.now(),
        hits: 1
      });

      const cleared = manager.clearExpired();
      expect(cleared).toBe(0);
      expect(cache.has('fresh.com')).toBe(true);
    });
  });

  describe("configuration handling", () => {
    test("uses default config when none provided", () => {
      const manager = new DNSCacheManager();

      // Should use default values
      expect(manager).toBeDefined();
      // The cache should be empty initially
      const stats = manager.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    test("accepts custom configuration", () => {
      const customConfig = {
        cacheTTL: 10 * 60 * 1000, // 10 minutes
        prefetchInterval: 60 * 1000, // 1 minute
        maxPrefetchHosts: 5,
        minHitsForPrefetch: 2,
        enablePeriodicPrefetch: false,
        additionalHosts: ['custom1.com', 'custom2.com']
      };

      const manager = new DNSCacheManager(customConfig);
      expect(manager).toBeDefined();
    });

    test("handles undefined additionalHosts gracefully", () => {
      const configWithoutHosts = { ...mockDNSConfig };
      delete configWithoutHosts.additionalHosts;

      const manager = new DNSCacheManager(configWithoutHosts);
      expect(manager).toBeDefined();
    });
  });
});

describe("global dnsCacheManager instance", () => {
  test("exports a DNSCacheManager instance", () => {
    expect(dnsCacheManager).toBeInstanceOf(DNSCacheManager);
  });

  test("is properly initialized", () => {
    expect(dnsCacheManager).toBeDefined();
    expect(typeof dnsCacheManager.getStats).toBe('function');
    expect(typeof dnsCacheManager.clearExpired).toBe('function');
  });
});