// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// lib/partner-profile/settlement-runner.ts — weekly settlement runner (Phase 3).
//
// Computes a partner's period settlement from the desk-entry ledger:
//   gross   = sum of the period's settlement rows (desk entries; excludes
//             prior period-* commission adjustments)
//   commission = gross * settlement.commissionPct / 100   (signed net-P&L)
//   adjustment  = -commission                              (the operator's share)
// Posts ONE settlement row with reference `period-<YYYY-MM-DD>` (period start)
// so re-runs skip (idempotent). Refreshes accounting.fundStatus via
// balance.marginCallAction/marginCallThreshold:
//   balanceAfter <  initialCapitalRequirement * marginCallThreshold
//     → notify→'deferred' · pause→'paused' · block→'blocked'
//   balanceAfter >= initialCapitalRequirement → 'ready'
//
// The default period is the current ISO week (Monday 00:00 UTC → now) so the
// `period-<weekStart>` reference is stable across re-runs within the week.
//
// @see docs/design/settlement-feed.md — Phase 3

import type { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun';
import { openOperationsDb, type OpenOperationsDbOpts } from '../operations/db';
import {
  ensurePartnerLedgerSchema,
  insertLedgerEntry,
  ledgerBalance,
  ledgerEntryExists,
  listLedgerEntriesSince,
  type PartnerLedgerRow,
} from './ledger';
import { mirrorLedgerEntryToProfile } from './accounting-stub';
import { PROFILES_DIR } from './bake';
import { PARTNER_CODE_RE } from './schema';

export const SETTLEMENT_CRON_SCHEDULE = '0 0 * * 0'; // Sunday midnight UTC

/** Monday 00:00 UTC of the current ISO week. */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat; ISO week starts Monday
  const back = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}

/** Map a marginCallAction to a fundStatus (notify → deferred, pause → paused, block → blocked). */
export function fundStatusForAction(
  action: string | undefined,
  balanceAfter: number,
  thresholdBalance: number,
  initialCapitalRequirement: number
): string | undefined {
  if (balanceAfter < thresholdBalance) {
    if (action === 'block') return 'blocked';
    if (action === 'pause') return 'paused';
    return 'deferred'; // notify (or unset) — alert but don't block
  }
  if (initialCapitalRequirement > 0 && balanceAfter >= initialCapitalRequirement) return 'ready';
  return undefined; // between threshold and initial capital — leave unchanged
}

export interface RunSettlementInput {
  code: string; // partner CODE (^[A-Z]{3,6}$)
  periodStart: Date; // inclusive
  periodEnd?: Date; // optional upper bound (default now)
  dryRun?: boolean;
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string;
  profilesDir?: string; // default config/partner-profiles
}

export interface RunSettlementResult {
  code: string;
  periodStart: string; // ISO date of the period start
  gross: number; // sum of the period's desk-entry settlements
  commissionPct: number;
  commission: number; // signed net-P&L commission
  net: number; // gross - commission
  fundStatus?: string; // refreshed value when the margin rules changed it
  row: PartnerLedgerRow | null; // null on dry-run / skipped / no desk entries
  skipped: boolean; // period reference already present
}

/** Load the profile TOML for a partner (null when absent). */
async function loadProfile(
  code: string,
  profilesDir: string
): Promise<Record<string, unknown> | null> {
  const path = joinPath(profilesDir, `${code}.toml`);
  if (!(await Bun.file(path).exists())) return null;
  return Bun.TOML.parse(await Bun.file(path).text()) as Record<string, unknown>;
}

/**
 * Run the weekly settlement for one partner: compute the period commission
 * adjustment from desk-entry settlements and post it (idempotent per period),
 * then refresh fundStatus per the margin rules.
 */
