// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// lib/partner-profile/ledger.ts — partner ledger table + minimal client.
//
// SQLite `partner_ledger` table in the ops DB, keyed by partner CODE. Records
// deposits, credits, settlements and free-roll usage with a running balance
// (`balance_after`). The DDL is idempotent and wired into ops `migrateSchema`,
// so every `openOperationsDb` gets it as a migration path.
//
// This is the Phase-2 storage layer of the accounting integration; the
// settlement engine (Phase 3) posts to it later.
//
// @see docs/design/unified-partner-profile.md — accounting.ledger

import type { Database } from 'bun:sqlite';

export const PARTNER_LEDGER_TYPES = [
  'initial_capital',
  'deposit',
  'credit',
  'settlement',
  'free_roll',
] as const;
export type PartnerLedgerType = (typeof PARTNER_LEDGER_TYPES)[number];

export const PARTNER_LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS partner_ledger (
  id TEXT PRIMARY KEY,
  partner_code TEXT NOT NULL, -- brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
  type TEXT NOT NULL CHECK(type IN ('initial_capital', 'deposit', 'credit', 'settlement', 'free_roll')),
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  balance_after REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_code ON partner_ledger(partner_code, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_ledger_initial_capital
  ON partner_ledger(partner_code) WHERE type = 'initial_capital';
`;

export interface PartnerLedgerRow {
  id: string; // brand-ok — opaque ledger entry PK (UUIDv7)
  partnerCode: string; // brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
  type: PartnerLedgerType;
  amount: number;
  currency: string;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface NewLedgerEntry {
  partnerCode: string; // brand-ok — partner CODE
  type: PartnerLedgerType;
  amount: number;
  currency: string;
  description?: string;
}

export function ensurePartnerLedgerSchema(db: Database): void {
  db.exec(PARTNER_LEDGER_DDL);
}

/** Insert a ledger entry; balance_after = prior balance + amount. */
export function insertLedgerEntry(db: Database, entry: NewLedgerEntry): PartnerLedgerRow {
  const prior = db
    .query(
      `SELECT balance_after FROM partner_ledger
       WHERE partner_code = $code ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get({ $code: entry.partnerCode }) as { balance_after: number } | null;
  const balanceAfter = (prior?.balance_after ?? 0) + entry.amount;
  const row: PartnerLedgerRow = {
    id: Bun.randomUUIDv7(),
    partnerCode: entry.partnerCode,
    type: entry.type,
    amount: entry.amount,
    currency: entry.currency,
    description: entry.description ?? null,
    balanceAfter,
    createdAt: new Date().toISOString(),
  };
  db.query(
    `INSERT INTO partner_ledger
       (id, partner_code, type, amount, currency, description, balance_after, created_at)
     VALUES ($id, $code, $type, $amount, $cur, $desc, $bal, $ts)`
  ).run({
    $id: row.id,
    $code: row.partnerCode,
    $type: row.type,
    $amount: row.amount,
    $cur: row.currency,
    $desc: row.description,
    $bal: row.balanceAfter,
    $ts: row.createdAt,
  });
  return row;
}

/** Current running balance for a partner (0 when no ledger rows exist). */
export function ledgerBalance(db: Database, partnerCode: string): number {
  const row = db
    .query(
      `SELECT balance_after FROM partner_ledger
       WHERE partner_code = $code ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get({ $code: partnerCode }) as { balance_after: number } | null;
  return row?.balance_after ?? 0;
}

/** Does the partner already have any ledger rows? (initial-capital idempotency.) */
export function hasLedgerRows(db: Database, partnerCode: string): boolean {
  const row = db
    .query(`SELECT 1 AS hit FROM partner_ledger WHERE partner_code = $code LIMIT 1`)
    .get({ $code: partnerCode }) as { hit: number } | null;
  return row !== null;
}

/** All ledger rows for a partner, oldest first. */
export function listLedgerEntries(db: Database, partnerCode: string): PartnerLedgerRow[] {
  const rows = db
    .query(
      `SELECT id, partner_code, type, amount, currency, description, balance_after, created_at
       FROM partner_ledger WHERE partner_code = $code ORDER BY created_at ASC, id ASC`
    )
    .all({ $code: partnerCode }) as {
    id: string; // brand-ok — opaque ledger entry PK (UUIDv7)
    partner_code: string; // brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
    type: PartnerLedgerType;
    amount: number;
    currency: string;
    description: string | null;
    balance_after: number;
    created_at: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    partnerCode: r.partner_code,
    type: r.type,
    amount: r.amount,
    currency: r.currency,
    description: r.description,
    balanceAfter: r.balance_after,
    createdAt: r.created_at,
  }));
}
