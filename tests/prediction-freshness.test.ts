// @see https://bun.com/docs/test/index#run-tests
/**
 * Prediction report freshness gate — the committed summary.json must not go
 * stale. If the 01:00 UTC prediction cron dies, this test turns red within
 * 48h instead of the report silently aging (same contract as surfaces/bunfig
 * drift gates). Refresh: bun run ops:prediction report (needs ops DB).
 */
import { describe, expect, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const SUMMARY = resolvePath(import.meta.dir, '../public/registry/prediction/report/summary.json');
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

describe('prediction report freshness', () => {
  test('summary.json exists with schema + generated timestamp', async () => {
    const file = Bun.file(SUMMARY);
    expect(await file.exists()).toBe(true);
    const summary = (await file.json()) as { schemaVersion?: number; generated?: string };
    expect(summary.schemaVersion).toBe(3);
    expect(typeof summary.generated).toBe('string');
  });

  test('summary.json is fresh (< 48h since generated)', async () => {
    const summary = (await Bun.file(SUMMARY).json()) as { generated: string };
    const ageMs = Date.now() - new Date(summary.generated).getTime();
    expect(
      ageMs,
      `prediction summary is ${(ageMs / 3_600_000).toFixed(1)}h old — refresh with bun run ops:prediction report`
    ).toBeLessThan(MAX_AGE_MS);
  });
});
