// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  formatFlatManifest,
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
});
