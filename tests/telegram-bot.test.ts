/**
 * Telegram bot command router tests.
 */

import { describe, expect, test } from 'bun:test';
import { createTenantBot } from '../lib/telegram/bot.ts';
import { MemoryAccountStore } from '../lib/accounts/memory-account-store.ts';
import { MemoryChannelStore } from '../lib/channels/channels.ts';
import { asPortalTenantId, asTelegramUserId } from '../lib/types/branded/portal.ts';
import { getTenant } from '../config/tenants.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';
import { AccountR2Store } from '../lib/accounts/account-r2-store.ts';

function mockR2(): R2PutBucket {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      const body = store.get(key);
      if (!body) return null;
      return {
        body: new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(body));
            c.close();
          },
        }),
      };
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('TelegramBot factory', () => {
  test('/status requires factory tenant account', async () => {
    const bucket = mockR2();
    await bucket.put(
      'tenants/factory/registry.json',
      JSON.stringify({ packages: { a: {} }, meta: { coverage: 80 } })
    );
    const accounts = new AccountR2Store(bucket);
    const account = await accounts.create({
      email: 'f@example.com',
      tenantId: asPortalTenantId('factory'),
      role: 'viewer',
      oidcSubject: 'sub-f',
    });
    await accounts.linkTelegram(account.tenantId, account.id, asTelegramUserId('42'));

    const bot = createTenantBot('factory');
    const tenant = getTenant('factory')!;
    const channel = new MemoryChannelStore();
    const sent: string[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('api.telegram.org')) {
        sent.push(JSON.parse(String(init?.body)).text);
        return new Response('{}', { status: 200 });
      }
      return origFetch(input, init);
    }) as typeof fetch;

    try {
      await bot.handleUpdate(
        { message: { chat: { id: 1 }, from: { id: 42 }, text: '/status' } },
        {
          tenant,
          accounts,
          bucket,
          channel,
          env: { TELEGRAM_BOT_FACTORY: 'test-token', OPS_DB_PATH: ':memory:' },
        }
      );
      expect(sent[0]).toContain('Factory Status');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
