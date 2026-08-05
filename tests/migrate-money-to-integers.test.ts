import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  currencyMinorUnitExponent,
  ensurePartnerLedgerSchema,
  insertLedgerEntry,
  ledgerBalance,
  listLedgerEntries,
} from '../lib/partner-profile/ledger.ts';
import {
  backfillMoneyMigration,
  finalizeMoneyMigration,
  inspectMoneyMigration,
  prepareMoneyMigration,
} from '../scripts/migrate-money-to-integers.ts';

const LEGACY_LEDGER_DDL = `
CREATE TABLE partner_ledger (
  id TEXT PRIMARY KEY,
  partner_code TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('initial_capital', 'deposit', 'credit', 'settlement', 'free_roll')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  reference TEXT,
  book_key TEXT,
  tracking_id TEXT,
  account_scope TEXT,
  counterparty TEXT,
  source TEXT,
  external_id TEXT,
  proof TEXT,
  batch_id TEXT,
  balance_after REAL NOT NULL,
  created_at TEXT NOT NULL
);
`;

function legacyDb(): Database {
  const db = new Database(':memory:');
  db.exec(LEGACY_LEDGER_DDL);
  db.run(
    'CREATE INDEX idx_partner_ledger_code ON partner_ledger(partner_code, created_at)'
  );
  db.run(`
    INSERT INTO partner_ledger
      (id, partner_code, type, amount, currency, balance_after, created_at)
    VALUES ('one', 'SPEN', 'initial_capital', 10.25, 'USD', 10.25, '2026-08-01T00:00:00Z')
  `);
  db.run(`
    INSERT INTO partner_ledger
      (id, partner_code, type, amount, currency, balance_after, created_at)
    VALUES ('two', 'SPEN', 'settlement', -0.05, 'USD', 10.20, '2026-08-02T00:00:00Z')
  `);
  return db;
}

describe('partner ledger integer-money runtime', () => {
  test('fresh schema stores only canonical integer money columns', () => {
    const db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    const columns = db.query('PRAGMA table_info(partner_ledger)').all() as {
      name: string;
      type: string;
      notnull: number;
    }[];
    expect(columns.find(column => column.name === 'amount_minor')).toMatchObject({
      type: 'INTEGER',
      notnull: 1,
    });
    expect(columns.find(column => column.name === 'balance_after_minor')).toMatchObject({
      type: 'INTEGER',
      notnull: 1,
    });
    expect(columns.some(column => column.name === 'amount')).toBe(false);
    expect(columns.some(column => column.name === 'balance_after')).toBe(false);
    db.close();
  });

  test('runtime dual-writes a prepared legacy table and reads minor units first', () => {
    const db = legacyDb();
    prepareMoneyMigration(db);
    backfillMoneyMigration(db);
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'deposit',
      amount: 1.23,
      currency: 'USD',
    });
    const stored = db
      .query(
        `SELECT amount, amount_minor, balance_after, balance_after_minor
         FROM partner_ledger WHERE type = 'deposit'`
      )
      .get() as Record<string, number>;
    expect(stored).toEqual({
      amount: 1.23,
      amount_minor: 123,
      balance_after: 11.43,
      balance_after_minor: 1143,
    });
    expect(ledgerBalance(db, 'SPEN')).toBe(11.43);
    expect(listLedgerEntries(db, 'SPEN').map(row => row.amount)).toEqual([10.25, -0.05, 1.23]);
    db.close();
  });

  test('rejects excess currency precision and mixed-currency balances', () => {
    const db = new Database(':memory:');
    ensurePartnerLedgerSchema(db);
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'deposit',
      amount: 1,
      currency: 'USD',
    });
    expect(() =>
      insertLedgerEntry(db, {
        partnerCode: 'SPEN',
        type: 'deposit',
        amount: 0.001,
        currency: 'USD',
      })
    ).toThrow(/exceeds its minor-unit precision/);
    expect(() =>
      insertLedgerEntry(db, {
        partnerCode: 'SPEN',
        type: 'deposit',
        amount: 1,
        currency: 'EUR',
      })
    ).toThrow(/ledger currency is USD/);
    db.close();
  });

  test('uses ISO-4217 exponents for zero-, two-, and three-decimal currencies', () => {
    expect(currencyMinorUnitExponent('JPY')).toBe(0);
    expect(currencyMinorUnitExponent('USD')).toBe(2);
    expect(currencyMinorUnitExponent('KWD')).toBe(3);
  });
});

describe('migrate-money-to-integers', () => {
  test('prepare and backfill are idempotent and preserve exact values', () => {
    const db = legacyDb();
    expect(prepareMoneyMigration(db).rowsMissingMinorUnits).toBe(2);
    expect(prepareMoneyMigration(db).rowsMissingMinorUnits).toBe(2);
    const first = backfillMoneyMigration(db);
    const second = backfillMoneyMigration(db);
    expect(first.readyToFinalize).toBe(true);
    expect(second).toEqual(first);
    expect(
      db
        .query(
          `SELECT amount_minor, balance_after_minor FROM partner_ledger ORDER BY created_at`
        )
        .all()
    ).toEqual([
      { amount_minor: 1025, balance_after_minor: 1025 },
      { amount_minor: -5, balance_after_minor: 1020 },
    ]);
    db.close();
  });

  test('verification detects a broken integer balance chain', () => {
    const db = legacyDb();
    backfillMoneyMigration(db);
    db.run(`UPDATE partner_ledger SET balance_after_minor = 999 WHERE id = 'two'`);
    const report = inspectMoneyMigration(db);
    expect(report.readyToFinalize).toBe(false);
    expect(report.issues.some(issue => issue.includes('differs between legacy'))).toBe(true);
    expect(report.issues.some(issue => issue.includes('breaks the balance chain'))).toBe(true);
    db.close();
  });

  test('backfill rolls back canonical values when a partner mixes currencies', () => {
    const db = legacyDb();
    db.run(`UPDATE partner_ledger SET currency = 'EUR' WHERE id = 'two'`);
    expect(() => backfillMoneyMigration(db)).toThrow(/mixes currencies/);
    const values = db
      .query('SELECT amount_minor, balance_after_minor FROM partner_ledger ORDER BY id')
      .all();
    expect(values).toEqual([
      { amount_minor: null, balance_after_minor: null },
      { amount_minor: null, balance_after_minor: null },
    ]);
    db.close();
  });

  test('finalize rebuilds canonical constraints and removes legacy columns', () => {
    const db = legacyDb();
    backfillMoneyMigration(db);
    const report = finalizeMoneyMigration(db);
    expect(report.legacyColumns).toBe(false);
    expect(report.minorColumnsNotNull).toBe(true);
    expect(report.migrationComplete).toBe(true);
    expect(report.issues).toEqual([]);
    const columns = (db.query('PRAGMA table_info(partner_ledger)').all() as { name: string }[]).map(
      column => column.name
    );
    expect(columns).not.toContain('amount');
    expect(columns).not.toContain('balance_after');
    const indexes = (db.query('PRAGMA index_list(partner_ledger)').all() as { name: string }[]).map(
      index => index.name
    );
    expect(indexes).toContain('idx_partner_ledger_code');
    expect(listLedgerEntries(db, 'SPEN').map(row => row.amount)).toEqual([10.25, -0.05]);
    expect(() => finalizeMoneyMigration(db)).not.toThrow();
    db.close();
  });
});
