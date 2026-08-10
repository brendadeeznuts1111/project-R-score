#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/console#reading-from-stdin — Bun.stdin
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
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
  ledgerEntryExists,
  type PartnerLedgerRow,
} from '../lib/partner-profile/ledger';
import { mirrorLedgerEntryToProfile } from '../lib/partner-profile/accounting-stub';
import { PROFILES_DIR } from '../lib/partner-profile/bake';
import { PARTNER_CODE_RE } from '../lib/partner-profile/schema';
import {
  runSettlementForPartner,
  runSettlementsForAll,
  SETTLEMENT_CRON_SCHEDULE,
  startOfWeek,
} from '../lib/partner-profile/settlement-runner';
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';

export const SETTLEMENT_FUND_STATUSES = ['ready', 'deferred', 'paused', 'blocked'] as const;
const CURRENCY_RE = /^[A-Z]{3}$/i;

export interface PostSettlementInput {
  code: string; // partner CODE (^[A-Z]{3,6}$)
  amount: number; // settlement amount (negative = payout/loss)
  currency?: string; // default USD
  fundStatus?: string; // optional accounting.fundStatus refresh
  description?: string; // default 'desk-entry settlement'
  reference?: string; // external feed key — idempotent re-imports skip
  bookKey?: string; // brand-ok — per-out attribution references profile books.<bookKey> (user flag --out)
  trackingId?: string; // brand-ok — opaque run key (e.g. weekly-2026-08-03)
  dryRun?: boolean;
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string;
  profilesDir?: string; // default config/partner-profiles
}

export interface PostSettlementResult {
  code: string;
  row: PartnerLedgerRow | null; // null on dry-run / skipped
  balance: number;
  profilePath: string | null;
  mirrored: boolean;
  skipped: boolean; // reference already present → no write
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
      const skipped = input.reference !== undefined && ledgerEntryExists(db, code, input.reference);
      const balance = skipped ? ledgerBalance(db, code) : ledgerBalance(db, code) + input.amount;
      return { code, row: null, balance, profilePath, mirrored: false, skipped };
    }

    // Idempotency: a reference already on the ledger is skipped (unique index
    // backs this against concurrent imports).
    if (input.reference !== undefined && ledgerEntryExists(db, code, input.reference)) {
      return {
        code,
        row: null,
        balance: ledgerBalance(db, code),
        profilePath,
        mirrored: false,
        skipped: true,
      };
    }

    let row: PartnerLedgerRow;
    try {
      row = insertLedgerEntry(db, {
        partnerCode: code,
        type: 'settlement',
        amount: input.amount,
        currency,
        description: input.description ?? 'desk-entry settlement',
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.bookKey !== undefined ? { bookKey: input.bookKey } : {}),
        ...(input.trackingId !== undefined ? { trackingId: input.trackingId } : {}),
      });
    } catch (e) {
      // A concurrent import won the reference race — treat as already imported.
      if (e instanceof Error && /UNIQUE constraint failed/.test(e.message)) {
        return {
          code,
          row: null,
          balance: ledgerBalance(db, code),
          profilePath,
          mirrored: false,
          skipped: true,
        };
      }
      throw e;
    }
    const mirrored = await mirrorLedgerEntryToProfile(
      profilePath,
      row,
      input.fundStatus ? { fundStatus: input.fundStatus } : {}
    );
    return { code, row, balance: row.balanceAfter, profilePath, mirrored, skipped: false };
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
    [--description <text>] [--reference <key>] [--dry-run]

  bun run partner:settlement:import --file <settlements.csv|jsonl> \\
    [--code <CODE>] [--dry-run]        # per-row code overrides --code

  bun run partner:settlement:run [--partner <CODE>] [--period START..END] \\
    [--dry-run] [--cron]               # weekly settlement runner

