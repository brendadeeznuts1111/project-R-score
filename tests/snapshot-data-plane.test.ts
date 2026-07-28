// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  formatFlatManifest,
  getLockfileState,
  getRepoIdentity,
  limitChartDataFromMetadata,
  matchesGrep,
  termColor,
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

  test('getRepoIdentity reads package.json identity + bunfig hash', async () => {
    const meta = await getRepoIdentity();
    expect(meta.pkgName).toBeTruthy();
    expect(meta.pkgVersion).toMatch(/^\d+\./);
    expect(meta.bunfigHash).toMatch(/^[0-9a-f]{16}$/);
  });

  test('termColor emits codes on a color TTY and plain text elsewhere', async () => {
    // NOTE: this session exports NO_COLOR=1, which Bun.color honors — the
    // color case must strip it from the child env or every check reads ''.
    const runInPty = async (env: Record<string, string>): Promise<string> => {
      const { NO_COLOR: _drop, ...baseEnv } = Bun.env;
      let out = '';
      const proc = Bun.spawn(
        [
          'bun',
          '-e',
          'import { termColor } from "./tools/snapshot-core.ts"; process.stdout.write(termColor("X", "green"));',
        ],
        {
          env: { ...baseEnv, ...env },
          terminal: {
            cols: 80,
            rows: 24,
            data(_t: unknown, d: Uint8Array) {
              out += new TextDecoder().decode(d);
            },
          },
        }
      );
      await proc.exited;
      return out;
    };

    expect(await runInPty({ TERM: 'xterm-256color', COLORTERM: 'truecolor' })).toContain('\x1b[');
    expect(await runInPty({ TERM: 'xterm-256color', NO_COLOR: '1' })).toBe('X');
    expect(await runInPty({ TERM: 'dumb' })).toBe('X');
    // Piped (this test process) → plain text
    expect(termColor('X', 'green')).toBe('X');
  });

  test('flat manifest includes repo identity keys when present', () => {
    const flat = formatFlatManifest(
      sampleManifest({
        metadata: { status: 'ok', lockBytes: '199437', pkgVersion: '5.2.0', bunfigHash: 'abc123' },
      })
    );
    expect(flat).toContain('lockBytes=199437');
    expect(flat).toContain('pkgVersion=5.2.0');
    expect(flat).toContain('bunfigHash=abc123');
  });
});
