// @see https://bun.com/docs/runtime/sqlite
/**
 * Self-learning Telegram chat roster — Bot API never lists memberships.
 *
 * Persist chat.id from inbound updates (message / callback / my_chat_member).
 * Discovery probes this table alongside TELEGRAM_OPS_CHAT_ID + linked seats.
 *
 * Distinct from ChatChannelMeta (partner seat binding / call-signs).
 */
import { Database } from 'bun:sqlite';
import { inferSurfaceSlug } from './surfaces.ts';
import { packageGroupRegistryByChatId } from './package-group-registry.ts';
import type { TelegramChatWire, TelegramUpdate } from './telegram-update.ts';

export type KnownChatSource =
  | 'message'
  | 'edited_message'
  | 'channel_post'
  | 'edited_channel_post'
  | 'callback_query'
  | 'my_chat_member'
  | 'chat_member'
  | 'manual';

export type KnownChatRow = {
  chatId: string; // brand-ok — Telegram chat_id wire
  chatType: string;
  title: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  isForum: boolean;
  botStatus: string | null;
  memberCount: number | null;
  /** Concern surface slug when known (hq | ash-staging | sandbox | …). */
  surfaceSlug: string | null;
  source: KnownChatSource;
  tenantSlug: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  active: boolean;
};

type DbRow = {
  chat_id: string; // brand-ok
  chat_type: string;
  title: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_forum: number;
  bot_status: string | null;
  member_count: number | null;
  surface_slug: string | null;
  source: string;
  tenant_slug: string | null;
  first_seen_at: string;
  last_seen_at: string;
  active: number;
};

const INACTIVE_STATUSES = new Set(['left', 'kicked']);

export function ensureKnownChatsSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ops_telegram_known_chats (
      chat_id TEXT PRIMARY KEY,
      chat_type TEXT NOT NULL DEFAULT 'unknown',
      title TEXT,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      is_forum INTEGER NOT NULL DEFAULT 0,
      bot_status TEXT,
      member_count INTEGER,
      surface_slug TEXT,
      source TEXT NOT NULL DEFAULT 'message',
      tenant_slug TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
  try {
    db.run(`ALTER TABLE ops_telegram_known_chats ADD COLUMN member_count INTEGER`);
  } catch {
    /* already present */
  }
  try {
    db.run(`ALTER TABLE ops_telegram_known_chats ADD COLUMN surface_slug TEXT`);
  } catch {
    /* already present */
  }
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_ops_telegram_known_chats_active
     ON ops_telegram_known_chats(active, last_seen_at);`
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_ops_telegram_known_chats_surface
     ON ops_telegram_known_chats(surface_slug);`
  );
}

/** Direct lookup by chat_id (avoids listKnownChats limit when joining registry rows). */
export function getKnownChatById(
  db: Database,
  chatId: string // brand-ok
): KnownChatRow | null {
  ensureKnownChatsSchema(db);
  const row = db
    .query(`SELECT * FROM ops_telegram_known_chats WHERE chat_id = $id`)
    .get({ $id: chatId.trim() }) as DbRow | null;
  return row ? rowToKnown(row) : null;
}

function rowToKnown(row: DbRow): KnownChatRow {
  return {
    chatId: row.chat_id,
    chatType: row.chat_type,
    title: row.title,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    isForum: row.is_forum === 1,
    botStatus: row.bot_status,
    memberCount: typeof row.member_count === 'number' ? row.member_count : null,
    surfaceSlug: row.surface_slug ?? null,
    source: row.source as KnownChatSource,
    tenantSlug: row.tenant_slug,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    active: row.active === 1,
  };
}

export type UpsertKnownChatInput = {
  chat: TelegramChatWire;
  source: KnownChatSource;
  botStatus?: string | null;
  tenantSlug?: string | null;
  /** Force surface slug; otherwise inferred from TELEGRAM_SURFACES + title. */
  surfaceSlug?: string | null;
  inactive?: boolean;
  now?: string;
};

