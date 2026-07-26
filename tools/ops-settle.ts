#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Production settlement caller — closes pending plays with distribution rows.
 *
 *   bun tools/ops-settle.ts
 *   bun tools/ops-settle.ts --limit 20 --result win --pnl 120
 *   bun tools/ops-settle.ts --dry-run
 */
import { resolveChannelR2BridgeConfig } from '../scripts/lib/r2-bridge.ts';
import { createR2ChannelStoreFromConfig } from '../lib/channels/r2-channel-bucket.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { settlePendingPlays } from '../lib/operations/ops-settle-batch.ts';
import type { PlayResult } from '../lib/operations/play-settlement.ts';

function usage(): never {
  console.log(`Usage: bun tools/ops-settle.ts [options]

Options:
  --help           Show this help
  --dry-run        List pending play_distribution rows without settling
  --limit N        Max rows (default 50)
  --result R       win|loss|push|void (default push)
  --pnl N          PnL applied per play (default 0)
  --no-outbox      Skip processChannelOutbox after settle
  --r2             Project outbox to R2 when credentials configured
`);
  process.exit(0);
}

const argv = Bun.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) usage();

const dryRun = argv.includes('--dry-run');
const limitArg = argv.indexOf('--limit');
const limit = limitArg >= 0 ? Number(argv[limitArg + 1]) : 50;
const resultArg = argv.indexOf('--result');
const resultRaw = resultArg >= 0 ? argv[resultArg + 1] : 'push';
const pnlArg = argv.indexOf('--pnl');
const pnl = pnlArg >= 0 ? Number(argv[pnlArg + 1]) : 0;
const skipOutbox = argv.includes('--no-outbox');
const useR2 = argv.includes('--r2');

const allowed: PlayResult[] = ['win', 'loss', 'push', 'void'];
if (!allowed.includes(resultRaw as PlayResult)) {
  console.error(`Invalid --result ${resultRaw}`);
  process.exit(1);
}
const result = resultRaw as PlayResult;

async function main(): Promise<void> {
  const db = openOperationsDb();
  try {
    if (dryRun) {
      const pending = db
        .query(
          `SELECT d.play_id, d.node_id, d.stake_actual, p.sent_at
           FROM play_distribution d
           INNER JOIN plays p ON p.id = d.play_id
           WHERE p.result = 'pending'
           ORDER BY d.received_at ASC
           LIMIT $lim`
        )
        .all({ $lim: Number.isFinite(limit) ? limit : 50 });
      console.log(JSON.stringify({ pending, count: pending.length }, null, 2));
      return;
    }

    let outboxOpts: Parameters<typeof settlePendingPlays>[1]['outbox'];
    if (skipOutbox) {
      outboxOpts = null;
    } else if (useR2) {
      try {
        const r2 = resolveChannelR2BridgeConfig();
        outboxOpts = { deliver: true, r2Store: createR2ChannelStoreFromConfig(r2) };
      } catch {
        outboxOpts = { deliver: false };
      }
    } else {
      outboxOpts = { deliver: false };
    }

    const batch = await settlePendingPlays(db, {
      limit: Number.isFinite(limit) ? limit : 50,
      defaultResult: result,
      defaultPnl: Number.isFinite(pnl) ? pnl : 0,
      outbox: outboxOpts,
    });

    console.log(
      JSON.stringify(
        {
          settled: batch.settled,
          skipped: batch.skipped,
          errors: batch.errors,
          outbox: batch.outbox,
        },
        null,
        2
      )
    );
    if (batch.errors.length > 0) process.exitCode = 1;
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
