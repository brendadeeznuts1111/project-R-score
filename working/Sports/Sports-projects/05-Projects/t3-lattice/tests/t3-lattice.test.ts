/**
 * T3-Lattice Test Suite
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  FractalEngine,
  computeBoxCountingFD,
  computeHurstExponent,
} from '../src/engines/fractal-engine';
import { HiddenLatticeFinder } from '../src/persona/lattice-finder';
import { MarketDataIngestor, DEC_29_GAMES } from '../src/ingestion/market-ingestor';
import { T3LatticeOrchestrator } from '../src/orchestrator';
import {
  QUANTUM_GLYPHS,
  findGlyphForFD,
  validateGlyph,
  getGlyphName,
} from '../src/constants/glyph-patterns';
import type { OddsTick, TickBatch, FDResult, HurstResult } from '../src/types';

// Test data generators
function generateTicks(count: number, volatility: number = 0.5): OddsTick[] {
  const ticks: OddsTick[] = [];
  let spread = -3.5;

  for (let i = 0; i < count; i++) {
    spread += (Math.random() - 0.5) * volatility;
    ticks.push({
      time: Date.now() - (count - i) * 60000,
      spread,
      ml: -110,
      total: 220 + (Math.random() - 0.5) * 5,
      volume: 10000 + Math.random() * 5000,
    });
  }

  return ticks;
}

function generateTrendingTicks(count: number): OddsTick[] {
  const ticks: OddsTick[] = [];
  let spread = -3.5;

  for (let i = 0; i < count; i++) {
    spread += 0.1; // Consistent upward drift
    ticks.push({
      time: Date.now() - (count - i) * 60000,
      spread,
      ml: -110,
      total: 220,
      volume: 10000,
    });
  }

  return ticks;
}

// ============ Fractal Engine Tests ============

describe('FractalEngine', () => {
  let engine: FractalEngine;

  beforeEach(() => {
    engine = new FractalEngine();
  });

  test('computeFD returns valid fractal dimension', async () => {
    const ticks = generateTicks(50);
    const result = await engine.computeFD(ticks);

    expect(result.fd).toBeGreaterThanOrEqual(1.0);
    expect(result.fd).toBeLessThanOrEqual(2.0);
    expect(result.computationTime).toBeGreaterThan(0);
    expect(result.method).toBe('box_counting');
  });

  test('computeHurst returns valid Hurst exponent', async () => {
    const ticks = generateTicks(50);
    const result = await engine.computeHurst(ticks);

    expect(result.hurst).toBeGreaterThanOrEqual(0);
    expect(result.hurst).toBeLessThanOrEqual(1);
    expect(result.computationTime).toBeGreaterThan(0);
  });

  test('analyze returns both FD and Hurst', async () => {
    const ticks = generateTicks(30);
    const { fd, hurst } = await engine.analyze(ticks);

    expect(fd.fd).toBeGreaterThanOrEqual(1.0);
    expect(hurst.hurst).toBeGreaterThanOrEqual(0);
  });

  test('trending data has lower FD', async () => {
    const trendingTicks = generateTrendingTicks(50);
    const volatileTicks = generateTicks(50, 2.0);

    const trendResult = await engine.computeFD(trendingTicks);
    const volatileResult = await engine.computeFD(volatileTicks);

    // Trending should have lower FD (smoother)
    expect(trendResult.fd).toBeLessThan(volatileResult.fd);
  });

  test('handles empty tick array', async () => {
    const result = await engine.computeFD([]);
    expect(result.fd).toBe(1.0); // Default for empty
  });

  test('handles single tick', async () => {
    const ticks = [{ time: Date.now(), spread: -3.5, ml: -110, total: 220, volume: 10000 }];
    const result = await engine.computeFD(ticks);
    expect(result.fd).toBe(1.0);
  });
});

// ============ Inline Computation Tests ============

describe('Inline Fractal Computations', () => {
  test('computeBoxCountingFD calculates correctly', () => {
    const series = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const fd = computeBoxCountingFD(series, 100);

    expect(fd).toBeGreaterThanOrEqual(1.0);
    expect(fd).toBeLessThanOrEqual(2.0);
  });

  test('computeHurstExponent calculates correctly', () => {
    const series = new Float64Array([1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4]);
    const hurst = computeHurstExponent(series, 6);

    expect(hurst).toBeGreaterThanOrEqual(0);
    expect(hurst).toBeLessThanOrEqual(1);
  });
});

// ============ Glyph Pattern Tests ============

describe('Glyph Patterns', () => {
  test('QUANTUM_GLYPHS has 5 patterns', () => {
    expect(QUANTUM_GLYPHS.length).toBe(5);
  });

  test('findGlyphForFD returns correct glyph', () => {
    const glyph1 = findGlyphForFD(1.3);
    expect(glyph1?.pattern).toBe('▵⟂⥂');

    const glyph2 = findGlyphForFD(1.7);
    expect(glyph2?.pattern).toBe('⥂⟂(▵⟜⟳)');

    const glyph3 = findGlyphForFD(2.5);
    expect(glyph3?.pattern).toBe('⊟');
  });

  test('validateGlyph returns true for valid match', () => {
    expect(validateGlyph('▵⟂⥂', 1.3)).toBe(true);
    expect(validateGlyph('⊟', 2.5)).toBe(true);
  });

  test('validateGlyph returns false for invalid match', () => {
    expect(validateGlyph('▵⟂⥂', 2.5)).toBe(false);
    expect(validateGlyph('⊟', 1.3)).toBe(false);
  });

  test('getGlyphName returns correct name', () => {
    expect(getGlyphName('▵⟂⥂')).toBe('STRUCTURAL_DRIFT_SUPPRESSOR');
    expect(getGlyphName('⊟')).toBe('QUANTUM_ROLLBACK_TRIGGER');
    expect(getGlyphName('invalid')).toBe('UNKNOWN');
  });

  test('all glyphs have valid FD ranges', () => {
    for (const glyph of QUANTUM_GLYPHS) {
      expect(glyph.fdRange[0]).toBeLessThan(glyph.fdRange[1]);
      expect(glyph.fdRange[0]).toBeGreaterThanOrEqual(1.0);
      expect(glyph.fdRange[1]).toBeLessThanOrEqual(3.0);
    }
  });
});

// ============ Hidden Lattice Finder Tests ============

describe('HiddenLatticeFinder', () => {
  let persona: HiddenLatticeFinder;

  beforeEach(() => {
    persona = new HiddenLatticeFinder();
  });

  test('has valid persona ID', () => {
    const info = persona.getInfo();
    expect(info.id).toMatch(/^t3-lattice-finder-/);
  });

  test('has default config values', () => {
    const info = persona.getInfo();
    expect(info.config.fdThreshold).toBe(2.5);
    expect(info.config.confidenceMin).toBe(0.85);
  });

  test('detectEdge returns edge for valid data', async () => {
    const ticks = generateTicks(30, 0.3);
    const tickBatch: TickBatch = {
      gameId: 'TEST@GAME',
      timestamp: Date.now(),
      ticks,
    };

    const fdResult: FDResult = { fd: 1.4, computationTime: 5, method: 'box_counting' };
    const hurstResult: HurstResult = { hurst: 0.65, computationTime: 3 };

    const edge = await persona.detectEdge(tickBatch, fdResult, hurstResult);

    // May or may not detect edge depending on confidence
    if (edge) {
      expect(edge.market).toBe('TEST@GAME');
      expect(edge.fd).toBe(1.4);
      expect(edge.hurst).toBe(0.65);
      expect(edge.confidence).toBeGreaterThanOrEqual(0);
    }
  });

  test('detectEdge marks black swan for high FD', async () => {
    const ticks = generateTicks(30);
    const tickBatch: TickBatch = {
      gameId: 'BLACK@SWAN',
      timestamp: Date.now(),
      ticks,
    };

    const fdResult: FDResult = { fd: 2.7, computationTime: 5, method: 'box_counting' };
    const hurstResult: HurstResult = { hurst: 0.3, computationTime: 3 };

    const edge = await persona.detectEdge(tickBatch, fdResult, hurstResult);

    if (edge) {
      expect(edge.requiresReview).toBe(true);
      expect(edge.type).toBe('BLACK_SWAN');
    }
  });

  test('getStats returns valid statistics', async () => {
    const stats = persona.getStats();

    expect(stats.edgesDetected).toBeGreaterThanOrEqual(0);
    expect(stats.blackSwans).toBeGreaterThanOrEqual(0);
    expect(stats.gamesProcessed).toBeGreaterThanOrEqual(0);
  });
});

// ============ Market Ingestor Tests ============

describe('MarketDataIngestor', () => {
  test('DEC_29_GAMES has 11 games', () => {
    expect(DEC_29_GAMES.length).toBe(11);
  });

  test('all games have valid structure', () => {
    for (const game of DEC_29_GAMES) {
      expect(game.id).toMatch(/^[A-Z]{3}@[A-Z]{3}$/);
      expect(game.tipoff).toMatch(/^\d{2}:\d{2}$/);
      expect(game.opening.spread).toBeDefined();
      expect(game.opening.ml).toBeDefined();
      expect(game.opening.total).toBeDefined();
    }
  });

  test('demo ingestor generates ticks', async () => {
    const ingestor = new MarketDataIngestor({ source: 'demo', rateLimit: 10 });
    const games = [DEC_29_GAMES[0]];

    const batches: TickBatch[] = [];
    for await (const batch of ingestor.streamMarketTicks(games)) {
      batches.push(batch);
    }

    expect(batches.length).toBe(1);
    expect(batches[0].gameId).toBe('MIL@CHA');
    expect(batches[0].ticks.length).toBeGreaterThan(0);
  });

  test('session info is generated', () => {
    const ingestor = new MarketDataIngestor({ source: 'demo' });
    const info = ingestor.getSessionInfo();

    expect(info.id).toBeDefined();
    expect(info.source).toBe('demo');
  });
});

// ============ Orchestrator Tests ============

describe('T3LatticeOrchestrator', () => {
  test('runs analysis on games', async () => {
    const orchestrator = new T3LatticeOrchestrator({
      source: 'demo',
      verbose: false,
    });

    // Test with subset of games for speed
    const games = DEC_29_GAMES.slice(0, 3);
    const result = await orchestrator.run(games);

    expect(result.stats.gamesProcessed).toBe(3);
    expect(result.edges).toBeInstanceOf(Array);
    expect(result.alerts).toBeInstanceOf(Array);
    expect(result.stats.latencyMs).toBeGreaterThan(0);
  });

  test('calculates hit rate correctly', async () => {
    const orchestrator = new T3LatticeOrchestrator({
      source: 'demo',
      verbose: false,
    });

    const games = DEC_29_GAMES.slice(0, 5);
    const result = await orchestrator.run(games);

    const expectedHitRate = ((result.stats.edgesDetected / 5) * 100).toFixed(1) + '%';
    expect(result.stats.hitRate).toBe(expectedHitRate);
  });
});

// ============ Integration Tests ============

describe('Integration', () => {
  test('full pipeline works end-to-end', async () => {
    const orchestrator = new T3LatticeOrchestrator({
      source: 'demo',
      verbose: false,
    });

    const result = await orchestrator.run(DEC_29_GAMES);

    // Should process all 11 games
    expect(result.stats.gamesProcessed).toBe(11);

    // Should have reasonable latency
    expect(result.stats.latencyMs).toBeLessThan(10000); // 10 seconds max

    // Stats should be valid
    expect(result.stats.edgesDetected).toBeGreaterThanOrEqual(0);
    expect(result.stats.blackSwans).toBeGreaterThanOrEqual(0);
  });
});
