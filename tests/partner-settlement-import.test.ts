// partner-settlement-import.test.ts — bulk import + reference idempotency.

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Database } from 'bun:sqlite';
import {
  importSettlements,
  parseSettlementFile,
} from '../tools/partner-settlement';
import {
  ensurePartnerLedgerSchema,
  ledgerEntryExists,
  listLedgerEntries,
} from '../lib/partner-profile/ledger';
import { initSchema, migrateSchema } from '../lib/operations/schema';

const OLD_DDL = `
CREATE TABLE IF NOT EXISTS partner_ledger (
  id TEXT PRIMARY KEY,
  partner_code TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  balance_after REAL NOT NULL,
  created_at TEXT NOT NULL
);
`;

describe('parseSettlementFile', () => {
  test('CSV with header maps columns', () => {
    const rows = parseSettlementFile(
      'amount,currency,description,reference\n-500,USD,Loss on UFC,ufc-1\n+1200,USD,Win on tennis,wim-2\n'
    );
    expect(rows).toEqual([
      { amount: -500, currency: 'USD', description: 'Loss on UFC', reference: 'ufc-1' },
      { amount: 1200, currency: 'USD', description: 'Win on tennis', reference: 'wim-2' },
    ]);
  });

  test('JSONL parses with optional per-row code', () => {
    const rows = parseSettlementFile(
      '{"code":"SPEN","amount":500,"currency":"USD","reference":"a"}\n{"amount":-100,"reference":"b"}\n',
      'jsonl'
    );
    expect(rows).toEqual([
      { code: 'SPEN', amount: 500, currency: 'USD', reference: 'a' },
      { amount: -100, reference: 'b' },
    ]);
  });
});

describe('migrateSchema adds the reference column', () => {
  test('old-schema DB gains reference + unique index', () => {
    const db = new Database(':memory:');
    initSchema(db); // full ops schema (partner_ledger included)
    db.exec('DROP TABLE partner_ledger');
    db.exec(OLD_DDL); // simulate a pre-reference deployment
    migrateSchema(db); // migration path adds the column + index
    const cols = (db.query('PRAGMA table_info(partner_ledger)').all() as { name: string }[]).map(
      c => c.name
    );
    expect(cols).toContain('reference');
    const indexes = (db.query(`PRAGMA index_list(partner_ledger)`).all() as {
      name: string;
    }[]).map(i => i.name);
    expect(indexes).toContain('idx_partner_ledger_reference');
    db.close();
  });
});

describe('importSettlements', () => {
  let db: Database;
  let profilesDir: string;

  beforeEach(() => {
    db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    profilesDir = mkdtempSync(join(tmpdir(), 'fw-import-profiles-'));
  });

  test('imports rows, skipping on re-import (idempotent references)', async () => {
    const rows = [
      { amount: -500, currency: 'USD', description: 'Loss on UFC', reference: 'ufc-1' },
      { amount: 1200, currency: 'USD', description: 'Win on tennis', reference: 'wim-2' },
    ];
    const first = await importSettlements({ rows, defaultCode: 'SPEN', db, profilesDir });
    expect(first.imported).toBe(2);
    expect(first.skipped).toBe(0);
    expect(first.balances.SPEN).toBe(700);

    const second = await importSettlements({ rows, defaultCode: 'SPEN', db, profilesDir });
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(2);

    const entries = listLedgerEntries(db, 'SPEN');
    expect(entries.length).toBe(2);
    expect(entries[0]!.reference).toBe('ufc-1');
    expect(ledgerEntryExists(db, 'SPEN', 'ufc-1')).toBe(true);
  });

  test('one bad row does not abort the file', async () => {
    const rows = [
      { amount: 100, reference: 'good-1' },
      { amount: Number.NaN, reference: 'bad-1' }, // invalid amount
      { amount: 50, reference: 'good-2' },
    ];
    const result = await importSettlements({ rows, defaultCode: 'SPEN', db, profilesDir });
    expect(result.imported).toBe(2);
    expect(result.failed).toEqual([{ row: 2, error: expect.stringContaining('--amount must be a finite number') }]);
    expect(listLedgerEntries(db, 'SPEN').length).toBe(2);
  });

  test('missing per-row code fails that row only', async () => {
    const rows = [
      { amount: 100, reference: 'a' }, // uses defaultCode
      { code: '', amount: 50, reference: 'b' }, // no code
    ];
    const result = await importSettlements({ rows, defaultCode: 'SPEN', db, profilesDir });
    expect(result.imported).toBe(1);
    expect(result.failed).toEqual([{ row: 2, error: expect.stringContaining('missing partner code') }]);
  });

  test('dry-run writes nothing and counts would-imports', async () => {
    const rows = [{ amount: 100, reference: 'a' }];
    const result = await importSettlements({ rows, defaultCode: 'SPEN', db, profilesDir, dryRun: true });
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(listLedgerEntries(db, 'SPEN').length).toBe(0);
  });

  test('postSettlement reference is stored and skip-aware', async () => {
    const { postSettlement } = await import('../tools/partner-settlement');
    const first = await postSettlement({ code: 'SPEN', amount: 100, reference: 'r-1', db, profilesDir });
    expect(first.skipped).toBe(false);
    expect(first.row?.reference).toBe('r-1');
    const second = await postSettlement({ code: 'SPEN', amount: 100, reference: 'r-1', db, profilesDir });
    expect(second.skipped).toBe(true);
    expect(second.row).toBeNull();
    expect(listLedgerEntries(db, 'SPEN').length).toBe(1);
  });
});

void 0;