export function upsertKnownChat(db: Database, input: UpsertKnownChatInput): KnownChatRow {
  ensureKnownChatsSchema(db);
  const now = input.now ?? new Date().toISOString();
  const chatId = String(input.chat.id);
  const status = input.botStatus ?? null;
  const inactive = input.inactive === true || (status != null && INACTIVE_STATUSES.has(status));
  const active = inactive ? 0 : 1;

  const existing = db
    .query(`SELECT * FROM ops_telegram_known_chats WHERE chat_id = $id`)
    .get({ $id: chatId }) as DbRow | null;

  const chatType = input.chat.type?.trim() || existing?.chat_type || 'unknown';
  const title = input.chat.title ?? existing?.title ?? null;
  const username = input.chat.username ?? existing?.username ?? null;
  const firstName = input.chat.first_name ?? existing?.first_name ?? null;
  const lastName = input.chat.last_name ?? existing?.last_name ?? null;
  const isForum =
    typeof input.chat.is_forum === 'boolean'
      ? input.chat.is_forum
        ? 1
        : 0
      : (existing?.is_forum ?? 0);
  const botStatus = status ?? existing?.bot_status ?? null;
  const source = input.source;
  const tenantSlug = input.tenantSlug ?? existing?.tenant_slug ?? null;
  const firstSeenAt = existing?.first_seen_at ?? now;
  const inferred = inferSurfaceSlug({ chatId, title });
  const surfaceSlug = input.surfaceSlug?.trim() || inferred || existing?.surface_slug || null;

  db.run(
    `INSERT INTO ops_telegram_known_chats (
       chat_id, chat_type, title, username, first_name, last_name, is_forum,
       bot_status, surface_slug, source, tenant_slug, first_seen_at, last_seen_at, active
     ) VALUES (
       $chat_id, $chat_type, $title, $username, $first_name, $last_name, $is_forum,
       $bot_status, $surface_slug, $source, $tenant_slug, $first_seen_at, $last_seen_at, $active
     )
     ON CONFLICT(chat_id) DO UPDATE SET
       chat_type = excluded.chat_type,
       title = COALESCE(excluded.title, ops_telegram_known_chats.title),
       username = COALESCE(excluded.username, ops_telegram_known_chats.username),
       first_name = COALESCE(excluded.first_name, ops_telegram_known_chats.first_name),
       last_name = COALESCE(excluded.last_name, ops_telegram_known_chats.last_name),
       is_forum = excluded.is_forum,
       bot_status = COALESCE(excluded.bot_status, ops_telegram_known_chats.bot_status),
       surface_slug = COALESCE(excluded.surface_slug, ops_telegram_known_chats.surface_slug),
       source = excluded.source,
       tenant_slug = COALESCE(excluded.tenant_slug, ops_telegram_known_chats.tenant_slug),
       last_seen_at = excluded.last_seen_at,
       active = excluded.active`,
    {
      $chat_id: chatId,
      $chat_type: chatType,
      $title: title,
      $username: username,
      $first_name: firstName,
      $last_name: lastName,
      $is_forum: isForum,
      $bot_status: botStatus,
      $surface_slug: surfaceSlug,
      $source: source,
      $tenant_slug: tenantSlug,
      $first_seen_at: firstSeenAt,
      $last_seen_at: now,
      $active: active,
    }
  );

  const row = db
    .query(`SELECT * FROM ops_telegram_known_chats WHERE chat_id = $id`)
    .get({ $id: chatId }) as DbRow;
  return rowToKnown(row);
}

export type ObservedChatEvent = {
  chat: TelegramChatWire;
  source: KnownChatSource;
  botStatus?: string | null;
  inactive?: boolean;
};

/** Extract chat sightings from a Bot API Update (edge-safe pure). */
export function extractKnownChatEvents(update: TelegramUpdate): ObservedChatEvent[] {
  const out: ObservedChatEvent[] = [];

  const pushMessage = (msg: { chat?: TelegramChatWire } | undefined, source: KnownChatSource) => {
    if (msg?.chat && typeof msg.chat.id === 'number') {
      out.push({ chat: msg.chat, source });
    }
  };

  pushMessage(update.message, 'message');
  pushMessage(update.edited_message, 'edited_message');
  pushMessage(update.channel_post, 'channel_post');
  pushMessage(update.edited_channel_post, 'edited_channel_post');

  if (
    update.callback_query?.message?.chat &&
    typeof update.callback_query.message.chat.id === 'number'
  ) {
    out.push({ chat: update.callback_query.message.chat, source: 'callback_query' });
  }

  for (const key of ['my_chat_member', 'chat_member'] as const) {
    const ev = update[key];
    if (!ev?.chat || typeof ev.chat.id !== 'number') continue;
    const status = ev.new_chat_member?.status ?? null;
    out.push({
      chat: ev.chat,
      source: key,
      botStatus: status,
      inactive: status != null ? INACTIVE_STATUSES.has(status) : undefined,
    });
  }

  return out;
}

