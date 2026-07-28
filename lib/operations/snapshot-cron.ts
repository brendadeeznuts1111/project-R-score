// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron in-process
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — Database type
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * In-process Bun.cron complement for ops/registry snapshots.
 *
 * Ideal for long-running hosts (spine daemon, factory gateway, serve-public):
 * - Shares module state / disk cache with getRoutingProof (TTL mem+disk)
 * - No overlap: next fire waits for buildRegistrySnapshot Promise to settle
 * - UTC schedule (in-process complement; OS-level Bun.cron uses local time)
 * - Errors are caught so unhandledRejection does not kill the daemon
 *
 *   bun lib/operations/snapshot-cron.ts --once
 *   OPS_SNAPSHOT_CRON=1 bun lib/operations/snapshot-cron.ts   # daemon
 *   REGISTRY_MONITOR=1 OPS_SNAPSHOT_CRON=1 bun lib/factory/server.ts
 *
 * Spine: tenant `ops-snapshot` · `bun run spine:schedule:once -- --tenant=ops-snapshot`
 */
import type { Database } from 'bun:sqlite';
import { scheduleInProcess, type InProcessCronJob } from '../harness/cron.ts';
import { buildRegistrySnapshot } from '../../tools/ops-snapshot.ts';
import { resolveChannelR2BridgeConfig } from '../../scripts/lib/r2-bridge.ts';
import { resolveProductionOutboxOpts } from '../channels/outbox-prod-opts.ts';
import { requeueFailedChannelOutbox } from '../channels/outbox.ts';
import { AccountService } from './account-service.ts';
import { AccountLimitsRepository } from '../account-limits-repo.ts';
import { openOperationsDb } from './db.ts';
import { settlePendingPlays } from './ops-settle-batch.ts';
import { processOpsSyncQueue } from './ops-sync.ts';

/** UTC — every 10 minutes (aligns with routing proof TTL + Pages freshness). */
export const OPS_SNAPSHOT_SCHEDULE =
  (Bun.env.OPS_SNAPSHOT_CRON_SCHEDULE || '*/10 * * * *').trim() || '*/10 * * * *';

/** UTC — ops-sync consumer (R2 signups → tree_nodes bind). */
export const OPS_SYNC_SCHEDULE =
  (Bun.env.OPS_SYNC_CRON_SCHEDULE || '*/5 * * * *').trim() || '*/5 * * * *';

/** UTC — settlement caller for distributed pending plays. */
export const OPS_SETTLE_SCHEDULE =
  (Bun.env.OPS_SETTLE_CRON_SCHEDULE || '*/5 * * * *').trim() || '*/5 * * * *';

export const OPS_SNAPSHOT_CRON_TITLE = 'ops-snapshot';
export const OPS_SYNC_CRON_TITLE = 'ops-sync';
export const OPS_SETTLE_CRON_TITLE = 'ops-settle';

export type OpsSnapshotCronOpts = {
  withRouting?: boolean;
  withReport?: boolean;
  withWebView?: boolean;
  withStatic?: boolean;
  forceRouting?: boolean;
  /** Bake compliance-board.json companion (default true; ops-snapshot owns freshness). */
  withCompliance?: boolean;
  /** Run limit baseline + prediction state preparation before the snapshot. Default true. */
  prepareState?: boolean;
  /** When true (default), run ops-sync + settle ticks after snapshot in --once mode. */
  withLoopAutomation?: boolean;
};

export type OpsSnapshotCycleDependencies = {
  buildSnapshot?: typeof buildRegistrySnapshot;
};

function tryR2OutboxOpts(): Parameters<typeof settlePendingPlays>[1]['outbox'] {
  const opts = resolveProductionOutboxOpts({ deliver: true });
  // Empty token would fail telegram projectors and poison the DLQ — keep R2, skip network.
  if (!opts.telegramToken?.trim()) {
    return { ...opts, deliver: false };
  }
  return opts;
}

