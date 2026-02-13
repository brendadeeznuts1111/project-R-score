import { describe, expect, test } from 'bun:test';
import { parseArgs, shouldReuseSnapshot } from '../scripts/search-loop-check-local';

describe('search loop check local', () => {
  test('reuses snapshot when fresh and query pack matches', () => {
    const now = Date.parse('2026-02-13T05:00:00.000Z');
    const out = shouldReuseSnapshot(
      {
        createdAt: '2026-02-13T04:50:00.000Z',
        queryPack: 'core_delivery_wide',
      },
      now,
      20
    );
    expect(out.reuse).toBe(true);
  });

  test('does not reuse snapshot when query pack mismatches', () => {
    const now = Date.parse('2026-02-13T05:00:00.000Z');
    const out = shouldReuseSnapshot(
      {
        createdAt: '2026-02-13T04:50:00.000Z',
        queryPack: 'core_delivery',
      },
      now,
      20
    );
    expect(out.reuse).toBe(false);
    expect(out.reason).toContain('queryPack mismatch');
  });

  test('does not reuse snapshot when stale', () => {
    const now = Date.parse('2026-02-13T05:00:00.000Z');
    const out = shouldReuseSnapshot(
      {
        createdAt: '2026-02-13T04:10:00.000Z',
        queryPack: 'core_delivery_wide',
      },
      now,
      20
    );
    expect(out.reuse).toBe(false);
    expect(out.reason).toContain('stale');
  });

  test('parseArgs supports force and max age', () => {
    const out = parseArgs(['--max-snapshot-age-minutes', '12', '--force-snapshot']);
    expect(out.maxSnapshotAgeMinutes).toBe(12);
    expect(out.forceSnapshot).toBe(true);
  });
});