export type ObserveKnownChatsOpts = {
  db: Database;
  update: TelegramUpdate;
  tenantSlug?: string | null;
};

export type ObserveKnownChatsResult = {
  upserted: number;
  chatIds: string[];
};

/** Upsert every chat sighting from an update. Safe no-op when none. */
export function observeKnownChatsFromUpdate(opts: ObserveKnownChatsOpts): ObserveKnownChatsResult {
  const events = extractKnownChatEvents(opts.update);
  const chatIds: string[] = [];
  for (const ev of events) {
    const row = upsertKnownChat(opts.db, {
      chat: ev.chat,
      source: ev.source,
      botStatus: ev.botStatus,
      inactive: ev.inactive,
      tenantSlug: opts.tenantSlug,
    });
    chatIds.push(row.chatId);
  }
  return { upserted: chatIds.length, chatIds };
}

/** Filter aliases for CLI `--filter`. */
export type KnownChatFilterKind = 'active' | 'inactive' | 'all' | 'group' | 'private' | 'channel';

export type ListKnownChatsOpts = {
  activeOnly?: boolean;
  /** Convenience filters (group = group|supergroup). */
  filter?: KnownChatFilterKind;
  /** Concern surface slug (hq | ash-staging | sandbox). */
  surface?: string;
  chatIds?: string[]; // brand-ok — Telegram chat_id wire
  limit?: number;
};

function matchesFilter(row: KnownChatRow, filter: KnownChatFilterKind | undefined): boolean {
  if (!filter || filter === 'all') return true;
  if (filter === 'active') return row.active;
  if (filter === 'inactive') return !row.active;
  if (filter === 'group') return row.chatType === 'group' || row.chatType === 'supergroup';
  if (filter === 'private') return row.chatType === 'private';
  if (filter === 'channel') return row.chatType === 'channel';
  return true;
}

export function listKnownChats(db: Database, opts: ListKnownChatsOpts = {}): KnownChatRow[] {
  ensureKnownChatsSchema(db);
  const limit = opts.limit ?? 200;
  const activeOnly =
    opts.filter === 'inactive' || opts.filter === 'all'
      ? false
      : opts.filter === 'active' ||
          opts.filter === 'group' ||
          opts.filter === 'private' ||
          opts.filter === 'channel'
        ? true
        : (opts.activeOnly ?? true);

  const rows =
    activeOnly === false
      ? (db
          .query(
            `SELECT * FROM ops_telegram_known_chats
             ORDER BY last_seen_at DESC LIMIT $lim`
          )
          .all({ $lim: limit }) as DbRow[])
      : (db
          .query(
            `SELECT * FROM ops_telegram_known_chats
             WHERE active = 1
             ORDER BY last_seen_at DESC LIMIT $lim`
          )
          .all({ $lim: limit }) as DbRow[]);

  let out = rows.map(rowToKnown);
  if (opts.filter) out = out.filter(r => matchesFilter(r, opts.filter));
  if (opts.surface?.trim()) {
    const slug = opts.surface.trim().toLowerCase();
    out = out.filter(r => (r.surfaceSlug ?? '').toLowerCase() === slug);
  }
  if (opts.chatIds?.length) {
    const want = new Set(opts.chatIds.map(String));
    out = out.filter(r => want.has(r.chatId));
  }
  return out;
}

/** Display label for directory / broadcast templates. */
export function knownChatLabel(row: KnownChatRow): string {
  return row.title ?? (row.username ? `@${row.username}` : null) ?? row.firstName ?? row.chatId;
}

export type KnownChatDirectoryExtra = {
  packageCode: string | null;
  hasInvite: boolean;
  /** Rich mode: active seats with telegram_id matching this chat (usually private DMs). */
  linkedSeats: number;
};