/** Consume R2 ops-sync queue and bind partner profiles (best-effort). */
export async function runOpsSyncCycle(): Promise<{
  code: number;
  processed?: number;
  error?: string;
}> {
  try {
    const r2 = resolveChannelR2BridgeConfig();
    const db = openOperationsDb();
    const svc = new AccountService(db);
    try {
      const result = await processOpsSyncQueue(db, svc, r2);
      console.info(
        `[${OPS_SYNC_CRON_TITLE}] processed=${result.processed} lastSeq=${result.lastSeq}`
      );
      return { code: 0, processed: result.processed };
    } finally {
      svc.close();
      db.close();
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.warn(`[${OPS_SYNC_CRON_TITLE}] skipped:`, error);
    return { code: 0, error };
  }
}

/** Settle pending distributed plays + drain outbox (production caller). */
export async function runOpsSettleCycle(): Promise<{
  code: number;
  settled?: number;
  error?: string;
}> {
  const db = openOperationsDb();
  try {
    const requeued = requeueFailedChannelOutbox(db, { maxRetries: 5, limit: 100 });
    if (requeued > 0) {
      console.info(`[${OPS_SETTLE_CRON_TITLE}] requeued failed outbox=${requeued}`);
    }
    const batch = await settlePendingPlays(db, {
      limit: 50,
      defaultResult: 'push',
      defaultPnl: 0,
      outbox: tryR2OutboxOpts(),
    });
    console.info(
      `[${OPS_SETTLE_CRON_TITLE}] settled=${batch.settled}` +
        ` outboxSent=${batch.outbox?.sent ?? 0}` +
        ` outboxFailed=${batch.outbox?.failed ?? 0}`
    );
    return {
      code: batch.errors.length > 0 ? 1 : 0,
      settled: batch.settled,
      error: batch.errors[0],
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[${OPS_SETTLE_CRON_TITLE}] cycle failed:`, error);
    return { code: 1, error };
  } finally {
    db.close();
  }
}

/**
 * Record current limit baselines for every partner with sb_accounts.
 * Called by the snapshot cron to build historical limit records over time.
 */
export function capturePartnerLimitBaselines(db: Database): { recorded: number } {
  const accounts = db
    .query(
      `SELECT DISTINCT a.agent_id, a.book FROM sb_accounts a
     JOIN tree_nodes n ON n.id = a.agent_id
     WHERE n.type = 'partner' AND a.status = 'active'`
    )
    .all() as Array<{ agent_id: string; book: string }>; // brand-ok — AgentId wire

  const repo = new AccountLimitsRepository(db);
  let count = 0;
  const seen = new Set<string>();
  for (const acct of accounts) {
    const key = `${acct.agent_id}:${acct.book}`;
    if (seen.has(key)) continue;
    seen.add(key);
    repo.recordLimit({
      node_id: acct.agent_id,
      sportsbook: acct.book,
      sport_id: '_any',
      market_id: '_any',
      bet_type: 'straight',
      max_wager: 0,
    });
    count++;
  }
  return { recorded: count };
}

/**
 * One tick: write ops-summary, monitoring, static, proofs, optional prediction.
 * Returns process-style exit code (0 ok, 1 failed).
 */
export async function runOpsSnapshotCycle(
  opts: OpsSnapshotCronOpts = {},
  dependencies: OpsSnapshotCycleDependencies = {}
): Promise<{ code: number; summary?: Record<string, unknown>; error?: string }> {
  try {
    if (opts.prepareState !== false) {
      const db = openOperationsDb();
      let limitResult: { recorded: number };
      try {
        limitResult = capturePartnerLimitBaselines(db);
      } finally {
        db.close();
      }
      if (limitResult.recorded > 0) {
        console.log(
          `[${OPS_SNAPSHOT_CRON_TITLE}] recorded ${limitResult.recorded} limit baselines`
        );
      }
      // Limit prediction cycle
      try {
        const { runLimitPredictionCycle } = await import('../prediction/limit-prediction.ts');
        const predDb = openOperationsDb();
        let predResult: ReturnType<typeof runLimitPredictionCycle>;
        try {
          predResult = runLimitPredictionCycle(predDb);
        } finally {
          predDb.close();
        }
        if (predResult.predictions > 0) {
          console.log(
            `[${OPS_SNAPSHOT_CRON_TITLE}] limit predictions: ${predResult.predictions} new, ${predResult.backfilled} backfilled`
          );
        }
      } catch (e) {
        console.warn(
          `[${OPS_SNAPSHOT_CRON_TITLE}] limit prediction cycle skipped:`,
          e instanceof Error ? e.message : e
        );
      }
    }
    const summary = await (dependencies.buildSnapshot ?? buildRegistrySnapshot)({
      withRouting: opts.withRouting ?? true,
      withReport: opts.withReport ?? true,
      withWebView: opts.withWebView ?? false,
      withStatic: opts.withStatic ?? true,
      forceRouting: opts.forceRouting ?? false,
      withCompliance: opts.withCompliance ?? true,
    });
    const critical = Number(
      (summary.routing as { criticalFailed?: number } | undefined)?.criticalFailed ?? 0
    );
    if (critical > 0) {
      console.warn(
        `[${OPS_SNAPSHOT_CRON_TITLE}] routing criticalFailed=${critical}`,
        (summary.routing as { failedRoutes?: string[] })?.failedRoutes
      );
      // Still exit 0 for spine tick — artifacts were written; critical routes surface on dashboard
    }
    if (opts.withLoopAutomation !== false) {
      await runOpsSyncCycle();
      await runOpsSettleCycle();
    }
    return { code: 0, summary };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[${OPS_SNAPSHOT_CRON_TITLE}] cycle failed:`, error);
    return { code: 1, error };
  }
}

export type OpsSnapshotCronScheduler = (
  schedule: string,
  handler: () => void | Promise<void>
) => InProcessCronJob | unknown;

/**
 * Register in-process cron (no-overlap, UTC). Injectable for tests.
 * Returns the CronJob when using real Bun.cron / scheduleInProcess.
 */
export function registerOpsSnapshotCron(
  scheduler: OpsSnapshotCronScheduler = scheduleInProcess,
  opts: OpsSnapshotCronOpts = {}
): InProcessCronJob | unknown {
  return scheduler(OPS_SNAPSHOT_SCHEDULE, async () => {
    await runOpsSnapshotCycle(opts);
  });
}

export function registerOpsSyncCron(
  scheduler: OpsSnapshotCronScheduler = scheduleInProcess
): InProcessCronJob | unknown {
  return scheduler(OPS_SYNC_SCHEDULE, async () => {
    await runOpsSyncCycle();
  });
}

export function registerOpsSettleCron(
  scheduler: OpsSnapshotCronScheduler = scheduleInProcess
): InProcessCronJob | unknown {
  return scheduler(OPS_SETTLE_SCHEDULE, async () => {
    await runOpsSettleCycle();
  });
}

/** Register snapshot + ops-sync + settle crons (daemon hosts). */
export function registerOpsAutomationCrons(
  scheduler: OpsSnapshotCronScheduler = scheduleInProcess,
  opts: OpsSnapshotCronOpts = {}
): { snapshot: unknown; sync: unknown; settle: unknown } {
  return {
    snapshot: registerOpsSnapshotCron(scheduler, opts),
    sync: registerOpsSyncCron(scheduler),
    settle: registerOpsSettleCron(scheduler),
  };
}

if (import.meta.main) {
  // Mirror setTimeout error surface for any missed rejection in deps
  process.on('unhandledRejection', err => {
    console.error(`[${OPS_SNAPSHOT_CRON_TITLE}] unhandledRejection:`, err);
  });

  if (Bun.argv.includes('--once')) {
    const { code } = await runOpsSnapshotCycle({
      withWebView: Bun.argv.includes('--webview'),
      forceRouting: Bun.argv.includes('--force-routing'),
      withReport: !Bun.argv.includes('--no-report'),
      withRouting: !Bun.argv.includes('--no-routing'),
    });
    process.exit(code);
  }

  const job = registerOpsSnapshotCron();
  registerOpsSyncCron();
  registerOpsSettleCron();
  console.info(
    `⏰ ${OPS_SNAPSHOT_CRON_TITLE} · in-process Bun.cron @ "${OPS_SNAPSHOT_SCHEDULE}" (UTC, no-overlap)`
  );
  console.info(`⏰ ${OPS_SYNC_CRON_TITLE} · @ "${OPS_SYNC_SCHEDULE}" (UTC)`);
  console.info(`⏰ ${OPS_SETTLE_CRON_TITLE} · @ "${OPS_SETTLE_SCHEDULE}" (UTC)`);
  console.info('   SIGINT/SIGTERM to stop · next fire waits for snapshot Promise');

  await new Promise<void>(resolve => {
    const stop = () => {
      try {
        const j = job as { stop?: () => void };
        j.stop?.();
      } catch {
        /* ignore */
      }
      resolve();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
  console.info(`👋 ${OPS_SNAPSHOT_CRON_TITLE} stopped`);
}
