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
      source TEXT NOT NULL DEFAULT 'message',
      tenant_slug TEXT,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_ops_telegram_known_chats_active
     ON ops_telegram_known_chats(active, last_seen_at);`
  );
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

  db.run(
    `INSERT INTO ops_telegram_known_chats (
       chat_id, chat_type, title, username, first_name, last_name, is_forum,
       bot_status, source, tenant_slug, first_seen_at, last_seen_at, active
     ) VALUES (
       $chat_id, $chat_type, $title, $username, $first_name, $last_name, $is_forum,
       $bot_status, $source, $tenant_slug, $first_seen_at, $last_seen_at, $active
     )
     ON CONFLICT(chat_id) DO UPDATE SET
       chat_type = excluded.chat_type,
       title = COALESCE(excluded.title, ops_telegram_known_chats.title),
       username = COALESCE(excluded.username, ops_telegram_known_chats.username),
       first_name = COALESCE(excluded.first_name, ops_telegram_known_chats.first_name),
       last_name = COALESCE(excluded.last_name, ops_telegram_known_chats.last_name),
       is_forum = excluded.is_forum,
       bot_status = COALESCE(excluded.bot_status, ops_telegram_known_chats.bot_status),
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

export type ListKnownChatsOpts = {
  activeOnly?: boolean;
  limit?: number;
};

export function listKnownChats(db: Database, opts: ListKnownChatsOpts = {}): KnownChatRow[] {
  ensureKnownChatsSchema(db);
  const limit = opts.limit ?? 200;
  const rows =
    opts.activeOnly === false
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
  return rows.map(rowToKnown);
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
