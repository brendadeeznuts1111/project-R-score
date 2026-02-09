import { describe, expect, test } from 'bun:test';
import {
  computeOverallStatus,
  freshnessStatus,
  isLoopClosedByPolicy,
  mapLoopStageToStatusLevel,
  normalizeWarningCode,
  warningCodeStatus,
} from '../scripts/lib/search-status-contract';

describe('search status contract unified helpers', () => {
  test('normalizes and maps warning severity', () => {
    expect(normalizeWarningCode(' LATENCY_P95_WARN ')).toBe('latency_p95_warn');
    expect(warningCodeStatus('latency_p95_warn')).toBe('warn');
    expect(warningCodeStatus('quality_drop_warn')).toBe('fail');
    expect(warningCodeStatus('unknown_warning')).toBe('unknown');
  });

  test('maps stage status and computes rollup precedence', () => {
    expect(mapLoopStageToStatusLevel('pass')).toBe('ok');
    expect(mapLoopStageToStatusLevel('warn')).toBe('warn');
    expect(mapLoopStageToStatusLevel('fail')).toBe('fail');
    expect(computeOverallStatus(['ok', 'warn'])).toBe('warn');
    expect(computeOverallStatus(['ok', 'warn', 'fail'])).toBe('fail');
  });

  test('enforces loop-closure policy with allowed warn stages', () => {
    const closed = isLoopClosedByPolicy([
      { id: 'signal_latency', status: 'warn' },
      { id: 'signal_memory', status: 'warn' },
      { id: 'dashboard_parity', status: 'pass' },
    ] as any);
    expect(closed.loopClosed).toBe(true);

    const open = isLoopClosedByPolicy([
      { id: 'signal_quality', status: 'warn' },
      { id: 'dashboard_parity', status: 'pass' },
    ] as any);
    expect(open.loopClosed).toBe(false);
    expect(open.disallowedWarnIds).toEqual(['signal_quality']);
  });

  test('evaluates freshness using alignment + stale window', () => {
    expect(
      freshnessStatus({
        latestSnapshotIdSeen: 'a',
        loopStatusSnapshotId: 'a',
        staleMinutes: 2,
      })
    ).toBe('ok');
    expect(
      freshnessStatus({
        latestSnapshotIdSeen: 'a',
        loopStatusSnapshotId: 'b',
        staleMinutes: 1,
      })
    ).toBe('fail');
    expect(
      freshnessStatus({
        latestSnapshotIdSeen: 'a',
        loopStatusSnapshotId: 'a',
        staleMinutes: 99,
        windowMinutes: 15,
      })
    ).toBe('warn');
  });
});
