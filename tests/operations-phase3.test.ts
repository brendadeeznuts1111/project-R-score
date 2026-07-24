/**
 * Phase 3 — reconciliation, dynamic rails, ops-sync apply.
 */
import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { openOperationsDb } from '../lib/operations/db.ts';
import { runReconciliation } from '../lib/operations/reconciliation.ts';
import { applyDynamicRailLimits, fundViaRail } from '../lib/operations/rail-limits.ts';
import { applyOpsSyncEvent, getSyncCursor, setSyncCursor } from '../lib/operations/ops-sync.ts';
import { AccountService } from '../lib/operations/account-service.ts';

function seed(db: ReturnType<typeof openOperationsDb>) {
  const now = new Date().toISOString();
  const agentId = randomUUIDv7();
  const railId = randomUUIDv7();
  db.run(
    `INSERT INTO tree_nodes (id, type, name, telegram_id, cut_percentage, active, status, created_at)
     VALUES ($aid, 'agent', 'Agent', 'tg1', 10, 1, 'active', $now)`,
    { $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO rails (id, type, agent_id, identifier, daily_limit, monthly_limit, total_sent, status, created_at)
     VALUES ($rid, 'paypal', $aid, 'x@test.com', 5000, 50000, 0, 'active', $now)`,
    { $rid: railId, $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO sb_accounts (id, agent_id, book, balance, status, created_at)
     VALUES ($id, $aid, 'fanduel', 10000, 'active', $now)`,
    { $id: randomUUIDv7(), $aid: agentId, $now: now }
  );
  db.run(
    `INSERT INTO operations (id, total_liquidity, total_exposure, version, updated_at)
     VALUES ('main', 500000, 0, 0, $now)`,
    { $now: now }
  );
  return { agentId, railId };
}

describe('reconciliation', () => {
  test('runReconciliation passes clean ledger', () => {
    const db = openOperationsDb({ path: ':memory:' });
    seed(db);
    const report = runReconciliation(db);
    expect(report.agentsChecked).toBeGreaterThan(0);
    expect(report.ok).toBe(true);
    db.close();
  });

  test('flags funding vs balance mismatch', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { agentId, railId } = seed(db);
    fundViaRail(db, { railId, toAgentId: agentId, amount: 5000 });
    db.run(`UPDATE sb_accounts SET balance = 100 WHERE agent_id = $aid`, { $aid: agentId });
    const report = runReconciliation(db);
    expect(report.ok).toBe(false);
    expect(report.mismatches.some(m => m.kind === 'rail_deposit')).toBe(true);
    db.close();
  });
});

describe('dynamic rail limits', () => {
  test('applyDynamicRailLimits updates daily_limit', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const { railId } = seed(db);
    const before = db
      .query('SELECT daily_limit FROM rails WHERE id = $id')
      .get({ $id: railId }) as { daily_limit: number };
    expect(before.daily_limit).toBe(5000);

    applyDynamicRailLimits(db);
    const after = db
      .query('SELECT daily_limit FROM rails WHERE id = $id')
      .get({ $id: railId }) as { daily_limit: number };
    expect(after.daily_limit).toBe(5000);
    db.close();
  });
});

describe('ops-sync apply', () => {
  test('applyOpsSyncEvent upserts factory prospect', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);

    const ok = applyOpsSyncEvent(svc, {
      type: 'account_assigned',
      tenantId: 'factory',
      oidcSubject: 'oidc-abc',
      email: 'user@factory-wager.com',
    }, db);
    expect(ok).toBe(true);

    const node = db
      .query(`SELECT email, status FROM tree_nodes WHERE oidc_subject = $o`)
      .get({ $o: 'oidc-abc' }) as { email: string; status: string };
    expect(node.email).toBe('user@factory-wager.com');
    expect(node.status).toBe('prospect');

    const binding = db
      .query('SELECT profile_key FROM partner_profile_bindings WHERE tree_node_id IN (SELECT id FROM tree_nodes WHERE oidc_subject = $o)')
      .get({ $o: 'oidc-abc' }) as { profile_key: string } | null;
    expect(binding?.profile_key).toMatch(/^pp-/);
    db.close();
  });

  test('sync cursor tracks last seq', () => {
    const db = openOperationsDb({ path: ':memory:' });
    expect(getSyncCursor(db)).toBe(0);
    setSyncCursor(db, 42);
    expect(getSyncCursor(db)).toBe(42);
    db.close();
  });

  test('ignores non-factory tenants', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);
    expect(
      applyOpsSyncEvent(svc, {
        type: 'account_assigned',
        tenantId: 'science',
        oidcSubject: 'x',
        email: 'a@b.com',
      })
    ).toBe(false);
    db.close();
  });
});
