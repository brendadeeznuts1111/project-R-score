/**
 * Propagation Half-Life Framework Benchmark Suite
 * Tests performance of market propagation tracking and pattern detection
 *
 * Performance Targets (from design spec):
 * - Update processing: <1ms per entry (~100μs hot path)
 * - Pattern detection: O(1) per detector (20 detectors)
 * - Memory overhead: <8MB (ring buffers + caches)
 * - EMA updates: O(1) constant time
 *
 * @module benchmarks/propagation
 */

import { bench, suite, benchMemory, PERFORMANCE_TARGETS, BENCHMARK_CATEGORIES } from '../index';

import {
  HalfLifeTracker,
  createConfiguredTracker,
  HalfLifeCalculator,
  DelayRingBuffer,
  EMACalculator,
  calculateTheoreticalHalfLife,
  calculateDecay,
  MarketTier,
  type PropagationEntry,
  type PropagationConfig,
} from '../../../../packages/core/src/sportsbook/propagation';

import { MarketStatus, OddsFormat, type EnhancedOddsEntry } from '../../../../packages/core/src/sportsbook/types';

/**
 * Create a mock odds entry for benchmarking
 */
function createMockOddsEntry(index: number, marketIdOverride?: string): EnhancedOddsEntry {
  const tiers = ['main', 'team_total', 'quarter', 'player_prop', 'alt', 'combo'];
  const bookmakers = ['pinnacle', 'betfair', 'draftkings', 'fanduel', 'betmgm'];
  const statuses = [MarketStatus.OPEN, MarketStatus.SUSPENDED, MarketStatus.CLOSED, MarketStatus.SETTLED];
  const formats = [OddsFormat.DECIMAL, OddsFormat.AMERICAN, OddsFormat.FRACTIONAL];

  return {
    marketId: marketIdOverride ?? `market_${tiers[index % 6]}_${index % 100}`,
    selectionId: `selection_${index % 10}`,
    bookmaker: bookmakers[index % 5],
    odds: 1.5 + (Math.random() * 2),
    previousOdds: 1.5 + (Math.random() * 2),
    volume: Math.floor(Math.random() * 100000),
    availableVolume: Math.floor(Math.random() * 50000),
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
    sequence: index,
    status: statuses[index % 4],
    format: formats[index % 3],
    overround: 1.02 + (Math.random() * 0.08),
  };
}

/**
 * Create a mock propagation entry
 */
function createMockPropagationEntry(index: number): PropagationEntry {
  const tiers = [
    MarketTier.MAIN_LINE,
    MarketTier.TEAM_TOTALS,
    MarketTier.QUARTER_HALF,
    MarketTier.PLAYER_PROPS,
    MarketTier.ALT_LINES,
    MarketTier.PROP_COMBOS,
  ];

  return {
    sourceMarketId: `source_${index}`,
    targetMarketId: `target_${index}`,
    propagationDelayMs: 100 + Math.random() * 500,
    dampingRatio: 0.8 + Math.random() * 0.2,
    tier: tiers[index % 6],
    patternId: null,
    bookmaker: 'pinnacle',
    timestamp: Date.now(),
  };
}

/**
 * Run propagation framework benchmarks
 */
