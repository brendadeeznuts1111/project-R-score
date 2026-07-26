/**
 * Telegram bot command router tests.
 */

import { describe, expect, test } from 'bun:test';
import { randomUUIDv7 } from 'bun';
import { createTenantBot } from '../lib/telegram/bot.ts';
import { initSchema } from '../lib/operations/schema.ts';
import { bindPartnerProfile } from '../lib/operations/partner-profile-bridge.ts';
import { MemoryAccountStore } from '../lib/accounts/memory-account-store.ts';
import { MemoryChannelStore } from '../lib/channels/channels.ts';
import { asPortalTenantId, asTelegramUserId } from '../lib/types/branded/portal.ts';
import { getTenant } from '../config/tenants.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';
import { AccountR2Store } from '../lib/accounts/account-r2-store.ts';
import { asTreeNodeId } from '../lib/types/branded/operations.ts';

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

  test('/status delivers HTML template card when ops tree node registered', async () => {
    const SCRATCH = '.tmp/telegram-bot-flow-test';
    const DB = `${SCRATCH}/operations.db`;
    await Bun.$`rm -rf ${SCRATCH} && mkdir -p ${SCRATCH}`.quiet();

    const db = new (await import('bun:sqlite')).Database(DB);
    initSchema(db);
    const now = new Date().toISOString();
    const agentId = randomUUIDv7();
    db.run(
      `INSERT INTO tree_nodes (id, type, name, call_sign, telegram_id, active, created_at)
       VALUES ($id, 'agent', 'Ops Agent', 'PAT-007', '42', 1, $now)`,
      { $id: agentId, $now: now }
    );
    bindPartnerProfile(db, asTreeNodeId(agentId));
    db.close();

    const bucket = mockR2();
    const accounts = new AccountR2Store(bucket);
    const bot = createTenantBot('factory');
    const tenant = getTenant('factory')!;
    const channel = new MemoryChannelStore();
    const bodies: Record<string, unknown>[] = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('api.telegram.org')) {
        bodies.push(JSON.parse(String(init?.body)));
        return new Response('{"ok":true,"result":{"message_id":1}}', { status: 200 });
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
          env: { TELEGRAM_BOT_FACTORY: 'test-token', OPS_DB_PATH: DB },
        }
      );
      expect(bodies[0]?.parse_mode).toBe('HTML');
      expect(String(bodies[0]?.text)).toContain('<b>');
      expect(bodies[0]?.reply_markup).toBeDefined();
    } finally {
      globalThis.fetch = origFetch;
      await Bun.$`rm -rf ${SCRATCH}`.quiet();
    }
  });
});
