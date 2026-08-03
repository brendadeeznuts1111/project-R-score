// partner-ledger.test.ts — Phase-2 accounting ledger: table client + stub.
// Offline: in-memory ops DB + temp profiles dir.

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import {
  ensurePartnerLedgerSchema,
  hasLedgerRows,
  insertLedgerEntry,
  ledgerBalance,
  listLedgerEntries,
} from '../lib/partner-profile/ledger';
import { initLedgerForPartner } from '../lib/partner-profile/accounting-stub';

describe('partner_ledger table client', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
  });

  test('schema is idempotent on reopen', () => {
    expect(() => ensurePartnerLedgerSchema(db)).not.toThrow();
    const tables = db
      .query(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'partner_ledger'`)
      .all();
    expect(tables.length).toBe(1);
  });

  test('insertLedgerEntry accumulates balance_after in order', () => {
    const first = insertLedgerEntry(db, {
      partnerCode: 'JOHNNY',
      type: 'initial_capital',
      amount: 10000,
      currency: 'USD',
    });
    expect(first.balanceAfter).toBe(10000);

    const second = insertLedgerEntry(db, {
      partnerCode: 'JOHNNY',
      type: 'deposit',
      amount: 500,
      currency: 'USD',
      description: 'top-up',
    });
    expect(second.balanceAfter).toBe(10500);

    expect(ledgerBalance(db, 'JOHNNY')).toBe(10500);
    expect(ledgerBalance(db, 'OTHER')).toBe(0);

    const rows = listLedgerEntries(db, 'JOHNNY');
    expect(rows.map(r => r.type)).toEqual(['initial_capital', 'deposit']);
    expect(rows[0]!.balanceAfter).toBe(10000);
    expect(rows[1]!.description).toBe('top-up');
    expect(hasLedgerRows(db, 'JOHNNY')).toBe(true);
    expect(hasLedgerRows(db, 'OTHER')).toBe(false);
  });

  test('bookKey + trackingId + account fields are stored and listed', () => {
    const row = insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'settlement',
      amount: -1200,
      currency: 'USD',
      bookKey: 'parlay21-com',
      trackingId: 'weekly-2026-08-03',
      accountScope: 'rail:venmo:spen@venmo.com',
      counterparty: 'rail:venmo:john@venmo.com',
      source: 'John (agent)',
      externalId: 'VENMO-123',
      proof: 'https://registry.factory-wager.com/api/registry/proofs/SPEN/1-shot.png',
      batchId: 'batch-1',
    });
    expect(row.bookKey).toBe('parlay21-com');
    expect(row.trackingId).toBe('weekly-2026-08-03');
    expect(row.accountScope).toBe('rail:venmo:spen@venmo.com');
    expect(row.counterparty).toBe('rail:venmo:john@venmo.com');
    expect(row.source).toBe('John (agent)');
    expect(row.externalId).toBe('VENMO-123');
    expect(row.proof).toContain('/proofs/SPEN/');
    expect(row.batchId).toBe('batch-1');
    const listed = listLedgerEntries(db, 'SPEN');
    expect(listed[0]).toMatchObject({
      bookKey: 'parlay21-com',
      trackingId: 'weekly-2026-08-03',
      accountScope: 'rail:venmo:spen@venmo.com',
      counterparty: 'rail:venmo:john@venmo.com',
      source: 'John (agent)',
      externalId: 'VENMO-123',
      proof: expect.stringContaining('/proofs/SPEN/'),
      batchId: 'batch-1',
    });
    // partner-level rows omit the optional keys entirely
    const plain = insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'settlement',
      amount: 500,
      currency: 'USD',
    });
    expect(plain.accountScope).toBeUndefined();
    expect(plain.externalId).toBeUndefined();
    expect(plain.batchId).toBeUndefined();
  });
});

describe('initLedgerForPartner (accounting stub)', () => {
  let db: Database;
  let profilesDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-ledger-profiles-'));
  });

  async function seedProfile(code: string): Promise<string> {
    const path = join(profilesDir, `${code}.toml`);
    await Bun.write(path, `[identity]\ncode = "${code}"\ncallSign = "${code}-001"\n`);
    return path;
  }

  test('inserts initial_capital row + mirrors into profile TOML', async () => {
    await seedProfile('JOHNNY');
    const res = await initLedgerForPartner({
      code: 'JOHNNY',
      initialBalance: 10000,
      currency: 'USD',
      db,
      profilesDir,
    });
    expect(res.inserted).toBe(true);
    expect(res.row).toMatchObject({
      partnerCode: 'JOHNNY',
      type: 'initial_capital',
      amount: 10000,
      currency: 'USD',
      balanceAfter: 10000,
    });

    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    const profile = Bun.TOML.parse(text) as Record<string, unknown>;
    const accounting = profile.accounting as Record<string, unknown>;
    expect(accounting.fundStatus).toBe('ready');
    const ledger = accounting.ledger as Record<string, unknown>[];
    expect(ledger.length).toBe(1);
    expect(ledger[0]).toMatchObject({ type: 'initial_capital', amount: 10000, currency: 'USD' });
  });

  test('defaults: amount 0, currency USD; idempotent on rerun', async () => {
    await seedProfile('JOHNNY');
    const first = await initLedgerForPartner({ code: 'JOHNNY', db, profilesDir });
    expect(first.row).toMatchObject({ amount: 0, currency: 'USD', balanceAfter: 0 });

    const second = await initLedgerForPartner({ code: 'JOHNNY', db, profilesDir });
    expect(second.inserted).toBe(false);
    expect(second.row).toBeNull();
    expect(listLedgerEntries(db, 'JOHNNY').length).toBe(1);

    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    const profile = Bun.TOML.parse(text) as Record<string, unknown>;
    const accounting = profile.accounting as Record<string, unknown>;
    expect((accounting.ledger as unknown[]).length).toBe(1); // no duplicate TOML entry
    expect(accounting.fundStatus).toBe('ready');
  });

  test('missing profile: ledger row still created, mirror skipped', async () => {
    const res = await initLedgerForPartner({
      code: 'NOPROF',
      initialBalance: 250,
      currency: 'EUR',
      db,
      profilesDir,
    });
    expect(res.inserted).toBe(true);
    expect(res.row?.currency).toBe('EUR');
    expect(listLedgerEntries(db, 'NOPROF').length).toBe(1);
  });

  test('negative initialBalance rejected at the lib boundary', async () => {
    await expect(
      initLedgerForPartner({ code: 'JOHNNY', initialBalance: -5, db, profilesDir })
    ).rejects.toThrow(/initialBalance must be ≥ 0/);
  });

  test('non-array accounting.ledger in profile is replaced, not crashed on', async () => {
    await Bun.write(
      join(profilesDir, 'JOHNNY.toml'),
      `[identity]\ncode = "JOHNNY"\ncallSign = "JOHNNY-001"\n\n[accounting]\nledger = "bogus"\n`
    );
    const res = await initLedgerForPartner({ code: 'JOHNNY', initialBalance: 10, db, profilesDir });
    expect(res.inserted).toBe(true);
    const text = await Bun.file(join(profilesDir, 'JOHNNY.toml')).text();
    const profile = Bun.TOML.parse(text) as Record<string, unknown>;
    expect(Array.isArray((profile.accounting as Record<string, unknown>).ledger)).toBe(true);
  });
});

void 0;
