/**
 * Onboarding + session + auth callback contract tests.
 */

import { describe, expect, test } from 'bun:test';
import { signSession, verifySession, sessionCookieHeader } from '../lib/auth/session.ts';
import { devClaimsFromCode } from '../lib/auth/oidc.ts';
import { onRequest as onboardRequest } from '../functions/api/onboard.ts';
import { onRequest as authCallback } from '../functions/api/auth/callback.ts';
import type { R2PutBucket } from '../lib/pages/r2-types.ts';

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

describe('session', () => {
  test('sign and verify round-trip', async () => {
    const token = await signSession(
      { sub: 'user-1', email: 'u@example.com', ttlSeconds: 3600 },
      'test-secret'
    );
    const payload = await verifySession(token, 'test-secret');
    expect(payload?.email).toBe('u@example.com');
  });
});

describe('oidc dev stub', () => {
  test('parses dev code', () => {
    expect(devClaimsFromCode('dev:abc:u@test.com')?.sub).toBe('abc');
  });
});

describe('onboard init', () => {
  test('returns new user tenants when no account', async () => {
    const secret = 'onboard-secret';
    const token = await signSession({ sub: 'new-user', email: 'n@example.com' }, secret);
    const bucket = mockR2();
    const res = await onboardRequest({
      request: new Request('https://example.com/api/onboard?step=init', {
        headers: { Cookie: sessionCookieHeader(token, false) },
      }),
      env: { SESSION_SECRET: secret, REGISTRY_BUCKET: bucket },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('new');
    expect(body.availableTenants.length).toBe(3);
  });
});

describe('auth callback dev', () => {
  test('redirects to onboard for new user', async () => {
    const bucket = mockR2();
    const res = await authCallback({
      request: new Request('https://example.com/api/auth/callback?code=dev:new1:n@dev.local'),
      env: { SESSION_SECRET: 'cb-secret', REGISTRY_BUCKET: bucket },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('onboard=1');
  });
});
