// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// lib/partner-profile/partner-health.ts — partner-domain runtime health.
//
// Read-only health report: ops DB reachability, partner_profile_bindings,
// partner_ledger, partner_account_limits (capacity rows), parseable profile
// TOML count, and profile↔binding alignment. Subsystems with missing tables
// are reported as degraded rather than throwing — that's the point of the
// command (runtime visibility).

import type { Database } from 'bun:sqlite';

import { openOperationsDb } from '../operations/db.ts';
import { loadProfileTomlEntries, type ProfileTomlEntry } from './profiles-diff.ts';

export type PartnerHealthReport = {
  ok: boolean;
  generatedAt: string;
  opsDb: { ok: boolean; error?: string };
  bindings: { ok: boolean; count: number; error?: string };
  ledger: { ok: boolean; count: number; partners: number; error?: string };
  capacity: { ok: boolean; count: number; error?: string };
  profiles: { ok: boolean; count: number };
  alignment: { profilesWithoutBinding: string[]; bindingsWithoutProfile: string[] };
};

function tableExists(db: Database, name: string): boolean {
  return (
    db.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== null
  );
}

function safeCount(db: Database, sql: string): { count: number; error?: string } {
  try {
    const { n } = db.query(sql).get() as { n: number };
    return { count: n };
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Build the partner-domain health report. Never throws on degraded subsystems. */
export async function runPartnerHealth(
  opts: { db?: Database; profilesDir?: string } = {}
): Promise<PartnerHealthReport> {
  const generatedAt = new Date().toISOString();

  let db: Database | null = null;
  let dbError: string | undefined;
  if (opts.db) {
    db = opts.db;
  } else {
    try {
      db = openOperationsDb();
    } catch (err) {
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  const bindings = db
    ? safeCount(db, 'SELECT COUNT(*) AS n FROM partner_profile_bindings')
    : { count: 0, error: 'ops DB unavailable' };
  const ledger = db
    ? safeCount(db, 'SELECT COUNT(*) AS n FROM partner_ledger')
    : { count: 0, error: 'ops DB unavailable' };
  const ledgerPartners = db
    ? safeCount(db, 'SELECT COUNT(DISTINCT partner_code) AS n FROM partner_ledger')
    : { count: 0, error: 'ops DB unavailable' };
  const capacity = db
    ? safeCount(db, 'SELECT COUNT(*) AS n FROM partner_account_limits')
    : { count: 0, error: 'ops DB unavailable' };

  const entries: ProfileTomlEntry[] = await loadProfileTomlEntries(opts.profilesDir);

  let boundKeys = new Set<string>();
  if (db) {
    try {
      boundKeys = new Set(
        (
          db.query('SELECT DISTINCT profile_key FROM partner_profile_bindings').all() as Array<{
            profile_key: string;
          }>
        ).map(r => r.profile_key)
      );
    } catch {
      /* bindings table missing — degraded */
    }
  }
  const profileCodes = new Set(entries.map(e => e.code));
  const profilesWithoutBinding = [...profileCodes].filter(c => !boundKeys.has(c)).sort();
  const bindingsWithoutProfile = [...boundKeys].filter(c => !profileCodes.has(c)).sort();

  const opsDbOk = db !== null;
  const report: PartnerHealthReport = {
    ok: false,
    generatedAt,
    opsDb: { ok: opsDbOk, ...(dbError ? { error: dbError } : {}) },
    bindings: {
      ok: opsDbOk && bindings.error === undefined,
      count: bindings.count,
      ...(bindings.error ? { error: bindings.error } : {}),
    },
    ledger: {
      ok: opsDbOk && ledger.error === undefined,
      count: ledger.count,
      partners: ledgerPartners.count,
      ...(ledger.error ? { error: ledger.error } : {}),
    },
    capacity: {
      ok: opsDbOk && capacity.error === undefined,
      count: capacity.count,
      ...(capacity.error ? { error: capacity.error } : {}),
    },
    profiles: { ok: true, count: entries.length },
    alignment: { profilesWithoutBinding, bindingsWithoutProfile },
  };

  report.ok =
    report.opsDb.ok &&
    report.bindings.ok &&
    report.ledger.ok &&
    report.capacity.ok &&
    report.profiles.ok;

  return report;
}
