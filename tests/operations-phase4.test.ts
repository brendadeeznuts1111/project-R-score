// @see https://bun.com/docs/runtime/sqlite
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema, migrateSchema } from '../lib/operations/schema.ts';
import { applyBookScrapes, scrapeBookBalance } from '../lib/operations/book-reconcile.ts';
import { detectFraudSignals, FRAUD_GUARDRAILS } from '../lib/operations/fraud-guard.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';
import { settlePlay, sumCutsForNode } from '../lib/operations/play-settlement.ts';
import type { PlayInput } from '../lib/operations/play-signing.ts';

function testDb(): Database {
  const db = new Database(':memory:');
  initSchema(db);
  migrateSchema(db);
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ('exp1', 'Test Expert', 'NBA', 'spread', 0.7, 1, $now)`,
    { $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, name, parent_id, expert_id, cut_percentage, active, created_at)
     VALUES ('partner1', 'partner', 'Partner', NULL, 'exp1', 10, 1, $now),
            ('agent1', 'agent', 'Agent', 'partner1', 'exp1', 0, 1, $now)`,
    { $now: now }
  );
  db.run(
    `INSERT INTO sb_accounts (id, agent_id, book, balance, login_method, status, created_at)
     VALUES ('sb1', 'agent1', 'draftkings', 50000, 'webview', 'active', $now)`,
    { $now: now }
  );
  db.run(
    `INSERT INTO operations (id, total_liquidity, total_exposure, version, updated_at)
     VALUES ('main', 1000000, 0, 0, $now)`,
    { $now: now }
  );
  return db;
}

const basePlay = (): PlayInput => ({
  expertId: 'exp1',
  sport: 'NBA',
  market: 'spread',
  event: 'LAL vs BOS',
  selection: 'LAL -3.5',
  odds: -110,
  stakeRecommended: 1000,
  confidence: 0.75,
});

describe('fraud-guard', () => {
  test('blocks same-event correlation after threshold', () => {
    const db = testDb();
    const play = basePlay();
    const now = new Date().toISOString();

    for (let i = 0; i < FRAUD_GUARDRAILS.maxSameEventPlays24h; i++) {
      db.run(
        `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, sent_at)
         VALUES ($id, 'exp1', 'NBA', 'spread', $ev, $sel, -110, 100, 'h', $now)`,
        { $id: `p${i}`, $ev: play.event, $sel: `sel${i}`, $now: now }
      );
    }

    const result = detectFraudSignals(db, play);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('Event correlation');
    db.close();
  });

  test('blocks sport concentration when recent plays are same sport', () => {
    const db = testDb();
    const play = basePlay();
    const now = new Date().toISOString();

    for (let i = 0; i < FRAUD_GUARDRAILS.sameSportWindow; i++) {
      db.run(
        `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, sent_at)
         VALUES ($id, 'exp1', 'NBA', 'spread', $ev, $sel, -110, 100, 'h', datetime('now', '-2 hours'))`,
        { $id: `hist${i}`, $ev: `game${i}`, $sel: 'x' }
      );
    }

    const result = detectFraudSignals(db, play);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('Sport concentration');
    db.close();
  });

  test('publishAndDispatch runs validatePlayFull before insert', async () => {
    const db = testDb();
    const signer = new PlaySigner();
    const play = { ...basePlay(), event: 'Unique Event XYZ' };

    await publishAndDispatch(signer, play, db, {
      validate: true,
      flush: false,
      recordMetrics: false,
    });

    const row = db.query(`SELECT id FROM plays WHERE event = 'Unique Event XYZ'`).get();
    expect(row).toBeTruthy();
    db.close();
  });
});

describe('book-reconcile', () => {
  test('cached scrape returns sb_accounts balance', async () => {
    const db = testDb();
    const acct = db
      .query(`SELECT id, agent_id, book, username, balance, login_method, status FROM sb_accounts LIMIT 1`)
      .get() as {
      id: string;
      agent_id: string;
      book: string;
      username: string | null;
      balance: number;
      login_method: string;
      status: string;
    };

    const scrape = await scrapeBookBalance(acct, { live: false });
    expect(scrape.ok).toBe(true);
    expect(scrape.scrapedBalance).toBe(50000);
    expect(scrape.source).toBe('cached');
    db.close();
  });

  test('applyBookScrapes logs mismatch above tolerance', () => {
    const db = testDb();
    const { mismatches } = applyBookScrapes(db, [
      {
        accountId: 'sb1',
        agentId: 'agent1',
        book: 'draftkings',
        reportedBalance: 50000,
        scrapedBalance: 60000,
        source: 'cached',
        ok: true,
      },
    ]);
    expect(mismatches.length).toBe(1);
    expect(mismatches[0]!.kind).toBe('book_balance');

    const bal = db.query(`SELECT balance FROM sb_accounts WHERE id = 'sb1'`).get() as { balance: number };
    expect(bal.balance).toBe(60000);
    db.close();
  });
});

describe('play-settlement', () => {
  test('settlePlay applies cut cascade to parent', () => {
    const db = testDb();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO positions (id, node_id, book, deposited, available, in_play, version)
       VALUES ('pos1', 'agent1', '_all', 50000, 49000, 1000, 0)`
    );
    db.run(
      `INSERT INTO plays (id, expert_id, sport, market, event, selection, odds, stake_recommended, signed_hash, sent_at)
       VALUES ('play1', 'exp1', 'NBA', 'spread', 'LAL vs BOS', 'LAL', -110, 1000, 'hash', $now)`,
      { $now: now }
    );

    const result = settlePlay(db, {
      playId: 'play1',
      result: 'win',
      pnl: 900,
      leafNodeId: 'agent1',
      stakeReserved: 1000,
    });

    expect(result.cuts.allocations.length).toBe(1);
    expect(result.cuts.allocations[0]!.nodeId).toBe('partner1');
    expect(result.cuts.allocations[0]!.amount).toBe(90);

    const period = now.slice(0, 7);
    expect(sumCutsForNode(db, 'partner1', period)).toBe(90);

    const channel = db
      .query(
        `SELECT event_type FROM ops_channel_outbox WHERE idempotency_key = 'settle:play1:agent1'`
      )
      .get() as { event_type: string };
    expect(channel.event_type).toBe('play.settled');
    db.close();
  });
});

describe('postgres-bridge', () => {
  test('exportPostgresDdl returns table DDL', async () => {
    const { exportPostgresDdl } = await import('../lib/operations/postgres-bridge.ts');
    const ddl = exportPostgresDdl();
    expect(ddl).toContain('CREATE TABLE');
    expect(ddl).toContain('tree_nodes');
  });
});
