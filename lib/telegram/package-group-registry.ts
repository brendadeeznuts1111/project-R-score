// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/sqlite
/**
 * Package group registry — partner_code → Telegram package forum (Soft plane surface).
 *
 * Distinct from ops_chat_channel_meta (per-DM transport). See partner-package-group-handshake.md.
 */
import { Database } from 'bun:sqlite';
import { formatPackageGroupTitle, TOC_OPS_SURFACES } from './surfaces.ts';
import { tryPartnerCodeArg, HANDSHAKE_PARTNER_CODE_RE } from './handshake-ref.ts';
import { resolveSeatTelegramId, telegramIdWireLinked } from './flows/seat-telegram-id.ts';

/** @deprecated use HANDSHAKE_PARTNER_CODE_RE from handshake-ref.ts */
export const PARTNER_CODE_PATTERN = HANDSHAKE_PARTNER_CODE_RE;

export const PENDING_PACKAGE_GROUPS_JSONL = 'reports/telegram/pending-package-groups.jsonl';

export type PackageGroupRegistryRow = {
  partnerCode: string;
  chatId: string; // brand-ok — Telegram chat_id wire
  inviteLink: string | null;
  title: string;
  requestedBy: string | null;
  createdAt: string;
  linkedAt: string;
};

type DbRow = {
  partner_code: string;
  chat_id: string; // brand-ok
  invite_link: string | null;
  title: string;
  requested_by: string | null;
  created_at: string;
  linked_at: string;
};

export function ensurePackageGroupRegistrySchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS package_group_registry (
      partner_code TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      invite_link TEXT,
      title TEXT NOT NULL,
      requested_by TEXT,
      created_at TEXT NOT NULL,
      linked_at TEXT NOT NULL
    );
  `);
}

function rowToRegistry(row: DbRow): PackageGroupRegistryRow {
  return {
    partnerCode: row.partner_code,
    chatId: row.chat_id,
    inviteLink: row.invite_link,
    title: row.title,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    linkedAt: row.linked_at,
  };
}

export function parsePartnerCode(raw: string): string | null {
  return tryPartnerCodeArg(raw);
}

/** Telegram chat_id wire: optional leading minus, digits only. */
export function parseTelegramChatIdWire(raw: string): string | null {
  const s = raw.trim();
  if (!/^-?\d+$/.test(s)) return null;
  return s;
}

export function getPackageGroupRegistry(
  db: Database,
  partnerCode: string
): PackageGroupRegistryRow | null {
  ensurePackageGroupRegistrySchema(db);
  const code = parsePartnerCode(partnerCode);
  if (!code) return null;
  const row = db
    .query(`SELECT * FROM package_group_registry WHERE partner_code = $c`)
    .get({ $c: code }) as DbRow | null;
  return row ? rowToRegistry(row) : null;
}

/** All package_group_registry rows, sorted by partner code. */
export function listPackageGroupRegistry(db: Database): PackageGroupRegistryRow[] {
  ensurePackageGroupRegistrySchema(db);
  const rows = db
    .query(`SELECT * FROM package_group_registry ORDER BY partner_code`)
    .all() as DbRow[];
  return rows.map(rowToRegistry);
}

/** chat_id → registry row (for directory join). */
export function packageGroupRegistryByChatId(db: Database): Map<string, PackageGroupRegistryRow> {
  ensurePackageGroupRegistrySchema(db);
  const rows = db.query(`SELECT * FROM package_group_registry`).all() as DbRow[];
  const map = new Map<string, PackageGroupRegistryRow>();
  for (const row of rows) {
    map.set(row.chat_id, rowToRegistry(row));
  }
  return map;
}

export type UpsertPackageGroupRegistryInput = {
  partnerCode: string;
  chatId: string; // brand-ok
  displayName: string;
  inviteLink?: string | null;
  requestedBy?: string | null;
  now?: string;
};

export function upsertPackageGroupRegistry(
  db: Database,
  input: UpsertPackageGroupRegistryInput
): PackageGroupRegistryRow {
  ensurePackageGroupRegistrySchema(db);
  const partnerCode = parsePartnerCode(input.partnerCode);
  if (!partnerCode) {
    throw new Error(`Invalid partner_code: ${input.partnerCode} (expected ^[A-Z]{2,4}$)`);
  }
  const chatId = parseTelegramChatIdWire(input.chatId);
  if (!chatId) {
    throw new Error(`Invalid Telegram chat_id: ${input.chatId}`);
  }

  const now = input.now ?? new Date().toISOString();
  const title = formatPackageGroupTitle(partnerCode, input.displayName.trim() || partnerCode);
  const existing = getPackageGroupRegistry(db, partnerCode);
  const createdAt = existing?.createdAt ?? now;

  db.run(
    `INSERT INTO package_group_registry (
       partner_code, chat_id, invite_link, title, requested_by, created_at, linked_at
     ) VALUES ($pc, $cid, $inv, $title, $req, $created, $linked)
     ON CONFLICT(partner_code) DO UPDATE SET
       chat_id = excluded.chat_id,
       invite_link = COALESCE(excluded.invite_link, package_group_registry.invite_link),
       title = excluded.title,
       requested_by = COALESCE(excluded.requested_by, package_group_registry.requested_by),
       linked_at = excluded.linked_at`,
    {
      $pc: partnerCode,
      $cid: chatId,
      $inv: input.inviteLink?.trim() || null,
      $title: title,
      $req: input.requestedBy?.trim() || null,
      $created: createdAt,
      $linked: now,
    }
  );

  return getPackageGroupRegistry(db, partnerCode)!;
}

/** Resolve a DM telegram_id for package-room welcome (any active seat under code). */
export function resolvePartnerDmTelegramId(
  db: Database,
  partnerCode: string,
  preferredCallSign?: string | null
): string | null {
  if (preferredCallSign?.trim()) {
    const fromSeat = resolveSeatTelegramId(db, { callSign: preferredCallSign.trim() });
    if (telegramIdWireLinked(fromSeat)) return fromSeat;
  }

  const code = parsePartnerCode(partnerCode);
  if (!code) return null;

  const rows = db
    .query(
      `SELECT call_sign FROM tree_nodes
       WHERE active = 1 AND call_sign LIKE $prefix
       ORDER BY call_sign ASC`
    )
    .all({ $prefix: `${code}-%` }) as Array<{ call_sign: string | null }>;

  for (const row of rows) {
    if (!row.call_sign?.trim()) continue;
    const fromSeat = resolveSeatTelegramId(db, { callSign: row.call_sign });
    if (telegramIdWireLinked(fromSeat)) return fromSeat;
  }

  return null;
}

export type PackageGroupCreateArtifact = {
  action: 'create_package_group';
  partner_code: string;
  display_name: string;
  suggested_title: string;
  requested_by: string | null;
  tree_node_id: string; // brand-ok
  timestamp: string;
};

export async function appendPendingPackageGroupArtifact(
  artifact: PackageGroupCreateArtifact
): Promise<string> {
  return appendPackageGroupEventLog(PENDING_PACKAGE_GROUPS_JSONL, artifact);
}

export type AckPackageGroupWiredArtifact = {
  action: 'ack_package_group_wired';
  partner_code: string;
  chat_id: string; // brand-ok
  telegram_ref: string;
  wired_by: 'ct';
  timestamp: string;
};

export type AckPackageGroupLinkedArtifact = {
  action: 'ack_package_group_linked';
  partner_code: string;
  chat_id: string; // brand-ok
  linked_by: 'factory';
  registry_title?: string;
  timestamp: string;
};

export type AckDmSeatDesignatedArtifact = {
  action: 'ack_dm_seat_designated';
  partner_code: string;
  call_sign: string;
  designated_by: 'factory';
  timestamp: string;
};

export type AckForumInviteSentArtifact = {
  action: 'ack_forum_invite_sent';
  partner_code: string;
  call_sign: string;
  chat_id: string; // brand-ok — operator DM telegram id wire
  invite_link: string;
  sent_by: 'factory';
  timestamp: string;
};

export type PackageGroupEventLogEntry =
  | PackageGroupCreateArtifact
  | AckPackageGroupWiredArtifact
  | AckPackageGroupLinkedArtifact
  | AckDmSeatDesignatedArtifact
  | AckForumInviteSentArtifact;

function parseEventLogLine(raw: string, lineNo: number): PackageGroupEventLogEntry | null {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error(`package group JSONL line ${lineNo}: invalid JSON`);
  }
  if (typeof parsed !== 'object' || parsed == null) return null;
  const action = (parsed as { action?: string }).action;
  if (action === 'create_package_group') {
    const row = parsed as Record<string, unknown>;
    const partnerCode = String(row.partner_code ?? '')
      .toUpperCase()
      .trim();
    return {
      action: 'create_package_group',
      partner_code: partnerCode,
      display_name: String(row.display_name ?? '').trim(),
      suggested_title: String(row.suggested_title ?? '').trim(),
      requested_by:
        row.requested_by == null || row.requested_by === ''
          ? null
          : String(row.requested_by).trim(),
      tree_node_id: String(row.tree_node_id ?? ''), // brand-ok
      timestamp: String(row.timestamp ?? ''),
    };
  }
  if (action === 'ack_package_group_wired') {
    const row = parsed as Record<string, unknown>;
    return {
      action: 'ack_package_group_wired',
      partner_code: String(row.partner_code ?? '')
        .toUpperCase()
        .trim(),
      chat_id: String(row.chat_id ?? ''), // brand-ok
      telegram_ref: String(row.telegram_ref ?? ''),
      wired_by: 'ct',
      timestamp: String(row.timestamp ?? ''),
    };
  }
  if (action === 'ack_package_group_linked') {
    const row = parsed as Record<string, unknown>;
    return {
      action: 'ack_package_group_linked',
      partner_code: String(row.partner_code ?? '')
        .toUpperCase()
        .trim(),
      chat_id: String(row.chat_id ?? ''), // brand-ok
      linked_by: 'factory',
      registry_title: row.registry_title != null ? String(row.registry_title) : undefined,
      timestamp: String(row.timestamp ?? ''),
    };
  }
  if (action === 'ack_dm_seat_designated') {
    const row = parsed as Record<string, unknown>;
    return {
      action: 'ack_dm_seat_designated',
      partner_code: String(row.partner_code ?? '')
        .toUpperCase()
        .trim(),
      call_sign: String(row.call_sign ?? '').trim(),
      designated_by: 'factory',
      timestamp: String(row.timestamp ?? ''),
    };
  }
  if (action === 'ack_forum_invite_sent') {
    const row = parsed as Record<string, unknown>;
    return {
      action: 'ack_forum_invite_sent',
      partner_code: String(row.partner_code ?? '')
        .toUpperCase()
        .trim(),
      call_sign: String(row.call_sign ?? '').trim(),
      chat_id: String(row.chat_id ?? ''), // brand-ok
      invite_link: String(row.invite_link ?? ''),
      sent_by: 'factory',
      timestamp: String(row.timestamp ?? ''),
    };
  }
  return null;
}

export function parsePackageGroupEventLog(text: string): PackageGroupEventLogEntry[] {
  const entries: PackageGroupEventLogEntry[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const entry = parseEventLogLine(lines[i]!, i + 1);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function readPackageGroupEventLog(
  path: string = PENDING_PACKAGE_GROUPS_JSONL
): Promise<PackageGroupEventLogEntry[]> {
  const file = Bun.file(path);
  if (!(await file.exists())) return [];
  return parsePackageGroupEventLog(await file.text());
}

/** Creates still awaiting Soft wire (no ack_package_group_wired for that code). */
export function resolveOpenPendingCreates(
  log: PackageGroupEventLogEntry[]
): PackageGroupCreateArtifact[] {
  const open = new Map<string, PackageGroupCreateArtifact>();
  const wired = new Set<string>();

  for (const entry of log) {
    if (entry.action === 'create_package_group') {
      open.set(entry.partner_code, entry);
      wired.delete(entry.partner_code);
    } else if (entry.action === 'ack_package_group_wired') {
      wired.add(entry.partner_code);
      open.delete(entry.partner_code);
    }
  }

  return [...open.values()].filter(row => !wired.has(row.partner_code));
}

/** Latest create_package_group line for a partner code (append-only log). */
export function latestPackageGroupCreate(
  log: PackageGroupEventLogEntry[],
  partnerCode: string
): PackageGroupCreateArtifact | null {
  const code = parsePartnerCode(partnerCode);
  if (!code) return null;
  let latest: PackageGroupCreateArtifact | null = null;
  for (const entry of log) {
    if (entry.action === 'create_package_group' && entry.partner_code === code) {
      latest = entry;
    }
  }
  return latest;
}

export async function resolvePackageGroupDisplayName(
  partnerCode: string,
  jsonlPath: string = PENDING_PACKAGE_GROUPS_JSONL
): Promise<string | null> {
  const log = await readPackageGroupEventLog(jsonlPath);
  return latestPackageGroupCreate(log, partnerCode)?.display_name ?? null;
}

export function hasAckPackageGroupWired(
  log: PackageGroupEventLogEntry[],
  partnerCode: string,
  chatId: string // brand-ok — Telegram chat_id wire
): boolean {
  const code = parsePartnerCode(partnerCode);
  if (!code) return false;
  return log.some(
    e => e.action === 'ack_package_group_wired' && e.partner_code === code && e.chat_id === chatId
  );
}

export function hasAckPackageGroupLinked(
  log: PackageGroupEventLogEntry[],
  partnerCode: string,
  chatId?: string // brand-ok — Telegram chat_id wire
): boolean {
  const code = parsePartnerCode(partnerCode);
  if (!code) return false;
  return log.some(
    e =>
      e.action === 'ack_package_group_linked' &&
      e.partner_code === code &&
      (chatId == null || e.chat_id === chatId)
  );
}

export async function appendPackageGroupEventLog(
  path: string,
  entry: PackageGroupEventLogEntry
): Promise<string> {
  const dir = path.slice(0, path.lastIndexOf('/'));
  if (dir) await Bun.$`mkdir -p ${dir}`.quiet();
  const prev = (await Bun.file(path).exists()) ? await Bun.file(path).text() : '';
  await Bun.write(path, prev + JSON.stringify(entry) + '\n');
  return path;
}

export async function appendAckPackageGroupWired(input: {
  partnerCode: string;
  chatId: string; // brand-ok — Telegram chat_id wire
  telegramRef: string;
  path?: string;
  now?: string;
}): Promise<{ path: string; appended: boolean }> {
  const code = parsePartnerCode(input.partnerCode);
  if (!code) throw new Error(`Invalid partner_code: ${input.partnerCode}`);
  const chatId = parseTelegramChatIdWire(input.chatId);
  if (!chatId) throw new Error(`Invalid chat_id: ${input.chatId}`);
  const path = input.path ?? PENDING_PACKAGE_GROUPS_JSONL;
  const log = await readPackageGroupEventLog(path);
  if (hasAckPackageGroupWired(log, code, chatId)) {
    return { path, appended: false };
  }
  await appendPackageGroupEventLog(path, {
    action: 'ack_package_group_wired',
    partner_code: code,
    chat_id: chatId,
    telegram_ref: input.telegramRef,
    wired_by: 'ct',
    timestamp: input.now ?? new Date().toISOString(),
  });
  return { path, appended: true };
}

export async function appendAckPackageGroupLinked(input: {
  partnerCode: string;
  chatId: string; // brand-ok — Telegram chat_id wire
  registryTitle?: string;
  path?: string;
  now?: string;
}): Promise<{ path: string; appended: boolean }> {
  const code = parsePartnerCode(input.partnerCode);
  if (!code) throw new Error(`Invalid partner_code: ${input.partnerCode}`);
  const chatId = parseTelegramChatIdWire(input.chatId);
  if (!chatId) throw new Error(`Invalid chat_id: ${input.chatId}`);
  const path = input.path ?? PENDING_PACKAGE_GROUPS_JSONL;
  const log = await readPackageGroupEventLog(path);
  if (hasAckPackageGroupLinked(log, code, chatId)) {
    return { path, appended: false };
  }
  await appendPackageGroupEventLog(path, {
    action: 'ack_package_group_linked',
    partner_code: code,
    chat_id: chatId,
    linked_by: 'factory',
    registry_title: input.registryTitle,
    timestamp: input.now ?? new Date().toISOString(),
  });
  return { path, appended: true };
}

export async function appendAckDmSeatDesignated(input: {
  partnerCode: string;
  callSign: string;
  path?: string;
  now?: string;
}): Promise<{ path: string; appended: boolean }> {
  const path = input.path ?? PENDING_PACKAGE_GROUPS_JSONL;
  const code = parsePartnerCode(input.partnerCode);
  const callSign = input.callSign.trim();
  if (!code || !callSign)
    throw new Error('appendAckDmSeatDesignated requires partnerCode + callSign');

  const log = await readPackageGroupEventLog(path);
  const exists = log.some(
    e =>
      e.action === 'ack_dm_seat_designated' && e.partner_code === code && e.call_sign === callSign
  );
  if (exists) return { path, appended: false };

  await appendPackageGroupEventLog(path, {
    action: 'ack_dm_seat_designated',
    partner_code: code,
    call_sign: callSign,
    designated_by: 'factory',
    timestamp: input.now ?? new Date().toISOString(),
  });
  return { path, appended: true };
}

export function latestForumInviteSentAck(
  log: readonly PackageGroupEventLogEntry[],
  partnerCode: string
): AckForumInviteSentArtifact | null {
  const code = parsePartnerCode(partnerCode);
  if (!code) return null;
  let latest: AckForumInviteSentArtifact | null = null;
  for (const entry of log) {
    if (entry.action === 'ack_forum_invite_sent' && entry.partner_code === code) {
      latest = entry;
    }
  }
  return latest;
}

export async function appendAckForumInviteSent(input: {
  partnerCode: string;
  callSign: string;
  chatId: string; // brand-ok — operator DM telegram id wire
  inviteLink: string;
  path?: string;
  now?: string;
  force?: boolean;
}): Promise<{ path: string; appended: boolean }> {
  const path = input.path ?? PENDING_PACKAGE_GROUPS_JSONL;
  const code = parsePartnerCode(input.partnerCode);
  const callSign = input.callSign.trim();
  const chatId = input.chatId.trim(); // brand-ok
  const inviteLink = input.inviteLink.trim();
  if (!code || !callSign || !chatId || !inviteLink) {
    throw new Error('appendAckForumInviteSent requires partnerCode, callSign, chatId, inviteLink');
  }

  const log = await readPackageGroupEventLog(path);
  const existing = latestForumInviteSentAck(log, code);
  if (
    existing &&
    !input.force &&
    existing.call_sign === callSign &&
    existing.chat_id === chatId &&
    existing.invite_link === inviteLink
  ) {
    return { path, appended: false };
  }

  await appendPackageGroupEventLog(path, {
    action: 'ack_forum_invite_sent',
    partner_code: code,
    call_sign: callSign,
    chat_id: chatId,
    invite_link: inviteLink,
    sent_by: 'factory',
    timestamp: input.now ?? new Date().toISOString(),
  });
  return { path, appended: true };
}

export async function readOpenPendingPackageGroups(
  path: string = PENDING_PACKAGE_GROUPS_JSONL
): Promise<PackageGroupCreateArtifact[]> {
  const log = await readPackageGroupEventLog(path);
  return resolveOpenPendingCreates(log);
}

/**
 * Suggested TELEGRAM_SURFACES entries from linked package groups.
 * Adds `pkg-{code}` plus partner desk slugs when callSign matches (e.g. ASH → ash-staging).
 */
export function suggestPackageGroupSurfacesMap(
  registry: readonly PackageGroupRegistryRow[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of registry) {
    const code = row.partnerCode.toUpperCase();
    out[`pkg-${code.toLowerCase()}`] = row.chatId;
    for (const surface of TOC_OPS_SURFACES) {
      if (surface.callSign?.toUpperCase() === code) {
        out[surface.slug] = row.chatId;
      }
    }
  }
  return out;
}
