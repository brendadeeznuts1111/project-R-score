// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// lib/partner-profile/ledger.ts — partner ledger table + minimal client.
//
// SQLite `partner_ledger` table in the ops DB, keyed by partner CODE. Records
// deposits, credits, settlements and free-roll usage with a running balance.
// Canonical storage is integer minor units. Existing databases may temporarily
// retain the legacy REAL columns; reads prefer minor units and writes dual-write
// until the migration finalizer removes those columns.
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
  amount_minor INTEGER NOT NULL,
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
  balance_after_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_code ON partner_ledger(partner_code, created_at);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_out ON partner_ledger(partner_code, book_key);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_scope ON partner_ledger(partner_code, account_scope);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_batch ON partner_ledger(partner_code, batch_id);
CREATE INDEX IF NOT EXISTS idx_partner_ledger_tracking ON partner_ledger(partner_code, tracking_id);
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

export type PartnerLedgerMoneyColumns = {
  amountMinor: boolean;
  balanceAfterMinor: boolean;
  legacyAmount: boolean;
  legacyBalanceAfter: boolean;
};

const CURRENCY_RE = /^[A-Z]{3}$/;

/** ISO-4217 minor-unit exponent as provided by the runtime ICU data. */
export function currencyMinorUnitExponent(currency: string): number {
  const normalized = currency.trim().toUpperCase();
  if (!CURRENCY_RE.test(normalized)) {
    throw new Error(`currency must be a 3-letter ISO code (got "${currency}")`);
  }
  if (!Intl.supportedValuesOf('currency').includes(normalized)) {
    throw new Error(`unsupported ISO-4217 currency "${normalized}"`);
  }
  return new Intl.NumberFormat('en', { style: 'currency', currency: normalized }).resolvedOptions()
    .maximumFractionDigits;
}

/** Convert a major-unit API value to a JSON-safe integer for SQLite storage. */
export function toMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) throw new Error(`amount must be finite (got ${amount})`);
  const factor = 10 ** currencyMinorUnitExponent(currency);
  const scaled = amount * factor;
  const rounded = Math.round(scaled);
  if (Math.abs(scaled - rounded) > 1e-7) {
    throw new Error(`${currency.toUpperCase()} amount ${amount} exceeds its minor-unit precision`);
  }
  if (!Number.isSafeInteger(rounded)) {
    throw new Error(`${currency.toUpperCase()} amount ${amount} exceeds safe integer storage`);
  }
  return rounded;
}

export function fromMinorUnits(amountMinor: number, currency: string): number {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(`minor-unit amount must be a safe integer (got ${amountMinor})`);
  }
  return amountMinor / 10 ** currencyMinorUnitExponent(currency);
}

export function partnerLedgerMoneyColumns(db: Database): PartnerLedgerMoneyColumns {
  const columns = new Set(
    (db.query('PRAGMA table_info(partner_ledger)').all() as { name: string }[]).map(row => row.name)
  );
  return {
    amountMinor: columns.has('amount_minor'),
    balanceAfterMinor: columns.has('balance_after_minor'),
    legacyAmount: columns.has('amount'),
    legacyBalanceAfter: columns.has('balance_after'),
  };
}

export function ensurePartnerLedgerSchema(db: Database): void {
  db.exec(PARTNER_LEDGER_DDL);
  const columns = partnerLedgerMoneyColumns(db);
  if (!columns.amountMinor) db.run('ALTER TABLE partner_ledger ADD COLUMN amount_minor INTEGER');
  if (!columns.balanceAfterMinor) {
    db.run('ALTER TABLE partner_ledger ADD COLUMN balance_after_minor INTEGER');
  }
}

function assertMoneyColumnPair(columns: PartnerLedgerMoneyColumns): void {
  if (!columns.amountMinor || !columns.balanceAfterMinor) {
    throw new Error('partner_ledger minor-unit columns are incomplete');
  }
  if (columns.legacyAmount !== columns.legacyBalanceAfter) {
    throw new Error('partner_ledger legacy money columns are incomplete');
  }
}