export function propagationBenchmarks() {
  // ============================================================================
  // HalfLifeTracker Benchmarks
  // ============================================================================

  suite('Propagation Tracker', () => {
    const tracker = createConfiguredTracker();

    // Pre-populate with some market data
    for (let i = 0; i < 50; i++) {
      tracker.trackUpdate(createMockOddsEntry(i));
    }

    bench('trackUpdate() - single update', () => {
      const entry = createMockOddsEntry(Math.floor(Math.random() * 1000));
      tracker.trackUpdate(entry);
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10000,
    });

    bench('trackUpdate() - main line market', () => {
      const entry = createMockOddsEntry(0, 'main_moneyline_1'); // main tier
      tracker.trackUpdate(entry);
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10000,
    });

    bench('trackUpdate() - player prop market', () => {
      const entry = createMockOddsEntry(3, 'player_points_lebron'); // player props tier
      tracker.trackUpdate(entry);
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10000,
    });

    bench('trackUpdate() - prop combo market (slowest tier)', () => {
      const entry = createMockOddsEntry(5, 'combo_sgp_1'); // prop combos tier
      tracker.trackUpdate(entry);
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10000,
    });

    bench('getActivePatterns()', () => {
      tracker.getActivePatterns();
    }, {
      target: PERFORMANCE_TARGETS.PATTERN_DETECTION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });

    bench('getTierMetrics() - single tier', () => {
      tracker.getTierMetrics(MarketTier.MAIN_LINE);
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });

    bench('getAllTierMetrics()', () => {
      tracker.getAllTierMetrics();
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS * 6,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 20000,
    });

    bench('getHeatmap()', () => {
      tracker.getHeatmap();
    }, {
      target: PERFORMANCE_TARGETS.HEATMAP_GENERATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 1000,
    });

    bench('getStats()', () => {
      tracker.getStats();
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });

    bench('getRecentEntries(100)', () => {
      tracker.getRecentEntries(100);
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 20000,
    });

    bench('bulk updates (100 sequential)', () => {
      for (let i = 0; i < 100; i++) {
        tracker.trackUpdate(createMockOddsEntry(i));
      }
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS * 100,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 100,
    });

    bench('high-frequency burst (1000 updates)', () => {
      for (let i = 0; i < 1000; i++) {
        tracker.trackUpdate(createMockOddsEntry(i));
      }
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS * 1000,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10,
    });
  });

  // ============================================================================
  // HalfLifeCalculator Benchmarks
  // ============================================================================

  suite('Half-Life Calculator', () => {
    const calculator = new HalfLifeCalculator({
      bufferSize: 100,
      emaAlpha: 0.1,
      anomalyThreshold: 2.0,
    });

    // Pre-populate calculator
    for (let i = 0; i < 50; i++) {
      calculator.processEntry(createMockPropagationEntry(i));
    }

    bench('processEntry() - single entry', () => {
      const entry = createMockPropagationEntry(Math.floor(Math.random() * 1000));
      calculator.processEntry(entry);
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });

    bench('getMetrics() - single tier', () => {
      calculator.getMetrics(MarketTier.MAIN_LINE);
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 100000,
    });

    bench('getAllTierMetrics()', () => {
      calculator.getAllTierMetrics();
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS * 6,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });

    bench('getAllTierMetrics() - full state snapshot', () => {
      calculator.getAllTierMetrics();
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 20000,
    });
  });

  // ============================================================================
  // Ring Buffer Benchmarks
  // ============================================================================

  suite('Delay Ring Buffer', () => {
    const buffer = new DelayRingBuffer(1000);

    // Pre-fill buffer
    for (let i = 0; i < 500; i++) {
      buffer.push(100 + Math.random() * 500);
    }

    bench('push() - single insert', () => {
      buffer.push(100 + Math.random() * 500);
    }, {
      target: PERFORMANCE_TARGETS.RING_BUFFER_INSERT_NS / 1000000,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 100000,
    });

    bench('percentile(50) - median', () => {
      buffer.percentile(50);
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10000,
    });

    bench('percentile(99) - P99', () => {
      buffer.percentile(99);
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 10000,
    });

    bench('mean()', () => {
      buffer.mean();
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });

    bench('stdDev()', () => {
      buffer.stdDev();
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 20000,
    });

    bench('bulk insert (100 values)', () => {
      for (let i = 0; i < 100; i++) {
        buffer.push(100 + Math.random() * 500);
      }
    }, {
      target: (PERFORMANCE_TARGETS.RING_BUFFER_INSERT_NS / 1000000) * 100,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 1000,
    });
  });

  // ============================================================================
  // EMA Calculator Benchmarks
  // ============================================================================

  suite('EMA Calculator', () => {
    const ema = new EMACalculator(0.1);

    // Pre-populate
    for (let i = 0; i < 100; i++) {
      ema.update(100 + Math.random() * 500);
    }

    bench('update() - single value', () => {
      ema.update(100 + Math.random() * 500);
    }, {
      target: PERFORMANCE_TARGETS.TIER_LOOKUP_NS / 1000000,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 500000,
    });

    bench('get()', () => {
      ema.get();
    }, {
      target: PERFORMANCE_TARGETS.TIER_LOOKUP_NS / 1000000,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 500000,
    });

    bench('bulk updates (1000 values)', () => {
      for (let i = 0; i < 1000; i++) {
        ema.update(100 + Math.random() * 500);
      }
    }, {
      target: (PERFORMANCE_TARGETS.TIER_LOOKUP_NS / 1000000) * 1000,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 100,
    });
  });

  // ============================================================================
  // Decay Calculation Benchmarks
  // ============================================================================

  suite('Decay Calculations', () => {
    bench('calculateTheoreticalHalfLife()', () => {
      calculateTheoreticalHalfLife(300, 0.85); // avgDelayMs, avgDamping
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 100000,
    });

    bench('calculateDecay()', () => {
      calculateDecay(500, 250); // halfLifeMs, elapsedMs
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 100000,
    });

    bench('decay curve fitting (10 points)', () => {
      const points = Array.from({ length: 10 }, (_, i) => ({
        time: i * 100,
        value: Math.exp(-0.693 * i / 5),
      }));
      // Simulate curve fitting calculation
      let sum = 0;
      for (const p of points) {
        sum += Math.log(p.value) * p.time;
      }
    }, {
      target: PERFORMANCE_TARGETS.HALFLIFE_CALCULATION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50000,
    });
  });

  // ============================================================================
  // Pattern Detection Benchmarks
  // ============================================================================

  suite('Pattern Detection', () => {
    const tracker = createConfiguredTracker();

    // Populate with data that might trigger patterns
    // The random values in createMockOddsEntry provide variance
    for (let i = 0; i < 100; i++) {
      const entry = createMockOddsEntry(i);
      tracker.trackUpdate(entry);
    }

    bench('full pattern detection cycle', () => {
      const entry = createMockOddsEntry(Math.floor(Math.random() * 1000));
      const result = tracker.trackUpdate(entry);
      // Access patterns to ensure detection ran
      result.newPatterns.length;
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 5000,
    });

    bench('getPatternsByCategory()', () => {
      tracker.getPatternsByCategory('DERIVATIVE_DELAYS' as any);
    }, {
      target: PERFORMANCE_TARGETS.PATTERN_DETECTION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 20000,
    });

    bench('getPatternsBySeverity(HIGH)', () => {
      tracker.getPatternsBySeverity('HIGH');
    }, {
      target: PERFORMANCE_TARGETS.PATTERN_DETECTION_MS,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 20000,
    });
  });

  // ============================================================================
  // Memory Benchmarks
  // ============================================================================

  suite('Propagation Memory', () => {
    benchMemory('tracker initialization', () => {
      const tracker = createConfiguredTracker();
      return tracker;
    }, {
      iterations: 100,
    });

    benchMemory('1000 updates memory impact', () => {
      const tracker = createConfiguredTracker();
      for (let i = 0; i < 1000; i++) {
        tracker.trackUpdate(createMockOddsEntry(i));
      }
      return tracker;
    }, {
      iterations: 10,
    });

    benchMemory('heatmap generation', () => {
      const tracker = createConfiguredTracker();
      for (let i = 0; i < 100; i++) {
        tracker.trackUpdate(createMockOddsEntry(i));
      }
      return tracker.getHeatmap();
    }, {
      iterations: 50,
    });

    benchMemory('ring buffer allocation (1000 entries)', () => {
      const buffer = new DelayRingBuffer(1000);
      for (let i = 0; i < 1000; i++) {
        buffer.push(Math.random() * 1000);
      }
      return buffer;
    }, {
      iterations: 100,
    });
  });

  // ============================================================================
  // Throughput Benchmarks
  // ============================================================================

  suite('Propagation Throughput', () => {
    bench('sustained throughput (5000 updates)', () => {
      const tracker = createConfiguredTracker();
      for (let i = 0; i < 5000; i++) {
        tracker.trackUpdate(createMockOddsEntry(i));
      }
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS * 5000,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 5,
    });

    bench('mixed operations throughput', () => {
      const tracker = createConfiguredTracker();

      // Simulate real-world mixed operations
      for (let i = 0; i < 100; i++) {
        tracker.trackUpdate(createMockOddsEntry(i));

        if (i % 10 === 0) {
          tracker.getActivePatterns();
        }

        if (i % 20 === 0) {
          tracker.getAllTierMetrics();
        }

        if (i % 50 === 0) {
          tracker.getHeatmap();
        }
      }
    }, {
      target: PERFORMANCE_TARGETS.PROPAGATION_UPDATE_MS * 100 + 50,
      category: BENCHMARK_CATEGORIES.PROPAGATION,
      iterations: 50,
    });
  });
}

/**
 * Run all propagation benchmarks standalone
 */
export function runPropagationBenchmarks() {
  console.log('========================================');
  console.log('Propagation Half-Life Framework Benchmarks');
  console.log('========================================\n');

  propagationBenchmarks();
}

// Allow direct execution
if (import.meta.main) {
  runPropagationBenchmarks();
}
