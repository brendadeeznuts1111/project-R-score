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
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

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
