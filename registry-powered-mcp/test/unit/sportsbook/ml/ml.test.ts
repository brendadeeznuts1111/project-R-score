/**
 * ML Intelligence Layer Tests
 * Validates model stubs, registry, and telemetry
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  MLModelRegistry,
  createMLRegistry,
  getSharedRegistry,
  resetSharedRegistry,
  MLProcessingTier,
  MLModelId,
  MLSignal,
  MLHealthStatus,
  ML_MODEL_DEFINITIONS,
  ML_TIER_CONFIG,
} from '../../../../packages/core/src/sportsbook/index';

import type { MLModelInput } from '../../../../packages/core/src/sportsbook/types';

describe('ML Intelligence Layer', () => {
  // Create test input
  const createTestInput = (): MLModelInput => ({
    currentBuffer: new Uint32Array([100, 200, 300]),
    previousBuffer: new Uint32Array([95, 198, 305]),
    timestampNs: BigInt(Date.now()) * 1_000_000n,
    marketId: 'test-market-1',
    bookmaker: 'test-book',
  });

  describe('MLModelRegistry', () => {
    let registry: MLModelRegistry;

    beforeEach(() => {
      registry = createMLRegistry();
    });

    test('initializes with all 10 models', () => {
      expect(registry.modelCount).toBe(10);
      expect(registry.getReadyCount()).toBe(10);
    });

    test('retrieves models by ID', () => {
      const model = registry.getModel(MLModelId.MM_COMPRESSION);
      expect(model).toBeDefined();
      expect(model!.id).toBe(MLModelId.MM_COMPRESSION);
      expect(model!.name).toBe('MM Compression');
      expect(model!.tier).toBe(MLProcessingTier.TIER_1_HF);
    });

    test('retrieves models by tier', () => {
      const tier1Models = registry.getModelsByTier(MLProcessingTier.TIER_1_HF);
      expect(tier1Models.length).toBe(3); // MM Compression, Velocity Convexity, Liquidity Mirage

      const tier2Models = registry.getModelsByTier(MLProcessingTier.TIER_2_QUANT);
      expect(tier2Models.length).toBe(2); // Provider Glitch, Asymmetric Prop

      const tier3Models = registry.getModelsByTier(MLProcessingTier.TIER_3_STATS);
      expect(tier3Models.length).toBe(4); // Prop Beta Skew, Source ID, Momentum, Emotional

      const tier4Models = registry.getModelsByTier(MLProcessingTier.TIER_4_SYNC);
      expect(tier4Models.length).toBe(1); // Regulatory Delay
    });

    test('evaluates model and returns output', () => {
      const input = createTestInput();
      const output = registry.evaluate(MLModelId.MM_COMPRESSION, input);

      expect(output).not.toBeNull();
      expect(output!.modelId).toBe(MLModelId.MM_COMPRESSION);
      expect(output!.confidence).toBeGreaterThanOrEqual(0);
      expect(output!.confidence).toBeLessThanOrEqual(1);
      expect(Object.values(MLSignal)).toContain(output!.signal);
      expect(output!.latencyUs).toBeGreaterThan(0);
      expect(output!.slaMetadata).toBeDefined();
    });

    test('evaluates entire tier', () => {
      const input = createTestInput();
      const outputs = registry.evaluateTier(MLProcessingTier.TIER_1_HF, input);

      expect(outputs.length).toBe(3);
      for (const output of outputs) {
        expect(ML_MODEL_DEFINITIONS[output.modelId].tier).toBe(MLProcessingTier.TIER_1_HF);
      }
    });

    test('returns null when disabled', () => {
      const disabledRegistry = createMLRegistry({ enabled: false });
      const input = createTestInput();

      expect(disabledRegistry.evaluate(MLModelId.MM_COMPRESSION, input)).toBeNull();
      expect(disabledRegistry.evaluateTier(MLProcessingTier.TIER_1_HF, input)).toEqual([]);
    });

    test('tracks SLA violations', () => {
      const input = createTestInput();

      // Run multiple evaluations
      for (let i = 0; i < 10; i++) {
        registry.evaluate(MLModelId.MM_COMPRESSION, input);
      }

      const snapshot = registry.getTelemetrySnapshot();
      expect(snapshot.models.has(MLModelId.MM_COMPRESSION)).toBe(true);

      const stats = snapshot.models.get(MLModelId.MM_COMPRESSION)!;
      expect(stats.evaluations).toBe(10);
    });

    test('generates telemetry snapshot', () => {
      const input = createTestInput();

      // Run evaluations across tiers
      registry.evaluateTier(MLProcessingTier.TIER_1_HF, input);
      registry.evaluateTier(MLProcessingTier.TIER_2_QUANT, input);

      const snapshot = registry.getTelemetrySnapshot();

      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(snapshot.models.size).toBe(10);
      expect(snapshot.tierStats.size).toBe(4);
      expect(Object.values(MLHealthStatus)).toContain(snapshot.health);
    });

    test('computes health status correctly', () => {
      const input = createTestInput();

      // Fresh registry should be healthy (no violations)
      const snapshot = registry.getTelemetrySnapshot();
      expect(snapshot.health).toBe(MLHealthStatus.HEALTHY);
    });

    test('resets all models', () => {
      const input = createTestInput();
      registry.evaluate(MLModelId.MM_COMPRESSION, input);

      let stats = registry.getModel(MLModelId.MM_COMPRESSION)!.getStats();
      expect(stats.evaluations).toBe(1);

      registry.resetAll();

      stats = registry.getModel(MLModelId.MM_COMPRESSION)!.getStats();
      expect(stats.evaluations).toBe(0);
    });
  });

  describe('Shared Registry', () => {
    beforeEach(() => {
      resetSharedRegistry();
    });

    test('returns same instance', () => {
      const r1 = getSharedRegistry();
      const r2 = getSharedRegistry();
      expect(r1).toBe(r2);
    });

    test('resets correctly', () => {
      const r1 = getSharedRegistry();
      const input = createTestInput();
      r1.evaluate(MLModelId.MM_COMPRESSION, input);

      resetSharedRegistry();

      const r2 = getSharedRegistry();
      expect(r2).not.toBe(r1);
      expect(r2.getModel(MLModelId.MM_COMPRESSION)!.getStats().evaluations).toBe(0);
    });
  });

  describe('Model Definitions', () => {
    test('all models have valid definitions', () => {
      for (const modelId of Object.values(MLModelId).filter(v => typeof v === 'number')) {
        const def = ML_MODEL_DEFINITIONS[modelId as MLModelId];
        expect(def).toBeDefined();
        expect(def.id).toBe(modelId);
        expect(def.name).toBeTruthy();
        expect(def.tier).toBeGreaterThanOrEqual(1);
        expect(def.tier).toBeLessThanOrEqual(4);
        expect(def.targetSlaMs).toBeGreaterThan(0);
        expect(def.bunApi).toBeTruthy();
      }
    });

    test('tier configs are valid', () => {
      for (const tier of [
        MLProcessingTier.TIER_1_HF,
        MLProcessingTier.TIER_2_QUANT,
        MLProcessingTier.TIER_3_STATS,
        MLProcessingTier.TIER_4_SYNC,
      ]) {
        const config = ML_TIER_CONFIG[tier];
        expect(config).toBeDefined();
        expect(config.name).toBeTruthy();
        expect(config.maxLatencyMs).toBeGreaterThan(0);
        expect(config.featureFlag).toBeTruthy();
      }
    });
  });

  describe('Performance', () => {
    test('model evaluation completes within tier SLA', () => {
      const registry = createMLRegistry();
      const input = createTestInput();

      // Test each tier
      for (const tier of [
        MLProcessingTier.TIER_1_HF,
        MLProcessingTier.TIER_2_QUANT,
        MLProcessingTier.TIER_3_STATS,
        MLProcessingTier.TIER_4_SYNC,
      ]) {
        const tierConfig = ML_TIER_CONFIG[tier];
        const outputs = registry.evaluateTier(tier, input);

        for (const output of outputs) {
          // Allow 10x slack for test environment variability
          const maxAllowedMs = tierConfig.maxLatencyMs * 10;
          expect(output.slaMetadata.actualMs).toBeLessThan(maxAllowedMs);
        }
      }
    });

    test('100 evaluations under 100ms total', () => {
      const registry = createMLRegistry();
      const input = createTestInput();
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        registry.evaluate(MLModelId.MM_COMPRESSION, input);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100); // 100 evals in 100ms = 1ms avg
    });
  });

  describe('Signal Distribution', () => {
    test('tracks signal counts correctly', () => {
      const registry = createMLRegistry();
      const input = createTestInput();

      // Run multiple evaluations
      for (let i = 0; i < 20; i++) {
        registry.evaluate(MLModelId.MM_COMPRESSION, input);
      }

      const snapshot = registry.getTelemetrySnapshot();
      const stats = snapshot.models.get(MLModelId.MM_COMPRESSION)!;

      // Sum of all signals should equal evaluations
      const totalSignals = Object.values(stats.signalDistribution).reduce((a, b) => a + b, 0);
      expect(totalSignals).toBe(20);
    });
  });
});
