// @see https://bun.sh/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
/**
 * Operations automation — cron jobs for growth checks and metrics.
 *
 * Run with: bun run lib/accounts/automation.ts
 * Or: bun run lib/accounts/automation.ts --once
 */

import { type TreeNodeId } from '../types/branded.ts';
import { AccountSystem } from './accounts';

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
