/**
 * Pages webhook enqueue → R2 telegram-updates → factory bot handleUpdate.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { AccountR2Store } from '../lib/accounts/account-r2-store.ts';
import { R2ChannelStore } from '../lib/channels/channels.ts';
import { getTenant } from '../config/tenants.ts';
import { initSchema } from '../lib/operations/schema.ts';
import { drainTelegramUpdates } from '../lib/telegram/consumer-updates.ts';
import {
  onTelegramWebhookRequest,
  TELEGRAM_UPDATES_TOPIC,
} from '../lib/telegram/webhook-pages.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';

const SCRATCH = '.tmp/telegram-webhook-consumer-test';
const DB = `${SCRATCH}/operations.db`;

function memoryBucket(): R2PutBucket & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      const text = store.get(key);
      if (text == null) return null;
      return {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(text));
            controller.close();
          },
        }),
      };
    },
    async put(key: string, value: string | ReadableStream | ArrayBuffer) {
      const text =
        typeof value === 'string'
          ? value
          : value instanceof ArrayBuffer
            ? new TextDecoder().decode(value)
            : await new Response(value).text();
      store.set(key, text);
    },
  };
}

let sent: string[];
let origFetch: typeof globalThis.fetch;

beforeEach(async () => {
  await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();
  sent = [];
  origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('api.telegram.org')) {
      sent.push(JSON.parse(String(init?.body)).text);
      return new Response('{}', { status: 200 });
    }
    return origFetch(input, init);
  }) as typeof fetch;
});

afterEach(async () => {
  globalThis.fetch = origFetch;
  await Bun.$`rm -rf ${SCRATCH}`.quiet();
});

async function seedAgent(): Promise<void> {
  const db = new (await import('bun:sqlite')).Database(DB);
  initSchema(db);
  db.run(
    `INSERT INTO tree_nodes (id, type, name, telegram_id, active, created_at)
     VALUES ('agent-wh', 'agent', 'Webhook Agent', '7', 1, datetime('now'))`
  );
  db.close();
}

describe('telegram webhook → consumer e2e', () => {
  test('enqueue then drain update reaches registered agent /status', async () => {
    await seedAgent();
    const bucket = memoryBucket();
    const channel = new R2ChannelStore(bucket);

    const webhookRes = await onTelegramWebhookRequest({
      request: new Request('https://example.test/api/telegram/webhook/factory', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'sekrit' },
        body: JSON.stringify({
          message: { chat: { id: 42 }, from: { id: 7 }, text: '/status' },
        }),
      }),
      env: {
        REGISTRY_BUCKET: bucket,
        TELEGRAM_WEBHOOK_SECRET: 'sekrit',
      },
      params: { tenant: 'factory' },
    });
    expect(webhookRes.status).toBe(200);

    const events = await channel.readSince(TELEGRAM_UPDATES_TOPIC, 0);
    expect(events).toHaveLength(1);
    expect(events[0]!.topic).toBe(TELEGRAM_UPDATES_TOPIC);

    const payload = events[0]!.payload as {
      tenantSlug: string;
      update: { message?: { text?: string } };
    };
    expect(payload.tenantSlug).toBe('factory');
    expect(payload.update.message?.text).toBe('/status');

    const tenant = getTenant('factory')!;
    const accounts = new AccountR2Store(bucket);

    const processed = await drainTelegramUpdates({
      updates: events,
      bucket,
      channel,
      accounts,
      tenant,
      env: {
        TELEGRAM_BOT_FACTORY: 'test-token',
        OPS_DB_PATH: DB,
      },
      dbPath: DB,
    });
    expect(processed).toBe(1);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('Status');
    expect(sent[0]).toContain('Accounts:');
  });
});
