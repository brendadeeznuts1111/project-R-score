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
CREATE INDEX IF NOT EXISTS idx_partner_ledger_code ON partner_ledger(partner_code, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_out ON partner_ledger(partner_code, book_key);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_scope ON partner_ledger(partner_code, account_scope);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_batch ON partner_ledger(partner_code, batch_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_ledger_external
  ON partner_ledger(partner_code, account_scope, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_ledger_initial_capital
  ON partner_ledger(partner_code) WHERE type = 'initial_capital';
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_ledger_reference
  ON partner_ledger(partner_code, reference) WHERE reference IS NOT NULL;
`;

export interface PartnerLedgerRow {
  id: string; // brand-ok — opaque ledger entry PK (UUIDv7)
  partnerCode: string; // brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
  type: PartnerLedgerType;
  amount: number;
  currency: string;
  description: string | null;
  reference?: string | null; // external feed key — idempotent re-imports
  bookKey?: string | null; // brand-ok — per-out attribution references profile books.<bookKey> (not the seat OutId brand)
  trackingId?: string | null; // brand-ok — opaque run key (e.g. weekly-2026-08-03)
  accountScope?: string | null; // global | rail:<method>:<id> | book:<bookKey> — where funds are held
  counterparty?: string | null; // other side of the transaction (rail:paypal:sender@email.com …)
  source?: string | null; // who initiated the transaction
  externalId?: string | null; // brand-ok — opaque external reference (PAYPAL-123, wire ref)
  proof?: string | null; // proof URL (https://registry.factory-wager.com/api/registry/proofs/…)
  batchId?: string | null; // brand-ok — opaque batch key grouping one funding session
  balanceAfter: number;
  createdAt: string;
}

export interface NewLedgerEntry {
  partnerCode: string; // brand-ok — partner CODE
  type: PartnerLedgerType;
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  bookKey?: string; // brand-ok — per-out attribution references profile books.<bookKey>
  trackingId?: string; // brand-ok — opaque run key (e.g. weekly-2026-08-03)
  accountScope?: string;
  counterparty?: string;
  source?: string;
  externalId?: string; // brand-ok — opaque external reference
  proof?: string;
  batchId?: string; // brand-ok — opaque batch key
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
    ...(entry.reference !== undefined ? { reference: entry.reference } : {}),
    ...(entry.bookKey !== undefined ? { bookKey: entry.bookKey } : {}),
    ...(entry.trackingId !== undefined ? { trackingId: entry.trackingId } : {}),
    ...(entry.accountScope !== undefined ? { accountScope: entry.accountScope } : {}),
    ...(entry.counterparty !== undefined ? { counterparty: entry.counterparty } : {}),
    ...(entry.source !== undefined ? { source: entry.source } : {}),
    ...(entry.externalId !== undefined ? { externalId: entry.externalId } : {}),
    ...(entry.proof !== undefined ? { proof: entry.proof } : {}),
    ...(entry.batchId !== undefined ? { batchId: entry.batchId } : {}),
    balanceAfter,
    createdAt: new Date().toISOString(),
  };
  db.query(
    `INSERT INTO partner_ledger
       (id, partner_code, type, amount, currency, description, reference, book_key, tracking_id, account_scope, counterparty, source, external_id, proof, batch_id, balance_after, created_at)
     VALUES ($id, $code, $type, $amount, $cur, $desc, $ref, $book, $track, $scope, $cparty, $source, $ext, $proof, $batch, $bal, $ts)`
  ).run({
    $id: row.id,
    $code: row.partnerCode,
    $type: row.type,
    $amount: row.amount,
    $cur: row.currency,
    $desc: row.description,
    $ref: row.reference ?? null,
    $book: row.bookKey ?? null,
    $track: row.trackingId ?? null,
    $scope: row.accountScope ?? null,
    $cparty: row.counterparty ?? null,
    $source: row.source ?? null,
    $ext: row.externalId ?? null,
    $proof: row.proof ?? null,
    $batch: row.batchId ?? null,
    $bal: row.balanceAfter,
    $ts: row.createdAt,
  });
  return row;
}

/** Does a row with this external reference already exist? (import idempotency.) */
export function ledgerEntryExists(db: Database, partnerCode: string, reference: string): boolean {
  const row = db
    .query(
      `SELECT 1 AS hit FROM partner_ledger
       WHERE partner_code = $code AND reference = $ref LIMIT 1`
    )
    .get({ $code: partnerCode, $ref: reference }) as { hit: number } | null;
  return row !== null;
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
      `SELECT id, partner_code, type, amount, currency, description, reference, book_key, tracking_id, account_scope, counterparty, source, external_id, proof, batch_id, balance_after, created_at
       FROM partner_ledger WHERE partner_code = $code ORDER BY created_at ASC, id ASC`
    )
    .all({ $code: partnerCode }) as {
    id: string; // brand-ok — opaque ledger entry PK (UUIDv7)
    partner_code: string; // brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
    type: PartnerLedgerType;
    amount: number;
    currency: string;
    description: string | null;
    reference: string | null;
    book_key: string | null;
    tracking_id: string | null; // brand-ok — opaque run key (e.g. weekly-2026-08-03)
    account_scope: string | null;
    counterparty: string | null;
    source: string | null;
    external_id: string | null; // brand-ok — opaque external reference
    proof: string | null;
    batch_id: string | null; // brand-ok — opaque batch key
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
    ...(r.reference !== null ? { reference: r.reference } : {}),
    ...(r.book_key !== null ? { bookKey: r.book_key } : {}),
    ...(r.tracking_id !== null ? { trackingId: r.tracking_id } : {}),
    ...(r.account_scope !== null ? { accountScope: r.account_scope } : {}),
    ...(r.counterparty !== null ? { counterparty: r.counterparty } : {}),
    ...(r.source !== null ? { source: r.source } : {}),
    ...(r.external_id !== null ? { externalId: r.external_id } : {}),
    ...(r.proof !== null ? { proof: r.proof } : {}),
    ...(r.batch_id !== null ? { batchId: r.batch_id } : {}),
    balanceAfter: r.balance_after,
    createdAt: r.created_at,
  }));
}

/** Ledger rows for a partner created at/after `since` (ISO-inclusive), oldest first. */
export function listLedgerEntriesSince(
  db: Database,
  partnerCode: string,
  since: Date
): PartnerLedgerRow[] {
  return listLedgerEntries(db, partnerCode).filter(row => row.createdAt >= since.toISOString());
}
