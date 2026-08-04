// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// lib/partner-profile/profiles-diff.ts — partner profile TOML vs ops-DB diff +
// profile-change audit.
//
// The real analog of the proposal's "--diff/--dry-run quick win": parse
// config/partner-profiles/*.toml, compare each profile's SHA-256 against the
// last recorded baseline (partner_profile_audit), and report added / changed /
// removed / unchanged. `--record` on the CLI advances the audit baseline —
// the closest the current system has to a seed/upsert loop (the bindings table
// is materialized separately by the partner-profiles migration).

import type { Database } from 'bun:sqlite';

import { openOperationsDb } from '../operations/db.ts';
import { parsePartnerProfileToml } from './parse.ts';

// ─── hashing ─────────────────────────────────────────────────────────────────

/** SHA-256 of a profile TOML document — the change-detection fingerprint. */
export function profileFileHash(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex');
}

// ─── TOML loading ────────────────────────────────────────────────────────────

export type ProfileTomlEntry = {
  code: string; // brand-ok — partner CODE (^[A-Z]{3,6}$)
  filePath: string;
  hash: string;
};

/** Parse every partner profile TOML; malformed files are skipped. */
export async function loadProfileTomlEntries(
  profilesDir = 'config/partner-profiles',
  hashFn: (text: string) => string = profileFileHash
): Promise<ProfileTomlEntry[]> {
  const out: ProfileTomlEntry[] = [];
  const glob = new Bun.Glob('*.toml');
  for await (const rel of glob.scan(profilesDir)) {
    const expected = rel.replace(/\.toml$/i, '').toUpperCase();
    try {
      const text = await Bun.file(`${profilesDir}/${rel}`).text();
      const profile = parsePartnerProfileToml(text, expected);
      out.push({
        code: profile.identity.code,
        filePath: `${profilesDir}/${rel}`,
        hash: hashFn(text),
      });
    } catch {
      /* skip malformed / non-profile TOML */
    }
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}

// ─── audit table ─────────────────────────────────────────────────────────────

const PROFILE_AUDIT_DDL = `
CREATE TABLE IF NOT EXISTS partner_profile_audit (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_code TEXT NOT NULL,   -- brand-ok — partner CODE (^[A-Z]{3,6}$)
  action       TEXT NOT NULL CHECK(action IN ('add', 'change', 'remove', 'baseline')),
  file_hash    TEXT NOT NULL,
  recorded_at  TEXT NOT NULL,
  note         TEXT
);
CREATE INDEX IF NOT EXISTS idx_partner_profile_audit_code ON partner_profile_audit (partner_code, recorded_at);
`;

export type ProfileAuditAction = 'add' | 'change' | 'remove' | 'baseline';

/** Idempotent — create the profile audit table in the ops DB. */
export function ensureProfileAudit(db: Database): void {
  db.exec(PROFILE_AUDIT_DDL);
}

/** Open the ops DB with the audit table ensured. */
export function openProfileAuditDb(path?: string): Database {
  const db = openOperationsDb({ path: path ?? undefined });
  ensureProfileAudit(db);
  return db;
}

/** Record one profile change; returns the audit row id. */
export function recordProfileAudit(
  db: Database,
  code: string,
  action: ProfileAuditAction,
  hash: string,
  note?: string
): number {
  const { lastInsertRowid } = db
    .query(
      'INSERT INTO partner_profile_audit (partner_code, action, file_hash, recorded_at, note) VALUES (?, ?, ?, ?, ?)'
    )
    .run(code, action, hash, new Date().toISOString(), note ?? null);
  return Number(lastInsertRowid);
}

export type ProfileAuditRow = {
  id: number;
  partnerCode: string; // brand-ok — partner CODE
  action: ProfileAuditAction;
  fileHash: string;
  recordedAt: string;
  note: string | null;
};

/** List audit rows, optionally filtered by partner code. */
export function listProfileAudit(db: Database, code?: string): ProfileAuditRow[] {
  const rows = (
    code
      ? db
          .query(
            'SELECT * FROM partner_profile_audit WHERE partner_code = ? ORDER BY recorded_at DESC'
          )
          .all(code)
      : db.query('SELECT * FROM partner_profile_audit ORDER BY recorded_at DESC').all()
  ) as Array<Record<string, unknown>>;
  return rows.map(r => ({
    id: Number(r.id),
    partnerCode: String(r.partner_code),
    action: String(r.action) as ProfileAuditAction,
    fileHash: String(r.file_hash),
    recordedAt: String(r.recorded_at),
    note: r.note === null ? null : String(r.note),
  }));
}

/** Last recorded hash for a partner code, or null when never recorded. */
export function lastProfileAuditHash(db: Database, code: string): string | null {
  const row = db
    .query(
      'SELECT file_hash FROM partner_profile_audit WHERE partner_code = ? ORDER BY recorded_at DESC LIMIT 1'
    )
    .get(code) as { file_hash: string } | null | undefined;
  return row?.file_hash ?? null;
}

// ─── diff ────────────────────────────────────────────────────────────────────

export type PartnerProfilesDiff = {
  added: string[]; // brand-ok — partner CODEs in TOML but never audited
  changed: Array<{ code: string; hash: string; prevHash: string | null }>; // hash drift vs baseline
  removed: string[]; // brand-ok — audited/bound codes with no TOML file
  unchanged: number;
  total: number;
};

/**
 * Compare TOML profiles against the audit baseline (and the ops-DB bindings
 * for the "removed" set). Baseline semantics: a code is "added" when it has no
 * audit record; "changed" when its TOML hash differs from the last record.
 */
export function diffPartnerProfiles(opts: {
  entries: ProfileTomlEntry[];
  db: Database;
}): PartnerProfilesDiff {
  const { entries, db } = opts;
  const byCode = new Map(entries.map(e => [e.code, e]));
  const audited = new Set(
    (
      db.query('SELECT DISTINCT partner_code FROM partner_profile_audit').all() as Array<{
        partner_code: string;
      }>
    ).map(r => r.partner_code)
  );
  const bound = new Set(
    (
      db.query('SELECT DISTINCT profile_key FROM partner_profile_bindings').all() as Array<{
        profile_key: string;
      }>
    ).map(r => r.profile_key)
  );

  const added: string[] = [];
  const changed: PartnerProfilesDiff['changed'] = [];
  let unchanged = 0;

  for (const entry of entries) {
    const prevHash = lastProfileAuditHash(db, entry.code);
    if (prevHash === null) added.push(entry.code);
    else if (prevHash !== entry.hash)
      changed.push({ code: entry.code, hash: entry.hash, prevHash });
    else unchanged++;
  }

  const known = new Set([...audited, ...bound]);
  const removed = [...known].filter(code => !byCode.has(code)).sort();

  return { added, changed, removed, unchanged, total: entries.length };
}

/** Record audit rows for a diff (the `--record` baseline advance). */
export function recordDiffAudit(
  db: Database,
  diff: PartnerProfilesDiff,
  entries: ProfileTomlEntry[]
): number {
  const byCode = new Map(entries.map(e => [e.code, e]));
  let recorded = 0;
  for (const code of diff.added) {
    const entry = byCode.get(code);
    if (entry) {
      recordProfileAudit(db, code, 'add', entry.hash, 'diff --record');
      recorded++;
    }
  }
  for (const c of diff.changed) {
    recordProfileAudit(db, c.code, 'change', c.hash, 'diff --record');
    recorded++;
  }
  for (const code of diff.removed) {
    recordProfileAudit(db, code, 'remove', '', 'diff --record — no TOML');
    recorded++;
  }
  return recorded;
}
