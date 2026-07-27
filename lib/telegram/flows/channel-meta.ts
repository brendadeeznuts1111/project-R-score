// @see https://bun.com/docs/runtime/sqlite
/**
 * ChatChannelMeta — per-chat deep state (call-signs, topics, locale, edit ids).
 */
import type { Database } from 'bun:sqlite';
import type { TreeNodeId } from '../../types/branded/operations.ts';
import { resolveLocale } from './i18n.ts';
import type { ChatChannelMeta, FlowLocale } from './types.ts';
import type { TemplateId } from '../templates/types.ts';
import { detectTelegramLinkConflict, findTreeNodeOwningTelegramId } from './seat-telegram.ts';

type MetaRow = {
  chat_id: string; // brand-ok
  tree_node_ids_json: string;
  call_signs_json: string;
  locale: string;
  topics_json: string;
  image_bundle_id: string | null; // brand-ok
  last_template_ids_json: string;
  linked_at: string | null;
  active_call_sign: string | null;
};

export function ensureChatChannelMetaSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ops_chat_channel_meta (
      chat_id TEXT PRIMARY KEY,
      tree_node_ids_json TEXT NOT NULL DEFAULT '[]',
      call_signs_json TEXT NOT NULL DEFAULT '[]',
      locale TEXT NOT NULL DEFAULT 'en',
      topics_json TEXT NOT NULL DEFAULT '{}',
      image_bundle_id TEXT,
      last_template_ids_json TEXT NOT NULL DEFAULT '{}',
      linked_at TEXT,
      active_call_sign TEXT
    );
  `);
  const cols = new Set(
    (db.query('PRAGMA table_info(ops_chat_channel_meta)').all() as { name: string }[]).map(
      c => c.name
    )
  );
  if (!cols.has('active_call_sign')) {
    db.run(`ALTER TABLE ops_chat_channel_meta ADD COLUMN active_call_sign TEXT`);
  }
}

function parseStringArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseTopics(raw: string): ChatChannelMeta['topics'] {
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: ChatChannelMeta['topics'] = {};
    for (const key of ['identity', 'plays', 'alerts', 'toc', 'ops'] as const) {
      if (typeof v[key] === 'number') out[key] = v[key];
    }
    return out;
  } catch {
    return {};
  }
}

function parseLastTemplateIds(raw: string): ChatChannelMeta['lastTemplateIds'] {
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: NonNullable<ChatChannelMeta['lastTemplateIds']> = {};
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === 'number') out[k as TemplateId] = val;
    }
    return out;
  } catch {
    return {};
  }
}

function rowToMeta(row: MetaRow): ChatChannelMeta {
  return {
    chatId: row.chat_id,
    treeNodeIds: parseStringArray(row.tree_node_ids_json),
    callSigns: parseStringArray(row.call_signs_json),
    locale: resolveLocale(row.locale),
    topics: parseTopics(row.topics_json),
    imageBundleId: row.image_bundle_id ?? undefined,
    lastTemplateIds: parseLastTemplateIds(row.last_template_ids_json),
    linkedAt: row.linked_at ?? undefined,
    activeCallSign: row.active_call_sign ?? undefined,
  };
}

export function getChatChannelMeta(
  db: Database,
  chatId: string // brand-ok
): ChatChannelMeta | null {
  ensureChatChannelMetaSchema(db);
  const row = db
    .query(`SELECT * FROM ops_chat_channel_meta WHERE chat_id = $c`)
    .get({ $c: chatId }) as MetaRow | null;
  return row ? rowToMeta(row) : null;
}

export function upsertChatChannelMeta(db: Database, meta: ChatChannelMeta): ChatChannelMeta {
  ensureChatChannelMetaSchema(db);
  const linkedAt = meta.linkedAt ?? new Date().toISOString();
  db.run(
    `INSERT INTO ops_chat_channel_meta
     (chat_id, tree_node_ids_json, call_signs_json, locale, topics_json,
      image_bundle_id, last_template_ids_json, linked_at, active_call_sign)
     VALUES ($c, $nodes, $signs, $locale, $topics, $bundle, $last, $linked, $active)
     ON CONFLICT(chat_id) DO UPDATE SET
       tree_node_ids_json = excluded.tree_node_ids_json,
       call_signs_json = excluded.call_signs_json,
       locale = excluded.locale,
       topics_json = excluded.topics_json,
       image_bundle_id = COALESCE(excluded.image_bundle_id, ops_chat_channel_meta.image_bundle_id),
       last_template_ids_json = excluded.last_template_ids_json,
       linked_at = COALESCE(ops_chat_channel_meta.linked_at, excluded.linked_at),
       active_call_sign = COALESCE(excluded.active_call_sign, ops_chat_channel_meta.active_call_sign)`,
    {
      $c: meta.chatId,
      $nodes: JSON.stringify(meta.treeNodeIds),
      $signs: JSON.stringify(meta.callSigns),
      $locale: meta.locale,
      $topics: JSON.stringify(meta.topics ?? {}),
      $bundle: meta.imageBundleId ?? null,
      $last: JSON.stringify(meta.lastTemplateIds ?? {}),
      $linked: linkedAt,
      $active: meta.activeCallSign ?? null,
    }
  );
  return getChatChannelMeta(db, meta.chatId)!;
}

/** Record message_id for edit-in-place of a template (upserts meta when missing). */
export function rememberTemplateMessageId(
  db: Database,
  chatId: string, // brand-ok
  templateId: TemplateId,
  messageId: number
): void {
  const existing = getChatChannelMeta(db, chatId);
  const base: ChatChannelMeta = existing ?? {
    chatId,
    treeNodeIds: [],
    callSigns: [],
    locale: 'en',
    topics: {},
    lastTemplateIds: {},
  };
  upsertChatChannelMeta(db, {
    ...base,
    lastTemplateIds: { ...base.lastTemplateIds, [templateId]: messageId },
  });
}

export type LinkTelegramChatOpts = {
  treeNodeId: TreeNodeId;
  callSign: string | null;
  chatId: string; // brand-ok — normalized Telegram chat id
  locale?: FlowLocale;
  topics?: ChatChannelMeta['topics'];
  /** When true, also SET tree_nodes.telegram_id (default true). */
  bindTreeNode?: boolean;
  /** When true, clear telegram_id from other seats before binding this one. */
  reassignTelegramId?: boolean;
};

export type LinkTelegramChatResult = {
  meta: ChatChannelMeta;
  /** Bound via ChatChannelMeta only — another seat owns tree_nodes.telegram_id. */
  sharedDm?: boolean;
  /** Prior owner when sharedDm or reassign cleared. */
  previousOwnerCallSign?: string | null;
};

/** Normalize `tg:chat:-100…` / bare chat id → wire chat id string. Never invents ids. */
export function normalizeTelegramChatRef(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('Empty telegram chat ref');
  const prefixed = trimmed.match(/^tg:chat:(.+)$/i);
  const id = (prefixed?.[1] ?? trimmed).trim();
  if (!/^-?\d+$/.test(id)) {
    throw new Error(`Invalid telegram chat id (digits only, optional leading -): ${raw}`);
  }
  return id;
}

/**
 * Explicit Telegram bind for a call-sign / tree node.
 * Writes ChatChannelMeta and optionally tree_nodes.telegram_id.
 */
export function linkTelegramChat(db: Database, opts: LinkTelegramChatOpts): LinkTelegramChatResult {
  const chatId = normalizeTelegramChatRef(opts.chatId);
  const existing = getChatChannelMeta(db, chatId);
  const treeNodeIds = new Set(existing?.treeNodeIds ?? []);
  treeNodeIds.add(opts.treeNodeId as string);
  const callSigns = new Set(existing?.callSigns ?? []);
  if (opts.callSign) callSigns.add(opts.callSign);

  let sharedDm = false;
  let previousOwnerCallSign: string | null | undefined;
  const conflict = detectTelegramLinkConflict(db, chatId, opts.treeNodeId);
  let bindTree = opts.bindTreeNode !== false;

  if (conflict && !opts.reassignTelegramId) {
    bindTree = false;
    sharedDm = true;
    previousOwnerCallSign = conflict.owner.callSign;
    treeNodeIds.add(conflict.owner.id);
    if (conflict.owner.callSign) callSigns.add(conflict.owner.callSign);
  }

  if (bindTree) {
    if (opts.reassignTelegramId) {
      const owner = findTreeNodeOwningTelegramId(db, chatId, opts.treeNodeId as string);
      if (owner) {
        previousOwnerCallSign = owner.callSign;
        db.run(`UPDATE tree_nodes SET telegram_id = NULL WHERE id = $id`, { $id: owner.id });
      }
    }
    db.run(`UPDATE tree_nodes SET telegram_id = $tg WHERE id = $id`, {
      $tg: chatId,
      $id: opts.treeNodeId as string,
    });
  }

  const meta = upsertChatChannelMeta(db, {
    chatId,
    treeNodeIds: [...treeNodeIds],
    callSigns: [...callSigns],
    locale: opts.locale ?? existing?.locale ?? 'en',
    topics: { ...existing?.topics, ...opts.topics },
    imageBundleId: existing?.imageBundleId,
    lastTemplateIds: existing?.lastTemplateIds,
    linkedAt: existing?.linkedAt ?? new Date().toISOString(),
  });

  return {
    meta,
    sharedDm: sharedDm || undefined,
    previousOwnerCallSign,
  };
}

/** True when chat meta allows the call-sign (or meta missing → fall back to tree_nodes only). */
export function chatAllowsCallSign(
  db: Database,
  chatId: string, // brand-ok
  callSign: string | null
): boolean {
  if (!callSign) return true;
  const meta = getChatChannelMeta(db, chatId);
  if (!meta) return true;
  return meta.callSigns.includes(callSign);
}
