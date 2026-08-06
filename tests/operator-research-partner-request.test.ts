import { afterEach, describe, expect, test } from 'bun:test';
import { timingSafeEqual, tokenMatchesAny } from '../lib/operator-research/auth/api-key.ts';
import {
  authenticatePartnerRequest,
  isLoopbackHostname,
} from '../lib/operator-research/auth/partner-request.ts';

const TOKEN_ENV_KEYS = [
  'PARTNER_API_TOKEN',
  'OPERATOR_API_TOKEN',
  'OPERATOR_RESEARCH_API_KEY',
  'FACTORYWAGER_API_KEY',
] as const;

const saved: Record<string, string | undefined> = {};

function clearPartnerTokens() {
  for (const k of TOKEN_ENV_KEYS) {
    if (!(k in saved)) saved[k] = Bun.env[k];
    delete Bun.env[k];
  }
}

function restorePartnerTokens() {
  for (const k of TOKEN_ENV_KEYS) {
    if (k in saved) {
      if (saved[k] == null) delete Bun.env[k];
      else Bun.env[k] = saved[k]!;
      delete saved[k];
    }
  }
}

afterEach(() => {
  restorePartnerTokens();
});

describe('partner-request timing-safe token match', () => {
  test('timingSafeEqual rejects length / byte mismatches', () => {
    const enc = new TextEncoder();
    expect(timingSafeEqual(enc.encode('abc'), enc.encode('abc'))).toBe(true);
    expect(timingSafeEqual(enc.encode('abc'), enc.encode('abd'))).toBe(false);
    expect(timingSafeEqual(enc.encode('ab'), enc.encode('abc'))).toBe(false);
  });

  test('tokenMatchesAny accepts exact match only', () => {
    expect(tokenMatchesAny('secret-token', ['secret-token', 'other'])).toBe(true);
    expect(tokenMatchesAny('secret-tokenx', ['secret-token'])).toBe(false);
    expect(tokenMatchesAny('wrong', ['secret-token'])).toBe(false);
  });

  test('authenticatePartnerRequest open mode when no tokens', () => {
    clearPartnerTokens();
    const auth = authenticatePartnerRequest(
      new Request('http://127.0.0.1:8790/api/system/fs/write', { method: 'POST' }),
      'write'
    );
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.mode).toBe('open');
  });

  test('write requires token when configured (no same-origin bypass)', () => {
    clearPartnerTokens();
    Bun.env.PARTNER_API_TOKEN = 'desk-write-token-xyz';

    const bare = authenticatePartnerRequest(
      new Request('http://127.0.0.1:8790/api/system/env', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
      'write'
    );
    expect(bare.ok).toBe(false);
    if (!bare.ok) expect(bare.status).toBe(401);

    const withToken = authenticatePartnerRequest(
      new Request('http://127.0.0.1:8790/api/system/fs/write', {
        method: 'POST',
        headers: { authorization: 'Bearer desk-write-token-xyz' },
      }),
      'write'
    );
    expect(withToken.ok).toBe(true);
    if (withToken.ok) expect(withToken.mode).toBe('token');

    const wrong = authenticatePartnerRequest(
      new Request('http://127.0.0.1:8790/api/system/fs/write', {
        method: 'POST',
        headers: { 'x-api-key': 'desk-write-token-xyZ' },
      }),
      'write'
    );
    expect(wrong.ok).toBe(false);
  });

  test('read allows same-origin when tokens configured', () => {
    clearPartnerTokens();
    Bun.env.OPERATOR_RESEARCH_API_KEY = 'read-key-abc';

    const sameOrigin = authenticatePartnerRequest(
      new Request('http://127.0.0.1:8790/api/system/fs/read', {
        method: 'GET',
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
      'read'
    );
    expect(sameOrigin.ok).toBe(true);
    if (sameOrigin.ok) expect(sameOrigin.mode).toBe('same-origin');
  });

  test('isLoopbackHostname covers local binds', () => {
    expect(isLoopbackHostname('127.0.0.1')).toBe(true);
    expect(isLoopbackHostname('localhost')).toBe(true);
    expect(isLoopbackHostname('::1')).toBe(true);
    expect(isLoopbackHostname('0.0.0.0')).toBe(false);
    expect(isLoopbackHostname('example.com')).toBe(false);
  });
});
