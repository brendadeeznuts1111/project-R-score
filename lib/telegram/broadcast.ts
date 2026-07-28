// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
/**
 * Broadcast text to known Telegram chats (ops CLI).
 *
 * Uses rate-limited sendTelegramBotMessage; audits each attempt in ops_broadcast_log.
 */
import type { Database } from 'bun:sqlite';
import {
  knownChatLabel,
  listKnownChats,
  type KnownChatFilterKind,
  type KnownChatRow,
} from './known-chats.ts';
import { sendTelegramBotMessage } from './telegram-api.ts';
import { loadTelegramEnv } from './telegram-config.ts';
import { enqueueOpsChannelEvent } from '../channels/outbox.ts';

export type BroadcastLogRow = {
  id: string; // brand-ok — broadcast log row id
  batchId: string; // brand-ok
  chatId: string; // brand-ok
  ok: boolean;
  messageId: number | null;
  error: string | null;
  createdAt: string;
};

// Moved to ./broadcast-log.ts to break the outbox ↔ broadcast import cycle.
// Import for local use + re-export for existing import sites (tests, tools).
import { ensureBroadcastLogSchema, recordBroadcastOutboxSend } from './broadcast-log.ts';
export { ensureBroadcastLogSchema, recordBroadcastOutboxSend };

export type ResolveBroadcastTargetsOpts = {
  db: Database;
  /** Explicit chat ids (implies not --all). */
  chatIds?: string[]; // brand-ok
  all?: boolean;
  filter?: KnownChatFilterKind;
  /** Concern surface slug (hq | ash-staging | sandbox). */
  surface?: string;
  limit?: number;
};

export function resolveBroadcastTargets(opts: ResolveBroadcastTargetsOpts): KnownChatRow[] {
  if (opts.chatIds?.length) {
    return listKnownChats(opts.db, {
      filter: opts.filter ?? 'all',
      chatIds: opts.chatIds,
      surface: opts.surface,
      activeOnly: false,
      limit: opts.limit ?? 500,
    });
  }
  if (!opts.all) return [];
  return listKnownChats(opts.db, {
    filter: opts.filter ?? 'active',
    surface: opts.surface,
    limit: opts.limit ?? 500,
  });
}

/** Expand simple templates: {{title}} {{chatId}} {{type}} {{members}}. */
export function renderBroadcastText(template: string, row: KnownChatRow): string {
  return template
    .replaceAll('{{title}}', knownChatLabel(row))
    .replaceAll('{{chatId}}', row.chatId)
    .replaceAll('{{type}}', row.chatType)
    .replaceAll('{{members}}', row.memberCount != null ? String(row.memberCount) : '');
}

export type BroadcastSendOpts = {
  db: Database;
  token: string;
  text: string;
  targets: KnownChatRow[];
  dryRun?: boolean;
  parseMode?: 'HTML' | 'Markdown';
};

export type BroadcastSendResult = {
  batchId: string; // brand-ok
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    chatId: string; // brand-ok
    label: string;
    ok: boolean;
    messageId?: number;
    error?: string;
    dryRun?: boolean;
  }>;
};

function previewText(text: string): string {
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
}

export async function broadcastToKnownChats(opts: BroadcastSendOpts): Promise<BroadcastSendResult> {
  ensureBroadcastLogSchema(opts.db);
  const batchId = Bun.randomUUIDv7();
  const results: BroadcastSendResult['results'] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of opts.targets) {
    const label = knownChatLabel(row);
    const body = renderBroadcastText(opts.text, row);

    if (opts.dryRun) {
      skipped++;
      results.push({ chatId: row.chatId, label, ok: true, dryRun: true });
      continue;
    }

    const r = await sendTelegramBotMessage(opts.token, {
      chatId: row.chatId,
      text: body,
      parseMode: opts.parseMode,
    });

    const id = Bun.randomUUIDv7();
    const createdAt = new Date().toISOString();
    opts.db.run(
      `INSERT INTO ops_broadcast_log (
         id, batch_id, chat_id, text_preview, ok, message_id, error, created_at
       ) VALUES (
         $id, $batch, $chat, $preview, $ok, $mid, $err, $at
       )`,
      {
        $id: id,
        $batch: batchId,
        $chat: row.chatId,
        $preview: previewText(body),
        $ok: r.ok ? 1 : 0,
        $mid: r.messageId ?? null,
        $err: r.ok ? null : (r.description ?? 'send failed'),
        $at: createdAt,
      }
    );

    if (r.ok) {
      sent++;
      results.push({ chatId: row.chatId, label, ok: true, messageId: r.messageId });
    } else {
      failed++;
      results.push({
        chatId: row.chatId,
        label,
        ok: false,
        error: r.description ?? `error_code=${r.errorCode ?? '?'}`,
      });
    }
  }

  return {
    batchId,
    attempted: opts.targets.length,
    sent,
    failed,
    skipped,
    results,
  };
}

export function formatBroadcastSummary(result: BroadcastSendResult): string[] {
  const lines = [
    `batch: ${result.batchId}`,
    `attempted=${result.attempted} sent=${result.sent} failed=${result.failed} dry_run=${result.skipped}`,
  ];
  for (const r of result.results) {
    if (r.dryRun) {
      lines.push(`  · ${r.chatId}  ${r.label}  (dry-run)`);
    } else if (r.ok) {
      lines.push(`  ✓ ${r.chatId}  ${r.label}  msg=${r.messageId ?? '?'}`);
    } else {
      lines.push(`  ✗ ${r.chatId}  ${r.label}  ${r.error ?? 'failed'}`);
    }
  }
  return lines;
}

export type EnqueueBroadcastToOutboxOpts = {
  db: Database;
  targets: KnownChatRow[];
  textTemplate: string;
  parseMode?: 'HTML' | 'Markdown';
  batchId?: string; // brand-ok
};

export type EnqueueBroadcastToOutboxResult = {
  batchId: string; // brand-ok
  enqueued: number;
  skipped: number;
};

/** Queue one outbox row per target (alerts · ops.broadcast · telegram only). */
export function enqueueBroadcastToOutbox(
  opts: EnqueueBroadcastToOutboxOpts
): EnqueueBroadcastToOutboxResult {
  const batchId = opts.batchId ?? Bun.randomUUIDv7();
  const minInterval = loadTelegramEnv().rateLimitMinIntervalMs;
  const nowMs = Date.now();
  let enqueued = 0;
  let skipped = 0;

  for (let i = 0; i < opts.targets.length; i++) {
    const row = opts.targets[i]!;
    const body = renderBroadcastText(opts.textTemplate, row);
    const staggerMs = i * minInterval;
    const availableAt = staggerMs > 0 ? new Date(nowMs + staggerMs).toISOString() : null;

    const event = enqueueOpsChannelEvent(opts.db, {
      topic: 'alerts',
      eventType: 'ops.broadcast',
      idempotencyKey: `broadcast:${batchId}:${row.chatId}`,
      projectors: ['telegram'],
      availableAt,
      payload: {
        telegramId: row.chatId,
        text: body,
        parseMode: opts.parseMode,
        batchId,
        chatLabel: knownChatLabel(row),
      },
    });

    if (event.inserted) enqueued++;
    else skipped++;
  }

  return { batchId, enqueued, skipped };
}
