// @see https://bun.com/docs/runtime/sqlite
/**
 * Seat ↔ Telegram id resolution — tree_nodes.telegram_id (primary) + ops_chat_channel_meta
 * (shared DM). Leaf extracted from `seat-telegram.ts` (strong import-cycle burn-down) so
 * `channel-meta`, `package-group-registry`, and `dm-seat-designation` resolve ids without
 * importing the full seat-telegram hub. `seat-telegram.ts` and `channel-meta.ts` re-export
 * for backward compatibility.
 *
 * One human may operate ASH-001 and BIL-001 from the same private chat. Only the first bind
 * sets tree_nodes.telegram_id (UNIQUE); later seats merge into ChatChannelMeta instead.
 */
import type { Database } from 'bun:sqlite';
import type { TreeNodeId } from '../../types/branded/operations.ts';

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

export function parseStringArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function telegramIdWireLinked(telegramId: string | null | undefined): boolean {
  // brand-ok — tree_nodes.telegram_id wire
  if (!telegramId || telegramId.startsWith('pending-')) return false;
  // Placeholder refs (seed/demo) — not Bot API DM targets
  if (telegramId.startsWith('tg:')) return false;
  return true;
}

export type TreeNodeTelegramOwner = {
  id: string; // brand-ok
  callSign: string | null;
  name: string;
};

/** Active seat that already owns this telegram_id on tree_nodes (excluding optional node). */
export function findTreeNodeOwningTelegramId(
  db: Database,
  telegramId: string, // brand-ok
  excludeNodeId?: string // brand-ok
): TreeNodeTelegramOwner | null {
  const row = db
    .query(
      `SELECT id, call_sign, name FROM tree_nodes
       WHERE active = 1 AND telegram_id = $tg
         AND ($exclude IS NULL OR id != $exclude)
       LIMIT 1`
    )
    .get({ $tg: telegramId, $exclude: excludeNodeId ?? null }) as {
    id: string; // brand-ok
    call_sign: string | null;
    name: string;
  } | null;
  if (!row) return null;
  return { id: row.id, callSign: row.call_sign, name: row.name };
}

/** Resolve DM chat id from ChatChannelMeta when seat shares a Telegram user with another seat. */
export function resolveSeatTelegramIdFromMeta(
  db: Database,
  opts: { callSign?: string | null; treeNodeId?: TreeNodeId }
): string | null {
  ensureChatChannelMetaSchema(db);
  const rows = db
    .query(`SELECT chat_id, call_signs_json, tree_node_ids_json FROM ops_chat_channel_meta`)
    .all() as Array<{
    chat_id: string; // brand-ok
    call_signs_json: string;
    tree_node_ids_json: string;
  }>;

  for (const row of rows) {
    const callSigns = parseStringArray(row.call_signs_json);
    const nodeIds = parseStringArray(row.tree_node_ids_json);
    if (opts.callSign?.trim() && callSigns.includes(opts.callSign.trim())) {
      return row.chat_id;
    }
    if (opts.treeNodeId && nodeIds.includes(opts.treeNodeId as string)) {
      return row.chat_id;
    }
  }
  return null;
}

/** Effective Telegram DM id for a seat — tree_nodes first, then shared ChatChannelMeta. */
export function resolveSeatTelegramId(
  db: Database,
  opts: { callSign?: string | null; treeNodeId?: TreeNodeId }
): string | null {
  if (opts.treeNodeId) {
    const row = db
      .query(`SELECT telegram_id, call_sign FROM tree_nodes WHERE id = $id AND active = 1`)
      .get({ $id: opts.treeNodeId as string }) as {
      telegram_id: string | null; // brand-ok
      call_sign: string | null;
    } | null;
    if (row && telegramIdWireLinked(row.telegram_id)) return row.telegram_id!.trim();
    const fromMeta = resolveSeatTelegramIdFromMeta(db, {
      treeNodeId: opts.treeNodeId,
      callSign: opts.callSign ?? row?.call_sign,
    });
    if (fromMeta) return fromMeta;
  }

  if (opts.callSign?.trim()) {
    const row = db
      .query(`SELECT telegram_id FROM tree_nodes WHERE active = 1 AND call_sign = $cs LIMIT 1`)
      .get({ $cs: opts.callSign.trim() }) as { telegram_id: string | null } | null; // brand-ok
    if (row && telegramIdWireLinked(row.telegram_id)) return row.telegram_id!.trim();
    return resolveSeatTelegramIdFromMeta(db, { callSign: opts.callSign });
  }

  return null;
}

export type LinkTelegramConflict = {
  kind: 'shared_dm';
  owner: TreeNodeTelegramOwner;
};

/** Whether binding chatId to treeNodeId must skip tree_nodes.telegram_id (UNIQUE). */
export function detectTelegramLinkConflict(
  db: Database,
  chatId: string, // brand-ok
  treeNodeId: TreeNodeId
): LinkTelegramConflict | null {
  const owner = findTreeNodeOwningTelegramId(db, chatId, treeNodeId as string);
  if (!owner) return null;
  return { kind: 'shared_dm', owner };
}
