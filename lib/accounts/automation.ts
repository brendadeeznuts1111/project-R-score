// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
/**
 * Operations automation — cron jobs for growth checks, metrics, C5 coverage prediction,
 * and production registry snapshot (routing proof + static aggregate).
 *
 * Run with: bun run lib/accounts/automation.ts
 * Or: bun run lib/accounts/automation.ts --once
 *     bun run lib/accounts/automation.ts --once --coverage-prediction
 *     bun run lib/accounts/automation.ts --once --registry-snapshot
 */

import { openOperationsDb } from '../operations/db.ts';
import { buildRegistrySnapshot } from '../registry-snapshot.ts';
import { runDailyCoveragePredictionCycle } from '../prediction/index.ts';
import { type TreeNodeId } from '../types/branded.ts';
import { AccountSystem } from './accounts';

/** Production snapshot: routing proof, ops-summary, monitoring, static.json (every 10 min). */
export async function runRegistrySnapshotCycle(): Promise<void> {
  const summary = await buildRegistrySnapshot({
    withRouting: true,
    withReport: true,
    withWebView: false,
    withStaticRegistry: true,
  });
  console.log(
    `Registry snapshot: routing ${summary.routing && typeof summary.routing === 'object' && 'passed' in summary.routing ? `${(summary.routing as { passed?: number }).passed}/${(summary.routing as { total?: number }).total}` : 'n/a'}` +
      ` · bunUtils ${summary.bunUtils.passed}/${summary.bunUtils.total}` +
      ` · liquidity $${summary.liquidity}` +
      ` · proof ${summary.proofHash.slice(0, 12)}…`
  );
}

// Every 10 minutes — self-healing Pages artifacts (no WebView in cron)
Bun.cron('ops-registry-snapshot', '*/10 * * * *', async () => {
  try {
    await runRegistrySnapshotCycle();
  } catch (e) {
    console.error('Registry snapshot cron failed:', e instanceof Error ? e.message : e);
  }
});

// Daily coverage snapshot + prediction backtest (01:00 UTC)
Bun.cron('ops-coverage-prediction', '0 1 * * *', () => {
  const db = openOperationsDb();
  try {
    const result = runDailyCoveragePredictionCycle(db);
    console.log(
      `Coverage prediction: snapshot ${result.snapshotDate} ` +
        `${result.snapshot.covered}/${result.snapshot.total} (${result.snapshot.pct}%) ` +
        `newRows=${result.backtest.length} mae=${result.accuracy.mae.toFixed(2)} n=${result.accuracy.n}`
    );
  } finally {
    db.close();
  }
});

// Daily promotion eligibility check (9 AM)
Bun.cron('ops-promotion-check', '0 9 * * *', async () => {
  const accounts = new AccountSystem();

  const agents = accounts
    .db!.query("SELECT id, name FROM tree_nodes WHERE type = 'agent' AND status = 'active'")
    .all() as { id: TreeNodeId; name: string }[];

  for (const agent of agents) {
    const check = await accounts.canPromote(agent.id);
    if (check.eligible) {
      console.log(`Promoting: ${agent.name} (${agent.id as string})`);
      await accounts.promoteToPartner(agent.id);
    }
  }
});

// Daily metrics rollup (midnight)
Bun.cron('ops-metrics-rollup', '0 0 * * *', async () => {
  const accounts = new AccountSystem();

  const partners = accounts.db!.query("SELECT id FROM tree_nodes WHERE type = 'partner'").all() as {
    id: TreeNodeId;
  }[];

  for (const { id } of partners) {
    const liquidity = accounts.getDownstreamLiquidity(id);
    accounts.db!.run('UPDATE tree_nodes SET total_liquidity = $l WHERE id = $id', {
      $l: liquidity,
      $id: id,
    });
  }

  console.log(`Metrics rollup complete: ${partners.length} partners updated`);
});

// Run once and exit (for testing)
if (Bun.argv.includes('--once')) {
  if (Bun.argv.includes('--coverage-prediction')) {
    console.log('Running coverage prediction cycle once...');
    const db = openOperationsDb();
    try {
      const result = runDailyCoveragePredictionCycle(db);
      console.log(Bun.inspect(result, { depth: 4 }));
    } finally {
      db.close();
    }
    process.exit(0);
  }

  if (Bun.argv.includes('--registry-snapshot')) {
    console.log('Running registry snapshot cycle once...');
    await runRegistrySnapshotCycle();
    process.exit(0);
  }

  console.log('Running promotion check once...');
  const accounts = new AccountSystem();

  const agents = accounts
    .db!.query("SELECT id, name FROM tree_nodes WHERE type = 'agent' AND status = 'active'")
    .all() as { id: TreeNodeId; name: string }[];

  for (const agent of agents) {
    const check = await accounts.canPromote(agent.id);
    console.log(`${agent.name}: ${check.eligible ? 'ELIGIBLE' : check.reason}`);
  }

  process.exit(0);
}

// Keep the process alive
console.log('Operations automation running (Bun.cron)...');
