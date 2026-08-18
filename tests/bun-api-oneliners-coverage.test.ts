/**
 * Version-aware surface coverage + oneliner inventory.
 * @see ../tools/bun-api-oneliners.ts
 * @see ../tools/bun-docs-coverage.ts
 */
import { describe, expect, test } from 'bun:test';
import {
  availableAt,
  BUN_API_ONELINERS,
  onelinerCoveredApis,
  runOneliner,
} from '../tools/bun-api-oneliners.ts';
import {
  computeSurfaceLayer,
  isSurfaceApiToken,
  surfaceExercises,
} from '../tools/bun-docs-coverage.ts';

describe('availableAt (version-aware)', () => {
  test('missing since ⇒ available', () => {
    expect(availableAt('1.0.0', undefined)).toBe(true);
  });
  test('since ≤ version ⇒ available', () => {
    expect(availableAt('1.4.0', '1.3.6')).toBe(true);
    expect(availableAt('1.3.6', '1.3.6')).toBe(true);
  });
  test('since > version ⇒ unavailable', () => {
    expect(availableAt('1.2.0', '1.3.6')).toBe(false);
  });
});

describe('surfaceExercises', () => {
  test('exact + parent/child', () => {
    const covered = new Set(['Bun.CSRF.generate', 'Bun.mmap']);
    expect(surfaceExercises('Bun.CSRF', covered)).toBe(true);
    expect(surfaceExercises('Bun.CSRF.generate', covered)).toBe(true);
    expect(surfaceExercises('Bun.mmap', covered)).toBe(true);
    expect(surfaceExercises('Bun.WebView', covered)).toBe(false);
  });
});

describe('isSurfaceApiToken', () => {
  test('keeps APIs, drops guide aliases', () => {
    expect(isSurfaceApiToken('Bun.mmap')).toBe(true);
    expect(isSurfaceApiToken('Bun.CSRF.generate')).toBe(true);
    expect(isSurfaceApiToken('bun:sqlite')).toBe(true);
    expect(isSurfaceApiToken('HTMLRewriter')).toBe(true);
    expect(isSurfaceApiToken('Bun.serve routes')).toBe(false);
    expect(isSurfaceApiToken('Bun.inspect()')).toBe(false);
  });
});

describe('oneliners inventory', () => {
  test('has offline rare APIs', () => {
    const covered = onelinerCoveredApis({ includeLive: false });
    for (const api of [
      'Bun.mmap',
      'Bun.allocUnsafe',
      'Bun.concatArrayBuffers',
      'Bun.which',
      'Bun.pathToFileURL',
      'Bun.generateHeapSnapshot',
      'Bun.JSONL',
    ]) {
      expect(covered.has(api)).toBe(true);
    }
  });

  test('run offline file-meta + mmap', async () => {
    const a = await runOneliner('file-meta');
    expect(a.result).toMatch(/^nonempty=true name=\S+$/);
    const b = await runOneliner('mmap');
    expect(b.result).toContain('Uint8Array');
  });

  test('live demos require --live', async () => {
    expect(BUN_API_ONELINERS.some(d => d.live)).toBe(true);
    await expect(runOneliner('dns-lookup')).rejects.toThrow(/live/);
  });
});

describe('computeSurfaceLayer', () => {
  test('returns versioned hit/total', async () => {
    const layer = await computeSurfaceLayer(Bun.version);
    expect(layer.total).toBeGreaterThan(0);
    expect(layer.hit).toBeGreaterThan(0);
    expect(layer.pct).toBeGreaterThanOrEqual(0);
    expect(layer.pct).toBeLessThanOrEqual(100);
  });
});
