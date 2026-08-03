// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// lib/partner-profile/deposit-import.ts — batch deposit import (Phase 2).
//
// Reads deposits (CSV or JSONL), validates each row, and posts a `deposit`
// ledger entry with full provenance (account_scope, counterparty, source,
// external_id, proof, batch_id).
//
// Per-row validation:
//   - partner code exists in config/partner-profiles/<CODE>.toml
//   - amount > 0 · currency is 3-letter ISO (default USD)
//   - account_scope matches ^(global|rail:[a-z]+:.+|book:.+)$
//   - proof: an http(s) URL must be from ALLOWED_PROOF_DOMAINS (default the
//     artifact-registry proofs base); a local file path is uploaded to R2 via
//     uploadProof
// Idempotency: the unique partial index (partner_code, account_scope,
// external_id) makes re-imports skip instead of double-posting.
// Rows with a local proof path need an injectable R2 store in tests.
//
// @see docs/design/settlement-feed.md — deposit provenance

import type { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun';
import { openOperationsDb, type OpenOperationsDbOpts } from '../operations/db';
import type { RegistryObjectStore } from '../factory/object-store';
import { ensurePartnerLedgerSchema, insertLedgerEntry, type PartnerLedgerRow } from './ledger';
import { mirrorLedgerEntryToProfile } from './accounting-stub';
import { PROFILES_DIR } from './bake';
import { PARTNER_CODE_RE } from './schema';
import { uploadProof, PROOF_BASE_URL } from './proof-upload';

export interface DepositRow {
  code?: string; // partner CODE (optional per-row; falls back to --code)
  amount: number;
  currency?: string; // 3-letter ISO (default USD)
  description?: string;
  accountScope?: string; // global | rail:<method>:<id> | book:<bookKey> (default global)
  counterparty?: string; // other side of the transaction
  source?: string; // who initiated the transaction (falls back to --source)
  externalId?: string; // brand-ok — opaque external reference (PAYPAL-123)
  proof?: string; // proof URL or local file path (uploaded to R2)
  batchId?: string; // brand-ok — opaque batch key (defaults to the run's batch)
}

export const ACCOUNT_SCOPE_RE = /^(global|rail:[a-z]+:.+|book:.+)$/;
const CURRENCY_RE = /^[A-Z]{3}$/i;

/** Allowed proof prefixes (env-overridable, matching validate:ledger). */
export function allowedProofPrefixes(): string[] {
  return (Bun.env.ALLOWED_PROOF_DOMAINS ?? `${PROOF_BASE_URL}/`)
    .split(',')
    .map(d => d.trim())
    .filter(Boolean);
}

/** Parse a deposit file (CSV with header or JSONL). CSV values must not contain commas. */
export function parseDepositFile(
  text: string,
  format: 'csv' | 'jsonl' | 'auto' = 'auto'
): DepositRow[] {
  const trimmed = text.trimStart();
  const kind: 'csv' | 'jsonl' =
    format === 'auto'
      ? trimmed.startsWith('{') || trimmed.startsWith('[')
        ? 'jsonl'
        : 'csv'
      : format;
  if (kind === 'jsonl') {
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => JSON.parse(l) as DepositRow);
  }
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0]!.split(',').map(h => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const cell = (line: string, name: string): string | undefined => {
    const i = idx[name];
    return i === undefined ? undefined : (line.split(',')[i] ?? '').trim() || undefined;
  };
  const map = (line: string): DepositRow => ({
    ...(idx.code !== undefined ? { code: cell(line, 'code') } : {}),
    amount: Number(cell(line, 'amount')),
    currency: cell(line, 'currency'),
    description: cell(line, 'description'),
    accountScope: cell(line, 'account_scope') ?? cell(line, 'scope'),
    counterparty: cell(line, 'counterparty'),
    source: cell(line, 'source'),
    externalId: cell(line, 'external_id'),
    proof: cell(line, 'proof'),
    batchId: cell(line, 'batch_id'),
  });
  return lines.slice(1).map(map);
}

