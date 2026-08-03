// partner-ops-ledger-projection.test.ts — SQLite partner_ledger → partners-ops
// registry projection (the corrected #2: balances without new glossary codes).

import { describe, expect, test } from 'bun:test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Database } from 'bun:sqlite';
import {
  buildPartnersOpsRegistry,
  loadSqliteLedgerSnapshots,
  type PartnerLedgerSnapshot,
} from '../lib/telegram/partner-ops-registry';
import { ensurePartnerLedgerSchema, insertLedgerEntry } from '../lib/partner-profile/ledger';
import { createTestWorkspace } from './harness.ts';

async function seedOpsDb(root: string): Promise<void> {
  const dir = resolve(root, 'data');
  mkdirSync(dir, { recursive: true });
  const db = new Database(resolve(dir, 'operations.db'));
  ensurePartnerLedgerSchema(db);
  insertLedgerEntry(db, {
    partnerCode: 'JOHNNY',
    type: 'initial_capital',
    amount: 10000,
    currency: 'USD',
  });
  insertLedgerEntry(db, {
    partnerCode: 'JOHNNY',
    type: 'deposit',
    amount: 500,
    currency: 'USD',
    description: 'top-up',
  });
  db.close();
}

async function writeSeatFixture(root: string): Promise<void> {
  const dir = resolve(root, 'public/registry');
  mkdirSync(dir, { recursive: true });
  await Bun.write(
    resolve(dir, 'seat-capital-desk.json'),
    JSON.stringify({
      rows: [
        {
          callSign: 'JOHNNY-001',
          partnerCode: 'JOHNNY',
          fundStatus: 'ready',
          outs: [],
          incompleteOuts: 0,
        },
      ],
    })
  );
  await Bun.write(resolve(dir, 'telegram-handshake.json'), JSON.stringify({ rows: [] }));
  await Bun.write(resolve(dir, 'scrape-wire-taxonomy.json'), JSON.stringify({ bookRegistry: [] }));
}

describe('loadSqliteLedgerSnapshots', () => {
  test('empty map when the ops DB file is absent', async () => {
    await using workspace = await createTestWorkspace('ledger-proj-');
    const snapshots = await loadSqliteLedgerSnapshots(workspace.root);
    expect(snapshots.size).toBe(0);
  });

  test('empty map when the DB has no partner_ledger table', async () => {
    await using workspace = await createTestWorkspace('ledger-proj-');
    const dir = resolve(workspace.root, 'data');
    mkdirSync(dir, { recursive: true });
    const db = new Database(resolve(dir, 'operations.db')); // no migration — no table
    db.run(`CREATE TABLE other (id TEXT)`);
    db.close();
    const snapshots = await loadSqliteLedgerSnapshots(workspace.root);
    expect(snapshots.size).toBe(0);
  });

  test('snapshot: balance, initialCapital, rows, lastEventAt', async () => {
    await using workspace = await createTestWorkspace('ledger-proj-');
    await seedOpsDb(workspace.root);
    const snapshots = await loadSqliteLedgerSnapshots(workspace.root);
    const snap = snapshots.get('JOHNNY') as PartnerLedgerSnapshot;
    expect(snap.balance).toBe(10500);
    expect(snap.initialCapital).toBe(10000);
    expect(snap.rows).toBe(2);
    expect(snap.lastEventAt).toBeTruthy();
  });
});

describe('buildPartnersOpsRegistry ledger projection', () => {
  test('absent DB → no balance fields, no summary accountingBalance', async () => {
    await using workspace = await createTestWorkspace('ledger-proj-');
    await writeSeatFixture(workspace.root);
    const registry = await buildPartnersOpsRegistry(workspace.root);
    const partner = registry.partners.find(p => p.code === 'JOHNNY');
    expect(partner?.accounting.balance).toBeUndefined();
    expect(partner?.tracking.accounting.balance).toBeUndefined();
    expect(registry.summary.accountingBalance).toBeUndefined();
  });

  test('seeded DB → balance/initialCapital/sqlLedgerCount + summary aggregate', async () => {
    await using workspace = await createTestWorkspace('ledger-proj-');
    await writeSeatFixture(workspace.root);
    await seedOpsDb(workspace.root);
    const registry = await buildPartnersOpsRegistry(workspace.root);
    const partner = registry.partners.find(p => p.code === 'JOHNNY');
    expect(partner?.accounting.balance).toBe(10500);
    expect(partner?.accounting.initialCapital).toBe(10000);
    expect(partner?.accounting.sqlLedgerCount).toBe(2);
    expect(partner?.tracking.accounting.balance).toBe(10500);
    expect(registry.summary.accountingBalance).toBe(10500);
  });
});

void 0;