/** Insert atomically; legacy databases receive both major and minor values. */
export function insertLedgerEntry(db: Database, entry: NewLedgerEntry): PartnerLedgerRow {
  const columns = partnerLedgerMoneyColumns(db);
  assertMoneyColumnPair(columns);
  const currency = entry.currency.trim().toUpperCase();
  const amountMinor = toMinorUnits(entry.amount, currency);

  db.run('BEGIN IMMEDIATE');
  try {
    const legacySelect = columns.legacyBalanceAfter ? ', balance_after' : '';
    const prior = db
      .query(
        `SELECT balance_after_minor, currency${legacySelect} FROM partner_ledger
         WHERE partner_code = $code ORDER BY created_at DESC, id DESC LIMIT 1`
      )
      .get({ $code: entry.partnerCode }) as {
      balance_after_minor: number | null;
      balance_after?: number;
      currency: string;
    } | null;
    if (prior && prior.currency.toUpperCase() !== currency) {
      throw new Error(
        `partner ${entry.partnerCode} ledger currency is ${prior.currency}; cannot append ${currency}`
      );
    }
    const priorBalanceMinor = prior
      ? (prior.balance_after_minor ?? toMinorUnits(prior.balance_after!, prior.currency))
      : 0;
    const balanceAfterMinor = priorBalanceMinor + amountMinor;
    if (!Number.isSafeInteger(balanceAfterMinor)) {
      throw new Error(`partner ${entry.partnerCode} balance exceeds safe integer storage`);
    }
    const row: PartnerLedgerRow = {
      id: Bun.randomUUIDv7(),
      partnerCode: entry.partnerCode,
      type: entry.type,
      amount: fromMinorUnits(amountMinor, currency),
      currency,
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
      balanceAfter: fromMinorUnits(balanceAfterMinor, currency),
      createdAt: new Date().toISOString(),
    };
    const legacyColumns = columns.legacyAmount ? ', amount, balance_after' : '';
    const legacyValues = columns.legacyAmount ? ', $amount, $balance' : '';
    db.query(
      `INSERT INTO partner_ledger
         (id, partner_code, type, amount_minor, currency, description, reference, book_key, tracking_id, account_scope, counterparty, source, external_id, proof, batch_id, balance_after_minor, created_at${legacyColumns})
       VALUES ($id, $code, $type, $amountMinor, $currency, $description, $reference, $bookKey, $trackingId, $accountScope, $counterparty, $source, $externalId, $proof, $batchId, $balanceMinor, $createdAt${legacyValues})`
    ).run({
      $id: row.id,
      $code: row.partnerCode,
      $type: row.type,
      $amountMinor: amountMinor,
      $currency: row.currency,
      $description: row.description,
      $reference: row.reference ?? null,
      $bookKey: row.bookKey ?? null,
      $trackingId: row.trackingId ?? null,
      $accountScope: row.accountScope ?? null,
      $counterparty: row.counterparty ?? null,
      $source: row.source ?? null,
      $externalId: row.externalId ?? null,
      $proof: row.proof ?? null,
      $batchId: row.batchId ?? null,
      $balanceMinor: balanceAfterMinor,
      $createdAt: row.createdAt,
      $amount: row.amount,
      $balance: row.balanceAfter,
    });
    db.run('COMMIT');
    return row;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
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
  const columns = partnerLedgerMoneyColumns(db);
  assertMoneyColumnPair(columns);
  const legacySelect = columns.legacyBalanceAfter ? ', balance_after' : '';
  const row = db
    .query(
      `SELECT balance_after_minor, currency${legacySelect} FROM partner_ledger
       WHERE partner_code = $code ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get({ $code: partnerCode }) as {
    balance_after_minor: number | null;
    balance_after?: number;
    currency: string;
  } | null;
  if (!row) return 0;
  const minor = row.balance_after_minor ?? toMinorUnits(row.balance_after!, row.currency);
  return fromMinorUnits(minor, row.currency);
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
  const columns = partnerLedgerMoneyColumns(db);
  assertMoneyColumnPair(columns);
  const legacySelect = columns.legacyAmount
    ? ', amount AS amount_legacy, balance_after AS balance_after_legacy'
    : ', NULL AS amount_legacy, NULL AS balance_after_legacy';
  const rows = db
    .query(
      `SELECT id, partner_code, type, amount_minor, currency, description, reference, book_key, tracking_id, account_scope, counterparty, source, external_id, proof, batch_id, balance_after_minor, created_at${legacySelect}
       FROM partner_ledger WHERE partner_code = $code ORDER BY created_at ASC, id ASC`
    )
    .all({ $code: partnerCode }) as {
    id: string; // brand-ok — opaque ledger entry PK (UUIDv7)
    partner_code: string; // brand-ok — partner CODE (^[A-Z]{3,6}$), canonical key
    type: PartnerLedgerType;
    amount_minor: number | null;
    amount_legacy: number | null;
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
    balance_after_minor: number | null;
    balance_after_legacy: number | null;
    created_at: string;
  }[];
  return rows.map(r => ({
    id: r.id,
    partnerCode: r.partner_code,
    type: r.type,
    amount: fromMinorUnits(
      r.amount_minor ?? toMinorUnits(r.amount_legacy!, r.currency),
      r.currency
    ),
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
    balanceAfter: fromMinorUnits(
      r.balance_after_minor ?? toMinorUnits(r.balance_after_legacy!, r.currency),
      r.currency
    ),
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
