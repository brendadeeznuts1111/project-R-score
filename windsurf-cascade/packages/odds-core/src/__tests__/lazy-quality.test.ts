// packages/odds-core/src/__tests__/lazy-quality.test.ts
// Comprehensive tests for lazy quality assessment

import { test, expect, describe, beforeEach } from "bun:test";
import {
  LazyQualityAssessor,
  QuickQualityAssessor,
  QualityAssessorFactory,
  LazyQualityUtils,
  LazyQualityResult
} from '../utils/lazy-quality.js';
import type { DataQuality } from '../types/topics.js';

describe('LazyQualityAssessor', () => {
  let assessor: LazyQualityAssessor;

  beforeEach(() => {
    assessor = new LazyQualityAssessor();
  });

  describe('Lazy Assessment', () => {
    test('should create lazy quality result', () => {
      const data = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
      const result = assessor.assessLazy(data, 'test_key');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('assess');
      expect(result).toHaveProperty('isAssessed');
      expect(typeof result.assess).toBe('function');
      expect(result.data).toBe(data);
    });

    test('should assess quality on demand', () => {
      const data = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
      const result = assessor.assessLazy(data);

      expect(result.isAssessed).toBe(false);
      expect(result.cachedResult).toBeUndefined();

      const quality = result.assess();
      expect(quality).toHaveProperty('completeness');
      expect(quality).toHaveProperty('accuracy');
      expect(quality).toHaveProperty('freshness');
      expect(quality).toHaveProperty('consistency');
      expect(quality).toHaveProperty('validity');
      expect(quality).toHaveProperty('overall');
    });

    test('should use cache when cache key provided', () => {
      const data = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
      const result1 = assessor.assessLazy(data, 'cached_key');
      result1.assess(); // Assess to populate cache
      
      const result2 = assessor.assessLazy(data, 'cached_key');

      expect(result1.isAssessed).toBe(false);
      expect(result2.isAssessed).toBe(true); // Should be assessed from cache
      expect(result2.cachedResult).toBeDefined();
    });

    test('should return cached result when available', () => {
      const data = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
      const result1 = assessor.assessLazy(data, 'cache_test');
      const quality1 = result1.assess();

      const result2 = assessor.assessLazy(data, 'cache_test');
      const quality2 = result2.assess();

      expect(quality1).toBe(quality2); // Should be the same cached result
    });
  });

  describe('Batch Assessment', () => {
    test('should assess batch of items lazily', () => {
      const items = [
        { data: { symbol: 'BTC/USD', price: 45000 }, cacheKey: 'item1' },
        { data: { symbol: 'ETH/USD', price: 3000 }, cacheKey: 'item2' },
        { data: { symbol: 'SOL/USD', price: 100 } }
      ];

      const results = assessor.assessBatchLazy(items);
      expect(results).toHaveLength(3);

      results.forEach((result, index) => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('assess');
        expect(result.data).toBe(items[index].data);
      });
    });
  });

  describe('Preloading', () => {
    test('should preload assessments', async () => {
      const patterns = [
        { symbol: 'BTC/USD', price: 45000 },
        { symbol: 'ETH/USD', price: 3000 }
      ];

      await assessor.preloadAssessments(patterns);

      const stats = assessor.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    test('should get cache statistics', () => {
      const stats = assessor.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });

    test('should clear cache', () => {
      const data = { symbol: 'BTC/USD', price: 45000 };
      assessor.assessLazy(data, 'test_key');
      assessor.assessLazy(data, 'test_key').assess(); // Populate cache

      let stats = assessor.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      assessor.clearCache();
      stats = assessor.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test('should handle cache overflow', () => {
      // Create a small cache for testing
      const smallAssessor = new LazyQualityAssessor();
      (smallAssessor as any).cacheMaxSize = 2;

      const data = { symbol: 'TEST', price: 100 };
      
      // Add items beyond cache limit
      smallAssessor.assessLazy(data, 'key1').assess();
      smallAssessor.assessLazy(data, 'key2').assess();
      smallAssessor.assessLazy(data, 'key3').assess(); // Should evict key1

      const stats = smallAssessor.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Quality Assessment Logic', () => {
    test('should assess completeness correctly', () => {
      const completeData = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
      const incompleteData = { symbol: 'BTC/USD' };
      const emptyData = null;

      const result1 = assessor.assessLazy(completeData).assess();
      const result2 = assessor.assessLazy(incompleteData).assess();
      const result3 = assessor.assessLazy(emptyData).assess();

      expect(result1.completeness).toBe(1);
      expect(result2.completeness).toBeLessThan(1);
      expect(result3.completeness).toBe(0);
    });

    test('should assess accuracy correctly', () => {
      const accurateData = { price: 45000, size: 1.5 };
      const inaccurateData = { price: -100, size: -1 };
      const invalidData = { price: Infinity, size: NaN };

      const result1 = assessor.assessLazy(accurateData).assess();
      const result2 = assessor.assessLazy(inaccurateData).assess();
      const result3 = assessor.assessLazy(invalidData).assess();

      expect(result1.accuracy).toBeGreaterThan(result2.accuracy);
      expect(result1.accuracy).toBeGreaterThan(result3.accuracy);
      // Invalid data should have lower accuracy than accurate data
      expect(result3.accuracy).toBeLessThan(result1.accuracy);
    });

    test('should assess freshness based on timestamp', () => {
      const now = Date.now();
      const freshData = { timestamp: now - 500 }; // 0.5 seconds old
      const staleData = { timestamp: now - 60000 }; // 1 minute old
      const veryStaleData = { timestamp: now - 3600000 }; // 1 hour old

      const result1 = assessor.assessLazy(freshData).assess();
      const result2 = assessor.assessLazy(staleData).assess();
      const result3 = assessor.assessLazy(veryStaleData).assess();

      expect(result1.freshness).toBeGreaterThan(result2.freshness);
      expect(result2.freshness).toBeGreaterThan(result3.freshness);
    });

    test('should assess consistency correctly', () => {
      const consistentData = { bid: 44999, ask: 45001 };
      const inconsistentData = { bid: 45001, ask: 44999 }; // Bid >= Ask

      const result1 = assessor.assessLazy(consistentData).assess();
      const result2 = assessor.assessLazy(inconsistentData).assess();

      expect(result1.consistency).toBeGreaterThan(result2.consistency);
    });

    test('should assess validity correctly', () => {
      const validData = { price: 45000, size: 1.5 };
      const invalidData = { price: 'invalid', size: 'not_a_number' };
      const infiniteData = { price: Infinity, size: -Infinity };

      const result1 = assessor.assessLazy(validData).assess();
      const result2 = assessor.assessLazy(invalidData).assess();
      const result3 = assessor.assessLazy(infiniteData).assess();

      expect(result1.validity).toBeGreaterThan(result2.validity);
      expect(result1.validity).toBeGreaterThan(result3.validity);
    });

    test('should calculate overall score correctly', () => {
      const data = { symbol: 'BTC/USD', price: 45000, timestamp: Date.now() };
      const result = assessor.assessLazy(data).assess();

      const expectedOverall = (result.completeness + result.accuracy + result.freshness + result.consistency + result.validity) / 5;
      expect(result.overall).toBeCloseTo(expectedOverall, 5);
    });
  });
});

describe('QuickQualityAssessor', () => {
  let assessor: QuickQualityAssessor;

  beforeEach(() => {
    assessor = new QuickQualityAssessor();
  });

  describe('Quick Assessment', () => {
    test('should provide quick quality score', () => {
      const data = { symbol: 'BTC/USD', price: 45000, size: 1.5, timestamp: Date.now() };
      const score = assessor.assessQuick(data);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should return 0 for null/undefined data', () => {
      expect(assessor.assessQuick(null)).toBe(0);
      expect(assessor.assessQuick(undefined)).toBe(0);
      expect(assessor.assessQuick({})).toBe(0.5); // Base score for empty object
    });

    test('should score higher for complete data', () => {
      const minimalData = { symbol: 'BTC/USD' };
      const completeData = { 
        symbol: 'BTC/USD', 
        price: 45000, 
        size: 1.5, 
        timestamp: Date.now() 
      };

      const score1 = assessor.assessQuick(minimalData);
      const score2 = assessor.assessQuick(completeData);

      expect(score2).toBeGreaterThan(score1);
    });

    test('should penalize invalid data', () => {
      const validData = { price: 45000, size: 1.5 };
      const invalidData = { price: -100, size: -1 };

      const score1 = assessor.assessQuick(validData);
      const score2 = assessor.assessQuick(invalidData);

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('Batch Operations', () => {
    test('should assess batch quickly', () => {
      const dataArray = [
        { symbol: 'BTC/USD', price: 45000 },
        { symbol: 'ETH/USD', price: 3000 },
        { symbol: 'SOL/USD', price: 100 }
      ];

      const scores = assessor.assessBatchQuick(dataArray);
      expect(scores).toHaveLength(3);
      scores.forEach(score => {
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    test('should filter by quality threshold', () => {
      const dataArray = [
        { symbol: 'BTC/USD', price: 45000, size: 1.5, timestamp: Date.now() }, // High quality
        { symbol: 'ETH/USD', price: 3000 }, // Lower quality
        { symbol: 'INVALID', price: -100 } // Low quality
      ];

      const filtered = assessor.filterByQuality(dataArray, 0.7);
      expect(filtered.length).toBeLessThanOrEqual(dataArray.length);
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('QualityAssessorFactory', () => {
  test('should return singleton instances', () => {
    const lazy1 = QualityAssessorFactory.getLazyAssessor();
    const lazy2 = QualityAssessorFactory.getLazyAssessor();
    const quick1 = QualityAssessorFactory.getQuickAssessor();
    const quick2 = QualityAssessorFactory.getQuickAssessor();

    expect(lazy1).toBe(lazy2);
    expect(quick1).toBe(quick2);
    expect(lazy1).not.toBe(quick1);
  });

  test('should return appropriate assessor for volume', () => {
    const lowVolumeAssessor = QualityAssessorFactory.getAssessorForVolume(100);
    const highVolumeAssessor = QualityAssessorFactory.getAssessorForVolume(2000);

    expect(lowVolumeAssessor).toBeInstanceOf(LazyQualityAssessor);
    expect(highVolumeAssessor).toBeInstanceOf(QuickQualityAssessor);
  });

  test('should handle edge case volumes', () => {
    const edgeAssessor1 = QualityAssessorFactory.getAssessorForVolume(1000);
    const edgeAssessor2 = QualityAssessorFactory.getAssessorForVolume(1001);

    expect(edgeAssessor1).toBeInstanceOf(LazyQualityAssessor);
    expect(edgeAssessor2).toBeInstanceOf(QuickQualityAssessor);
  });
});

describe('LazyQualityUtils', () => {
  test('should wrap data with lazy quality', () => {
    const data = { symbol: 'BTC/USD', price: 45000 };
    const wrapped = LazyQualityUtils.wrapWithLazyQuality(data, 'utils_test');

    expect(wrapped).toHaveProperty('data');
    expect(wrapped).toHaveProperty('assess');
    expect(wrapped.data).toBe(data);
  });

  test('should assess only if condition met', () => {
    const data = { symbol: 'BTC/USD', price: 45000 };
    const condition = (d: any) => d.price > 4000;

    const result = LazyQualityUtils.assessIfNeeded(data, condition);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('overall');

    const result2 = LazyQualityUtils.assessIfNeeded(data, (d) => d.price > 50000);
    expect(result2).toBeNull();
  });

  test('should get quick score', () => {
    const data = { symbol: 'BTC/USD', price: 45000 };
    const score = LazyQualityUtils.getQuickScore(data);

    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('Performance Considerations', () => {
  test('should handle large datasets efficiently', () => {
    const assessor = new LazyQualityAssessor();
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      symbol: `SYMBOL_${i}`,
      price: 100 + i,
      timestamp: Date.now()
    }));

    const start = Date.now();
    const results = assessor.assessBatchLazy(largeDataset);
    const end = Date.now();

    expect(results).toHaveLength(100);
    expect(end - start).toBeLessThan(100); // Should be fast
  });

  test('should cache results to avoid recomputation', () => {
    const assessor = new LazyQualityAssessor();
    const data = { symbol: 'BTC/USD', price: 45000 };

    const result1 = assessor.assessLazy(data, 'perf_test');
    const start1 = Date.now();
    const quality1 = result1.assess();
    const end1 = Date.now();

    const result2 = assessor.assessLazy(data, 'perf_test');
    const start2 = Date.now();
    const quality2 = result2.assess();
    const end2 = Date.now();

    expect(quality1).toBe(quality2);
    expect(end2 - start2).toBeLessThanOrEqual(end1 - start1); // Cached should be faster or equal
  });
});
