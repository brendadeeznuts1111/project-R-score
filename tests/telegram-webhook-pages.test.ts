/**
 * Pages telegram webhook — edge enqueue path (no bun:sqlite).
 */
import { describe, expect, test } from 'bun:test';
import {
  onTelegramWebhookRequest,
  TELEGRAM_UPDATES_TOPIC,
} from '../lib/telegram/webhook-pages.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';

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

describe('telegram webhook pages (edge enqueue)', () => {
  test('rejects missing secret unless insecure allowed', async () => {
    const bucket = memoryBucket();
    const res = await onTelegramWebhookRequest({
      request: new Request('https://example.test/api/telegram/webhook/factory', {
        method: 'POST',
        body: JSON.stringify({ message: { chat: { id: 1 }, from: { id: 1 }, text: '/help' } }),
      }),
      env: { REGISTRY_BUCKET: bucket },
      params: { tenant: 'factory' },
    });
    expect(res.status).toBe(503);
  });

  test('enqueues update to R2 telegram-updates topic', async () => {
    const bucket = memoryBucket();
    const res = await onTelegramWebhookRequest({
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
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
    const events = bucket.store.get(`channels/${TELEGRAM_UPDATES_TOPIC}/events.jsonl`);
    expect(events).toBeTruthy();
    const line = events!.trim().split('\n').at(-1)!;
    const msg = JSON.parse(line) as {
      topic: string;
      payload: { tenantSlug: string; update: { message?: { text?: string } } };
    };
    expect(msg.topic).toBe(TELEGRAM_UPDATES_TOPIC);
    expect(msg.payload.tenantSlug).toBe('factory');
    expect(msg.payload.update.message?.text).toBe('/status');
  });

  test('rejects bad secret and invalid tenant', async () => {
    const bucket = memoryBucket();
    const badSecret = await onTelegramWebhookRequest({
      request: new Request('https://example.test/api/telegram/webhook/factory', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' },
        body: '{}',
      }),
      env: { REGISTRY_BUCKET: bucket, TELEGRAM_WEBHOOK_SECRET: 'sekrit' },
      params: { tenant: 'factory' },
    });
    expect(badSecret.status).toBe(403);

    const badTenant = await onTelegramWebhookRequest({
      request: new Request('https://example.test/api/telegram/webhook/nope', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'sekrit' },
        body: '{}',
      }),
      env: { REGISTRY_BUCKET: bucket, TELEGRAM_WEBHOOK_SECRET: 'sekrit' },
      params: { tenant: 'nope' },
    });
    expect(badTenant.status).toBe(400);
  });
});
