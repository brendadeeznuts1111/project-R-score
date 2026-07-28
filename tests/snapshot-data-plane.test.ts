// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  formatFlatManifest,
  getLockfileState,
  limitChartDataFromMetadata,
  matchesGrep,
  type SnapshotManifest,
} from '../tools/snapshot-core.ts';
import { isSnapshotScope, resolveSnapshotUrl, scopeConfigs } from '../tools/snapshot-scopes.ts';

function sampleManifest(overrides: Partial<SnapshotManifest> = {}): SnapshotManifest {
  return {
    id: 'prediction-abc123',
    scope: 'prediction',
    reportType: 'prediction',
    capturedAt: '2026-07-28T12:00:00.000Z',
    commit: 'deadbeefcafe',
    branch: 'main',
    bunVersion: '1.0.0',
    baseUrl: 'http://localhost:3000',
    fileCount: 3,
    files: ['a', 'b', 'c'],
    metadata: {
      status: 'ok',
      mae: '2.87',
      bias: '2.87',
      within5Pct: '73.33',
    },
    ...overrides,
  };
}

describe('snapshot-scopes', () => {
  test('prediction assets use registry paths', () => {
    expect(scopeConfigs.prediction.assetPaths[0]).toBe('/registry/prediction/report/summary.json');
    expect(scopeConfigs.prediction.reportPath).toBe('/registry/prediction/report/');
  });

  test('resolveSnapshotUrl joins base and path', () => {
    expect(resolveSnapshotUrl('http://localhost:3000', '/registry/ops-summary.json')).toBe(
      'http://localhost:3000/registry/ops-summary.json'
    );
  });

  test('isSnapshotScope validates names', () => {
    expect(isSnapshotScope('prediction')).toBe(true);
    expect(isSnapshotScope('unknown')).toBe(false);
  });
});

describe('snapshot-data-plane grep + flat manifest', () => {
  test('flat manifest includes scope= for rg', () => {
    const flat = formatFlatManifest(sampleManifest());
    expect(flat).toContain('scope=prediction');
    expect(flat).toContain('mae=2.87');
    expect(flat).toContain('bias=2.87');
  });

  test('matchesGrep scope=prediction', () => {
    const m = sampleManifest();
    expect(matchesGrep(m, 'scope=prediction')).toBe(true);
    expect(matchesGrep(m, 'scope=portal')).toBe(false);
  });

  test('matchesGrep numeric bias>2', () => {
    const m = sampleManifest();
    expect(matchesGrep(m, 'bias>2')).toBe(true);
    expect(matchesGrep(m, 'bias>3')).toBe(false);
    expect(matchesGrep(m, 'mae<5')).toBe(true);
  });

  test('matchesGrep substring fallback', () => {
    expect(matchesGrep(sampleManifest(), 'deadbeef')).toBe(true);
  });

  test('flat manifest includes lockHash when present in metadata', () => {
    const flat = formatFlatManifest(sampleManifest({ metadata: { status: 'ok', lockHash: 'abc123' } }));
    expect(flat).toContain('lockHash=abc123');
  });

  test('getLockfileState hashes the repo text lockfile', async () => {
    const state = await getLockfileState();
    // Repo root has a text bun.lock (saveTextLockfile = true)
    expect(state).not.toBeNull();
    expect(state!.lockHash).toMatch(/^[0-9a-f]{16}$/);
    expect(Number(state!.lockBytes)).toBeGreaterThan(0);
    // Stable across calls
    const again = await getLockfileState();
    expect(again!.lockHash).toBe(state!.lockHash);
  });

  test('limitChartDataFromMetadata maps unique* keys to chart books/partners', () => {
    const data = limitChartDataFromMetadata({
      raises: '19',
      decreases: '3',
      netDelta: '16',
      avgScore: '0.87',
      uniqueSportsbooks: '7',
      uniquePartners: '15',
    });
    expect(data).toEqual({
      raises: 19,
      decreases: 3,
      netDelta: 16,
      avgScore: 0.87,
      books: 7,
      partners: 15,
    });
  });

  test('limitChartDataFromMetadata defaults missing keys to zero / null avgScore', () => {
    const data = limitChartDataFromMetadata({});
    expect(data).toEqual({
      raises: 0,
      decreases: 0,
      netDelta: 0,
      avgScore: null,
      books: 0,
      partners: 0,
    });
  });
});
