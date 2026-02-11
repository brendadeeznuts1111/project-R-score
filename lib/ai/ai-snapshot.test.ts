// lib/ai/ai-snapshot.test.ts — Snapshot tests for lib/ai/ Bun-native API outputs
import { YAML } from 'bun';
import { heapStats } from 'bun:jsc';
import { describe, it, expect } from 'bun:test';

import { AdvancedLRUCache } from './ai-operations-manager';
import { AnomalyDetector } from './anomaly-detector';

describe('snapshots', () => {
  // ========================================================================
  // LRU CACHE
  // ========================================================================

  describe('AdvancedLRUCache', () => {
    it('getStats() shape after set+get', () => {
      const cache = new AdvancedLRUCache<string>({
        maxSize: 100,
        defaultTtl: 60_000,
        enableStats: true,
      });
      cache.set('a', 'alpha');
      cache.set('b', 'beta');
      cache.get('a');
      cache.get('miss');

      const stats = cache.getStats();
      // Zero out timing-dependent fields for stable snapshot
      const stable = {
        ...stats,
        averageAccessTime: typeof stats.averageAccessTime,
        oldestEntry: typeof stats.oldestEntry,
        newestEntry: typeof stats.newestEntry,
      };
      expect(stable).toMatchSnapshot();
      cache.clear();
    });

    it('stats counters are correct', () => {
      const cache = new AdvancedLRUCache<number>({
        maxSize: 3,
        defaultTtl: 60_000,
        enableStats: true,
      });
      cache.set('x', 1);
      cache.set('y', 2);
      cache.set('z', 3);
      cache.set('w', 4); // evicts 'x'
      cache.get('y');     // hit
      cache.get('x');     // miss (evicted)

      const stats = cache.getStats();
      expect({
        size: stats.size,
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions,
        totalSets: stats.totalSets,
        totalGets: stats.totalGets,
      }).toMatchSnapshot();
      cache.clear();
    });
  });

  // ========================================================================
  // ID GENERATION (UUIDv7)
  // ========================================================================

  describe('Bun.randomUUIDv7', () => {
    it('hex format matches UUIDv7 pattern', () => {
      const id = Bun.randomUUIDv7();
      // UUIDv7: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('base64url encoding is shorter than hex', () => {
      const hex = Bun.randomUUIDv7("hex");
      const b64 = Bun.randomUUIDv7("base64url");
      expect({
        hexLength: hex.length,
        base64urlLength: b64.length,
        hexLonger: hex.length > b64.length,
      }).toMatchSnapshot();
    });

    it('buffer encoding returns Buffer', () => {
      const buf = Bun.randomUUIDv7("buffer");
      expect({
        type: buf.constructor.name,
        byteLength: buf.byteLength,
      }).toMatchSnapshot();
    });

    it('timestamp parameter syncs with UUIDv7 time', () => {
      const ts = 1700000000000; // fixed timestamp
      const a = Bun.randomUUIDv7("hex", ts);
      const b = Bun.randomUUIDv7("hex", ts);
      // Same timestamp prefix (first 12 hex chars encode the 48-bit ms timestamp)
      expect(a.slice(0, 13)).toBe(b.slice(0, 13));
    });
  });

  // ========================================================================
  // YAML PARSING
  // ========================================================================

  describe('Bun YAML', () => {
    it('parses cookie config', () => {
      const yaml = `
cookie:
  name: ab_variant
  domain: localhost
  secure: false
  httpOnly: true
  sameSite: lax
  maxAgeDays: 30
ab:
  defaultVariants:
    - A
    - B
  trafficSplit: 50
`;
      expect(YAML.parse(yaml)).toMatchSnapshot();
    });

    it('handles empty document', () => {
      expect(YAML.parse('')).toMatchSnapshot();
    });

    it('handles scalar values', () => {
      expect(YAML.parse('42')).toMatchSnapshot();
    });
  });

  // ========================================================================
  // ANOMALY DETECTOR
  // ========================================================================

  describe('AnomalyDetector', () => {
    it('statistics shape', () => {
      const detector = AnomalyDetector.getInstance();
      const stats = detector.getStatistics();
      expect({
        keys: Object.keys(stats).sort(),
        totalAnomaliesType: typeof stats.totalAnomalies,
        rulesActiveType: typeof stats.rulesActive,
      }).toMatchSnapshot();
    });

    it('default rules are loaded', () => {
      const detector = AnomalyDetector.getInstance();
      const stats = detector.getStatistics();
      // Should have default security + performance + ops rules
      expect(stats.rulesActive).toBeGreaterThanOrEqual(6);
    });

    it('anomaly list shape after submit', async () => {
      const detector = AnomalyDetector.getInstance();

      // Submit a metric that should trigger detection
      await detector.submitMetrics({
        timestamp: Date.now(),
        source: 'snapshot-test',
        metrics: { cpu: 50, memory: 60 },
      });

      const anomalies = detector.getAnomalies();
      if (anomalies.length > 0) {
        const sample = anomalies[0];
        expect({
          hasId: typeof sample.id === 'string',
          idPrefix: sample.id.split('-')[0],
          hasType: typeof sample.type === 'string',
          hasSeverity: typeof sample.severity === 'string',
          hasTimestamp: typeof sample.timestamp === 'number',
          hasConfidence: typeof sample.confidence === 'number',
          hasRecommendations: Array.isArray(sample.recommendations),
        }).toMatchSnapshot();
      }
    });
  });

  // ========================================================================
  // Bun.deepEquals
  // ========================================================================

  describe('Bun.deepEquals', () => {
    it('strict vs loose comparison', () => {
      const a = { count: 1, label: 'test' };
      const b = { count: 1, label: 'test' };
      const c = { count: '1', label: 'test' };

      expect({
        sameObject_strict: Bun.deepEquals(a, b, true),
        sameObject_loose: Bun.deepEquals(a, b, false),
        coerced_strict: Bun.deepEquals(a, c, true),
        coerced_loose: Bun.deepEquals(a, c, false),
      }).toMatchSnapshot();
    });

    it('nested objects', () => {
      const a = { config: { cookie: { name: 'ab', secure: true }, ab: [1, 2] } };
      const b = { config: { cookie: { name: 'ab', secure: true }, ab: [1, 2] } };
      const c = { config: { cookie: { name: 'ab', secure: false }, ab: [1, 2] } };

      expect({
        identical: Bun.deepEquals(a, b, true),
        different: Bun.deepEquals(a, c, true),
      }).toMatchSnapshot();
    });
  });

  // ========================================================================
  // bun:jsc heapStats
  // ========================================================================

  describe('heapStats', () => {
    it('shape has expected keys', () => {
      const stats = heapStats();
      expect({
        hasHeapSize: typeof stats.heapSize === 'number',
        hasHeapCapacity: typeof stats.heapCapacity === 'number',
        hasExtraMemorySize: typeof stats.extraMemorySize === 'number',
        hasObjectCount: typeof stats.objectCount === 'number',
        hasProtectedObjectCount: typeof stats.protectedObjectCount === 'number',
        hasGlobalObjectCount: typeof stats.globalObjectCount === 'number',
        hasObjectTypeCounts: typeof stats.objectTypeCounts === 'object',
        heapSizePositive: stats.heapSize > 0,
        objectCountPositive: stats.objectCount > 0,
      }).toMatchSnapshot();
    });

    it('objectTypeCounts contains known JSC types', () => {
      const stats = heapStats();
      const types = Object.keys(stats.objectTypeCounts);
      // JSC always has some base types allocated
      expect(types.length).toBeGreaterThan(0);
      // Check for stable well-known JSC types rather than snapshotting
      // a non-deterministic slice
      const has = (t: string) => t in stats.objectTypeCounts;
      expect({
        hasTypes: types.length > 0,
        hasString: has('string'),
        hasFunction: has('Function'),
      }).toMatchSnapshot();
    });
  });

  // ========================================================================
  // Bun.inspect.custom
  // ========================================================================

  describe('Bun.inspect.custom', () => {
    it('SecureVariantManager redacts secretKey', async () => {
      const { SecureVariantManager } = await import(
        '../../examples/cookie-crc32/cookie-crc32-integrator'
      );
      const manager = new SecureVariantManager({
        secretKey: 'super-secret-key-for-testing-purposes',
      });
      const inspected = Bun.inspect(manager);
      expect(inspected).toContain('cookie:');
      expect(inspected).toContain('maxAge:');
      expect(inspected).not.toContain('super-secret-key-for-testing-purposes');
    });
  });
});
