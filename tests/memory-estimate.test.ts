/**
 * @see https://bun.com/docs/runtime/utils#estimateshallowmemoryusageof-in-bun-jsc
 * @see https://bun.com/docs/test/index#run-tests
 */

import { describe, expect, test } from 'bun:test';
import { CacheManager } from '../lib/performance/cache-manager';
import {
  estimateCacheValueMemory,
  estimateShallowBytes,
} from '../lib/performance/memory-estimate';

describe('Bun shallow memory estimates', () => {
  test('measures directly owned binary storage', () => {
    const buffer = Buffer.alloc(1024);
    const estimate = estimateCacheValueMemory(buffer);

    expect(estimate.shallowBytes).toBeGreaterThanOrEqual(buffer.byteLength);
    expect(estimate.capacityBytes).toBe(estimate.shallowBytes);
    expect(estimate.method).toBe('bun:jsc');
  });

  test('keeps shallow and serialized capacity signals distinct', () => {
    const estimate = estimateCacheValueMemory({ payload: 'factory'.repeat(64) });

    expect(estimate.shallowBytes).toBeGreaterThan(0);
    expect(estimate.capacityBytes).toBeGreaterThan(estimate.shallowBytes);
    expect(estimate.method).toBe('bun:jsc+json');
  });

  test('falls back to shallow bytes for circular and BigInt values', () => {
    const circular: { self?: object } = {};
    circular.self = circular;

    const circularEstimate = estimateCacheValueMemory(circular);
    const bigintEstimate = estimateCacheValueMemory(42n);

    expect(circularEstimate).toEqual({
      shallowBytes: estimateShallowBytes(circular),
      capacityBytes: estimateShallowBytes(circular),
      method: 'bun:jsc',
    });
    expect(bigintEstimate.shallowBytes).toBeGreaterThan(0);
    expect(bigintEstimate.capacityBytes).toBe(bigintEstimate.shallowBytes);
    expect(bigintEstimate.method).toBe('bun:jsc');
  });

  test('preserves primitive cache-capacity baselines', () => {
    expect(estimateCacheValueMemory(42).capacityBytes).toBe(8);
    expect(estimateCacheValueMemory(true).capacityBytes).toBe(4);
    expect(estimateCacheValueMemory(null).capacityBytes).toBe(0);
  });
});

describe('performance CacheManager memory diagnostics', () => {
  test('accepts circular values and reports capacity plus shallow bytes', async () => {
    const cache = new CacheManager<string, object>({
      cleanupInterval: 0,
      maxSizeBytes: 1024 * 1024,
    });
    const circular: { self?: object } = {};
    circular.self = circular;

    await cache.set('circular', circular);

    const [info] = cache.getCacheInfo();
    const stats = cache.getStats();
    expect(info?.size).toBeGreaterThan(0);
    expect(info?.shallowSize).toBeGreaterThan(0);
    expect(stats.memoryUsage).toBe(info?.size);
    expect(stats.shallowMemoryUsage).toBe(info?.shallowSize);

    await cache.destroy();
  });

  test('keeps both memory totals correct across replacement and deletion', async () => {
    const cache = new CacheManager<string, Buffer>({ cleanupInterval: 0 });

    await cache.set('buffer', Buffer.alloc(256));
    const first = cache.getStats();
    await cache.set('buffer', Buffer.alloc(1024));
    const replacement = cache.getStats();

    expect(replacement.memoryUsage).toBeGreaterThan(first.memoryUsage);
    expect(replacement.shallowMemoryUsage).toBeGreaterThan(first.shallowMemoryUsage);

    await cache.delete('buffer');
    expect(cache.getStats().memoryUsage).toBe(0);
    expect(cache.getStats().shallowMemoryUsage).toBe(0);

    await cache.destroy();
  });
});
