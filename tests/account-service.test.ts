/**
 * Account service on unified operations schema.
 * @see ../lib/operations/account-service.ts
 */
import { describe, expect, test } from 'bun:test';
import { AccountService, PROMOTION_THRESHOLDS } from '../lib/operations/account-service.ts';
import { openOperationsDb } from '../lib/operations/db.ts';

describe('AccountService', () => {
  test('syncProspectFromPortal creates prospect node', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);

    const node = svc.syncProspectFromPortal({
      oidcSubject: 'oidc-test-123',
      email: 'agent@factory-wager.com',
      name: 'Test Agent',
    });

    expect(node.status).toBe('prospect');
    expect(node.oidcSubject).toBe('oidc-test-123');
    expect(node.email).toBe('agent@factory-wager.com');

    const again = svc.syncProspectFromPortal({
      oidcSubject: 'oidc-test-123',
      email: 'agent@factory-wager.com',
      telegramId: '999888',
    });
    expect(again.id).toBe(node.id);
    expect(again.telegramId).toBe('999888');

    db.close();
  });

  test('canPromote requires monthly thresholds', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);

    const node = svc.create({
      type: 'agent',
      parentId: null,
      expertId: null,
      name: 'Agent',
      telegramId: '111',
      railPreference: 'paypal',
      cutPercentage: 10,
      status: 'active',
    });

    let check = await svc.canPromote(node.id);
    expect(check.eligible).toBe(false);

    const period = new Date().toISOString().slice(0, 7);
    db.run(
      `INSERT INTO growth_metrics (node_id, period, plays_placed, volume, pnl)
       VALUES ($id, $p, $plays, $vol, $pnl)`,
      {
        $id: node.id,
        $p: period,
        $plays: PROMOTION_THRESHOLDS.playsPlaced,
        $vol: PROMOTION_THRESHOLDS.volume,
        $pnl: PROMOTION_THRESHOLDS.pnl,
      }
    );

    check = await svc.canPromote(node.id);
    expect(check.eligible).toBe(true);

    db.close();
  });

  test('rollupPartnerLiquidity aggregates downstream', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);
    const now = new Date().toISOString();

    const partnerId = Bun.randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, telegram_id, total_liquidity, active, status, created_at)
       VALUES ($id, 'partner', 'P', 'p1', 0, 1, 'partner', $now)`,
      { $id: partnerId, $now: now }
    );
    db.run(
      `INSERT INTO tree_nodes (id, type, parent_id, name, telegram_id, total_liquidity, active, status, created_at)
       VALUES ($id, 'agent', $pid, 'A', 'a1', 5000, 1, 'active', $now)`,
      { $id: Bun.randomUUIDv7(), $pid: partnerId, $now: now }
    );

    const count = svc.rollupPartnerLiquidity();
    expect(count).toBe(1);

    const partner = svc.getById(partnerId);
    expect(partner?.totalLiquidity).toBe(5000);

    db.close();
  });

  test('create and retrieve with call_sign', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);

    const node = svc.create({
      type: 'agent',
      parentId: null,
      expertId: null,
      name: 'CallSign Agent',
      callSign: 'ace-42',
      telegramId: 'cs-test-id',
      railPreference: 'paypal',
      cutPercentage: 10,
      status: 'active',
    });

    expect(node.callSign).toBe('ace-42');

    const fetched = svc.getById(node.id);
    expect(fetched?.callSign).toBe('ace-42');

    db.close();
  });

  test('call_sign UNIQUE constraint enforced', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);

    svc.create({
      type: 'agent',
      parentId: null,
      expertId: null,
      name: 'First',
      callSign: 'shared-call',
      telegramId: 'cs-first',
      railPreference: 'paypal',
      cutPercentage: 10,
      status: 'active',
    });

    expect(() => {
      svc.create({
        type: 'agent',
        parentId: null,
        expertId: null,
        name: 'Second',
        callSign: 'shared-call',
        telegramId: 'cs-second',
        railPreference: 'paypal',
        cutPercentage: 10,
        status: 'active',
      });
    }).toThrow();

    db.close();
  });
});
