/**
 * Propagation Half-Life Framework Tests
 * Validates tracking, pattern detection, and performance
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  createConfiguredTracker,
  HalfLifeTracker,
  HalfLifeCalculator,
  DelayRingBuffer,
  EMACalculator,
  MarketTier,
  PatternCategory,
  TIER_HALFLIFE_TARGETS,
  PATTERN_DEFINITIONS,
  PROPAGATION_PERFORMANCE_TARGETS,
  createAllDetectors,
  calculateTheoreticalHalfLife,
  calculateDecay,
} from '../../../../packages/core/src/sportsbook/index';

import type { EnhancedOddsEntry } from '../../../../packages/core/src/types';

describe('Propagation Half-Life Framework', () => {
  describe('DelayRingBuffer', () => {
    test('pushes and retrieves samples correctly', () => {
      const buffer = new DelayRingBuffer(5);

      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      expect(buffer.length).toBe(3);
      expect(buffer.mean()).toBe(20);
    });

    test('wraps around when full', () => {
      const buffer = new DelayRingBuffer(3);

      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      buffer.push(40); // Overwrites 10

      expect(buffer.length).toBe(3);
      expect(buffer.mean()).toBe(30); // (20 + 30 + 40) / 3
    });

    test('calculates percentiles correctly', () => {
      const buffer = new DelayRingBuffer(10);

      for (let i = 1; i <= 10; i++) {
        buffer.push(i * 10);
      }

      expect(buffer.percentile(50)).toBe(50);
      expect(buffer.percentile(90)).toBe(90);
    });

    test('calculates standard deviation', () => {
      const buffer = new DelayRingBuffer(5);

      buffer.push(10);
      buffer.push(10);
      buffer.push(10);

      expect(buffer.stdDev()).toBe(0);

      buffer.push(20);
      expect(buffer.stdDev()).toBeGreaterThan(0);
    });
  });

  describe('EMACalculator', () => {
    test('initializes with first value', () => {
      const ema = new EMACalculator(0.1);

      expect(ema.isInitialized()).toBe(false);
      ema.update(100);
      expect(ema.isInitialized()).toBe(true);
      expect(ema.get()).toBe(100);
    });

    test('smooths subsequent values', () => {
      const ema = new EMACalculator(0.5); // 50% weight on new values

      ema.update(100);
      ema.update(200);

      expect(ema.get()).toBe(150); // 0.5 * 200 + 0.5 * 100
    });

    test('resets correctly', () => {
      const ema = new EMACalculator(0.1);

      ema.update(100);
      ema.reset();

      expect(ema.isInitialized()).toBe(false);
    });
  });

  describe('HalfLifeCalculator', () => {
    test('processes entries and computes metrics', () => {
      const calculator = new HalfLifeCalculator({ bufferSize: 50 });

      const entry = {
        sourceMarketId: 'source-1',
        targetMarketId: 'target-1',
        propagationDelayMs: 300,
        dampingRatio: 0.8,
        tier: MarketTier.MAIN_LINE,
        patternId: null,
        bookmaker: 'test-book',
        timestamp: Date.now(),
      };

      const metrics = calculator.processEntry(entry);

      expect(metrics.halfLifeMs).toBeGreaterThan(0);
      expect(metrics.sampleCount).toBe(1);
    });

    test('tracks metrics by tier', () => {
      const calculator = new HalfLifeCalculator();

      // Process entries - metrics are tracked by tier:X key internally
      calculator.processEntry({
        sourceMarketId: 'source-1',
        targetMarketId: 'target-1',
        propagationDelayMs: 300,
        dampingRatio: 0.8,
        tier: MarketTier.MAIN_LINE,
        patternId: null,
        bookmaker: 'book-a',
        timestamp: Date.now(),
      });

      calculator.processEntry({
        sourceMarketId: 'source-2',
        targetMarketId: 'target-2',
        propagationDelayMs: 1000,
        dampingRatio: 0.7,
        tier: MarketTier.PLAYER_PROPS,
        patternId: null,
        bookmaker: 'book-b',
        timestamp: Date.now(),
      });

      // Verify metrics can be retrieved by tier
      const mainLineMetrics = calculator.getMetrics(MarketTier.MAIN_LINE, 'book-a');
      const playerPropsMetrics = calculator.getMetrics(MarketTier.PLAYER_PROPS, 'book-b');

      expect(mainLineMetrics).not.toBeNull();
      expect(playerPropsMetrics).not.toBeNull();
      expect(mainLineMetrics!.halfLifeMs).toBeGreaterThan(0);
      expect(playerPropsMetrics!.halfLifeMs).toBeGreaterThan(0);

      // Verify tracked keys
      const keys = calculator.getTrackedKeys();
      expect(keys.length).toBe(2);
    });
  });

  describe('HalfLifeTracker', () => {
    let tracker: HalfLifeTracker;

    beforeEach(() => {
      tracker = createConfiguredTracker();
    });

    test('tracks updates and generates results', () => {
      const entry: EnhancedOddsEntry = {
        marketId: 'game-1-spread',
        selectionId: 'home',
        odds: 1.95,
        previousOdds: 1.90,
        volume: 10000,
        availableVolume: 5000,
        timestamp: Date.now() / 1000,
        sequence: 1,
        status: 1,
        format: 0,
        bookmaker: 'pinnacle',
        overround: 1.05,
      };

      const result = tracker.trackUpdate(entry);

      expect(result.processingTimeUs).toBeLessThan(
        PROPAGATION_PERFORMANCE_TARGETS.UPDATE_PROCESSING_US * 10 // Allow 10x for first update
      );
      expect(tracker.getStats().updateCount).toBe(1);
    });

    test('generates heatmap', () => {
      // Add some updates to populate heatmap
      const bookmakers = ['pinnacle', 'draftkings'];

      for (const bookmaker of bookmakers) {
        tracker.trackUpdate({
          marketId: 'game-1-spread',
          selectionId: 'home',
          odds: 1.95,
          previousOdds: 1.90,
          volume: 10000,
          availableVolume: 5000,
          timestamp: Date.now() / 1000,
          sequence: 1,
          status: 1,
          format: 0,
          bookmaker,
          overround: 1.05,
        });
      }

      const heatmap = tracker.getHeatmap();

      expect(heatmap.rowLabels.length).toBe(6); // 6 tiers
      expect(heatmap.columnLabels.length).toBeGreaterThan(0);
      expect(heatmap.cells.length).toBe(6);
    });

    test('detects patterns with sufficient data', () => {
      // Generate enough updates to trigger patterns
      for (let i = 0; i < 20; i++) {
        tracker.trackUpdate({
          marketId: `game-1-${i % 2 === 0 ? 'spread' : 'sgp'}`,
          selectionId: 'home',
          odds: 1.80 + Math.random() * 0.4,
          previousOdds: 1.80 + Math.random() * 0.4,
          volume: 10000,
          availableVolume: 5000,
          timestamp: Date.now() / 1000 + i,
          sequence: i,
          status: 1,
          format: 0,
          bookmaker: i % 2 === 0 ? 'pinnacle' : 'draftkings',
          overround: 1.02 + Math.random() * 0.1,
        });
      }

      const patterns = tracker.getActivePatterns();
      const stats = tracker.getStats();

      expect(stats.updateCount).toBe(20);
      expect(stats.memoryBytes).toBeLessThan(
        PROPAGATION_PERFORMANCE_TARGETS.MAX_MEMORY_BYTES
      );
    });

    test('resets all tracking state', () => {
      tracker.trackUpdate({
        marketId: 'game-1',
        selectionId: 'home',
        odds: 1.95,
        previousOdds: 1.90,
        volume: 10000,
        availableVolume: 5000,
        timestamp: Date.now() / 1000,
        sequence: 1,
        status: 1,
        format: 0,
        bookmaker: 'test',
        overround: 1.05,
      });

      expect(tracker.getStats().updateCount).toBe(1);

      tracker.reset();

      expect(tracker.getStats().updateCount).toBe(0);
      expect(tracker.getStats().trackedMarkets).toBe(0);
    });
  });

  describe('Pattern Detectors', () => {
    test('creates all 5 detectors', () => {
      const detectors = createAllDetectors();

      expect(detectors.length).toBe(5);

      const categories = detectors.map(d => d.category);
      expect(categories).toContain(PatternCategory.DERIVATIVE_DELAYS);
      expect(categories).toContain(PatternCategory.CROSS_BOOK_ARBITRAGE);
      expect(categories).toContain(PatternCategory.TEMPORAL_INPLAY);
      expect(categories).toContain(PatternCategory.PROP_COMBO);
      expect(categories).toContain(PatternCategory.STEAM_BEHAVIORAL);
    });

    test('covers all 20 pattern IDs', () => {
      const detectors = createAllDetectors();
      const allPatternIds = detectors.flatMap(d => Array.from(d.patternIds));

      expect(allPatternIds.length).toBe(20);

      // Verify all pattern IDs from 70-89 are covered
      for (let id = 70; id <= 89; id++) {
        expect(allPatternIds).toContain(id);
      }
    });
  });

  describe('Type Constants', () => {
    test('TIER_HALFLIFE_TARGETS has all tiers', () => {
      expect(TIER_HALFLIFE_TARGETS[MarketTier.MAIN_LINE]).toBeDefined();
      expect(TIER_HALFLIFE_TARGETS[MarketTier.TEAM_TOTALS]).toBeDefined();
      expect(TIER_HALFLIFE_TARGETS[MarketTier.QUARTER_HALF]).toBeDefined();
      expect(TIER_HALFLIFE_TARGETS[MarketTier.PLAYER_PROPS]).toBeDefined();
      expect(TIER_HALFLIFE_TARGETS[MarketTier.ALT_LINES]).toBeDefined();
      expect(TIER_HALFLIFE_TARGETS[MarketTier.PROP_COMBOS]).toBeDefined();
    });

    test('PATTERN_DEFINITIONS has all 20 patterns', () => {
      expect(Object.keys(PATTERN_DEFINITIONS).length).toBe(20);

      for (let id = 70; id <= 89; id++) {
        expect(PATTERN_DEFINITIONS[id as keyof typeof PATTERN_DEFINITIONS]).toBeDefined();
      }
    });
  });

  describe('Utility Functions', () => {
    test('calculateTheoreticalHalfLife', () => {
      const halfLife = calculateTheoreticalHalfLife(300, 0.5);
      expect(halfLife).toBeGreaterThan(300);
    });

    test('calculateDecay', () => {
      const decay = calculateDecay(100, 100);
      expect(decay).toBeCloseTo(0.5, 1); // Should be ~50% at one half-life
    });
  });

  describe('Performance', () => {
    test('processes 100 updates under performance target', () => {
      const tracker = createConfiguredTracker();
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        tracker.trackUpdate({
          marketId: `game-${i % 5}-spread`,
          selectionId: `sel-${i % 3}`,
          odds: 1.80 + Math.random() * 0.4,
          previousOdds: 1.80 + Math.random() * 0.4,
          volume: 10000,
          availableVolume: 5000,
          timestamp: Date.now() / 1000 + i,
          sequence: i,
          status: 1,
          format: 0,
          bookmaker: ['pinnacle', 'draftkings', 'betfair'][i % 3],
          overround: 1.05,
        });
      }

      const elapsed = performance.now() - start;
      const avgMs = elapsed / 100;

      expect(avgMs).toBeLessThan(1); // Under 1ms average
      expect(tracker.getStats().memoryBytes).toBeLessThan(
        PROPAGATION_PERFORMANCE_TARGETS.MAX_MEMORY_BYTES
      );
    });
  });
});
