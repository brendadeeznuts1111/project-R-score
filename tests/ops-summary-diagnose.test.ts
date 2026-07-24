// @see docs/harness/ops-summary-endpoint.md
import { describe, expect, test } from 'bun:test';
import {
  classifySummaryPayload,
  detectRoutingDrift,
  embeddedRoutingFailures,
  formatSourceLabel,
  parseSummaryShape,
  severityToExitCode,
  snapshotAgeWarn,
} from '../lib/operations/ops-summary-diagnose.ts';

describe('ops-summary-diagnose', () => {
  test('classify live summary as ok', () => {
    const r = classifySummaryPayload(
      parseSummaryShape({ source: 'live', liquidity: { total: 100 } }),
      200
    );
    expect(r.severity).toBe('ok');
    expect(r.reasons.some(x => x.includes('live'))).toBe(true);
  });

  test('classify snapshot db-unavailable as warn', () => {
    const r = classifySummaryPayload(
      parseSummaryShape({ source: 'snapshot', fallback: 'db-unavailable' }),
      200
    );
    expect(r.severity).toBe('warn');
    expect(r.reasons).toContain('snapshot fallback (db-unavailable)');
    expect(severityToExitCode(r.severity)).toBe(2);
  });

  test('classify 503 / source none as fail', () => {
    expect(
      classifySummaryPayload(
        parseSummaryShape({ source: 'none', error: 'Failed to open operations DB' }),
        503
      ).severity
    ).toBe('fail');
    expect(severityToExitCode('fail')).toBe(1);
  });

  test('formatSourceLabel covers fallback', () => {
    expect(formatSourceLabel({ source: 'live' })).toBe('Live');
    expect(
      formatSourceLabel({ source: 'snapshot', fallback: 'db-unavailable' })
    ).toBe('Snapshot (DB fallback)');
    expect(formatSourceLabel({ source: 'snapshot' })).toBe('Snapshot');
  });

  test('detectRoutingDrift when artifact base differs from probe', () => {
    expect(
      detectRoutingDrift('https://score.factory-wager.com', 'http://localhost:3000')
    ).toBe(true);
    expect(
      detectRoutingDrift('http://localhost:3000/', 'http://localhost:3000')
    ).toBe(false);
  });

  test('embeddedRoutingFailures lists pass=false routes', () => {
    const shape = parseSummaryShape({
      routing: {
        routes: [
          { path: '/ok', pass: true, status: 200 },
          { path: '/bad', pass: false, status: 400 },
        ],
      },
    });
    expect(embeddedRoutingFailures(shape)).toEqual([{ path: '/bad', status: 400 }]);
  });

  test('snapshotAgeWarn when file older than threshold', () => {
    const now = Date.now();
    const old = now - 48 * 3_600_000;
    expect(snapshotAgeWarn(old, now, 24 * 3_600_000)).toMatch(/stale/);
    expect(snapshotAgeWarn(now - 1000, now, 24 * 3_600_000)).toBeNull();
    expect(snapshotAgeWarn(null, now, 24 * 3_600_000)).toMatch(/missing/);
  });
});
