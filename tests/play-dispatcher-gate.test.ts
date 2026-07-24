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
import { rankPlayRecipients } from '../lib/operations/toc-play-routing.ts';
import { withTocMetrics } from '../lib/toc-ops/export-snapshot.ts';
import { buildDemoTocOpsFixture } from '../lib/toc-ops/fixture.ts';
import { loadTocRoutingContext } from '../lib/operations/toc-play-routing.ts';
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

    const denied = db
      .query(
        `SELECT event_type, payload_json FROM ops_channel_outbox
         WHERE topic = 'plays' AND event_type = 'play.gate.denied'`
      )
      .get() as { event_type: string; payload_json: string } | null;
    expect(denied?.event_type).toBe('play.gate.denied');
    expect(denied?.payload_json).toContain(agentId);

    const gateRow = db
      .query('SELECT allowed, action FROM play_gate_decisions WHERE play_id = $pid')
      .get({ $pid: result.id }) as { allowed: number; action: string };
    expect(gateRow.allowed).toBe(0);
    expect(gateRow.action).toBe('block');
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

  test('rankPlayRecipients orders by TOC weightedScore', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();
    const highId = randomUUIDv7();
    const lowId = randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'Rank Expert', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, status, created_at)
       VALUES ($hid, 'agent', NULL, $eid, 'High', 'PAT-001', '111', 1, 'active', $now),
              ($lid, 'agent', NULL, $eid, 'Low', 'NOV-001', '222', 1, 'active', $now)`,
      { $hid: highId, $lid: lowId, $eid: expertId, $now: now }
    );

    const ctx = loadTocRoutingContext();
    const ranked = rankPlayRecipients(db, expertId, {
      context: {
        ...ctx,
        snap: withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z')),
        scoreByCallSign: new Map([
          ['PAT-001', 0.95],
          ['NOV-001', 0.1],
        ]),
        ropeBroken: false,
        throttleOnboarding: false,
      },
    });

    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.callSign).toBe('PAT-001');
    expect(ranked[0]!.weightedScore).toBeGreaterThan(ranked[1]!.weightedScore);
    db.close();
  });

  test('TOC rope defer skips reserve and emits play.gate.defer with routing payload', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();
    const patId = randomUUIDv7();
    const novId = randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'Rank Expert', 'NBA', 'totals', 0.8, 1, $now)`,
      { $id: expertId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, call_sign, telegram_id, active, status, created_at)
       VALUES ($pat, 'agent', NULL, $eid, 'Pat', 'PAT-001', '111', 1, 'active', $now),
              ($nov, 'agent', NULL, $eid, 'Nov', 'NOV-001', '222', 1, 'active', $now)`,
      { $pat: patId, $nov: novId, $eid: expertId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(patId));
    bindPartnerProfile(db, asTreeNodeId(novId));
    ensurePosition(db, patId, '_all', 5000);
    ensurePosition(db, novId, '_all', 5000);

    const snap = withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z'));
    const ctx = loadTocRoutingContext();
    const routingContext = {
      ...ctx,
      snap,
      scoreByCallSign: new Map([
        ['PAT-001', 0.92],
        ['NOV-001', 0.18],
      ]),
      throttleOnboarding: true,
      ropeBroken: false,
    };

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
      { flush: false, routingContext }
    );

    expect(result.enqueued).toBe(1);

    const deferGate = db
      .query(
        `SELECT action FROM play_gate_decisions WHERE play_id = $pid AND node_id = $nid`
      )
      .get({ $pid: result.id, $nid: novId }) as { action: string };
    expect(deferGate.action).toBe('defer');

    const deferRow = db
      .query(
        `SELECT event_type, payload_json FROM ops_channel_outbox WHERE event_type = 'play.gate.defer'`
      )
      .get() as { event_type: string; payload_json: string };
    expect(deferRow.event_type).toBe('play.gate.defer');
    expect(deferRow.payload_json).toContain('NOV-001');
    expect(deferRow.payload_json).toContain('"weightedScore"');

    const patDist = db
      .query('SELECT COUNT(*) AS n FROM play_distribution WHERE play_id = $pid AND node_id = $pat')
      .get({ $pid: result.id, $pat: patId }) as { n: number };
    expect(patDist.n).toBe(1);

    const novDist = db
      .query('SELECT COUNT(*) AS n FROM play_distribution WHERE play_id = $pid AND node_id = $nov')
      .get({ $pid: result.id, $nov: novId }) as { n: number };
    expect(novDist.n).toBe(0);
    db.close();
  });
});