CSV header: amount,currency,description,reference[,code][,out][,trackingId]
JSONL row:  {"code"?, "amount", "currency"?, "description"?, "reference"?, "out"?, "trackingId"?}`);
  process.exit(1);
}

// ── Run mode (weekly settlement runner) ────────────────────────────────────

function parsePeriod(raw: string | undefined): { start: Date; end?: Date } {
  if (raw === undefined) return { start: startOfWeek() };
  const [startRaw, endRaw] = raw.split('..');
  if (!startRaw) throw new Error(`--period must be START..END (YYYY-MM-DD..YYYY-MM-DD)`);
  const start = new Date(`${startRaw.trim()}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) throw new Error(`invalid --period start "${startRaw}"`);
  const end = endRaw ? new Date(`${endRaw.trim()}T23:59:59.999Z`) : undefined;
  if (end !== undefined && Number.isNaN(end.getTime())) {
    throw new Error(`invalid --period end "${endRaw}"`);
  }
  return { start, end };
}

async function runMode(argv: string[]): Promise<void> {
  const partner = flag(argv, 'partner');
  const { start, end } = parsePeriod(flag(argv, 'period'));
  const dryRun = argv.includes('--dry-run');

  if (argv.includes('--cron')) {
    const { scheduleInProcess } = await import('../lib/harness/cron');
    await using job = scheduleInProcess(SETTLEMENT_CRON_SCHEDULE, () => {
      runSettlementsForAll({ periodStart: startOfWeek() }).catch(e =>
        console.error(`settlement cron failed: ${e instanceof Error ? e.message : e}`)
      );
    });
    console.log(`⏱ settlement cron registered (${SETTLEMENT_CRON_SCHEDULE} UTC) — Ctrl+C to stop`);
    await new Promise(() => {});
    return;
  }

  if (partner) {
    const result = await runSettlementForPartner({
      code: partner,
      periodStart: start,
      periodEnd: end,
      dryRun,
    });
    const verb = dryRun ? 'would post' : 'posted';
    console.log(
      `${dryRun ? '[dry-run] ' : ''}✓ ${verb} period settlement ${result.code}: gross ${result.gross} · commission ${result.commission} · net ${result.net}${result.fundStatus ? ` · fundStatus → ${result.fundStatus}` : ''}${result.skipped ? ' · skipped (no desk entries or period already settled)' : ''}`
    );
    return;
  }

  const result = await runSettlementsForAll({ periodStart: start, periodEnd: end, dryRun });
  for (const r of result.results) {
    console.log(
      `  ${dryRun ? '[dry-run] ' : ''}${r.code}: gross ${r.gross} · commission ${r.commission} · net ${r.net}${r.fundStatus ? ` · fundStatus → ${r.fundStatus}` : ''}${r.skipped ? ' · skipped' : ''}`
    );
  }
  for (const code of result.skippedPartners)
    console.log(`  ${code}: skipped (no settlement.commissionPct)`);
  for (const f of result.failed) console.error(`  ✗ ${f.code}: ${f.error}`);
  console.log(
    `${dryRun ? '[dry-run] ' : ''}✓ settlement run: ${result.results.length} settled · ${result.skippedPartners.length} no-commission · ${result.failed.length} failed`
  );
  if (result.failed.length > 0) process.exitCode = 1;
}

export interface SettlementImportRow {
  code?: string; // optional per-row override; falls back to --code
  amount: number;
  currency?: string;
  description?: string;
  reference?: string;
  out?: string; // per-out attribution (books.<bookKey>)
  trackingId?: string; // brand-ok — opaque run key (e.g. weekly-2026-08-03)
}

export interface ImportSettlementsInput {
  rows: SettlementImportRow[];
  defaultCode?: string;
  dryRun?: boolean;
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string;
  profilesDir?: string;
}

export interface ImportSettlementsResult {
  imported: number;
  skipped: number;
  failed: { row: number; error: string }[]; // 1-based row numbers
  balances: Record<string, number>;
}

/** Parse a settlement file (CSV with header or JSONL). CSV values must not contain commas. */
export function parseSettlementFile(
  text: string,
  format: 'csv' | 'jsonl' | 'auto' = 'auto'
): SettlementImportRow[] {
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
      .map(l => JSON.parse(l) as SettlementImportRow);
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
  return lines.slice(1).map(line => ({
    ...(idx.code !== undefined ? { code: cell(line, 'code') } : {}),
    amount: Number(cell(line, 'amount')),
    currency: cell(line, 'currency'),
    description: cell(line, 'description'),
    reference: cell(line, 'reference'),
    ...(idx.out !== undefined ? { out: cell(line, 'out') } : {}),
    ...(idx.trackingId !== undefined ? { trackingId: cell(line, 'trackingId') } : {}),
  }));
}

