// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Append-only TOC Soft Balance journal (operate-plane lite).
 * Never UPDATE/DELETE rows. Seed mirrors fixture Soft entries for linked call signs.
 *
 * @see toc-ops-repo/docs/system/ACCOUNTING.md
 * @see lib/toc-ops/enforcement.ts
 */
import { randomUUIDv7 } from 'bun';
import type { Database } from 'bun:sqlite';
import type { TocOpsSnapshot, TocSoftEntryType } from '../toc-ops/types.ts';

export type TocSoftJournalRow = {
  id: string; // brand-ok — journal row pk
  entryType: TocSoftEntryType;
  stakeholder: 'Partner' | 'Expert' | 'House';
  amount: number;
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  taskId: string; // brand-ok
  createdAt: string;
  correctsEntryId: string | null; // brand-ok
  reason: string | null;
};

export function ensureTocSoftBalanceSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS toc_soft_entries (
      id TEXT PRIMARY KEY,
      entry_type TEXT NOT NULL,
      stakeholder TEXT NOT NULL CHECK(stakeholder IN ('Partner','Expert','House')),
      amount REAL NOT NULL,
      call_sign TEXT NOT NULL,
      partner_code TEXT NOT NULL,
      task_id TEXT NOT NULL,
      corrects_entry_id TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_toc_soft_call ON toc_soft_entries(call_sign);
    CREATE INDEX IF NOT EXISTS idx_toc_soft_task ON toc_soft_entries(task_id);

    CREATE TRIGGER IF NOT EXISTS toc_soft_entries_no_update
    BEFORE UPDATE ON toc_soft_entries
    BEGIN
      SELECT RAISE(ABORT, 'toc_soft_entries is append-only');
    END;
    CREATE TRIGGER IF NOT EXISTS toc_soft_entries_no_delete
    BEFORE DELETE ON toc_soft_entries
    BEGIN
      SELECT RAISE(ABORT, 'toc_soft_entries is append-only');
    END;
  `);
}

export function postTocSoftBalance(
  db: Database,
  entry: {
    entryType: TocSoftEntryType;
    stakeholder: 'Partner' | 'Expert' | 'House';
    amount: number;
    callSign: string;
    partnerCode: string;
    taskId: string; // brand-ok — Soft journal FK to fixture/task id string
    correctsEntryId?: string; // brand-ok — Soft Adjustment self-reference
    reason?: string;
    createdAt?: string;
  }
): TocSoftJournalRow {
  ensureTocSoftBalanceSchema(db);
  if (entry.entryType === 'Adjustment' && !entry.correctsEntryId) {
    throw new Error('Adjustment requires correctsEntryId');
  }
  const id = randomUUIDv7(); // brand-ok
  const createdAt = entry.createdAt ?? new Date().toISOString();
  db.run(
    `INSERT INTO toc_soft_entries
       (id, entry_type, stakeholder, amount, call_sign, partner_code, task_id, corrects_entry_id, reason, created_at)
     VALUES ($id, $type, $sh, $amt, $cs, $pc, $tid, $corr, $reason, $now)`,
    {
      $id: id,
      $type: entry.entryType,
      $sh: entry.stakeholder,
      $amt: entry.amount,
      $cs: entry.callSign,
      $pc: entry.partnerCode,
      $tid: entry.taskId,
      $corr: entry.correctsEntryId ?? null,
      $reason: entry.reason ?? null,
      $now: createdAt,
    }
  );
  return {
    id,
    entryType: entry.entryType,
    stakeholder: entry.stakeholder,
    amount: entry.amount,
    callSign: entry.callSign,
    partnerCode: entry.partnerCode,
    taskId: entry.taskId,
    createdAt,
    correctsEntryId: entry.correctsEntryId ?? null,
    reason: entry.reason ?? null,
  };
}

/** Seed Soft journal from fixture recentEntries when empty (or force). */
export function seedTocSoftFromFixture(
  db: Database,
  fixture: TocOpsSnapshot,
  opts?: { force?: boolean }
): { inserted: number; skipped: boolean } {
  ensureTocSoftBalanceSchema(db);
  const n = db.query(`SELECT COUNT(*) AS n FROM toc_soft_entries`).get() as { n: number };
  if (!opts?.force && (n?.n ?? 0) > 0) {
    return { inserted: 0, skipped: true };
  }
  if (opts?.force) {
    // Append-only: cannot truncate under triggers — skip force wipe; only insert missing task_ids
  }

  let inserted = 0;
  for (const p of fixture.partners) {
    for (const e of p.softBalance.recentEntries) {
      const exists = db
        .query(
          `SELECT id FROM toc_soft_entries WHERE task_id = $t AND entry_type = $ty AND stakeholder = $sh LIMIT 1`
        )
        .get({ $t: e.taskId, $ty: e.entryType, $sh: e.stakeholder }) as { id: string } | null; // brand-ok
      if (exists) continue;
      postTocSoftBalance(db, {
        entryType: e.entryType,
        stakeholder: e.stakeholder,
        amount: e.amount,
        callSign: e.callSign,
        partnerCode: p.partnerCode,
        taskId: e.taskId,
        createdAt: e.timestamp,
      });
      inserted++;
    }
  }
  return { inserted, skipped: false };
}

export function listTocSoftEntries(db: Database, limit = 50): TocSoftJournalRow[] {
  ensureTocSoftBalanceSchema(db);
  const rows = db
    .query(
      `SELECT id, entry_type, stakeholder, amount, call_sign, partner_code, task_id,
              corrects_entry_id, reason, created_at
       FROM toc_soft_entries ORDER BY created_at DESC LIMIT $lim`
    )
    .all({ $lim: limit }) as Array<{
    id: string; // brand-ok — SQLite wire primary key
    entry_type: TocSoftEntryType;
    stakeholder: 'Partner' | 'Expert' | 'House';
    amount: number;
    call_sign: string;
    partner_code: string;
    task_id: string; // brand-ok — SQLite wire task FK
    corrects_entry_id: string | null; // brand-ok — SQLite wire correction FK
    reason: string | null;
    created_at: string;
  }>;

  return rows.map(r => ({
    id: r.id,
    entryType: r.entry_type,
    stakeholder: r.stakeholder,
    amount: r.amount,
    callSign: r.call_sign,
    partnerCode: r.partner_code,
    taskId: r.task_id,
    createdAt: r.created_at,
    correctsEntryId: r.corrects_entry_id,
    reason: r.reason,
  }));
}
