#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Legacy ops-loop gate + settle outbox backfill on data/operations.db.
 *
 *   bun tools/ops-loop-gate-backfill.ts --dry-run
 *   bun tools/ops-loop-gate-backfill.ts
 */
import { resolveProductionOutboxOpts } from '../lib/channels/outbox-prod-opts.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { backfillOpsLoopGateAttribution } from '../lib/operations/ops-loop-gate-backfill.ts';

function usage(): never {
  console.log(`Usage: bun tools/ops-loop-gate-backfill.ts [options]

Options:
  --help       Show this help
  --dry-run    Count missing gates/outbox without writing
  --no-outbox  Skip processChannelOutbox after enqueue
  --r2         Use production R2 projector when credentials exist
`);
  process.exit(0);
}

const argv = Bun.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) usage();

const dryRun = argv.includes('--dry-run');
const skipOutbox = argv.includes('--no-outbox');
const useR2 = argv.includes('--r2');

async function main(): Promise<void> {
  const db = openOperationsDb();
  try {
    let outbox: Parameters<typeof backfillOpsLoopGateAttribution>[1]['outbox'];
    if (skipOutbox) {
      outbox = null;
    } else if (useR2) {
      outbox = resolveProductionOutboxOpts({ deliver: true });
    } else {
      outbox = { deliver: false };
    }

    const result = await backfillOpsLoopGateAttribution(db, { dryRun, outbox });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
