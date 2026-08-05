// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  backfillPartnerBindings,
  bindPartnerProfile,
  evaluateForNode,
  inferSignalTypeFromPlay,
  materializePartnerProfile,
  queryPartnersSlice,
  templateIdForSource,
  DEFAULT_TEMPLATE_ID,
} from '../lib/operations/partner-profile-bridge.ts';
import { buildOpsSummary } from '../lib/operations/ops-summary.ts';
import { applyOpsSyncEvent } from '../lib/operations/ops-sync.ts';
import { AccountService } from '../lib/operations/account-service.ts';
import type { PartnerLifecycleStatus } from '../lib/partner-profile/schema.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

const LIFECYCLE_GATE_CASES = [
  ['active', 'allow', true],
  ['graduated', 'allow', true],
  ['materialized', 'allow', true],
  ['kyc_pending', 'allow', true],
  ['cultivating', 'defer', false],
  ['signup', 'defer', false],
  ['suspended', 'block', false],
  ['terminated', 'block', false],
] as const satisfies ReadonlyArray<
  readonly [PartnerLifecycleStatus, 'allow' | 'block' | 'defer', boolean]
>;

function insertNode(
  db: ReturnType<typeof openOperationsDb>,
  opts?: { id?: string; type?: string; status?: string; name?: string; active?: number } // brand-ok — test fixture PK
) {
  const o = opts ?? {};
  const id = o.id ?? Bun.randomUUIDv7();
  const tg = `tg-${Bun.randomUUIDv7()}`;
  db.run(
    `INSERT INTO tree_nodes (id, type, name, telegram_id, active, status, created_at)
     VALUES ($id, $type, $name, $tg, $active, $status, datetime('now'))`,
    {
      $id: id,
      $type: o.type ?? 'agent',
      $name: o.name ?? 'Test Agent',
      $tg: tg,
      $active: o.active ?? 1,
      $status: o.status ?? 'active',
    }
  );
  return asTreeNodeId(id);
}