/**
 * Batch-import settlement rows. One bad row does not abort the file — it is
 * counted in `failed`. Rows whose `reference` already exists are skipped
 * (idempotent re-imports).
 */
export async function importSettlements(
  input: ImportSettlementsInput
): Promise<ImportSettlementsResult> {
  const db = input.db ?? openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  try {
    ensurePartnerLedgerSchema(db);
    const result: ImportSettlementsResult = { imported: 0, skipped: 0, failed: [], balances: {} };
    for (const [i, row] of input.rows.entries()) {
      const code = (row.code ?? input.defaultCode ?? '').trim().toUpperCase();
      if (!code) {
        result.failed.push({ row: i + 1, error: 'missing partner code (row code or --code)' });
        continue;
      }
      try {
        const res = await postSettlement({
          code,
          amount: row.amount,
          currency: row.currency,
          description: row.description,
          reference: row.reference,
          bookKey: row.out,
          trackingId: row.trackingId,
          dryRun: input.dryRun,
          db,
          profilesDir: input.profilesDir,
        });
        if (res.skipped) result.skipped++;
        else result.imported++;
        result.balances[code] = res.balance;
      } catch (e) {
        result.failed.push({ row: i + 1, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return result;
  } finally {
    if (!input.db) db.close();
  }
}

async function main(): Promise<void> {
  const argv = applyUnknownLongOptionGuardFor('partner:settlement:import', Bun.argv.slice(2));
  const dryRun = argv.includes('--dry-run');

  if (argv[0] === 'run') {
    await runMode(argv);
    return;
  }

  if (argv[0] === 'import') {
    const filePath = flag(argv, 'file');
    const defaultCode = flag(argv, 'code');
    let text: string;
    if (argv.includes('--stdin')) {
      text = await Bun.stdin.text();
    } else if (filePath) {
      text = await Bun.file(filePath).text();
    } else {
      usage();
    }
    const format = filePath?.endsWith('.csv')
      ? 'csv'
      : filePath?.endsWith('.jsonl')
        ? 'jsonl'
        : 'auto';
    const rows = parseSettlementFile(text, format);
    const result = await importSettlements({ rows, defaultCode, dryRun });
    for (const f of result.failed) console.error(`  ✗ row ${f.row}: ${f.error}`);
    console.log(
      `${dryRun ? '[dry-run] ' : ''}✓ import: ${result.imported} imported · ${result.skipped} skipped · ${result.failed.length} failed`
    );
    if (result.failed.length > 0) process.exitCode = 1;
    return;
  }

  const code = flag(argv, 'code');
  const amountRaw = flag(argv, 'amount');
  const currency = flag(argv, 'currency');
  const fundStatus = flag(argv, 'fund-status');
  const description = flag(argv, 'description');
  const reference = flag(argv, 'reference');
  const bookKey = flag(argv, 'out');
  const trackingId = flag(argv, 'tracking-id');
  if (!code || amountRaw === undefined) usage();
  const amount = Number(amountRaw);

  const result = await postSettlement({
    code,
    amount,
    currency,
    fundStatus,
    description,
    reference,
    bookKey,
    trackingId,
    dryRun,
  });
  const sign = amount < 0 ? '' : '+';
  if (dryRun) {
    console.log(
      `[dry-run] would post settlement ${sign}${amount} ${result.row?.currency ?? (currency ?? 'USD').toUpperCase()} → ${result.code} · balance ${result.balance}${result.skipped ? ' · skipped (reference exists)' : ''}`
    );
  } else {
    console.log(
      `${result.skipped ? '⏭ skipped' : '✓ posted'} settlement ${sign}${amount} ${result.row?.currency ?? ''} → ${result.code} · balance ${result.balance}${fundStatus ? ` · fundStatus ${fundStatus}` : ''}${result.mirrored ? '' : ' · profile mirror skipped'}`
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
