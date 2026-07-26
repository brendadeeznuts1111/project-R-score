#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — S3Client
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Drain factory Telegram R2 queues → SQLite / bot handler / outbox projectors.
 *
 * Queues:
 * - `telegram-updates` — Pages webhook enqueue (full TelegramUpdate)
 * - `telegram-commands` — ops-bridge command queue (legacy / direct enqueue)
 * - `ops_channel_outbox` — durable channel projectors (via processChannelOutbox)
 */
import { getTenant } from '../config/tenants.ts';
import { AccountR2Store } from '../lib/accounts/account-r2-store.ts';
import {
  createR2ChannelStoreFromConfig,
  createR2PutBucketFromConfig,
} from '../lib/channels/r2-channel-bucket.ts';
import { processChannelOutbox } from '../lib/channels/outbox.ts';
import { resolveProductionOutboxOpts } from '../lib/channels/outbox-prod-opts.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { sendTelegramMessage } from '../lib/telegram/bot.ts';
import { drainTelegramUpdates } from '../lib/telegram/consumer-updates.ts';
import { deliverFlowOutput } from '../lib/telegram/flows/deliver.ts';
import { TELEGRAM_COMMANDS_TOPIC } from '../lib/telegram/ops-bridge.ts';
import { dispatchOpsCommand, dispatchOpsFlowOutput } from '../lib/telegram/ops-commands.ts';
import { loadTelegramEnv } from '../lib/telegram/telegram-config.ts';
import { TELEGRAM_UPDATES_TOPIC } from '../lib/telegram/webhook-pages.ts';
import type { TelegramUserId } from '../lib/types/branded/portal.ts';
import { resolveChannelR2BridgeConfig } from '../scripts/lib/r2-bridge.ts';
import { S3Client } from 'bun';

const UPDATES_CURSOR_KEY = 'telegram-ops-consumer/updates-cursor.json';
const COMMANDS_CURSOR_KEY = 'telegram-ops-consumer/cursor.json';

type Cursor = { lastSeq: number };

async function loadCursor(client: S3Client, key: string): Promise<number> {
  const f = client.file(key);
  if (!(await f.exists())) return 0;
  try {
    const c = (await f.json()) as Cursor;
    return c.lastSeq ?? 0;
  } catch {
    return 0;
  }
}

async function saveCursor(client: S3Client, key: string, lastSeq: number): Promise<void> {
  await client.write(key, JSON.stringify({ lastSeq, updatedAt: new Date().toISOString() }));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const tg = loadTelegramEnv();
  const token = tg.effectiveToken;
  if (!token) {
    console.error('TELEGRAM_BOT_FACTORY or TELEGRAM_BOT_TOKEN required');
    process.exit(1);
  }

  const r2 = resolveChannelR2BridgeConfig();
  const client = new S3Client({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    bucket: r2.bucket,
    endpoint: r2.endpoint,
  });

  const bucket = createR2PutBucketFromConfig(r2);
  const channel = createR2ChannelStoreFromConfig(r2);
  const env: Record<string, string | undefined> = {
    ...Bun.env,
    TELEGRAM_BOT_FACTORY: token,
  };

  const updatesSince = await loadCursor(client, UPDATES_CURSOR_KEY);
  const commandsSince = await loadCursor(client, COMMANDS_CURSOR_KEY);
  const updates = await channel.readSince(TELEGRAM_UPDATES_TOPIC, updatesSince);
  const commands = await channel.readSince(TELEGRAM_COMMANDS_TOPIC, commandsSince);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          updatesPending: updates.length,
          commandsPending: commands.length,
          updatesCursor: updatesSince,
          commandsCursor: commandsSince,
        },
        null,
        2
      )
    );
    return;
  }

  const db = openOperationsDb();
  const dbPath = Bun.env.OPS_DB_PATH ?? 'data/operations.db';
  let updatesMax = updatesSince;
  let commandsMax = commandsSince;
  let updatesProcessed = 0;
  let commandsProcessed = 0;

  try {
    const tenant = getTenant('factory')!;
    const accounts = new AccountR2Store(bucket);

    updatesProcessed = await drainTelegramUpdates({
      updates,
      bucket,
      channel,
      accounts,
      tenant,
      env: { ...env, OPS_DB_PATH: dbPath },
      dbPath,
    });
    for (const ev of updates) {
      if (ev.seq > updatesMax) updatesMax = ev.seq;
    }

    for (const ev of commands) {
      if (ev.seq > commandsMax) commandsMax = ev.seq;
      const p = ev.payload as {
        telegramUserId?: TelegramUserId;
        chatId?: string; // brand-ok — Telegram Bot API chat id wire string
        command?: string;
        args?: string[];
      };
      if (!p.telegramUserId || !p.command) continue;
      const chatId = Number(p.chatId ?? p.telegramUserId);
      const flowOutput = dispatchOpsFlowOutput(db, dbPath, {
        telegramUserId: p.telegramUserId as string,
        command: p.command,
        args: p.args ?? [],
      });
      if (flowOutput) {
        await deliverFlowOutput(flowOutput, {
          token,
          chatId,
          db,
        });
      } else {
        const reply = dispatchOpsCommand(db, dbPath, {
          telegramUserId: p.telegramUserId as string,
          command: p.command,
          args: p.args ?? [],
        });
        await sendTelegramMessage({ TELEGRAM_BOT_FACTORY: token }, tenant, chatId, reply);
      }
      commandsProcessed++;
    }

    const outboxOpts = resolveProductionOutboxOpts({
      telegramToken: token,
      deliver: true,
      requireR2: true,
    });
    await processChannelOutbox(db, outboxOpts);
    console.log(
      `telegram-ops-consumer: updates=${updatesProcessed} commands=${commandsProcessed}` +
        ` updatesSeq=${updatesMax} commandsSeq=${commandsMax}` +
        ` projectorBackend=${outboxOpts.projectorBackend}`
    );

    if (updatesMax > updatesSince) await saveCursor(client, UPDATES_CURSOR_KEY, updatesMax);
    if (commandsMax > commandsSince) await saveCursor(client, COMMANDS_CURSOR_KEY, commandsMax);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
