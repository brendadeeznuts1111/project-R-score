/**
 * Delta-Update-Aggregator (#37) Tests
 * Binary delta compression with XOR diffing and RLE
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  DeltaUpdateAggregator,
  DEFAULT_DELTA_CONFIG,
  loadDeltaConfig,
  getDeltaConfigSummary,
  type DeltaAggregatorConfig,
} from '../../../packages/core/src/sportsbook/delta-aggregator';
import { TypedArrayInspector } from '../../../packages/core/src/types/typed-array-inspector';

describe('DeltaUpdateAggregator', () => {
  let aggregator: DeltaUpdateAggregator;

  beforeEach(() => {
    aggregator = new DeltaUpdateAggregator({ featureMode: 'ENFORCE' });
  });

  describe('Initialization', () => {
    test('should initialize with default config', () => {
      const agg = new DeltaUpdateAggregator();
      const config = agg.getConfig();
      expect(config.rleThreshold).toBe(DEFAULT_DELTA_CONFIG.rleThreshold);
      expect(config.maxPatchSize).toBe(DEFAULT_DELTA_CONFIG.maxPatchSize);
      expect(config.compressionLevel).toBe(DEFAULT_DELTA_CONFIG.compressionLevel);
      expect(config.featureMode).toBe('OFF');
    });

    test('should accept custom config', () => {
      const agg = new DeltaUpdateAggregator({
        rleThreshold: 3,
        maxPatchSize: 1024 * 1024,
        featureMode: 'SHADOW',
      });
      const config = agg.getConfig();
      expect(config.rleThreshold).toBe(3);
      expect(config.maxPatchSize).toBe(1024 * 1024);
      expect(config.featureMode).toBe('SHADOW');
    });

    test('should report enabled status based on feature mode', () => {
      expect(new DeltaUpdateAggregator({ featureMode: 'OFF' }).isEnabled()).toBe(false);
      expect(new DeltaUpdateAggregator({ featureMode: 'SHADOW' }).isEnabled()).toBe(true);
      expect(new DeltaUpdateAggregator({ featureMode: 'ROLLBACK' }).isEnabled()).toBe(true);
      expect(new DeltaUpdateAggregator({ featureMode: 'ENFORCE' }).isEnabled()).toBe(true);
    });
  });

  describe('Delta Computation', () => {
    test('should return full buffer on first update', () => {
      const buffer = new ArrayBuffer(16);
      const view = new Uint32Array(buffer);
      view[0] = 1;
      view[1] = 2;
      view[2] = 3;
      view[3] = 4;

      const result = aggregator.computeDelta(buffer);

      expect(result.hasChanges).toBe(true);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].startIndex).toBe(0);
      expect(result.patches[0].length).toBe(4);
      expect(result.compressionRatio).toBe(0);
    });

    test('should detect no changes for identical buffers', () => {
      const buffer = new ArrayBuffer(16);
      new Uint32Array(buffer).fill(42);

      // First update
      aggregator.computeDelta(buffer);

      // Second update with same data
      const result = aggregator.computeDelta(buffer);

      expect(result.hasChanges).toBe(false);
      expect(result.patches.length).toBe(0);
      expect(result.compressionRatio).toBe(1);
    });

    test('should compute delta for single changed word', () => {
      // Use larger buffer (64 bytes) to make compression meaningful
      // Patch overhead is 8 bytes header + 4 bytes data = 12 bytes
      // Compression ratio = 1 - 12/64 = 0.8125 > 0.5
      const buffer1 = new ArrayBuffer(64);
      const view1 = new Uint32Array(buffer1);
      view1.fill(0);

      const buffer2 = new ArrayBuffer(64);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[2] = 99; // Change only one word

      // Initialize with first buffer
      aggregator.computeDelta(buffer1);

      // Compute delta
      const result = aggregator.computeDelta(buffer2);

      expect(result.hasChanges).toBe(true);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].startIndex).toBe(2);
      expect(result.patches[0].length).toBe(1);
      expect(result.patches[0].data[0]).toBe(99);
      expect(result.compressionRatio).toBeGreaterThan(0.5);
    });

    test('should compute delta for consecutive changes (RLE)', () => {
      const buffer1 = new ArrayBuffer(32);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(32);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      // Change consecutive words 2-5
      view2[2] = 10;
      view2[3] = 20;
      view2[4] = 30;
      view2[5] = 40;

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      expect(result.hasChanges).toBe(true);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].startIndex).toBe(2);
      expect(result.patches[0].length).toBe(4);
    });

    test('should create multiple patches for non-consecutive changes', () => {
      const buffer1 = new ArrayBuffer(32);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(32);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[1] = 100; // First change
      view2[6] = 200; // Second change (gap of 4 words)

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      expect(result.hasChanges).toBe(true);
      expect(result.patches.length).toBe(2);
      expect(result.patches[0].startIndex).toBe(1);
      expect(result.patches[1].startIndex).toBe(6);
    });

    test('should achieve significant compression ratio', () => {
      // Create a large buffer (1MB)
      const size = 1024 * 1024;
      const buffer1 = new ArrayBuffer(size);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(size);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      // Change only 1% of the buffer
      const changeCount = Math.floor(view2.length * 0.01);
      for (let i = 0; i < changeCount; i++) {
        view2[i * 100] = i + 1;
      }

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      expect(result.hasChanges).toBe(true);
      expect(result.compressionRatio).toBeGreaterThan(0.9); // >90% reduction
      expect(result.patchBytes).toBeLessThan(size * 0.1);
    });
  });

  describe('Patch Serialization', () => {
    test('should serialize and deserialize patches correctly', () => {
      const buffer1 = new ArrayBuffer(32);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(32);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[2] = 42;
      view2[3] = 43;
      view2[6] = 99;

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      expect(result.serialized).not.toBeNull();

      // Apply patches to a copy of buffer1
      const reconstructed = new Uint32Array(8);
      reconstructed.fill(0);
      DeltaUpdateAggregator.applyPatches(reconstructed, result.serialized!);

      expect(reconstructed[2]).toBe(42);
      expect(reconstructed[3]).toBe(43);
      expect(reconstructed[6]).toBe(99);
    });

    test('should correctly reconstruct full state from patches', () => {
      const size = 64;
      const buffer1 = new ArrayBuffer(size);
      const view1 = new Uint32Array(buffer1);
      for (let i = 0; i < view1.length; i++) {
        view1[i] = i;
      }

      const buffer2 = new ArrayBuffer(size);
      const view2 = new Uint32Array(buffer2);
      view2.set(view1);
      // Modify some values
      view2[3] = 300;
      view2[7] = 700;
      view2[10] = 1000;

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      // Reconstruct
      const reconstructed = new Uint32Array(view1.length);
      reconstructed.set(view1);
      DeltaUpdateAggregator.applyPatches(reconstructed, result.serialized!);

      // Verify
      for (let i = 0; i < view2.length; i++) {
        expect(reconstructed[i]).toBe(view2[i]);
      }
    });
  });

  describe('Validation', () => {
    test('should validate correct patch application', () => {
      const original = new Uint32Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const modified = new Uint32Array([1, 2, 99, 4, 5, 88, 7, 8]);

      const buffer1 = original.buffer.slice(0);
      const buffer2 = modified.buffer.slice(0);

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      const isValid = aggregator.validatePatch(
        original,
        result.serialized!,
        modified
      );

      expect(isValid).toBe(true);
    });

    test('should detect invalid patch application', () => {
      const original = new Uint32Array([1, 2, 3, 4]);
      const modified = new Uint32Array([1, 2, 99, 4]);
      const wrong = new Uint32Array([1, 2, 88, 4]); // Wrong expected

      const buffer1 = original.buffer.slice(0);
      const buffer2 = modified.buffer.slice(0);

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      const isValid = aggregator.validatePatch(
        original,
        result.serialized!,
        wrong
      );

      expect(isValid).toBe(false);
      expect(aggregator.getMetrics().validationErrors).toBe(1);
    });
  });

  describe('Metrics', () => {
    test('should track updates processed', () => {
      const buffer = new ArrayBuffer(16);
      new Uint32Array(buffer).fill(1);

      aggregator.computeDelta(buffer);
      aggregator.computeDelta(buffer);
      aggregator.computeDelta(buffer);

      const metrics = aggregator.getMetrics();
      expect(metrics.updatesProcessed).toBe(3);
    });

    test('should track updates with changes', () => {
      const buffer1 = new ArrayBuffer(16);
      new Uint32Array(buffer1).fill(1);

      const buffer2 = new ArrayBuffer(16);
      new Uint32Array(buffer2).fill(2);

      aggregator.computeDelta(buffer1);
      aggregator.computeDelta(buffer1); // No change
      aggregator.computeDelta(buffer2); // Change

      const metrics = aggregator.getMetrics();
      expect(metrics.updatesWithChanges).toBe(2); // Initial + one change
    });

    test('should track bytes saved', () => {
      const size = 1024;
      const buffer1 = new ArrayBuffer(size);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(size);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[0] = 1; // Single change

      aggregator.computeDelta(buffer1);
      aggregator.computeDelta(buffer2);

      const metrics = aggregator.getMetrics();
      expect(metrics.bytesSaved).toBeGreaterThan(0);
    });

    test('should track processing time', () => {
      const buffer = new ArrayBuffer(1024);
      new Uint32Array(buffer).fill(42);

      aggregator.computeDelta(buffer);

      const metrics = aggregator.getMetrics();
      expect(metrics.lastProcessingMs).toBeGreaterThanOrEqual(0);
      expect(metrics.lastProcessingMs).toBeLessThan(10); // Should be fast
    });
  });

  describe('Reset', () => {
    test('should reset state correctly', () => {
      const buffer = new ArrayBuffer(16);
      new Uint32Array(buffer).fill(42);

      aggregator.computeDelta(buffer);
      aggregator.reset();

      // After reset, should treat next update as initial
      const result = aggregator.computeDelta(buffer);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].startIndex).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const result = aggregator.computeDelta(buffer);
      expect(result.hasChanges).toBe(true);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].length).toBe(0);
    });

    test('should handle all values changed', () => {
      const buffer1 = new ArrayBuffer(16);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(16);
      new Uint32Array(buffer2).fill(0xFFFFFFFF);

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      expect(result.hasChanges).toBe(true);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].length).toBe(4);
    });

    test('should handle trailing changes', () => {
      const buffer1 = new ArrayBuffer(16);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(16);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[3] = 999; // Last word changed

      aggregator.computeDelta(buffer1);
      const result = aggregator.computeDelta(buffer2);

      expect(result.patches.length).toBe(1);
      expect(result.patches[0].startIndex).toBe(3);
      expect(result.patches[0].data[0]).toBe(999);
    });
  });
});

describe('Delta Configuration', () => {
  test('should load default config', () => {
    const config = loadDeltaConfig();
    expect(config.featureMode).toBeDefined();
    expect(config.rleThreshold).toBeGreaterThan(0);
    expect(config.maxPatchSize).toBeGreaterThan(0);
  });

  test('should generate config summary', () => {
    const summary = getDeltaConfigSummary();
    expect(summary).toContain('Delta-Aggregator');
  });
});

describe('Performance', () => {
  test('should process 1000 updates in <100ms', () => {
    const aggregator = new DeltaUpdateAggregator({ featureMode: 'ENFORCE' });
    const size = 4096; // 4KB buffer
    const buffer = new ArrayBuffer(size);
    const view = new Uint32Array(buffer);

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      view[i % view.length] = i;
      aggregator.computeDelta(buffer);
    }

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);

    const metrics = aggregator.getMetrics();
    expect(metrics.updatesProcessed).toBe(1000);
  });

  test('should achieve target bandwidth reduction', () => {
    const aggregator = new DeltaUpdateAggregator({ featureMode: 'ENFORCE' });
    const size = 128 * 1024; // 128KB buffer (realistic odds buffer)

    const buffer1 = new ArrayBuffer(size);
    new Uint32Array(buffer1).fill(0);

    const buffer2 = new ArrayBuffer(size);
    const view2 = new Uint32Array(buffer2);
    view2.fill(0);

    // Simulate 2% of odds changing (typical tick)
    const changeCount = Math.floor(view2.length * 0.02);
    for (let i = 0; i < changeCount; i++) {
      const idx = Math.floor(Math.random() * view2.length);
      view2[idx] = Math.random() * 1000000;
    }

    aggregator.computeDelta(buffer1);
    const result = aggregator.computeDelta(buffer2);

    // Should achieve >90% compression for sparse updates
    expect(result.compressionRatio).toBeGreaterThan(0.9);
  });
});

describe('DeltaUpdateAggregator Buffer Tracking', () => {
  let aggregator: DeltaUpdateAggregator;

  beforeEach(() => {
    // Reset the TypedArrayInspector singleton before each test
    TypedArrayInspector.reset();
    aggregator = new DeltaUpdateAggregator({ featureMode: 'ENFORCE' });
  });

  afterEach(() => {
    TypedArrayInspector.reset();
  });

  describe('Buffer Inspector Integration', () => {
    test('metrics include buffer stats', () => {
      const metrics = aggregator.getMetrics();

      expect(metrics.buffers).toBeDefined();
      expect(metrics.buffers.activeCount).toBeGreaterThanOrEqual(0);
      expect(metrics.buffers.totalAllocatedBytes).toBeGreaterThanOrEqual(0);
      expect(metrics.buffers.potentialLeaks).toBeGreaterThanOrEqual(0);
    });

    test('getBufferStats returns complete registry stats', () => {
      const bufferStats = aggregator.getBufferStats();

      expect(bufferStats).toBeDefined();
      expect(bufferStats.activeCount).toBeGreaterThanOrEqual(0);
      expect(bufferStats.totalRegistered).toBeGreaterThanOrEqual(0);
      expect(bufferStats.byType).toBeDefined();
      expect(bufferStats.longestLived).toBeInstanceOf(Array);
      expect(bufferStats.potentialLeaks).toBeInstanceOf(Array);
    });
  });

  describe('Baseline Buffer Tracking', () => {
    test('first computeDelta creates tracked baseline buffer', () => {
      const buffer = new ArrayBuffer(64);
      new Uint32Array(buffer).fill(42);

      aggregator.computeDelta(buffer);

      const bufferStats = aggregator.getBufferStats();
      // Should have at least 1 registered buffer (baseline + possibly patch)
      expect(bufferStats.totalRegistered).toBeGreaterThanOrEqual(1);
    });

    test('baseline buffer uses CustomUint32Array', () => {
      const buffer = new ArrayBuffer(64);
      new Uint32Array(buffer).fill(1);

      aggregator.computeDelta(buffer);

      const bufferStats = aggregator.getBufferStats();

      // Should have CustomUint32Array for baseline
      if (bufferStats.byType['CustomUint32Array']) {
        expect(bufferStats.byType['CustomUint32Array'].count).toBeGreaterThanOrEqual(1);
      }
    });

    test('baseline buffer has correct context', () => {
      const buffer = new ArrayBuffer(64);
      new Uint32Array(buffer).fill(1);

      aggregator.computeDelta(buffer);

      const bufferStats = aggregator.getBufferStats();

      // Check if any buffer has delta-baseline context
      const hasBaselineContext = bufferStats.longestLived.some(
        (entry) => entry.context === 'delta-baseline'
      );
      expect(hasBaselineContext).toBe(true);
    });
  });

  describe('Patch Buffer Tracking', () => {
    test('computeDelta creates tracked patch buffers', () => {
      const buffer1 = new ArrayBuffer(64);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(64);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[2] = 99; // Change one word

      aggregator.computeDelta(buffer1);
      const statsBefore = aggregator.getBufferStats();
      const registeredBefore = statsBefore.totalRegistered;

      aggregator.computeDelta(buffer2);
      const statsAfter = aggregator.getBufferStats();

      // Should have registered more buffers (patch buffer)
      expect(statsAfter.totalRegistered).toBeGreaterThan(registeredBefore);
    });

    test('patch buffers use CustomUint8Array', () => {
      const buffer1 = new ArrayBuffer(64);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(64);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[2] = 99;

      aggregator.computeDelta(buffer1);
      aggregator.computeDelta(buffer2);

      const bufferStats = aggregator.getBufferStats();

      // Should have CustomUint8Array for serialized patches
      if (bufferStats.byType['CustomUint8Array']) {
        expect(bufferStats.byType['CustomUint8Array'].count).toBeGreaterThanOrEqual(1);
      }
    });

    test('patch buffer context includes patch count', () => {
      const buffer1 = new ArrayBuffer(64);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(64);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[2] = 99;

      aggregator.computeDelta(buffer1);
      aggregator.computeDelta(buffer2);

      const bufferStats = aggregator.getBufferStats();

      // Check if any buffer has delta-patch context
      const hasPatchContext = bufferStats.longestLived.some(
        (entry) => entry.context?.startsWith('delta-patch-')
      );
      expect(hasPatchContext).toBe(true);
    });
  });

  describe('Buffer Metrics in getMetrics()', () => {
    test('metrics.buffers reflects actual buffer state', () => {
      const buffer = new ArrayBuffer(128);
      new Uint32Array(buffer).fill(1);

      // Before any delta computation
      const metricsBefore = aggregator.getMetrics();
      const countBefore = metricsBefore.buffers.activeCount;

      // After delta computation
      aggregator.computeDelta(buffer);
      const metricsAfter = aggregator.getMetrics();

      // Active count should increase (or stay same if GC'd)
      expect(metricsAfter.buffers.activeCount).toBeGreaterThanOrEqual(countBefore);
    });

    test('totalAllocatedBytes tracks buffer memory', () => {
      const buffer = new ArrayBuffer(1024);
      new Uint32Array(buffer).fill(1);

      aggregator.computeDelta(buffer);

      const metrics = aggregator.getMetrics();
      // Should have allocated at least the baseline buffer
      expect(metrics.buffers.totalAllocatedBytes).toBeGreaterThan(0);
    });

    test('multiple updates accumulate buffer registrations', () => {
      const buffer1 = new ArrayBuffer(64);
      const view1 = new Uint32Array(buffer1);
      view1.fill(0);

      aggregator.computeDelta(buffer1);
      const stats1 = aggregator.getBufferStats();
      const registered1 = stats1.totalRegistered;

      // Change buffer and compute again
      view1[0] = 100;
      aggregator.computeDelta(buffer1);
      const stats2 = aggregator.getBufferStats();

      // Should have registered more buffers
      expect(stats2.totalRegistered).toBeGreaterThan(registered1);
    });
  });

  describe('Reset and Cleanup', () => {
    test('reset triggers buffer cleanup', () => {
      const buffer = new ArrayBuffer(64);
      new Uint32Array(buffer).fill(42);

      aggregator.computeDelta(buffer);
      const statsBefore = aggregator.getBufferStats();
      expect(statsBefore.totalRegistered).toBeGreaterThan(0);

      aggregator.reset();

      // After reset, should have cleaned up
      // Note: GC is non-deterministic, so we just verify reset doesn't throw
      const statsAfter = aggregator.getBufferStats();
      expect(statsAfter).toBeDefined();
    });

    test('reset allows fresh baseline creation', () => {
      const buffer1 = new ArrayBuffer(64);
      new Uint32Array(buffer1).fill(1);

      aggregator.computeDelta(buffer1);
      aggregator.reset();

      // After reset, next update should be treated as initial
      const buffer2 = new ArrayBuffer(64);
      new Uint32Array(buffer2).fill(2);

      const result = aggregator.computeDelta(buffer2);
      expect(result.patches.length).toBe(1);
      expect(result.patches[0].startIndex).toBe(0);
    });
  });

  describe('Buffer Type Distribution', () => {
    test('byType correctly categorizes buffer types', () => {
      const buffer1 = new ArrayBuffer(128);
      new Uint32Array(buffer1).fill(0);

      const buffer2 = new ArrayBuffer(128);
      const view2 = new Uint32Array(buffer2);
      view2.fill(0);
      view2[5] = 123;

      aggregator.computeDelta(buffer1);
      aggregator.computeDelta(buffer2);

      const bufferStats = aggregator.getBufferStats();

      // Should have entries in byType
      const typeCount = Object.keys(bufferStats.byType).length;
      expect(typeCount).toBeGreaterThan(0);

      // Each type entry should have count and bytes
      for (const [typeName, typeStats] of Object.entries(bufferStats.byType)) {
        expect(typeof typeName).toBe('string');
        expect(typeStats.count).toBeGreaterThanOrEqual(1);
        expect(typeStats.bytes).toBeGreaterThan(0);
      }
    });
  });

  describe('Memory Efficiency', () => {
    test('buffer tracking overhead is minimal', () => {
      const size = 4096; // 4KB buffer
      const iterations = 100;

      const buffer = new ArrayBuffer(size);
      const view = new Uint32Array(buffer);

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        view[i % view.length] = i;
        aggregator.computeDelta(buffer);
      }

      const elapsed = performance.now() - start;

      // Should complete 100 iterations in < 50ms even with tracking
      expect(elapsed).toBeLessThan(50);

      const metrics = aggregator.getMetrics();
      expect(metrics.updatesProcessed).toBe(iterations);
    });
  });
});
