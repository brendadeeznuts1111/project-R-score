// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  bearerToken,
  configuredPublishToken,
  decidePublishAuth,
  tokenMatches,
} from '../lib/registry/publish-auth.ts';

function req(auth?: string): Request {
  return new Request('http://127.0.0.1:3000/@scope/pkg', {
    method: 'PUT',
    headers: auth ? { Authorization: auth } : undefined,
  });
}

describe('publish-auth (P0 F1)', () => {
  test('configuredPublishToken prefers FACTORY_WAGER_TOKEN then REGISTRY_SECRET', () => {
    expect(configuredPublishToken({ FACTORY_WAGER_TOKEN: 'a', REGISTRY_SECRET: 'b' })).toBe('a');
    expect(configuredPublishToken({ REGISTRY_SECRET: 'b' })).toBe('b');
    expect(configuredPublishToken({})).toBe('');
    expect(configuredPublishToken({ REGISTRY_SECRET: '  x  ' })).toBe('x');
  });

  test('bearerToken strips Bearer prefix only', () => {
    expect(bearerToken(req('Bearer secret'))).toBe('secret');
    expect(bearerToken(req('secret'))).toBe('');
    expect(bearerToken(req())).toBe('');
  });

  test('tokenMatches accepts equal secrets and rejects wrong/empty', async () => {
    expect(await tokenMatches('s3cret', 's3cret')).toBe(true);
    expect(await tokenMatches('wrong', 's3cret')).toBe(false);
    expect(await tokenMatches('', 's3cret')).toBe(false);
    expect(await tokenMatches('s3cret', '')).toBe(false);
  });

  test('fails closed with 503 when no secret configured', async () => {
    const d = await decidePublishAuth(req('Bearer anything'), {});
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.status).toBe(503);
      expect(d.error).toContain('not configured');
    }
  });

  test('rejects missing or wrong bearer with 401', async () => {
    const env = { REGISTRY_SECRET: 'publish-secret' };
    const missing = await decidePublishAuth(req(), env);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.status).toBe(401);

    const wrong = await decidePublishAuth(req('Bearer nope'), env);
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.status).toBe(401);
  });

  test('accepts correct bearer', async () => {
    const d = await decidePublishAuth(req('Bearer publish-secret'), {
      REGISTRY_SECRET: 'publish-secret',
    });
    expect(d.ok).toBe(true);
  });
});
