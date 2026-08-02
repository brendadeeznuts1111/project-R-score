// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// lib/partner-profile/register.ts — phase 2: register a partner bookmaker
// account into the unified Partner Profile (CODE-keyed) with vault-only
// credentials.
//
// Flow:
//   1. resolve the partner's tree node (ops DB, by call-sign);
//   2. write the password to partner_vault (per-node AES-GCM) under
//      `partner:{CODE}:{bookKey}` — NEVER plaintext in intake/profile;
//   3. upsert the seat-intake out (bookLogin + vaultKey, no password);
//   4. upsert config/partner-profiles/<CODE>.toml with books.<bookKey>.
//
// Caller runs the bakes afterwards (partner-profile:bake · seat:desk:post).
// @see docs/design/unified-partner-profile.md — phase 2
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write

import type { Database } from 'bun:sqlite';
import { joinPath } from '../path-bun';
import { DEFAULT_OPS_DB_PATH, openOperationsDb, type OpenOperationsDbOpts } from '../operations/db';
import { setPartnerSecret } from '../security/partner-vault';
import {
  loadSeatIntake,
  saveSeatIntake,
  SEAT_INTAKE_DIR,
  type SeatIntakeRecord,
  type SeatOut,
} from '../telegram/seat-intake';
import { BOOK_KEY_RE, CALL_SIGN_RE, PARTNER_CODE_RE, VAULT_KEY_RE, type BookType } from './schema';
import { asOutId, type OutId, type TreeNodeId } from '../types/branded';

export const PROFILES_DIR = 'config/partner-profiles';

/** `partner_vault` DDL (mirrors tests/partner-isolation.test.ts). */
export const PARTNER_VAULT_DDL = `
CREATE TABLE IF NOT EXISTS partner_vault (
  id INTEGER PRIMARY KEY,
  node_id TEXT NOT NULL,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  UNIQUE(node_id, key)
);
`;

export function ensurePartnerVaultTable(db: Database): void {
  db.exec(PARTNER_VAULT_DDL);
}

export function vaultKeyFor(code: string, bookKey: string): string {
  return `partner:${code}:${bookKey}`;
}

/** Resolve the active tree-node id for a call-sign (null when not onboarded). */
export function resolvePartnerNodeId(db: Database, callSign: string): TreeNodeId | null {
  const row = db
    .query('SELECT id FROM tree_nodes WHERE call_sign = $cs AND active = 1 LIMIT 1')
    .get({ $cs: callSign }) as { id: TreeNodeId } | undefined;
  return row?.id ?? null;
}

export interface RegisterBookmakerInput {
  code: string; // ^[A-Z]{3,6}$
  callSign: string; // CODE-NNN
  bookKey: string; // @factorywager/bookmakers registry id (e.g. youwager)
  url: string; // site URL (e.g. https://rc.youwager.lv)
  username: string;
  password?: string; // written to the vault (omitted when already stored)
  type?: BookType; // default pph
  chatId?: string; // brand-ok — telegram chat id wire
  maxBet?: number;
  outId?: OutId; // default `${code}-1`
  /** Injected ops DB (tests). Default: open via dbPath / DEFAULT_OPS_DB_PATH. */
  db?: Database;
  dbPath?: string; // ops DB (default DEFAULT_OPS_DB_PATH)
  intakeDir?: string; // default SEAT_INTAKE_DIR
  profilesDir?: string; // default config/partner-profiles
}

export interface RegisterBookmakerResult {
  nodeId: TreeNodeId;
  vaultKey: string;
  intakePath: string;
  profilePath: string;
}

function escapeToml(value: string): string {
  return JSON.stringify(value);
}

/** Build (or merge into) the profile TOML for books.<bookKey>. */
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML.parse
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
export async function upsertProfileToml(
  profilesDir: string,
  code: string,
  callSign: string,
  bookKey: string,
  input: Pick<RegisterBookmakerInput, 'url' | 'username' | 'type' | 'maxBet' | 'chatId'>,
  vaultKey: string
): Promise<string> {
  const path = joinPath(profilesDir, `${code}.toml`);
  // Parse/merge/stringify: object-level merge avoids TOML table-redefinition
  // errors from string surgery on nested tables.
  let profile: Record<string, unknown> = {};
  try {
    profile = Bun.TOML.parse(await Bun.file(path).text()) as Record<string, unknown>;
  } catch {
    // new profile — minimal skeleton below
  }
  profile.meta ??= {
    templateId: 'partner-active',
    name: code,
    version: '1.0.0',
    source: 'telegram',
  };
  profile.identity ??= { code, callSign, status: 'onboarded' };
  profile.lifecycle ??= { status: 'active', phase: 'operator_ready' };
  if (input.chatId && !profile.telegram) profile.telegram = { chatId: input.chatId };
  const books = (profile.books as Record<string, unknown> | undefined) ?? {};
  books[bookKey] = {
    type: input.type ?? 'pph',
    account: { username: input.username, vaultKey },
    ...(input.maxBet ? { limits: { maxBet: input.maxBet } } : {}),
  };
  profile.books = books;
  await Bun.write(path, `${Bun.TOML.stringify(profile).trimEnd()}\n`);
  return path;
}

