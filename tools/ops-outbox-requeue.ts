#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/sqlite
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Requeue failed ops_channel_outbox rows → pending, then optionally drain.
 *
 *   bun tools/ops-outbox-requeue.ts
 *   bun tools/ops-outbox-requeue.ts --dry-run
 *   bun tools/ops-outbox-requeue.ts --drain --r2 --max-retries=5
 *   bun tools/ops-outbox-requeue.ts --drain --memory   # attribution-only
 */
import { processChannelOutbox, requeueFailedChannelOutbox } from '../lib/channels/outbox.ts';
import { resolveProductionOutboxOpts } from '../lib/channels/outbox-prod-opts.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { queryLoopMetricsSlice } from '../lib/operations/ops-loop-metrics.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('ops:outbox:requeue', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const drain = argv.includes('--drain');
const useR2 = argv.includes('--r2');
const useMemory = argv.includes('--memory');
const maxRetriesArg = Bun.argv.find(a => a.startsWith('--max-retries='));
const maxRetries = maxRetriesArg ? Number(maxRetriesArg.split('=')[1]) : undefined;

async function main(): Promise<void> {
  if (drain && !useR2 && !useMemory) {
    console.error(
      'Drain requires --r2 (durable Pages registry bucket) or --memory (attribution-only).\n' +
        '  bun run ops:outbox:requeue -- --drain --r2\n' +
        '  bun run ops:outbox:requeue -- --drain --memory'
    );
    process.exit(1);
  }

  const db = openOperationsDb();
  try {
    const before = queryLoopMetricsSlice(db);
    if (dryRun) {
      const failed = (
        db
          .query(
            maxRetries != null
              ? `SELECT COUNT(*) AS n FROM ops_channel_outbox
                 WHERE status = 'failed' AND retries < $max`
              : `SELECT COUNT(*) AS n FROM ops_channel_outbox WHERE status = 'failed'`
          )
          .get(maxRetries != null ? { $max: maxRetries } : {}) as { n: number }
      ).n;
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            wouldRequeue: failed,
            maxRetries: maxRetries ?? null,
            before: {
              outboxPending: before.outboxPending,
              outboxFailed: before.outboxFailed,
              loopCompletionRate: before.loopCompletionRate,
            },
          },
          null,
          2
        )
      );
      return;
    }

    const requeued = requeueFailedChannelOutbox(db, {
      maxRetries: Number.isFinite(maxRetries) ? maxRetries : undefined,
    });

    let outbox: { sent: number; failed: number } | undefined;
    let projectorBackend: 'r2' | 'memory' | 'local' = 'local';
    let projectorBucket: string | null = null;
    if (drain) {
      if (useR2) {
        const opts = resolveProductionOutboxOpts({ deliver: false, requireR2: true });
        projectorBackend = opts.projectorBackend;
        projectorBucket = opts.projectorBucket ?? null;
        outbox = await processChannelOutbox(db, opts);
      } else {
        console.warn(
          '[ops-outbox-requeue] draining with local memory — LCR attribution only, not durable R2'
        );
        projectorBackend = 'memory';
        outbox = await processChannelOutbox(db, { deliver: false });
      }
    }

    const after = queryLoopMetricsSlice(db);
    console.log(
      JSON.stringify(
        {
          requeued,
          drain: drain ? outbox : null,
          projectorBackend,
          projectorBucket,
          before: {
            outboxPending: before.outboxPending,
            outboxFailed: before.outboxFailed,
            loopCompletionRate: before.loopCompletionRate,
          },
          after: {
            outboxPending: after.outboxPending,
            outboxFailed: after.outboxFailed,
            loopCompletionRate: after.loopCompletionRate,
            manualStepsPerCycle: after.manualStepsPerCycle,
          },
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
