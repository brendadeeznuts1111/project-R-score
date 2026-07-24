// @see https://bun.com/docs/runtime/sqlite
/**
 * Deterministic closed-loop fixture for throughput proof (W5).
 */
import { randomUUIDv7 } from 'bun';
import { processChannelOutbox } from '../channels/outbox.ts';
import { openOperationsDb } from './db.ts';
import { PlaySigner } from './play-signing.ts';
import { publishAndDispatch } from './play-dispatcher.ts';
import { bindPartnerProfile } from './partner-profile-bridge.ts';
import { ensurePosition } from './liquidity.ts';
import { settlePendingPlays } from './ops-settle-batch.ts';
import { asPartnerTemplateId, asTreeNodeId } from '../types/branded/operations.ts';
import type { Database } from 'bun:sqlite';

/** Seed + run dispatch → settle → outbox for loop metric proof. */
export async function runOpsLoopFixture(): Promise<Database> {
  const db = openOperationsDb({ path: ':memory:' });
  const now = new Date().toISOString();
  const expertId = randomUUIDv7();
  const agentId = randomUUIDv7();

  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ($id, 'Loop Expert', 'NBA', 'totals', 0.9, 1, $now)`,
    { $id: expertId, $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
     VALUES ($aid, 'agent', NULL, $eid, 'Loop Agent', '999001', 1, 'active', $now)`,
    { $aid: agentId, $eid: expertId, $now: now }
  );

  bindPartnerProfile(db, asTreeNodeId(agentId), {
    templateId: asPartnerTemplateId('default-prospect'),
  });
  db.run(`UPDATE partner_profile_bindings SET metadata_json = $meta WHERE tree_node_id = $id`, {
    $id: agentId,
    $meta: JSON.stringify({ opsecScore: 12, riskLevel: 'green' }),
  });

  ensurePosition(db, agentId, '_all', 10_000);

  const signer = new PlaySigner();
  await publishAndDispatch(
    signer,
    {
      expertId,
      sport: 'NBA',
      market: 'totals manual',
      event: 'Fixture game',
      selection: 'over 220',
      odds: -110,
      stakeRecommended: 500,
    },
    db,
    { flush: false }
  );

  await settlePendingPlays(db, {
    limit: 10,
    defaultResult: 'win',
    defaultPnl: 45,
    outbox: { deliver: false },
  });

  await processChannelOutbox(db, { deliver: false });

  return db;
}
