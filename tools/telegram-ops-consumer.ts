#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Consume queued factory Telegram ops commands from R2 → SQLite → sendMessage.
 */
import { resolveR2BridgeConfig } from '../scripts/lib/r2-bridge.ts';
import { R2ChannelStore } from '../lib/channels/channels.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { dispatchOpsCommand } from '../lib/telegram/ops-commands.ts';
import { TELEGRAM_COMMANDS_TOPIC } from '../lib/telegram/ops-bridge.ts';
import { sendTelegramMessage } from '../lib/telegram/bot.ts';
import { getTenant } from '../config/tenants.ts';
import { S3Client } from 'bun';
import { processChannelOutbox } from '../lib/channels/outbox.ts';
import type { TelegramUserId } from '../lib/types/branded/portal.ts';

const CURSOR_KEY = 'telegram-ops-consumer/cursor.json';

type Cursor = { lastSeq: number };

async function loadCursor(client: S3Client): Promise<number> {
  const f = client.file(CURSOR_KEY);
  if (!(await f.exists())) return 0;
  try {
    const c = (await f.json()) as Cursor;
    return c.lastSeq ?? 0;
  } catch {
    return 0;
  }
}

async function saveCursor(client: S3Client, lastSeq: number): Promise<void> {
  await client.write(CURSOR_KEY, JSON.stringify({ lastSeq, updatedAt: new Date().toISOString() }));
}

async function main(): Promise<void> {
  const token = Bun.env.TELEGRAM_BOT_FACTORY ?? Bun.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required');
    process.exit(1);
  }

  const r2 = resolveR2BridgeConfig();
  const client = new S3Client({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    bucket: r2.bucket,
    endpoint: r2.endpoint,
  });

  const bucket = {
    get: (key: string) => client.file(key).text(),
    put: (key: string, body: string, opts?: { httpMetadata?: { contentType?: string } }) =>
      client.write(key, body, opts),
  };

  const channel = new R2ChannelStore(bucket);
  const lastSeq = await loadCursor(client);
  const events = await channel.readSince(TELEGRAM_COMMANDS_TOPIC, lastSeq);

  const db = openOperationsDb();
  const dbPath = Bun.env.OPS_DB_PATH ?? 'data/operations.db';
  const tenant = getTenant('factory')!;
  let maxSeq = lastSeq;
  let processed = 0;

  try {
    for (const ev of events) {
      if (ev.seq > maxSeq) maxSeq = ev.seq;
      const p = ev.payload as {
        telegramUserId?: TelegramUserId;
        chatId?: string; // brand-ok — Telegram Bot API chat id wire string
        command?: string;
        args?: string[];
      };
      if (!p.telegramUserId || !p.command) continue;
      const reply = dispatchOpsCommand(db, dbPath, {
        telegramUserId: p.telegramUserId as string,
        command: p.command,
        args: p.args ?? [],
      });
      const chatId = Number(p.chatId ?? p.telegramUserId);
      await sendTelegramMessage({ TELEGRAM_BOT_FACTORY: token }, tenant, chatId, reply);
      processed++;
    }

    await processChannelOutbox(db, {
      telegramToken: token,
      deliver: true,
    });

    if (maxSeq > lastSeq) await saveCursor(client, maxSeq);
    console.log(`telegram-ops-consumer: processed=${processed} lastSeq=${maxSeq}`);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
