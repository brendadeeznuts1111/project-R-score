/**
 * Account R2 store + memory store contract tests.
 */

import { describe, expect, test } from 'bun:test';
import { AccountR2Store } from '../lib/accounts/account-r2-store.ts';
import { MemoryAccountStore } from '../lib/accounts/memory-account-store.ts';
import { asPortalTenantId, asTelegramUserId } from '../lib/types/branded/portal.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';

function mockR2Bucket(): R2PutBucket & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
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
        httpMetadata: { contentType: 'application/json' },
      };
    },
    async put(key: string, value: string) {
      store.set(key, typeof value === 'string' ? value : '');
    },
  };
}

describe('AccountR2Store', () => {
  test('create + getByOidc + linkTelegram', async () => {
    const bucket = mockR2Bucket();
    const accounts = new AccountR2Store(bucket);
    const created = await accounts.create({
      email: 'a@example.com',
      tenantId: asPortalTenantId('factory'),
      role: 'viewer',
      oidcSubject: 'oidc-sub-1',
    });
    const byOidc = await accounts.getByOidc('oidc-sub-1');
    expect(byOidc?.email).toBe('a@example.com');
    await accounts.linkTelegram(
      created.tenantId,
      created.id,
      asTelegramUserId('999001')
    );
    const byTg = await accounts.getByTelegram(asTelegramUserId('999001'));
    expect(byTg?.id).toBe(created.id);
  });
});

describe('MemoryAccountStore', () => {
  test('create and lookup', async () => {
    const accounts = new MemoryAccountStore();
    await accounts.create({
      email: 'b@example.com',
      tenantId: asPortalTenantId('tennis'),
      role: 'admin',
      oidcSubject: 'oidc-sub-2',
    });
    const found = await accounts.getByOidc('oidc-sub-2');
    expect(found?.tenantId).toBe(asPortalTenantId('tennis'));
  });
});
