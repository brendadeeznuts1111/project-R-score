// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// lib/partner-profile/accounting-stub.ts — Phase-2 accounting service stub.
//
// Initializes a partner's ledger on successful onboarding:
//   1. ensures the partner_ledger table (migration path via ops migrateSchema);
//   2. inserts the `initial_capital` row (amount = --initial-balance, default 0;
//      currency = --currency, default USD) — idempotent: only when the partner
//      has no ledger rows yet, so re-running book-add does not duplicate it;
//   3. sets accounting.fundStatus = 'ready' and appends the entry to the
//      profile's accounting.ledger (read-merge-write of the TOML).
//
// A local function for now — swappable for an external accounting service
// without changing the call site.
//
// @see docs/design/unified-partner-profile.md — accounting.fundStatus

import type { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun';
import { openOperationsDb, type OpenOperationsDbOpts } from '../operations/db';
import { PROFILES_DIR } from './bake';
import {
  ensurePartnerLedgerSchema,
  hasLedgerRows,
  insertLedgerEntry,
  type PartnerLedgerRow,
} from './ledger';

export interface InitLedgerForPartnerInput {
  code: string; // partner CODE (^[A-Z]{3,6}$)
  initialBalance?: number; // balance.initialCapitalRequirement (default 0)
  currency?: string; // settlement.currency (default 'USD')
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string;
  profilesDir?: string; // default config/partner-profiles
}

export interface InitLedgerForPartnerResult {
  inserted: boolean;
  row: PartnerLedgerRow | null;
  profilePath: string | null;
}

/**
 * Initialize the ledger for a freshly onboarded partner (idempotent).
 * Inserts the `initial_capital` entry, then mirrors it into the profile TOML
 * (accounting.fundStatus = 'ready' + accounting.ledger append).
 */
export async function initLedgerForPartner(
  input: InitLedgerForPartnerInput
): Promise<InitLedgerForPartnerResult> {
  const db = input.db ?? openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  try {
    ensurePartnerLedgerSchema(db);
    if (input.initialBalance !== undefined && input.initialBalance < 0) {
      throw new Error(`initialBalance must be ≥ 0 (got ${input.initialBalance})`);
    }
    const amount = input.initialBalance ?? 0;
    const currency = input.currency ?? 'USD';
    let row: PartnerLedgerRow | null = null;
    let inserted = false;
    // Idempotent first-write: book-add reruns must not stack initial_capital rows.
    // The unique partial index (partner_code, type='initial_capital') backs this
    // against concurrent writers (two book:add shells / future settlement engine).
    if (!hasLedgerRows(db, input.code)) {
      try {
        row = insertLedgerEntry(db, {
          partnerCode: input.code,
          type: 'initial_capital',
          amount,
          currency,
          description: 'onboarding initial capital',
        });
        inserted = true;
      } catch (e) {
        // A concurrent writer won the initial_capital race — treat as already seeded.
        if (!(e instanceof Error && /UNIQUE constraint failed/.test(e.message))) throw e;
      }
    }

    const profilePath = joinPath(input.profilesDir ?? PROFILES_DIR, `${input.code}.toml`);
    try {
      const profile = (await Bun.file(profilePath).exists())
        ? (Bun.TOML.parse(await Bun.file(profilePath).text()) as Record<string, unknown>)
        : null;
      if (profile) {
        const accounting = (profile.accounting as Record<string, unknown> | undefined) ?? {};
        accounting.fundStatus = 'ready';
        if (row) {
          const ledger = Array.isArray(accounting.ledger) ? (accounting.ledger as unknown[]) : [];
          accounting.ledger = [...ledger, row];
        }
        profile.accounting = accounting;
        await Bun.write(profilePath, `${Bun.TOML.stringify(profile).trimEnd()}\n`);
      }
    } catch (e) {
      // Ledger row stands; surface the mirror failure instead of hiding it.
      console.warn(
        `accounting-stub: profile mirror skipped for ${input.code}: ${
          e instanceof Error ? e.message : e
        }`
      );
    }

    return { inserted, row, profilePath: profilePath };
  } finally {
    if (!input.db) db.close();
  }
}
