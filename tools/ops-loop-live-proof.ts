#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/sqlite
/**
 * Dispatch one gated play on the live operations DB, settle, and drain outbox.
 *
 *   bun tools/ops-loop-live-proof.ts
 *   bun tools/ops-loop-live-proof.ts --dry-run
 */
import { processChannelOutbox } from '../lib/channels/outbox.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { settlePendingPlays } from '../lib/operations/ops-settle-batch.ts';
import { queryLoopMetricsSlice } from '../lib/operations/ops-loop-metrics.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';
import { asPartnerTemplateId, asTreeNodeId } from '../lib/types/branded/operations.ts';

const dryRun = Bun.argv.includes('--dry-run');

async function main(): Promise<void> {
  const db = openOperationsDb();
  try {
    const before = queryLoopMetricsSlice(db);
    if (dryRun) {
      console.log(JSON.stringify({ before, action: 'would dispatch one gated play' }, null, 2));
      return;
    }

    const expert = db
      .query(`SELECT id FROM experts WHERE active = 1 ORDER BY created_at ASC LIMIT 1`)
      .get() as { id: string } | null; // brand-ok
    if (!expert) throw new Error('No active expert in operations DB');

    const agents = db
      .query(
        `SELECT id FROM tree_nodes
         WHERE expert_id = $eid AND active = 1 AND telegram_id IS NOT NULL AND telegram_id != ''`
      )
      .all({ $eid: expert.id }) as { id: string }[]; // brand-ok
    if (agents.length === 0) throw new Error('No active agents with telegram_id for expert');

    for (const { id } of agents) {
      bindPartnerProfile(db, asTreeNodeId(id), {
        templateId: asPartnerTemplateId('default-prospect'),
      });
      db.run(`UPDATE partner_profile_bindings SET metadata_json = $meta WHERE tree_node_id = $id`, {
        $id: id,
        $meta: JSON.stringify({
          opsecScore: 12,
          riskLevel: 'green',
          source: 'ops-loop-live-proof',
        }),
      });
      ensurePosition(db, id, '_all', 10_000);
    }

    const signer = new PlaySigner();
    const dispatch = await publishAndDispatch(
      signer,
      {
        expertId: expert.id,
        sport: 'NBA',
        market: 'totals live-proof',
        event: 'Loop throughput proof',
        selection: 'over 220',
        odds: -110,
        stakeRecommended: 500,
      },
      db,
      { flush: false }
    );

    const settle = await settlePendingPlays(db, {
      limit: 10,
      defaultResult: 'win',
      defaultPnl: 45,
      outbox: { deliver: false },
    });

    const outbox = await processChannelOutbox(db, { deliver: false });
    const after = queryLoopMetricsSlice(db);

    console.log(
      JSON.stringify(
        {
          playId: dispatch.id,
          enqueued: dispatch.enqueued,
          settle,
          outbox,
          before,
          after,
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