describe('partner-profile-bridge', () => {
  test('templateIdForSource defaults to default-prospect', () => {
    expect(String(templateIdForSource())).toBe(DEFAULT_TEMPLATE_ID);
    expect(String(templateIdForSource('referral'))).toBe(DEFAULT_TEMPLATE_ID);
  });

  test('inferSignalTypeFromPlay maps market text', () => {
    expect(inferSignalTypeFromPlay({ market: 'arbitrage', selection: 'side a' })).toBe('arb');
    expect(inferSignalTypeFromPlay({ market: 'steam move' })).toBe('steam');
    expect(inferSignalTypeFromPlay({ market: 'spread', selection: 'home' })).toBe('manual');
  });

  test('bindPartnerProfile creates binding and materialize reads it', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = insertNode(db, { status: 'prospect' });
    const binding = bindPartnerProfile(db, nodeId);
    expect(String(binding.treeNodeId)).toBe(String(nodeId));
    expect(String(binding.templateId)).toBe(DEFAULT_TEMPLATE_ID);
    expect(binding.lifecycleStatus).toBe('materialized');

    const profile = materializePartnerProfile(db, nodeId);
    expect(profile).not.toBeNull();
    expect(profile!.nodeName).toBe('Test Agent');
    expect(profile!.platformAccountCount).toBe(0);
    expect(String(profile!.binding.profileKey)).toContain('pp-');
    db.close();
  });

  test('bindPartnerProfile is idempotent on re-bind', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = insertNode(db, { status: 'partner' });
    const a = bindPartnerProfile(db, nodeId);
    const b = bindPartnerProfile(db, nodeId, { lifecycleStatus: 'active' });
    expect(String(a.profileKey)).toBe(String(b.profileKey));
    expect(b.lifecycleStatus).toBe('active');
    expect(queryPartnersSlice(db).bound).toBe(1);
    db.close();
  });

  test('queryPartnersSlice counts unbound active nodes', () => {
    const db = openOperationsDb({ path: ':memory:' });
    insertNode(db, { name: 'Unbound' });
    const boundId = insertNode(db, { name: 'Bound' });
    bindPartnerProfile(db, boundId);
    const slice = queryPartnersSlice(db);
    expect(slice.bound).toBe(1);
    expect(slice.unboundAgents).toBe(1);
    expect(slice.recent.length).toBe(1);
    db.close();
  });

  test('backfillPartnerBindings binds all unbound active nodes', () => {
    const db = openOperationsDb({ path: ':memory:' });
    insertNode(db, { name: 'A' });
    insertNode(db, { name: 'B', status: 'partner' });
    insertNode(db, { name: 'Inactive', active: 0 });
    const dry = backfillPartnerBindings(db, { dryRun: true });
    expect(dry.scanned).toBe(2);
    expect(queryPartnersSlice(db).bound).toBe(0);
    const real = backfillPartnerBindings(db);
    expect(real.bound).toBe(2);
    expect(queryPartnersSlice(db).bound).toBe(2);
    expect(queryPartnersSlice(db).unboundAgents).toBe(0);
    db.close();
  });

  test('evaluateForNode blocks without binding and allows after bind', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = insertNode(db, { status: 'active' });
    const blocked = evaluateForNode(db, nodeId, { suggestedStake: 100 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.action).toBe('block');

    bindPartnerProfile(db, nodeId, { lifecycleStatus: 'active' });
    const allowed = evaluateForNode(db, nodeId, { suggestedStake: 100, signalType: 'manual' });
    expect(allowed.allowed).toBe(true);
    expect(allowed.action).toBe('allow');

    const capped = evaluateForNode(db, nodeId, {
      suggestedStake: 50_000,
      signalType: 'manual',
    });
    expect(capped.allowed).toBe(true);
    expect(capped.action).toBe('adjust');
    expect(capped.adjustedStake).toBeLessThan(50_000);
    db.close();
  });

  test.each(LIFECYCLE_GATE_CASES)(
    'gate for %s is %s',
    (lifecycleStatus, expectedAction, expectedAllowed) => {
      const db = openOperationsDb({ path: ':memory:' });
      const nodeId = insertNode(db, { status: 'active' });
      bindPartnerProfile(db, nodeId, { lifecycleStatus });

      const evaluation = evaluateForNode(db, nodeId, {
        suggestedStake: 100,
        signalType: 'manual',
      });

      expect(evaluation.action).toBe(expectedAction);
      expect(evaluation.allowed).toBe(expectedAllowed);
      db.close();
    }
  );

  test('rejects an invalid lifecycle on single-entity reads; soft-quarantines aggregates', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = insertNode(db, { status: 'active' });
    const goodId = insertNode(db, { name: 'Good', status: 'active' });
    bindPartnerProfile(db, nodeId, { lifecycleStatus: 'active' });
    bindPartnerProfile(db, goodId, { lifecycleStatus: 'active' });
    db.run('PRAGMA ignore_check_constraints = ON');
    db.run(
      `UPDATE partner_profile_bindings SET lifecycle_status = 'frozen' WHERE tree_node_id = $id`,
      { $id: nodeId }
    );

    // Single-entity paths still fail closed (parse at boundary).
    expect(() => materializePartnerProfile(db, nodeId)).toThrow(
      'Invalid PartnerLifecycleStatus: frozen'
    );
    expect(() => evaluateForNode(db, nodeId, { suggestedStake: 100 })).toThrow(
      'Invalid PartnerLifecycleStatus: frozen'
    );
    // Aggregates soft-quarantine so ops-summary / limits stay up.
    const slice = queryPartnersSlice(db);
    expect(slice.bound).toBe(2);
    expect(slice.invalidLifecycle).toBe(1);
    expect(slice.byLifecycle.active).toBe(1);
    expect(slice.recent.every(r => r.lifecycleStatus === 'active')).toBe(true);
    db.close();
  });

  test('ops-sync account_assigned binds partner profile and emits partner.bound once', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const svc = new AccountService(db);
    const event = {
      type: 'account_assigned',
      tenantId: 'factory',
      oidcSubject: 'oidc-test-subject',
      email: 'agent@example.com',
      name: 'Portal Agent',
    };
    expect(applyOpsSyncEvent(svc, event, db)).toBe(true);
    expect(applyOpsSyncEvent(svc, event, db)).toBe(true); // re-sync is update, no second identity event

    const slice = queryPartnersSlice(db);
    expect(slice.bound).toBe(1);
    expect(slice.recent[0]?.name).toBe('Portal Agent');

    const identity = db
      .query(
        `SELECT COUNT(*) AS n FROM ops_channel_outbox
         WHERE topic = 'identity' AND event_type = 'partner.bound'`
      )
      .get() as { n: number };
    expect(identity.n).toBe(1);
    svc.close();
    db.close();
  });

  test('buildOpsSummary includes partners slice', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const nodeId = insertNode(db);
    bindPartnerProfile(db, nodeId);
    const s = buildOpsSummary(db, 'live');
    expect(s.partners.bound).toBe(1);
    expect(s.partners.byLifecycle).toBeDefined();
    expect(s.channels).toHaveProperty('pending');
    db.close();
  });
});