/** Join package_group_registry + optional seat counts for directory display. */
export function buildKnownChatDirectoryExtras(
  db: Database,
  rows: KnownChatRow[],
  rich = false
): Map<string, KnownChatDirectoryExtra> {
  let registryByChat = new Map<string, { partnerCode: string; inviteLink: string | null }>();
  try {
    for (const [chatId, reg] of packageGroupRegistryByChatId(db)) {
      registryByChat.set(chatId, {
        partnerCode: reg.partnerCode,
        inviteLink: reg.inviteLink,
      });
    }
  } catch {
    registryByChat = new Map();
  }

  const seatCounts = new Map<string, number>();
  if (rich) {
    try {
      const counts = db
        .query(
          `SELECT telegram_id AS tid, COUNT(*) AS n FROM tree_nodes
           WHERE active = 1 AND telegram_id IS NOT NULL
           GROUP BY telegram_id`
        )
        .all() as Array<{ tid: string; n: number }>; // brand-ok
      for (const c of counts) {
        if (c.tid?.trim()) seatCounts.set(c.tid.trim(), c.n);
      }
    } catch {
      // tree_nodes absent in minimal DBs
    }
  }

  const extras = new Map<string, KnownChatDirectoryExtra>();
  for (const row of rows) {
    const reg = registryByChat.get(row.chatId);
    extras.set(row.chatId, {
      packageCode: reg?.partnerCode ?? null,
      hasInvite: Boolean(reg?.inviteLink),
      linkedSeats: rich ? (seatCounts.get(row.chatId) ?? 0) : 0,
    });
  }
  return extras;
}

/** Column-aligned directory table (no external deps). */
export function formatKnownChatsTable(
  rows: KnownChatRow[],
  extras?: Map<string, KnownChatDirectoryExtra>,
  opts?: { rich?: boolean }
): string[] {
  if (rows.length === 0) return ['(no known chats)'];

  const rich = opts?.rich ?? false;
  const showPackage = extras != null;

  type ColKey =
    | 'chatId'
    | 'title'
    | 'surface'
    | 'package'
    | 'chatType'
    | 'active'
    | 'members'
    | 'seats'
    | 'lastSeen';

  const cols: Array<{ key: ColKey; head: string; width: number }> = [
    { key: 'chatId', head: 'ID', width: 16 },
    { key: 'title', head: 'TITLE', width: 22 },
    { key: 'surface', head: 'SURFACE', width: 12 },
  ];
  if (showPackage) cols.push({ key: 'package', head: 'PACKAGE', width: 8 });
  cols.push(
    { key: 'chatType', head: 'TYPE', width: 11 },
    { key: 'active', head: 'ACTIVE', width: 6 },
    { key: 'members', head: 'MEMBERS', width: 7 }
  );
  if (rich) cols.push({ key: 'seats', head: 'SEATS', width: 5 });
  cols.push({ key: 'lastSeen', head: 'LAST SEEN', width: 20 });

  const cells = rows.map(r => {
    const extra = extras?.get(r.chatId);
    const pkg = extra?.packageCode ?? '—';
    const inviteFlag = extra?.hasInvite ? '+' : '';
    return {
      chatId: r.chatId,
      title: knownChatLabel(r).slice(0, 22),
      surface: r.surfaceSlug ?? '—',
      package: pkg === '—' ? '—' : `${pkg}${inviteFlag}`,
      chatType: r.chatType + (r.isForum ? '*' : ''),
      active: r.active ? 'yes' : 'no',
      members: r.memberCount != null ? String(r.memberCount) : '—',
      seats: rich ? String(extra?.linkedSeats ?? 0) : '0',
      lastSeen: r.lastSeenAt.slice(0, 19).replace('T', ' '),
    };
  });

  const pad = (s: string, w: number) =>
    s.length >= w ? s.slice(0, w) : s + ' '.repeat(w - s.length);
  const header = cols.map(c => pad(c.head, c.width)).join('  ');
  const rule = cols.map(c => '-'.repeat(c.width)).join('  ');
  const body = cells.map(cell =>
    cols.map(c => pad(cell[c.key as keyof typeof cell] as string, c.width)).join('  ')
  );
  return [header, rule, ...body];
}

export function updateKnownChatMemberCount(
  db: Database,
  chatId: string, // brand-ok
  memberCount: number | null
): void {
  ensureKnownChatsSchema(db);
  db.run(
    `UPDATE ops_telegram_known_chats
     SET member_count = $n, last_seen_at = $now
     WHERE chat_id = $id`,
    {
      $n: memberCount,
      $now: new Date().toISOString(),
      $id: chatId,
    }
  );
}

/** Open ops DB for observe — returns null if path unusable. */
export function tryObserveKnownChats(
  dbPath: string,
  update: TelegramUpdate,
  tenantSlug?: string | null
): ObserveKnownChatsResult | null {
  try {
    const db = new Database(dbPath);
    try {
      return observeKnownChatsFromUpdate({ db, update, tenantSlug });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}
