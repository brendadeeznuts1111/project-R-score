import { describe, expect, test } from 'bun:test';
import { buildDeskJobsSnapshot } from '../lib/operator-research/desk-jobs.ts';
import type { OddsSchedulerHandle } from '../lib/operator-research/odds/scheduler.ts';
import type { MonitorTickResult } from '../lib/operator-research/odds/types.ts';
import { asHostId } from '../lib/types/branded.ts';

describe('desk-jobs snapshot', () => {
  test('monitor off → oddsMonitor.running false + bun.cron presence', () => {
    const snap = buildDeskJobsSnapshot({});
    expect(snap.oddsMonitor.running).toBe(false);
    expect(snap.research.running).toBe(false);
    expect(snap.oddsDashboard.running).toBe(false);
    expect(snap.bun.version).toBe(Bun.version);
    expect(typeof snap.bun.cron).toBe('boolean');
  });

  test('monitor on → cronExpr hosts and tick summary', () => {
    const tick: MonitorTickResult = {
      host: asHostId('hardrock.bet'),
      ok: true,
      elapsedMs: 12,
      identical: false,
      diff: null,
      patterns: [],
      snapshot: {
        host: asHostId('hardrock.bet'),
        sportsbookId: null,
        timestamp: 1_700_000_000_000,
        source: 'fixture',
        markets: [],
        limits: { maxBet: null, minBet: null },
      },
    };
    const monitor: OddsSchedulerHandle = {
      stop() {},
      lastResults: () => [tick],
      cronExpr: '*/30 * * * * *',
      hosts: ['hardrock.bet'],
    };
    const snap = buildDeskJobsSnapshot({ oddsMonitor: monitor });
    expect(snap.oddsMonitor.running).toBe(true);
    expect(snap.oddsMonitor.cronExpr).toBe('*/30 * * * * *');
    expect(snap.oddsMonitor.hosts).toEqual(['hardrock.bet']);
    expect(snap.oddsMonitor.lastTickSummary?.ok).toBe(1);
    expect(snap.oddsMonitor.lastTickSummary?.moved).toBe(1);
    expect(snap.oddsMonitor.lastTickAt).toBe(new Date(1_700_000_000_000).toISOString());
  });

  test('research status maps when handle present', () => {
    const snap = buildDeskJobsSnapshot({
      research: {
        status: () => ({
          running: true,
          intervalMs: 60_000,
          lastRunAt: '2026-01-01T00:00:00.000Z',
          lastError: null,
          lastMarketCount: 3,
          lastEventCount: 1,
          runs: 2,
          live: false,
        }),
        runOnce: async () => {
          throw new Error('unused');
        },
        lastMarkets: () => [],
        lastEvents: () => [],
        stop() {},
      },
    });
    expect(snap.research.running).toBe(true);
    expect(snap.research.intervalMs).toBe(60_000);
    expect(snap.research.runs).toBe(2);
  });
});