/**
 * Register (or refresh) a partner bookmaker account. Validates inputs, writes
 * the password to the vault, upserts the seat-intake out (no plaintext
 * password) and the profile TOML. Returns the written paths.
 */
export async function registerPartnerBookmaker(
  input: RegisterBookmakerInput
): Promise<RegisterBookmakerResult> {
  if (!PARTNER_CODE_RE.test(input.code)) throw new Error(`invalid CODE "${input.code}"`);
  if (!CALL_SIGN_RE.test(input.callSign)) {
    throw new Error(`invalid callSign "${input.callSign}"`);
  }
  if (!input.callSign.startsWith(input.code)) {
    throw new Error(`callSign ${input.callSign} must derive from code ${input.code}`);
  }
  if (!BOOK_KEY_RE.test(input.bookKey)) {
    throw new Error(`invalid bookKey "${input.bookKey}"`);
  }
  if (!input.url || !input.username) {
    throw new Error('url and username are required');
  }
  if (input.password !== undefined && input.password.length === 0) {
    throw new Error('password must be non-empty when provided');
  }

  const db = input.db ?? openOperationsDb({ path: input.dbPath } as OpenOperationsDbOpts);
  ensurePartnerVaultTable(db);
  const nodeId = resolvePartnerNodeId(db, input.callSign);
  if (!nodeId) {
    throw new Error(
      `partner ${input.callSign} is not onboarded — run \`bun run onboard:partner ${input.callSign}\` first`
    );
  }

  const vaultKey = vaultKeyFor(input.code, input.bookKey);
  if (!VAULT_KEY_RE.test(vaultKey)) throw new Error(`invalid vaultKey "${vaultKey}"`);
  if (input.password !== undefined) {
    await setPartnerSecret(db, nodeId, vaultKey, input.password);
  }

  const intakeDir = input.intakeDir ?? SEAT_INTAKE_DIR;
  const record =
    (await loadSeatIntake(input.callSign, intakeDir)) ??
    ({
      partnerCode: input.code,
      callSign: input.callSign,
      outs: [],
      recordedAt: new Date().toISOString(),
    } as SeatIntakeRecord);
  const outId = input.outId ?? asOutId(`${input.code}-1`);
  const existing = record.outs.find(o => o.outId === outId);
  const out: SeatOut = {
    ...(existing ?? {}),
    outId,
    book: input.url,
    bookLogin: input.username,
    vaultKey, // never password
    ...(input.maxBet ? { maxBet: String(input.maxBet) } : {}),
  };
  if (!existing) record.outs.push(out);
  else Object.assign(existing, out);
  const intakePath = await saveSeatIntake(record, intakeDir);

  const profilePath = await upsertProfileToml(
    input.profilesDir ?? PROFILES_DIR,
    input.code,
    input.callSign,
    input.bookKey,
    input,
    vaultKey
  );

  return { nodeId, vaultKey, intakePath, profilePath };
}

/** Move plaintext seat-intake passwords into the vault (idempotent). */
export async function migrateSeatIntakePasswordsToVault(
  dbPath = DEFAULT_OPS_DB_PATH,
  intakeDir = SEAT_INTAKE_DIR
): Promise<{ migrated: number; files: string[] }> {
  const db = openOperationsDb({ path: dbPath } as OpenOperationsDbOpts);
  ensurePartnerVaultTable(db);
  const migrated: string[] = [];
  const glob = new Bun.Glob('*.json');
  for await (const file of glob.scan({ cwd: intakeDir, onlyFiles: true })) {
    const record = await loadSeatIntake(file.replace(/\.json$/, ''), intakeDir);
    if (!record) continue;
    const nodeId = resolvePartnerNodeId(db, record.callSign);
    if (!nodeId) continue;
    let changed = false;
    for (const out of record.outs) {
      if (out.password) {
        const bookKey = (out.book ?? '').replace(/^https?:\/\//, '').split('.')[0] || 'book';
        const key = vaultKeyFor(record.partnerCode, bookKey);
        await setPartnerSecret(db, nodeId, key, out.password);
        out.vaultKey = key;
        delete (out as Partial<SeatOut>).password;
        changed = true;
      }
    }
    if (changed) {
      await saveSeatIntake(record, intakeDir);
      migrated.push(record.callSign);
    }
  }
  return { migrated: migrated.length, files: migrated };
}
