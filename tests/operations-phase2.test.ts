/**
 * Phase 2 operations — validation, liquidity, rails, cuts, phones.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { validatePlay, PLAY_GUARDRAILS } from '../lib/operations/play-validation.ts';
import {
  ensurePosition,
  reservePlay,
  reserveOperationsLiquidity,
} from '../lib/operations/liquidity.ts';
import { fundViaRail } from '../lib/operations/rail-limits.ts';
import { calculateCutCascade } from '../lib/operations/cut-engine.ts';
import { AccountService } from '../lib/operations/account-service.ts';
import { publishAndDispatch } from '../lib/operations/play-dispatcher.ts';
import { PlaySigner } from '../lib/operations/play-signing.ts';

function seedPlatform(db: ReturnType<typeof openOperationsDb>) {
  const now = new Date().toISOString();
  const expertId = randomUUIDv7();
  const partnerId = randomUUIDv7();
  const agentId = randomUUIDv7();
  const subId = randomUUIDv7();
  const railId = randomUUIDv7();

  db.run(
    `INSERT INTO experts (id, name, sport, market, edge_score, active, created_at)
     VALUES ($id, 'Expert', 'NBA', 'totals', 0.85, 1, $now)`,
    { $id: expertId, $now: now }
  );
  db.run(
    `INSERT INTO operations (id, total_liquidity, total_exposure, version, updated_at)
     VALUES ('main', 1000000, 0, 0, $now)`,
    { $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, cut_percentage, active, status, created_at)
     VALUES ($pid, 'partner', NULL, $eid, 'Partner', 'p1', 15, 1, 'partner', $now)`,
    { $pid: partnerId, $eid: expertId, $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, cut_percentage, active, status, created_at)
     VALUES ($aid, 'agent', $pid, $eid, 'Agent', 'a1', 10, 1, 'active', $now)`,
    { $aid: agentId, $pid: partnerId, $now: now }
  );
  db.run(
    `INSERT INTO tree_nodes (id, type, parent_id, expert_id, name, telegram_id, active, status, created_at)
     VALUES ($sid, 'sub_agent', $aid, $eid, 'Sub', 's1', 1, 'active', $now)`,
    { $sid: subId, $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO rails (id, type, agent_id, identifier, daily_limit, monthly_limit, total_sent, status, created_at)
     VALUES ($rid, 'paypal', $aid, 'ops@test.com', 50000, 200000, 0, 'active', $now)`,
    { $rid: railId, $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO sb_accounts (id, agent_id, book, balance, status, created_at)
     VALUES ($id, $aid, 'fanduel', 10000, 'active', $now)`,
    { $id: randomUUIDv7(), $aid: agentId, $now: now }
  );

  return { expertId, partnerId, agentId, subId, railId };
}

describe('play-validation', () => {
  test('rejects stake above edge limit', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { expertId } = seedPlatform(db);
    const result = validatePlay(db, {
      expertId,
      sport: 'NBA',
      market: 'totals',
      event: 'A vs B',
      selection: 'over 200',
      odds: -110,
      stakeRecommended: 600_000,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain('exceeds');
    db.close();
  });

  test('rejects rate limit', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { expertId } = seedPlatform(db);
    const signer = new PlaySigner();
    const base = {
      expertId,
      sport: 'NBA',
      market: 'totals',
      selection: 'over 200',
      odds: -110,
      stakeRecommended: 500,
    };
    for (let i = 0; i < PLAY_GUARDRAILS.maxPlaysPerHour; i++) {
      await publishAndDispatch(
        signer,
        { ...base, event: `Game ${i}`, selection: `over ${200 + i}` },
        db,
        { flush: false, validate: true, recordMetrics: false }
      );
    }
    const blocked = validatePlay(db, { ...base, event: 'Game final', selection: 'over 999' });
    expect(blocked.valid).toBe(false);
    db.close();
  });
});

describe('liquidity', () => {
  test('reservePlay deducts available atomically', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { agentId } = seedPlatform(db);
    ensurePosition(db, agentId, '_all', 50_000);

    const r1 = reservePlay(db, agentId, 10_000);
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.remaining).toBe(40_000);

    const r2 = reservePlay(db, agentId, 50_000);
    expect(r2.ok).toBe(false);

    db.close();
  });

  test('reserveOperationsLiquidity uses platform pool', () => {
    const db = openOperationsDb({ path: ':memory:' });
    seedPlatform(db);
    const r = reserveOperationsLiquidity(db, 100_000);
    expect(r.ok).toBe(true);
    db.close();
  });
});

describe('rail-limits', () => {
  test('fundViaRail enforces daily limit', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { agentId, railId } = seedPlatform(db);

    const ok = fundViaRail(db, { railId, toAgentId: agentId, amount: 10_000 });
    expect(ok.ok).toBe(true);

    const over = fundViaRail(db, { railId, toAgentId: agentId, amount: 45_000 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toContain('Daily limit');

    db.close();
  });
});

describe('cut-engine', () => {
  test('cascade takes cuts from remaining up-tree', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { subId } = seedPlatform(db);
    const result = calculateCutCascade(db, subId, 1000);
    expect(result.grossPnl).toBe(1000);
    expect(result.allocations.length).toBe(2);
    expect(result.netToOrigin).toBeLessThan(1000);
    expect(result.netToOrigin).toBeGreaterThan(700);
    db.close();
  });
});

describe('phone lifecycle', () => {
  test('issue and return phone', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { agentId } = seedPlatform(db);
    const svc = new AccountService(db);
    const phoneId = randomUUIDv7();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO phones (id, model, status) VALUES ($id, 'iPhone', 'inventory')`,
      { $id: phoneId }
    );
    svc.issuePhone(phoneId, agentId);
    const issued = db.query('SELECT status FROM phones WHERE id = $id').get({ $id: phoneId }) as {
      status: string;
    };
    expect(issued.status).toBe('issued');

    svc.returnPhone(phoneId);
    const returned = db.query('SELECT status FROM phones WHERE id = $id').get({ $id: phoneId }) as {
      status: string;
    };
    expect(returned.status).toBe('returned');
    db.close();
  });
});

describe('publish with guardrails', () => {
  test('publish rejects invalid stake before insert', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { expertId } = seedPlatform(db);
    const signer = new PlaySigner();

    await expect(
      publishAndDispatch(
        signer,
        {
          expertId,
          sport: 'NBA',
          market: 'totals',
          event: 'X vs Y',
          selection: 'over',
          odds: -110,
          stakeRecommended: 999_999,
        },
        db,
        { flush: false, validate: true }
      )
    ).rejects.toThrow(/exceeds/);

    const count = db.query('SELECT COUNT(*) as n FROM plays').get() as { n: number };
    expect(count.n).toBe(0);
    db.close();
  });
});
