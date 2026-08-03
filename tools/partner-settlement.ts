#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// partner-settlement.ts — desk-entry settlement posting (Phase 3, manual-first).
//
//   bun run partner:settlement:post --code JOHNNY --amount 1500 \
//     [--currency USD] [--fund-status ready] [--description "weekly settlement"] \
//     [--dry-run]
//
// Posts a `settlement` entry to the partner_ledger table (balance_after =
// prior balance + amount; negative amounts = payout/loss), mirrors the entry
// into the profile TOML (accounting.ledger), and optionally refreshes
// accounting.fundStatus. Prints the new running balance; warns when it goes
// negative. `--dry-run` previews the post without writing.
//
// This is the desk-entry data path of the settlement engine — an automated
// bet/win feed (cron) can post through the same insertLedgerEntry plumbing
// later without changing the ledger model.
//
// @see docs/design/unified-partner-profile.md — accounting.ledger

import type { Database } from 'bun:sqlite';
import { joinPath } from '../lib/path-bun';
import { openOperationsDb, type OpenOperationsDbOpts } from '../lib/operations/db';
import {
  ensurePartnerLedgerSchema,
  insertLedgerEntry,
  ledgerBalance,
  type PartnerLedgerRow,
} from '../lib/partner-profile/ledger';
import { mirrorLedgerEntryToProfile } from '../lib/partner-profile/accounting-stub';
import { PROFILES_DIR } from '../lib/partner-profile/bake';
import { PARTNER_CODE_RE } from '../lib/partner-profile/schema';

export const SETTLEMENT_FUND_STATUSES = ['ready', 'deferred', 'paused', 'blocked'] as const;
export type SettlementFundStatus = (typeof SETTLEMENT_FUND_STATUSES)[number];
const CURRENCY_RE = /^[A-Z]{3}$/i;

export interface PostSettlementInput {
  code: string; // partner CODE (^[A-Z]{3,6}$)
  amount: number; // settlement amount (negative = payout/loss)
  currency?: string; // default USD
  fundStatus?: string; // optional accounting.fundStatus refresh
  description?: string; // default 'desk-entry settlement'
  dryRun?: boolean;
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string;
  profilesDir?: string; // default config/partner-profiles
}

export interface PostSettlementResult {
  code: string;
  row: PartnerLedgerRow | null; // null on dry-run
  balance: number;
  profilePath: string | null;
  mirrored: boolean;
}

/** Post a desk-entry settlement (validated; dry-run writes nothing). */
export async function postSettlement(input: PostSettlementInput): Promise<PostSettlementResult> {
  const code = input.code.trim().toUpperCase();
  if (!PARTNER_CODE_RE.test(code)) {
    throw new Error(`invalid partner code "${input.code}" — must match ${PARTNER_CODE_RE}`);
  }
  if (!Number.isFinite(input.amount)) {
    throw new Error(`--amount must be a finite number (got ${input.amount})`);
  }
  const currency = (input.currency ?? 'USD').trim().toUpperCase();
  if (!CURRENCY_RE.test(currency)) {
    throw new Error(`--currency must be a 3-letter ISO code (got "${input.currency}")`);
  }
  if (
    input.fundStatus !== undefined &&
    !(SETTLEMENT_FUND_STATUSES as readonly string[]).includes(input.fundStatus)
  ) {
    throw new Error(
      `--fund-status must be one of ${SETTLEMENT_FUND_STATUSES.join('|')} (got "${input.fundStatus}")`
    );
  }

  const db = input.db ?? openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  try {
    ensurePartnerLedgerSchema(db);
    const profilePath = joinPath(input.profilesDir ?? PROFILES_DIR, `${code}.toml`);

    if (input.dryRun) {
      const balance = ledgerBalance(db, code) + input.amount;
      return { code, row: null, balance, profilePath, mirrored: false };
    }

    const row = insertLedgerEntry(db, {
      partnerCode: code,
      type: 'settlement',
      amount: input.amount,
      currency,
      description: input.description ?? 'desk-entry settlement',
    });
    const mirrored = await mirrorLedgerEntryToProfile(
      profilePath,
      row,
      input.fundStatus ? { fundStatus: input.fundStatus } : {}
    );
    return { code, row, balance: row.balanceAfter, profilePath, mirrored };
  } finally {
    if (!input.db) db.close();
  }
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}

function usage(): never {
  console.log(`Usage:
  bun run partner:settlement:post --code <CODE> --amount <n> \\
    [--currency <ISO3>] [--fund-status <ready|deferred|paused|blocked>] \\
    [--description <text>] [--dry-run]`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const code = flag(argv, 'code');
  const amountRaw = flag(argv, 'amount');
  const currency = flag(argv, 'currency');
  const fundStatus = flag(argv, 'fund-status');
  const description = flag(argv, 'description');
  const dryRun = argv.includes('--dry-run');
  if (!code || amountRaw === undefined) usage();
  const amount = Number(amountRaw);

  const result = await postSettlement({ code, amount, currency, fundStatus, description, dryRun });
  const sign = amount < 0 ? '' : '+';
  if (dryRun) {
    console.log(
      `[dry-run] would post settlement ${sign}${amount} ${result.row?.currency ?? (currency ?? 'USD').toUpperCase()} → ${result.code} · balance ${result.balance}`
    );
  } else {
    console.log(
      `✓ posted settlement ${sign}${amount} ${result.row?.currency ?? ''} → ${result.code} · balance ${result.balance}${fundStatus ? ` · fundStatus ${fundStatus}` : ''}${result.mirrored ? '' : ' · profile mirror skipped'}`
    );
    if (result.balance < 0) {
      console.warn(`⚠ balance ${result.balance} is negative — margin review advised`);
    }
  }
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
