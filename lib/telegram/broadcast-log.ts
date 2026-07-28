// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Broadcast audit log — extracted from `broadcast.ts` to break the
 * `lib/channels/outbox ↔ lib/telegram/broadcast` import cycle
 * (outbox needs `recordBroadcastOutboxSend`; broadcast needs outbox's
 * `enqueueOpsChannelEvent`). This module depends on neither.
 * `broadcast.ts` re-exports both functions for downstream compatibility.
 */

import type { Database } from 'bun:sqlite';
import { ensureKnownChatsSchema } from './known-chats.ts';

export function ensureBroadcastLogSchema(db: Database): void {
  ensureKnownChatsSchema(db);
  db.run(`
    CREATE TABLE IF NOT EXISTS ops_broadcast_log (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      text_preview TEXT NOT NULL,
      ok INTEGER NOT NULL,
      message_id INTEGER,
      error TEXT,
      created_at TEXT NOT NULL
    );
  `);
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_ops_broadcast_log_batch
     ON ops_broadcast_log(batch_id, created_at);`
  );
}

function previewTextForLog(text: string): string {
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

/** Audit row when ops.broadcast outbox row is projected. */
export function recordBroadcastOutboxSend(
  db: Database,
  payload: Record<string, unknown>,
  result: { ok: boolean; messageId?: number; error?: string }
): void {
  ensureBroadcastLogSchema(db);
  const batchId = typeof payload.batchId === 'string' ? payload.batchId : Bun.randomUUIDv7();
  const chatId = String(payload.telegramId ?? payload.telegram_id ?? ''); // brand-ok
  const text = typeof payload.text === 'string' ? payload.text : JSON.stringify(payload);
  db.run(
    `INSERT INTO ops_broadcast_log (
       id, batch_id, chat_id, text_preview, ok, message_id, error, created_at
     ) VALUES ($id, $batch, $chat, $preview, $ok, $mid, $err, $at)`,
    {
      $id: Bun.randomUUIDv7(),
      $batch: batchId,
      $chat: chatId,
      $preview: previewTextForLog(text),
      $ok: result.ok ? 1 : 0,
      $mid: result.messageId ?? null,
      $err: result.ok ? null : (result.error ?? 'failed'),
      $at: new Date().toISOString(),
    }
  );
}
