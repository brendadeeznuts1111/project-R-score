// @see https://bun.com/docs/runtime/sqlite
/**
 * Chat image / bundle meta per Telegram chat (proof, welcome, status cards).
 */
import type { Database } from 'bun:sqlite';
import { randomUUIDv7 } from 'bun';
import type { ChatImageMeta } from './types.ts';

export function ensureOpsChatMediaSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS ops_chat_media (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      message_id INTEGER,
      file_id TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('proof', 'welcome', 'status_card', 'bundle')),
      caption TEXT,
      call_sign TEXT,
      task_id TEXT,
      bundle_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ops_chat_media_chat ON ops_chat_media(chat_id, created_at DESC);
  `);
}

export async function recordChatImage(db: Database, meta: ChatImageMeta): Promise<void> {
  ensureOpsChatMediaSchema(db);
  const id = randomUUIDv7(); // brand-ok
  db.run(
    `INSERT INTO ops_chat_media
     (id, chat_id, message_id, file_id, purpose, caption, call_sign, task_id, bundle_id, created_at)
     VALUES ($id, $chat, $mid, $fid, $purpose, $cap, $cs, $task, $bundle, $at)`,
    {
      $id: id,
      $chat: meta.chatId,
      $mid: meta.messageId ?? null,
      $fid: meta.fileId,
      $purpose: meta.purpose,
      $cap: meta.caption ?? null,
      $cs: meta.callSign ?? null,
      $task: meta.taskId ?? null,
      $bundle: meta.bundleId ?? null,
      $at: meta.createdAt,
    }
  );
}

export async function listChatImages(
  db: Database,
  chatId: string, // brand-ok
  purpose?: string
): Promise<ChatImageMeta[]> {
  ensureOpsChatMediaSchema(db);
  const rows = purpose
    ? (db
        .query(
          `SELECT chat_id, message_id, file_id, purpose, caption, call_sign, task_id, bundle_id, created_at
           FROM ops_chat_media WHERE chat_id = $c AND purpose = $p ORDER BY created_at DESC LIMIT 50`
        )
        .all({ $c: chatId, $p: purpose }) as MediaRow[])
    : (db
        .query(
          `SELECT chat_id, message_id, file_id, purpose, caption, call_sign, task_id, bundle_id, created_at
           FROM ops_chat_media WHERE chat_id = $c ORDER BY created_at DESC LIMIT 50`
        )
        .all({ $c: chatId }) as MediaRow[]);

  return rows.map(r => ({
    chatId: r.chat_id,
    messageId: r.message_id ?? undefined,
    fileId: r.file_id,
    purpose: r.purpose as ChatImageMeta['purpose'],
    caption: r.caption ?? undefined,
    callSign: r.call_sign,
    taskId: r.task_id ?? undefined,
    bundleId: r.bundle_id ?? undefined,
    createdAt: r.created_at,
  }));
}

type MediaRow = {
  chat_id: string; // brand-ok — Telegram chat_id wire
  message_id: number | null;
  file_id: string; // brand-ok — Telegram file_id wire
  purpose: string;
  caption: string | null;
  call_sign: string | null;
  task_id: string | null; // brand-ok — opaque task wire
  bundle_id: string | null; // brand-ok — opaque bundle wire
  created_at: string;
};
