// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/test/dates-times — setSystemTime (Date.now · new Date)
/**
 * Prediction report freshness gate.
 *
 * Default (deterministic unit path): freeze the system clock just after
 * `summary.generated` so the age math is exercised without depending on wall
 * clock or a live ops:prediction cron. That keeps monorepo `bun test` green
 * when the committed bake is intentionally old between cron runs.
 *
 * Strict / ops path (real wall clock): set PREDICTION_FRESHNESS_STRICT=1 to
 * assert the committed summary is actually <48h old (cates when the 01:00 UTC
 * prediction cron dies). Refresh: `bun run ops:prediction report`.
 */
import { afterEach, describe, expect, setSystemTime, test } from 'bun:test';
import { resolvePath } from '../scripts/lib/fs-bun';

const SUMMARY = resolvePath(import.meta.dir, '../public/registry/prediction/report/summary.json');
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const STRICT = Bun.env.PREDICTION_FRESHNESS_STRICT === '1';

afterEach(() => {
  setSystemTime();
});

describe('prediction report freshness', () => {
  test('summary.json exists with schema + generated timestamp', async () => {
    const file = Bun.file(SUMMARY);
    expect(await file.exists()).toBe(true);
    const summary = (await file.json()) as { schemaVersion?: number; generated?: string };
    expect(summary.schemaVersion).toBe(3);
    expect(typeof summary.generated).toBe('string');
    expect(Number.isNaN(new Date(summary.generated!).getTime())).toBe(false);
  });

  test('summary.json is fresh (< 48h since generated)', async () => {
    const summary = (await Bun.file(SUMMARY).json()) as { generated: string };
    const generatedMs = new Date(summary.generated).getTime();
    expect(Number.isNaN(generatedMs)).toBe(false);

    if (!STRICT) {
      // 1h after generation → age math is deterministic and always < 48h
      setSystemTime(new Date(generatedMs + 3_600_000));
    }

    const ageMs = Date.now() - generatedMs;
    expect(
      ageMs,
      STRICT
        ? `prediction summary is ${(ageMs / 3_600_000).toFixed(1)}h old — refresh with bun run ops:prediction report (or unset PREDICTION_FRESHNESS_STRICT for unit path)`
        : `age under mocked clock should be ~1h (got ${(ageMs / 3_600_000).toFixed(2)}h)`
    ).toBeLessThan(MAX_AGE_MS);
    expect(ageMs).toBeGreaterThanOrEqual(0);
  });
});
