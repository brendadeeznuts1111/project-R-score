// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { openOperationsDb } from '../lib/operations/db.ts';
import { seedOperationsDemo } from '../lib/operations/ops-seed.ts';
import {
  exportCatalogSnapshot,
  isPartnerProfileBindingsEmpty,
  queryCatalogAccounts,
  seedPartnerProfilesDemo,
} from '../lib/operations/partner-profile-seed.ts';
import { queryPartnersSlice } from '../lib/operations/partner-profile-bridge.ts';
import { queryOpsChannelHealth } from '../lib/channels/outbox.ts';
import { joinPath } from '../lib/path-bun.ts';

describe('partner profile demo seed', () => {
  test('binds profiles, accounts, and channel outbox', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    await seedOperationsDemo(db, { force: true, ifEmpty: false });
    expect(isPartnerProfileBindingsEmpty(db)).toBe(true);

    const result = await seedPartnerProfilesDemo(db, { ifEmpty: true });
    expect(result.seeded).toBe(true);
    expect(result.bindings).toBeGreaterThanOrEqual(4);
    expect(Object.keys(result.byLifecycle ?? {}).length).toBeGreaterThan(1);
    expect(result.channelEvents).toBeGreaterThan(0);

    const partners = queryPartnersSlice(db);
    expect(partners.bound).toBe(result.bindings);
    expect(partners.unboundAgents).toBe(0);

    const health = queryOpsChannelHealth(db);
    expect(health.pending + health.sent + health.failed).toBeGreaterThan(0);
    expect(health.sent).toBeGreaterThan(0);

    const accounts = queryCatalogAccounts(db);
    expect(accounts.length).toBeGreaterThan(0);

    const again = await seedPartnerProfilesDemo(db, { ifEmpty: true });
    expect(again.seeded).toBe(false);

    db.close();
  });

  test('exports catalog snapshot JSON', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    await seedOperationsDemo(db, { force: true, ifEmpty: false });
    await seedPartnerProfilesDemo(db, { force: true });

    const out = joinPath(import.meta.dir, '../.tmp/partner-profile-seed-catalog.json');
    await Bun.$`mkdir -p ${joinPath(import.meta.dir, '../.tmp')}`.quiet();
    const written = await exportCatalogSnapshot(db, out);
    expect(written.accounts).toBeGreaterThan(0);
    const json = await Bun.file(out).json();
    expect(json.source).toBe('snapshot');
    expect(Array.isArray(json.accounts)).toBe(true);

    db.close();
  });
});