export interface ImportDepositsInput {
  rows: DepositRow[];
  defaultCode?: string;
  defaultSource?: string;
  dryRun?: boolean;
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string;
  profilesDir?: string; // default config/partner-profiles
  /** Injected R2 store for local-proof uploads (tests). Default: createS3RegistryStore. */
  store?: RegistryObjectStore;
}

export interface ImportDepositsResult {
  batchId: string; // brand-ok — opaque batch key (auto-generated UUIDv7 or per-row override)
  imported: number;
  skipped: number;
  failed: { row: number; error: string }[]; // 1-based row numbers
  totalAmount: number;
  balances: Record<string, number>;
}

/** Batch-import deposits. One bad row does not abort the file. */
export async function importDeposits(input: ImportDepositsInput): Promise<ImportDepositsResult> {
  const db = input.db ?? openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  try {
    ensurePartnerLedgerSchema(db);
    const batchId = input.rows.find(r => r.batchId)?.batchId ?? Bun.randomUUIDv7();
    const profilesDir = input.profilesDir ?? PROFILES_DIR;
    const allowedProofs = allowedProofPrefixes();
    const result: ImportDepositsResult = {
      batchId,
      imported: 0,
      skipped: 0,
      failed: [],
      totalAmount: 0,
      balances: {},
    };

    for (const [i, row] of input.rows.entries()) {
      try {
        const code = (row.code ?? input.defaultCode ?? '').trim().toUpperCase();
        if (!PARTNER_CODE_RE.test(code)) throw new Error(`invalid/missing partner code`);
        if (!(await Bun.file(joinPath(profilesDir, `${code}.toml`)).exists())) {
          throw new Error(`partner ${code} has no profile (${code}.toml)`);
        }
        if (!(row.amount > 0)) throw new Error(`amount must be positive (got ${row.amount})`);
        const currency = (row.currency ?? 'USD').trim().toUpperCase();
        if (!CURRENCY_RE.test(currency)) {
          throw new Error(`currency must be a 3-letter ISO code (got "${row.currency}")`);
        }
        const accountScope = (row.accountScope ?? 'global').trim();
        if (!ACCOUNT_SCOPE_RE.test(accountScope)) {
          throw new Error(`account_scope "${accountScope}" does not match ${ACCOUNT_SCOPE_RE}`);
        }

        // proof: http(s) URL must be allowed; local path → upload to R2
        let proof: string | undefined;
        if (row.proof) {
          if (/^https?:\/\//.test(row.proof)) {
            if (!allowedProofs.some(prefix => row.proof!.startsWith(prefix))) {
              throw new Error(`proof URL not from allowed domains (${allowedProofs.join(', ')})`);
            }
            proof = row.proof;
          } else {
            const data = await Bun.file(row.proof).arrayBuffer();
            const name = row.proof.split(/[\\/]/).pop() || 'proof.png';
            proof = await uploadProof(code, { name, data }, input.store);
          }
        }

        if (input.dryRun) {
          result.imported++;
          result.totalAmount += row.amount;
          result.balances[code] = (result.balances[code] ?? 0) + row.amount;
          continue;
        }

        let ledgerRow: PartnerLedgerRow;
        try {
          ledgerRow = insertLedgerEntry(db, {
            partnerCode: code,
            type: 'deposit',
            amount: row.amount,
            currency,
            description: row.description,
            bookKey: accountScope.startsWith('book:')
              ? accountScope.slice('book:'.length)
              : undefined,
            accountScope,
            counterparty: row.counterparty,
            source: row.source ?? input.defaultSource,
            externalId: row.externalId,
            proof,
            batchId: row.batchId ?? batchId,
          });
        } catch (e) {
          // The unique external index rejects a re-import of the same
          // (partner, scope, external_id) — treat as already imported.
          if (e instanceof Error && /UNIQUE constraint failed/.test(e.message)) {
            result.skipped++;
            continue;
          }
          throw e;
        }
        await mirrorLedgerEntryToProfile(joinPath(profilesDir, `${code}.toml`), ledgerRow);
        result.imported++;
        result.totalAmount += row.amount;
        result.balances[code] = ledgerRow.balanceAfter;
      } catch (e) {
        result.failed.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return result;
  } finally {
    if (!input.db) db.close();
  }
}
