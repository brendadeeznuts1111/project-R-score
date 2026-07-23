// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron in-process
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
import { scheduleInProcess, type InProcessCronJob } from '../harness/cron.ts';
import { buildRegistrySnapshot } from '../../tools/ops-snapshot.ts';

/** UTC — every 10 minutes (aligns with routing proof TTL + Pages freshness). */
export const OPS_SNAPSHOT_SCHEDULE =
  (Bun.env.OPS_SNAPSHOT_CRON_SCHEDULE || '*/10 * * * *').trim() || '*/10 * * * *';

export const OPS_SNAPSHOT_CRON_TITLE = 'ops-snapshot';

export type OpsSnapshotCronOpts = {
  withRouting?: boolean;
  withReport?: boolean;
  withWebView?: boolean;
  withStatic?: boolean;
  forceRouting?: boolean;
};

/**
 * One tick: write ops-summary, monitoring, static, proofs, optional prediction.
 * Returns process-style exit code (0 ok, 1 failed).
 */
export async function runOpsSnapshotCycle(
  opts: OpsSnapshotCronOpts = {}
): Promise<{ code: number; summary?: Record<string, unknown>; error?: string }> {
  try {
    const summary = await buildRegistrySnapshot({
      withRouting: opts.withRouting ?? true,
      withReport: opts.withReport ?? true,
      withWebView: opts.withWebView ?? false,
      withStatic: opts.withStatic ?? true,
      forceRouting: opts.forceRouting ?? false,
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
  console.info(
    `⏰ ${OPS_SNAPSHOT_CRON_TITLE} · in-process Bun.cron @ "${OPS_SNAPSHOT_SCHEDULE}" (UTC, no-overlap)`
  );
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