export async function runSettlementForPartner(
  input: RunSettlementInput
): Promise<RunSettlementResult> {
  const code = input.code.trim().toUpperCase();
  if (!PARTNER_CODE_RE.test(code)) {
    throw new Error(`invalid partner code "${input.code}" — must match ${PARTNER_CODE_RE}`);
  }
  const periodEnd = input.periodEnd ?? new Date();
  if (periodEnd < input.periodStart) throw new Error('periodEnd must be >= periodStart');

  const db = input.db ?? openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  try {
    ensurePartnerLedgerSchema(db);
    const profilesDir = input.profilesDir ?? PROFILES_DIR;
    const profile = await loadProfile(code, profilesDir);
    const settlement = (profile?.settlement ?? {}) as Record<string, unknown>;
    const balance = (profile?.balance ?? {}) as Record<string, unknown>;
    const commissionPct = Number(settlement.commissionPct ?? 0);
    if (!(commissionPct > 0)) {
      throw new Error(`partner ${code} has no settlement.commissionPct — nothing to settle`);
    }

    const reference = `period-${input.periodStart.toISOString().slice(0, 10)}`;
    const periodEntries = listLedgerEntriesSince(db, code, input.periodStart).filter(
      e => e.type === 'settlement' && !(e.reference ?? '').startsWith('period-')
    );
    const gross = periodEntries.reduce((sum, e) => sum + e.amount, 0);

    if (input.dryRun) {
      const commission = (gross * commissionPct) / 100;
      const net = gross - commission;
      const adjustment = -commission;
      const balanceAfter = ledgerBalance(db, code) + adjustment;
      const thresholdBalance =
        (Number(balance.initialCapitalRequirement ?? 0) || 0) *
        (Number(balance.marginCallThreshold ?? 0) || 0);
      const fundStatus = fundStatusForAction(
        String(balance.marginCallAction ?? 'notify'),
        balanceAfter,
        thresholdBalance,
        Number(balance.initialCapitalRequirement ?? 0)
      );
      return {
        code,
        periodStart: input.periodStart.toISOString().slice(0, 10),
        gross,
        commissionPct,
        commission,
        net,
        ...(fundStatus ? { fundStatus } : {}),
        row: null,
        skipped: gross === 0 || ledgerEntryExists(db, code, reference),
      };
    }

    if (gross === 0) {
      return {
        code,
        periodStart: input.periodStart.toISOString().slice(0, 10),
        gross,
        commissionPct,
        commission: 0,
        net: 0,
        row: null,
        skipped: true,
      };
    }
    if (ledgerEntryExists(db, code, reference)) {
      return {
        code,
        periodStart: input.periodStart.toISOString().slice(0, 10),
        gross,
        commissionPct,
        commission: (gross * commissionPct) / 100,
        net: gross - (gross * commissionPct) / 100,
        row: null,
        skipped: true,
      };
    }

    const commission = (gross * commissionPct) / 100;
    const adjustment = -commission;
    const net = gross - commission;
    let row: PartnerLedgerRow;
    try {
      row = insertLedgerEntry(db, {
        partnerCode: code,
        type: 'settlement',
        amount: adjustment,
        currency: String(settlement.currency ?? 'USD'),
        reference,
        trackingId: `weekly-${input.periodStart.toISOString().slice(0, 10)}`,
        description: `Weekly settlement (gross ${gross}, commission ${commission}, net ${net})`,
      });
    } catch (e) {
      // A concurrent run won the period reference race.
      if (e instanceof Error && /UNIQUE constraint failed/.test(e.message)) {
        return {
          code,
          periodStart: input.periodStart.toISOString().slice(0, 10),
          gross,
          commissionPct,
          commission,
          net,
          row: null,
          skipped: true,
        };
      }
      throw e;
    }

    const thresholdBalance =
      (Number(balance.initialCapitalRequirement ?? 0) || 0) *
      (Number(balance.marginCallThreshold ?? 0) || 0);
    const fundStatus = fundStatusForAction(
      String(balance.marginCallAction ?? 'notify'),
      row.balanceAfter,
      thresholdBalance,
      Number(balance.initialCapitalRequirement ?? 0)
    );
    const profilePath = joinPath(profilesDir, `${code}.toml`);
    await mirrorLedgerEntryToProfile(profilePath, row, fundStatus ? { fundStatus } : {});
    return {
      code,
      periodStart: input.periodStart.toISOString().slice(0, 10),
      gross,
      commissionPct,
      commission,
      net,
      ...(fundStatus ? { fundStatus } : {}),
      row,
      skipped: false,
    };
  } finally {
    if (!input.db) db.close();
  }
}

export interface RunSettlementForAllInput {
  periodStart: Date;
  periodEnd?: Date;
  dryRun?: boolean;
  dbPath?: string;
  profilesDir?: string;
}

export interface RunSettlementForAllResult {
  results: RunSettlementResult[];
  skippedPartners: string[];
  failed: { code: string; error: string }[];
}

/** Run the weekly settlement for every profile with a commissionPct set. */
export async function runSettlementsForAll(
  input: RunSettlementForAllInput
): Promise<RunSettlementForAllResult> {
  const profilesDir = input.profilesDir ?? PROFILES_DIR;
  const glob = new Bun.Glob('*.toml');
  const skippedPartners: string[] = [];
  const failed: { code: string; error: string }[] = [];
  const results: RunSettlementResult[] = [];
  for await (const file of glob.scan({ cwd: profilesDir, onlyFiles: true })) {
    if (file.startsWith('.example')) continue;
    const code = file.replace(/\.toml$/, '').toUpperCase();
    try {
      results.push(await runSettlementForPartner({ ...input, code }));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (/has no settlement\.commissionPct/.test(message)) skippedPartners.push(code);
      else failed.push({ code, error: message });
    }
  }
  return { results, skippedPartners, failed };
}
