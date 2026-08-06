// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
import { logDepth } from '../../console-depth.ts';
import { schedulePrewarm } from './connection-pool.ts';
import {
  endpointFromHost,
  HIGH_PRIORITY_BOOKS,
  runMonitorTick,
  type PipelineHooks,
} from './pipeline.ts';
import type { MonitorTickResult } from './types.ts';

export type OddsSchedulerHandle = {
  /** Stop cron + prewarm interval. */
  stop: () => void;
  /** Last tick results (may be empty before first fire). */
  lastResults: () => MonitorTickResult[];
  /** Cron expression in use (or interval fallback marker). */
  cronExpr: string;
  /** Hosts being monitored. */
  hosts: string[];
};

export type StartOddsMonitorOptions = {
  hosts?: string[];
  /** Cron expression (UTC). Default every 30s when Bun supports 6-field cron. */
  cronExpr?: string;
  fixtureFallback?: boolean;
  store?: boolean;
  window?: number;
  prewarmIntervalMs?: number;
  hooks?: PipelineHooks;
  /** When true, run one tick immediately before waiting for cron. */
  fireImmediately?: boolean;
  quiet?: boolean;
};

/**
 * In-process monitor using Bun.cron + prewarm interval.
 * Call stop() on shutdown so the process can exit.
 */
export function startOddsMonitor(opts: StartOddsMonitorOptions = {}): OddsSchedulerHandle {
  const hosts = opts.hosts ?? [...HIGH_PRIORITY_BOOKS];
  const endpoints = hosts.map(h => endpointFromHost(h));
  let last: MonitorTickResult[] = [];
  let stopped = false;

  const prewarmTimer = schedulePrewarm(hosts, opts.prewarmIntervalMs ?? 5_000);

  const run = async () => {
    if (stopped) return;
    try {
      last = await runMonitorTick({
        endpoints,
        fixtureFallback: opts.fixtureFallback,
        store: opts.store,
        window: opts.window,
        hooks: opts.hooks,
      });
      if (!opts.quiet) {
        const moved = last.filter(r => r.ok && !r.identical);
        const patterns = last.flatMap(r => r.patterns);
        if (moved.length || patterns.length) {
          logDepth(
            {
              tick: new Date().toISOString(),
              moved: moved.map(m => String(m.host)),
              patterns: patterns.map(p => ({
                host: String(p.host),
                type: p.type,
                confidence: p.confidence,
                details: p.details,
              })),
            },
            { depth: 4 }
          );
        }
      }
    } catch (err) {
      if (!opts.quiet) {
        console.error(
          'odds monitor tick failed:',
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  };

  // Prefer Bun.cron when available; fall back to setInterval(30s)
  let cronJob: { stop?: () => void } | null = null;
  let intervalFallback: ReturnType<typeof setInterval> | null = null;

  const expr = opts.cronExpr ?? '*/30 * * * * *';
  try {
    // Bun.cron(schedule, handler) — no-overlap after handler settles (1.3.14+)
    const job = Bun.cron(expr, () => {
      void run();
    });
    cronJob = job as { stop?: () => void };
  } catch {
    intervalFallback = setInterval(() => {
      void run();
    }, 30_000);
  }

  if (opts.fireImmediately !== false) {
    void run();
  }

  return {
    stop() {
      stopped = true;
      clearInterval(prewarmTimer);
      if (intervalFallback) clearInterval(intervalFallback);
      try {
        cronJob?.stop?.();
      } catch {
        /* ignore */
      }
    },
    lastResults: () => last,
    cronExpr: cronJob ? expr : `interval:30s`,
    hosts: [...hosts],
  };
}
