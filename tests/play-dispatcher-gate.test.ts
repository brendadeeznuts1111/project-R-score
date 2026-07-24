/**
 * Play dispatcher gate + reserve integration.
 */
import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { ensurePosition } from '../lib/operations/liquidity.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

function seedExpertAndAgent(db: ReturnType<typeof openOperationsDb>) {
  const now = new Date().toISOString();
  const expertId = randomUUIDv7();
  const agentId = randomUUIDv7();
  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ($id, 'Test Expert', 'NBA', 'totals', 0.8, 1, $now)`,
    { $id: expertId, $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
     VALUES ($aid, 'agent', NULL, $eid, 'Agent', '12345', 1, 'active', $now)`,
    { $aid: agentId, $eid: expertId, $now: now }
  );
  bindPartnerProfile(db, asTreeNodeId(agentId));
  ensurePosition(db, agentId, '_all', 5000);
  return { expertId, agentId };
}

describe('play-dispatcher gate', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('gateway deny skips reserve and distribution', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { expertId, agentId } = seedExpertAndAgent(db);
    db.run(
      `UPDATE partner_profile_bindings SET lifecycle_status = 'terminated' WHERE tree_node_id = $id`,
      { $id: agentId }
    );

    const signer = new PlaySigner();
    const result = await publishAndDispatch(
      signer,
      {
        expertId,
        sport: 'NBA',
        market: 'totals',
        event: 'LAL vs GSW',
        selection: 'over 225.5',
        odds: -110,
        stakeRecommended: 500,
      },
      db,
      { flush: false }
    );

    expect(result.enqueued).toBe(0);
    const dist = db
      .query('SELECT COUNT(*) as n FROM play_distribution WHERE play_id = $pid')
      .get({ $pid: result.id }) as { n: number };
    expect(dist.n).toBe(0);
    db.close();
  });

  test('allow path reserves liquidity and enqueues channel outbox', async () => {
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ ok: true }))) as typeof fetch;

    const db = openOperationsDb({ path: ':memory:' });
    const { expertId } = seedExpertAndAgent(db);
    const signer = new PlaySigner();

    const result = await publishAndDispatch(
      signer,
      {
        expertId,
        sport: 'NBA',
        market: 'totals',
        event: 'LAL vs GSW',
        selection: 'over 225.5',
        odds: -110,
        stakeRecommended: 500,
      },
      db,
      { flush: false, telegramToken: 'test-token' }
    );

    expect(result.enqueued).toBe(1);

    const gate = db
      .query('SELECT allowed FROM play_gate_decisions WHERE play_id = $pid')
      .get({ $pid: result.id }) as { allowed: number };
    expect(gate.allowed).toBe(1);

    const outbox = db
      .query("SELECT COUNT(*) as n FROM ops_channel_outbox WHERE topic = 'plays'")
      .get() as { n: number };
    expect(outbox.n).toBe(1);
    db.close();
  });
});
