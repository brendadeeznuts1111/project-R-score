// @see https://bun.com/docs/runtime/sqlite
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Factory Telegram ↔ ops SQLite bridge.
 * Direct DB when OPS_DB_PATH is writable; else enqueue to R2 telegram-commands.
 */
import type { Database } from 'bun:sqlite';
import { openOperationsDb } from '../operations/db.ts';
import { dispatchOpsCommand, type OpsCommandInput } from './ops-commands.ts';
import { R2ChannelStore } from '../channels/channels.ts';
import type { R2PutBucket } from '../pages/r2-types.ts';

export type OpsBridgeEnv = Record<string, string | undefined>;

export type OpsBridgeResult =
  | { mode: 'direct'; reply: string }
  | { mode: 'queued'; reply: string }
  | { mode: 'unavailable'; reply: string };

const TELEGRAM_COMMANDS_TOPIC = 'telegram-commands';

export function tryOpenOpsDb(env: OpsBridgeEnv): Database | null {
  const dbPath = env.OPS_DB_PATH ?? Bun.env.OPS_DB_PATH;
  if (!dbPath) return null;
  try {
    return openOperationsDb({ path: dbPath });
  } catch {
    return null;
  }
}

export async function runOpsCommand(
  env: OpsBridgeEnv,
  bucket: R2PutBucket | null,
  input: OpsCommandInput
): Promise<OpsBridgeResult> {
  const db = tryOpenOpsDb(env);
  if (db) {
    try {
      const dbPath = env.OPS_DB_PATH ?? Bun.env.OPS_DB_PATH ?? ':memory:';
      const reply = dispatchOpsCommand(db, dbPath, input);
      return { mode: 'direct', reply };
    } finally {
      db.close();
    }
  }

  if (bucket) {
    const channel = new R2ChannelStore(bucket);
    await channel.publish(
      TELEGRAM_COMMANDS_TOPIC,
      {
        telegramUserId: input.telegramUserId,
        chatId: input.telegramUserId,
        command: input.command,
        args: input.args,
      },
      { sender: 'telegram-webhook' }
    );
    return {
      mode: 'queued',
      reply: 'Command queued — reply will arrive shortly.',
    };
  }

  return {
    mode: 'unavailable',
    reply: 'Ops bridge unavailable. Set OPS_DB_PATH on Bun host or configure R2 bucket.',
  };
}

export { TELEGRAM_COMMANDS_TOPIC };
