/**
 * Ops loop throughput + settlement hardening tests.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { MemoryChannelStore, R2ChannelStore } from '../lib/channels/channels.ts';
import {
  enqueueSettlementChannelEvent,
  processChannelOutbox,
  requeueFailedChannelOutbox,
} from '../lib/channels/outbox.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import {
  bindPartnerProfile,
  evaluateForNode,
} from '../lib/operations/partner-profile-bridge.ts';
import { ensurePosition, reservePlayWithRetry } from '../lib/operations/liquidity.ts';
import { settlePlay } from '../lib/operations/play-settlement.ts';
import { queryLoopMetricsSlice, loopThroughputLift } from '../lib/operations/ops-loop-metrics.ts';
import { backfillOpsLoopGateAttribution } from '../lib/operations/ops-loop-gate-backfill.ts';
import { runOpsLoopFixture, runOpsLoopMultiNodeFixture } from '../lib/operations/ops-loop-fixture.ts';
import { asPartnerTemplateId, asTreeNodeId } from '../lib/types/branded.ts';

function mockR2Bucket(): R2PutBucket {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      const body = store.get(key);
      if (!body) return null;
      return {
        body: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(body));
            c.close();
          },
        }),
      };
    },
    async put(key: string, value: string) {
      const prev = store.get(key) ?? '';
      store.set(key, key.endsWith('.jsonl') ? `${prev}${value}` : value);
    },
  };
}

describe('settlePlay stake_actual', () => {
  test('uses play_distribution.stake_actual over stake_recommended after gate adjust', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const playId = randomUUIDv7();
    const nodeId = randomUUIDv7();

    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, result)
       VALUES ($id, $eid, 'NBA', 'totals', 'Game', 'over', -110, 500, 0.8, 'hash', $now, 'pending')`,
      { $id: playId, $eid: randomUUIDv7(), $now: now }
    );
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at, stake_actual)
       VALUES ($pid, $nid, 'telegram', $now, 250)`,
      { $pid: playId, $nid: nodeId, $now: now }
    );
    ensurePosition(db, nodeId, '_all', 5000);
    db.run(
      `UPDATE positions SET available = available - 250, in_play = in_play + 250 WHERE node_id = $nid AND book = '_all'`,
      { $nid: nodeId }
    );
    db.run(
      `UPDATE operations SET total_exposure = total_exposure + 250 WHERE id = 'main'`
    );

    settlePlay(db, {
      playId,
      leafNodeId: nodeId,
      result: 'win',
      pnl: 100,
      skipExperimentOutcomes: true,
    });

    const pos = db
      .query(`SELECT in_play, available FROM positions WHERE node_id = $nid AND book = '_all'`)
      .get({ $nid: nodeId }) as { in_play: number; available: number };
    expect(pos.in_play).toBe(0);
    expect(pos.available).toBeGreaterThan(5000);
    db.close();
  });

  test('releases liquidity for every distribution node on settle', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const playId = randomUUIDv7();
    const nodeA = randomUUIDv7();
    const nodeB = randomUUIDv7();

    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, result)
       VALUES ($id, $eid, 'NBA', 'totals', 'Game', 'over', -110, 500, 0.8, 'hash', $now, 'pending')`,
      { $id: playId, $eid: randomUUIDv7(), $now: now }
    );
    for (const [nodeId, stake] of [
      [nodeA, 200],
      [nodeB, 300],
    ] as const) {
      db.run(
        `INSERT INTO play_distribution (play_id, node_id, channel, received_at, stake_actual)
         VALUES ($pid, $nid, 'telegram', $now, $stake)`,
        { $pid: playId, $nid: nodeId, $now: now, $stake: stake }
      );
      ensurePosition(db, nodeId, '_all', 5000);
      db.run(
        `UPDATE positions SET available = available - $stake, in_play = in_play + $stake
         WHERE node_id = $nid AND book = '_all'`,
        { $nid: nodeId, $stake: stake }
      );
    }
    db.run(
      `INSERT INTO operations (id, total_liquidity, total_exposure, version, updated_at)
       VALUES ('main', 10000, 500, 0, $now)
       ON CONFLICT(id) DO UPDATE SET total_exposure = 500`,
      { $now: now }
    );

    const result = settlePlay(db, {
      playId,
      leafNodeId: nodeA,
      result: 'win',
      pnl: 100,
      skipExperimentOutcomes: true,
    });
    expect(result.nodesSettled).toBe(2);

    for (const nodeId of [nodeA, nodeB]) {
      const pos = db
        .query(`SELECT in_play FROM positions WHERE node_id = $nid AND book = '_all'`)
        .get({ $nid: nodeId }) as { in_play: number };
      expect(pos.in_play).toBe(0);
    }
    const ops = db
      .query(`SELECT total_exposure FROM operations WHERE id = 'main'`)
      .get() as { total_exposure: number } | null;
    expect(ops?.total_exposure).toBe(0);
    db.close();
  });

  test('enqueues play.settled outbox for every distribution node', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const playId = randomUUIDv7();
    const nodeA = randomUUIDv7();
    const nodeB = randomUUIDv7();
    const nodeC = randomUUIDv7();

    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, result)
       VALUES ($id, $eid, 'NBA', 'totals', 'Game', 'over', -110, 500, 0.8, 'hash', $now, 'pending')`,
      { $id: playId, $eid: randomUUIDv7(), $now: now }
    );
    for (const nodeId of [nodeA, nodeB, nodeC]) {
      db.run(
        `INSERT INTO play_distribution (play_id, node_id, channel, received_at, stake_actual)
         VALUES ($pid, $nid, 'telegram', $now, 250)`,
        { $pid: playId, $nid: nodeId, $now: now }
      );
      ensurePosition(db, nodeId, '_all', 5000);
      db.run(
        `UPDATE positions SET available = available - 250, in_play = in_play + 250 WHERE node_id = $nid AND book = '_all'`,
        { $nid: nodeId }
      );
    }
    db.run(`UPDATE operations SET total_exposure = total_exposure + 250 WHERE id = 'main'`);

    settlePlay(db, {
      playId,
      leafNodeId: nodeA,
      result: 'win',
      pnl: 100,
      skipExperimentOutcomes: true,
    });

    const byKey = db
      .query(
        `SELECT COUNT(*) AS n FROM ops_channel_outbox
         WHERE event_type = 'play.settled'
           AND idempotency_key IN ($k0, $k1, $k2)`
      )
      .get({
        $k0: `settle:${playId}:${nodeA}`,
        $k1: `settle:${playId}:${nodeB}`,
        $k2: `settle:${playId}:${nodeC}`,
      }) as { n: number };
    expect(byKey.n).toBe(3);
    db.close();
  });
});

describe('evaluateForNode opsec', () => {
  test('denies when opsec score exceeds template max', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = randomUUIDv7();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
       VALUES ($id, 'agent', NULL, $eid, 'Agent', '1', 1, 'active', $now)`,
      { $id: nodeId, $eid: randomUUIDv7(), $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(nodeId));
    db.run(
      `UPDATE partner_profile_bindings SET metadata_json = $meta WHERE tree_node_id = $id`,
      { $id: nodeId, $meta: JSON.stringify({ opsecScore: 90, riskLevel: 'red' }) }
    );

    const gate = evaluateForNode(db, asTreeNodeId(nodeId), { suggestedStake: 100 });
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain('OpSec');
    db.close();
  });
});

describe('reservePlayWithRetry', () => {
  test('succeeds on normal reserve path', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = randomUUIDv7();
    ensurePosition(db, nodeId, '_all', 1000);
    const result = reservePlayWithRetry(db, nodeId, 100, '_all');
    expect(result.ok).toBe(true);
    db.close();
  });

  test('does not retry non-retryable liquidity errors', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = randomUUIDv7();
    ensurePosition(db, nodeId, '_all', 50);
    const result = reservePlayWithRetry(db, nodeId, 100, '_all', undefined, 5);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Insufficient/i);
    db.close();
  });
});

describe('processChannelOutbox R2 projector', () => {
  test('persists r2 events to injected R2ChannelStore', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const r2Store = new R2ChannelStore(mockR2Bucket());
    enqueueSettlementChannelEvent(db, {
      playId: 'play-1',
      leafNodeId: asTreeNodeId('node-1'),
      result: 'win',
      pnl: 10,
    });

    const result = await processChannelOutbox(db, { deliver: false, r2Store });
    expect(result.sent).toBe(1);

    const events = await r2Store.readSince('plays', 0);
    expect(events.length).toBe(1);
    db.close();
  });

  test('requeueFailedChannelOutbox flips failed rows to pending', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    enqueueSettlementChannelEvent(db, {
      playId: 'play-fail',
      leafNodeId: asTreeNodeId('node-fail'),
      result: 'win',
      pnl: 1,
    });
    db.run(
      `UPDATE ops_channel_outbox SET status = 'failed', retries = 1, last_error = 'demo'
       WHERE event_type = 'play.settled'`
    );
    expect(requeueFailedChannelOutbox(db)).toBe(1);
    const row = db
      .query(`SELECT status, last_error FROM ops_channel_outbox WHERE event_type = 'play.settled'`)
      .get() as { status: string; last_error: string | null };
    expect(row.status).toBe('pending');
    expect(row.last_error).toBeNull();

    const drained = await processChannelOutbox(db, { deliver: false });
    expect(drained.sent).toBe(1);
    db.close();
  });
});

describe('ops loop throughput proof', () => {
  test('fixture achieves >=60% lift vs empty baseline', async () => {
    const baselineDb = openOperationsDb({ path: ':memory:' });
    const baseline = queryLoopMetricsSlice(baselineDb);
    baselineDb.close();

    const fixtureDb = await runOpsLoopFixture();
    const post = queryLoopMetricsSlice(fixtureDb);
    fixtureDb.close();

    expect(post.dispatched).toBeGreaterThan(0);
    expect(post.settledViaFullLoop).toBeGreaterThan(0);
    expect(post.loopCompletionRate).toBeGreaterThanOrEqual(0.6);
    expect(post.manualStepsPerCycle).toBe(0);

    const lift = loopThroughputLift(baseline, post);
    expect(lift).toBeGreaterThanOrEqual(0.6);
  });

  test('multi-node fixture achieves >=65% row-aligned loopCompletionRate', async () => {
    const fixtureDb = await runOpsLoopMultiNodeFixture(3);
    const post = queryLoopMetricsSlice(fixtureDb);
    fixtureDb.close();

    expect(post.dispatched).toBe(3);
    expect(post.settledViaFullLoop).toBe(3);
    expect(post.loopCompletionRate).toBeGreaterThanOrEqual(0.65);
    expect(post.loopCompletionRateByPlay).toBe(1);
    expect(post.distinctPlaysDispatched).toBe(1);
    expect(post.manualStepsPerCycle).toBe(0);
  });

  test('gatedDefer split from gatedDeny on TOC defer path', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const expertId = randomUUIDv7();
    const patId = randomUUIDv7();
    const novId = randomUUIDv7();
    db.run(
      `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
       VALUES ($id, 'E', 'NBA', 'totals', 0.8, 1, $now)`,
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

    const { loadTocRoutingContext } = await import('../lib/operations/toc-play-routing.ts');
    const { withTocMetrics } = await import('../lib/toc-ops/export-snapshot.ts');
    const { buildDemoTocOpsFixture } = await import('../lib/toc-ops/fixture.ts');
    const { PlaySigner } = await import('../lib/operations/play-signing.ts');
    const { publishAndDispatch } = await import('../lib/operations/play-dispatcher.ts');

    const ctx = loadTocRoutingContext();
    await publishAndDispatch(
      new PlaySigner(),
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
      {
        flush: false,
        routingContext: {
          ...ctx,
          snap: withTocMetrics(buildDemoTocOpsFixture('2026-07-24T00:00:00.000Z')),
          scoreByCallSign: new Map([
            ['PAT-001', 0.92],
            ['NOV-001', 0.18],
          ]),
          throttleOnboarding: true,
          ropeBroken: false,
        },
      }
    );

    const slice = queryLoopMetricsSlice(db);
    expect(slice.gatedDefer).toBe(1);
    expect(slice.gatedDeny).toBe(0);
    db.close();
  });
});

describe('backfillOpsLoopGateAttribution', () => {
  test('fills missing gates and settle outbox on :memory:', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const now = new Date().toISOString();
    const playId = randomUUIDv7();
    const nodeId = randomUUIDv7();

    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, confidence, signed_hash, sent_at, result, pnl, closed_at)
       VALUES ($id, $eid, 'NBA', 'totals', 'Game', 'over', -110, 500, 0.8, 'hash', $now, 'win', 100, $now)`,
      { $id: playId, $eid: randomUUIDv7(), $now: now }
    );
    db.run(
      `INSERT INTO play_distribution (play_id, node_id, channel, received_at, stake_actual)
       VALUES ($pid, $nid, 'telegram', $now, 250)`,
      { $pid: playId, $nid: nodeId, $now: now }
    );

    const before = queryLoopMetricsSlice(db);
    expect(before.dispatched).toBe(1);
    expect(before.gatedAllow).toBe(0);
    expect(before.settledViaFullLoop).toBe(0);

    const dry = await backfillOpsLoopGateAttribution(db, { dryRun: true });
    expect(dry.gatesInserted).toBe(1);
    expect(dry.settleOutboxEnqueued).toBe(1);
    expect(queryLoopMetricsSlice(db).settledViaFullLoop).toBe(0);

    const result = await backfillOpsLoopGateAttribution(db, { outbox: { deliver: false } });
    expect(result.gatesInserted).toBe(1);
    expect(result.settleOutboxEnqueued).toBe(1);
    expect(result.outboxProcessed?.sent).toBe(1);

    const after = queryLoopMetricsSlice(db);
    expect(after.gatedAllow).toBe(1);
    expect(after.settledViaFullLoop).toBe(1);
    expect(after.loopCompletionRate).toBe(1);

    const again = await backfillOpsLoopGateAttribution(db, { outbox: { deliver: false } });
    expect(again.gatesInserted).toBe(0);
    expect(again.settleOutboxEnqueued).toBe(0);
    db.close();
  });
});

describe('bindPartnerProfile atomic upsert', () => {
  test('concurrent bind does not throw', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = randomUUIDv7();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
       VALUES ($id, 'agent', NULL, $eid, 'Agent', '1', 1, 'active', $now)`,
      { $id: nodeId, $eid: randomUUIDv7(), $now: now }
    );

    const a = bindPartnerProfile(db, asTreeNodeId(nodeId));
    const b = bindPartnerProfile(db, asTreeNodeId(nodeId), {
      templateId: asPartnerTemplateId('default-prospect'),
    });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    const count = db
      .query('SELECT COUNT(*) AS n FROM partner_profile_bindings WHERE tree_node_id = $id')
      .get({ $id: nodeId }) as { n: number };
    expect(count.n).toBe(1);
    db.close();
  });
});
