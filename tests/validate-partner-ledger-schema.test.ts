// validate-partner-ledger-schema.test.ts — ledger data-integrity validation.

import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { validateLedgerData } from '../scripts/validate-partner-ledger-schema';
import { ensurePartnerLedgerSchema, insertLedgerEntry } from '../lib/partner-profile/ledger';

function freshDb(): Database {
  const db = new Database(':memory:');
  ensurePartnerLedgerSchema(db);
  return db;
}

describe('validateLedgerData', () => {
  test('clean ledger passes', () => {
    const db = freshDb();
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'deposit',
      amount: 500,
      currency: 'USD',
      accountScope: 'rail:venmo:spen@venmo.com',
      externalId: 'VENMO-1',
      proof: 'https://registry.factory-wager.com/api/registry/proofs/SPEN/1.png',
    });
    expect(validateLedgerData(db)).toEqual([]);
  });

  test('initial_capital is exempt from the type↔glossary check', () => {
    const db = freshDb();
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'initial_capital',
      amount: 10000,
      currency: 'USD',
    });
    expect(validateLedgerData(db)).toEqual([]);
  });

  test('unknown ledger type is flagged (defensive — the CHECK rejects it at insert)', () => {
    const db = new Database(':memory:');
    // lax table without the type CHECK so the invalid state can be represented
    db.exec(`
      CREATE TABLE partner_ledger (
        id TEXT PRIMARY KEY, partner_code TEXT NOT NULL, type TEXT NOT NULL,
        amount REAL NOT NULL, currency TEXT NOT NULL, description TEXT,
        reference TEXT, book_key TEXT, tracking_id TEXT, account_scope TEXT,
        counterparty TEXT, source TEXT, external_id TEXT, proof TEXT, batch_id TEXT,
        balance_after REAL NOT NULL, created_at TEXT NOT NULL
      );
    `);
    db.run(
      `INSERT INTO partner_ledger (id, partner_code, type, amount, currency, balance_after, created_at)
       VALUES ('x1', 'SPEN', 'fictional_type', 1, 'USD', 1, '2026-08-03T00:00:00Z')`
    );
    expect(validateLedgerData(db)).toEqual([
      'ledger type "fictional_type" has no accounting.fictional_type glossary concept',
    ]);
  });

  test('invalid + unknown-rail scopes are flagged', () => {
    const db = freshDb();
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'deposit',
      amount: 1,
      currency: 'USD',
      accountScope: 'not-a-scope',
    });
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'deposit',
      amount: 1,
      currency: 'USD',
      accountScope: 'rail:btc:spen@x.com', // deposit.method.btc not in glossary
    });
    const issues = validateLedgerData(db);
    expect(issues.some(i => i.includes('does not match'))).toBe(true);
    expect(issues.some(i => i.includes('unknown rail method "btc"'))).toBe(true);
  });

  test('off-domain proof URL is flagged', () => {
    const db = freshDb();
    insertLedgerEntry(db, {
      partnerCode: 'SPEN',
      type: 'deposit',
      amount: 1,
      currency: 'USD',
      proof: 'https://evil.example.com/shot.png',
    });
    expect(validateLedgerData(db)).toEqual([
      `proof URL "https://evil.example.com/shot.png" is not from ${'https://registry.factory-wager.com/api/registry/proofs/'}`,
    ]);
  });

  test('duplicate external_id per (partner, scope) is flagged (defensive — the unique index rejects it at insert)', () => {
    const db = freshDb();
    db.exec('DROP INDEX idx_partner_ledger_external'); // allow the invalid state
    for (const amount of [1, 2]) {
      insertLedgerEntry(db, {
        partnerCode: 'SPEN',
        type: 'deposit',
        amount,
        currency: 'USD',
        accountScope: 'rail:venmo:spen@venmo.com',
        externalId: 'VENMO-9',
      });
    }
    const issues = validateLedgerData(db);
    expect(issues.some(i => i.includes('duplicate external_id "VENMO-9"'))).toBe(true);
  });
});

void 0;
