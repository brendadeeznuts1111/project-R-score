// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
/**
 * Desk job status snapshot for agent:serve (:8790).
 * Bun.cron odds monitor is optional; research agent uses setInterval.
 *
 * @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
 * @see https://bun.com/blog/bun-v1.3.12 — in-process Bun.cron
 */

import type { ResearchAgentHandle } from '../research/index.ts';
import type { OddsDashboardServer } from './odds/dashboard.ts';
import type { OddsSchedulerHandle } from './odds/scheduler.ts';

export type DeskJobsSnapshot = {
  bun: {
    version: string;
    cron: boolean;
  };
  research: {
    running: boolean;
    intervalMs?: number;
    lastRunAt?: string | null;
    lastError?: string | null;
    lastMarketCount?: number;
    runs?: number;
    live?: boolean;
  };
  oddsDashboard: {
    running: boolean;
    port?: number;
    url?: string;
  };
  oddsMonitor: {
    running: boolean;
    cronExpr?: string;
    hosts?: string[];
    lastTickAt?: string | null;
    lastTickSummary?: {
      ok: number;
      failed: number;
      moved: number;
      patterns: number;
    };
  };
};

export type DeskJobsInputs = {
  research?: ResearchAgentHandle | null;
  odds?: OddsDashboardServer | null;
  oddsMonitor?: OddsSchedulerHandle | null;
};

export function buildDeskJobsSnapshot(inputs: DeskJobsInputs = {}): DeskJobsSnapshot {
  const researchStatus = inputs.research?.status();
  const monitor = inputs.oddsMonitor;
  const last = monitor?.lastResults() ?? [];
  const tickTs = last
    .map(r => r.snapshot?.timestamp)
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t));
  const lastTickAt =
    tickTs.length > 0
      ? new Date(Math.max(...tickTs)).toISOString()
      : last.length > 0
        ? new Date().toISOString()
        : null;
  return {
    bun: {
      version: Bun.version,
      cron: typeof Bun.cron === 'function',
    },
    research: researchStatus
      ? {
          running: researchStatus.running,
          intervalMs: researchStatus.intervalMs,
          lastRunAt: researchStatus.lastRunAt,
          lastError: researchStatus.lastError,
          lastMarketCount: researchStatus.lastMarketCount,
          runs: researchStatus.runs,
          live: researchStatus.live,
        }
      : { running: false },
    oddsDashboard: inputs.odds
      ? {
          running: true,
          port: inputs.odds.port,
          url: inputs.odds.url,
        }
      : { running: false },
    oddsMonitor: monitor
      ? {
          running: true,
          cronExpr: monitor.cronExpr,
          hosts: monitor.hosts,
          lastTickAt,
          lastTickSummary: {
            ok: last.filter(r => r.ok).length,
            failed: last.filter(r => !r.ok).length,
            moved: last.filter(r => r.ok && !r.identical).length,
            patterns: last.reduce((n, r) => n + (r.patterns?.length ?? 0), 0),
          },
        }
      : { running: false },
  };
}
