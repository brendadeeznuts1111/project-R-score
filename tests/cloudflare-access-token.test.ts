// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { CLOUDFLARE_ACCESS_TOKEN_PERMISSIONS } from '../config/r2-env.ts';
import { runCloudflareAccessTokenProbe } from '../lib/verification/cloudflare-access-token.ts';
import { asAccountId } from '../lib/types/branded.ts';

const ACCOUNT = asAccountId('7a470541a704caaf91e71efccc78fd36');

function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input);
  if (url.includes('/access/apps')) {
    return Promise.resolve(
      Response.json({
        success: true,
        result: [
          {
            id: 'app-1',
            name: 'FactoryWager Portal',
            domain: 'score.factory-wager.com/portal',
            session_duration: '4h',
          },
        ],
      })
    );
  }
  if (url.includes('/access/service_tokens')) {
    return Promise.resolve(
      Response.json({
        success: true,
        result: [
          {
            id: 'service-1',
            name: 'portal smoke',
            expires_at: '2026-12-31T00:00:00Z',
          },
        ],
      })
    );
  }
  return Promise.resolve(new Response('not found', { status: 404 }));
}

describe('Cloudflare Access token boundary', () => {
  test('keeps Access policy permissions separate from Pages and DNS', () => {
    expect(CLOUDFLARE_ACCESS_TOKEN_PERMISSIONS.required).toEqual([
      'Access: Apps and Policies Read',
      'Access: Apps and Policies Edit',
      'Access: Service Tokens Read',
    ]);
    expect(CLOUDFLARE_ACCESS_TOKEN_PERMISSIONS.forbidden).toContain('Zone:DNS:Edit');
    expect(CLOUDFLARE_ACCESS_TOKEN_PERMISSIONS.forbidden).toContain(
      'Cloudflare Pages:Edit'
    );
  });

  test('probes apps and service-token expiry without exposing credentials', async () => {
    const report = await runCloudflareAccessTokenProbe({
      token: 'cfat_test_access_token',
      accountId: ACCOUNT,
      fetch: mockFetch as typeof fetch,
      now: new Date('2026-07-31T00:00:00Z'),
    });

    expect(report.ok).toBe(true);
    expect(report.verification).toEqual({
      kind: 'read-health',
      writeScopeVerified: false,
      requiredWritePermission: 'Access: Apps and Policies Edit',
    });
    expect(report.tokenKind).toBe('account');
    expect(report.probes.apps.count).toBe(1);
    expect(report.serviceTokens[0]?.status).toBe('active');
    expect(JSON.stringify(report)).not.toContain('cfat_test_access_token');
  });

  test('uses the shared account default when no runtime override is supplied', async () => {
    const urls: string[] = [];
    await runCloudflareAccessTokenProbe({
      token: 'cfat_test_access_token',
      fetch: ((input: RequestInfo | URL) => {
        urls.push(String(input));
        return mockFetch(input);
      }) as typeof fetch,
      now: new Date('2026-07-31T00:00:00Z'),
    });

    expect(urls).toHaveLength(2);
    expect(urls.every(url => url.includes(CLOUDFLARE_ACCESS_TOKEN_PERMISSIONS.accountId))).toBe(
      true
    );
  });

  test('computes health from service-token status, not warning text', async () => {
    const namedLikeFailure = ((input: RequestInfo | URL) => {
      if (String(input).includes('/access/service_tokens')) {
        return Promise.resolve(
          Response.json({
            success: true,
            result: [
              {
                id: 'service-1',
                name: 'expired no-expiry migration',
                expires_at: '2026-12-31T00:00:00Z',
              },
            ],
          })
        );
      }
      return mockFetch(input);
    }) as typeof fetch;
    const report = await runCloudflareAccessTokenProbe({
      token: 'cfat_test_access_token',
      accountId: ACCOUNT,
      fetch: namedLikeFailure,
      now: new Date('2026-07-31T00:00:00Z'),
    });

    expect(report.serviceTokens[0]?.status).toBe('active');
    expect(report.ok).toBe(true);
  });

  test('CLI module import does not execute the live probe', async () => {
    const module = await import('../tools/cloudflare-access-token-validate.ts');
    expect(module).toBeDefined();
  });

  test('fails closed when the dedicated token lacks Access scope', async () => {
    const denied = (() => Promise.resolve(new Response('forbidden', { status: 403 }))) as typeof fetch;
    await expect(
      runCloudflareAccessTokenProbe({
        token: 'dedicated-test-token',
        accountId: ACCOUNT,
        fetch: denied,
      })
    ).rejects.toThrow(/Access .* probe failed 403/);
  });

  test('distinguishes an invalid vault value from a missing permission', async () => {
    const invalid = (() =>
      Promise.resolve(new Response('authentication failed', { status: 400 }))) as typeof fetch;
    await expect(
      runCloudflareAccessTokenProbe({
        token: 'legacy-or-malformed-value',
        accountId: ACCOUNT,
        fetch: invalid,
      })
    ).rejects.toThrow(/malformed, inactive, or expired/);
  });
});
