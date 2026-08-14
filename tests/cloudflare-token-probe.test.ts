// @see https://bun.com/docs/test
import { describe, expect, test } from 'bun:test';
import {
  classifyCloudflareTokenVerify,
  cloudflareTokenKind,
  cloudflareTokenVerifyUrl,
  probeCloudflareTokenValue,
} from '../lib/security/cloudflare-token-probe.ts';

describe('cloudflare-token-probe', () => {
  test('kind: cfat_ is account, others user', () => {
    expect(cloudflareTokenKind('cfat_abc')).toBe('account');
    expect(cloudflareTokenKind('xyz_user_token')).toBe('user');
  });

  test('verify URL: user path for non-cfat', () => {
    const r = cloudflareTokenVerifyUrl('user-token-value');
    expect(r.kind).toBe('user');
    expect(r.url).toContain('/user/tokens/verify');
  });

  test('verify URL: account path requires account id', () => {
    const missing = cloudflareTokenVerifyUrl('cfat_abc');
    expect(missing.url).toBeNull();
    const ok = cloudflareTokenVerifyUrl('cfat_abc', '7a470541a704caaf91e71efccc78fd36');
    expect(ok.kind).toBe('account');
    expect(ok.url).toContain('/accounts/7a470541a704caaf91e71efccc78fd36/tokens/verify');
  });

  test('classifyCloudflareTokenVerify lifecycle', () => {
    expect(
      classifyCloudflareTokenVerify(200, { success: true, result: { status: 'active' } })
    ).toBe('ok');
    expect(
      classifyCloudflareTokenVerify(200, { success: true, result: { status: 'expired' } })
    ).toBe('invalid');
    expect(classifyCloudflareTokenVerify(401, null)).toBe('invalid');
    expect(classifyCloudflareTokenVerify(429, null)).toBe('unreachable');
  });

  test('probeCloudflareTokenValue uses account URL for cfat_ (injectable fetch)', async () => {
    let hit = '';
    const fetchImpl = (async (input: RequestInfo | URL) => {
      hit = String(input);
      return new Response(JSON.stringify({ success: true, result: { status: 'active' } }), {
        status: 200,
      });
    }) as typeof fetch;

    const r = await probeCloudflareTokenValue({
      envKey: 'CLOUDFLARE_API_TOKEN',
      token: 'cfat_test_token',
      accountId: 'acct123',
      fetchImpl,
    });
    expect(r.status).toBe('ok');
    expect(r.kindDetail).toBe('account');
    expect(hit).toContain('/accounts/acct123/tokens/verify');
    expect(hit).not.toContain('/user/tokens/verify');
  });

  test('probeCloudflareTokenValue user token hits user path', async () => {
    let hit = '';
    const fetchImpl = (async (input: RequestInfo | URL) => {
      hit = String(input);
      return new Response(JSON.stringify({ success: true, result: { status: 'active' } }), {
        status: 200,
      });
    }) as typeof fetch;

    const r = await probeCloudflareTokenValue({
      envKey: 'CLOUDFLARE_API_TOKEN',
      token: 'plain_user_token',
      accountId: 'acct123',
      fetchImpl,
    });
    expect(r.status).toBe('ok');
    expect(r.kindDetail).toBe('user');
    expect(hit).toContain('/user/tokens/verify');
  });
});
