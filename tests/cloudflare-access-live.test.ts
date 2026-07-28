// @see https://bun.com/docs/test
// @see https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
import { describe, expect, test } from 'bun:test';
import {
  isCloudflareAccessEnforced,
  probeCloudflareAccess,
  probePortalAccess,
} from '../lib/verification/cloudflare-access-live.ts';
import { runInfraChecks } from '../tools/lib/portal-cli-doctor-infra.ts';

function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe('cloudflare-access-live', () => {
  test('isCloudflareAccessEnforced detects Access login redirect', () => {
    expect(
      isCloudflareAccessEnforced(
        302,
        headers({
          location:
            'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/ledger.factory-wager.com',
        })
      )
    ).toBe(true);
    expect(
      isCloudflareAccessEnforced(302, headers({ 'www-authenticate': 'Cloudflare-Access' }))
    ).toBe(true);
    expect(isCloudflareAccessEnforced(200, headers({ 'content-type': 'text/html' }))).toBe(
      false
    );
    expect(
      isCloudflareAccessEnforced(302, headers({ location: 'https://example.com/elsewhere' }))
    ).toBe(false);
  });

  test('probeCloudflareAccess with injectable fetch', async () => {
    const ok = await probeCloudflareAccess('https://ledger.factory-wager.com/', {
      fetch: async () =>
        new Response(null, {
          status: 302,
          headers: {
            location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/x',
          },
        }),
    });
    expect(ok.accessEnforced).toBe(true);
    expect(ok.ok).toBe(true);

    const open = await probeCloudflareAccess('https://score.factory-wager.com/portal/', {
      fetch: async () => new Response('ok', { status: 200 }),
    });
    expect(open.accessEnforced).toBe(false);
    expect(open.evidence).toContain('public');
  });

  test('probePortalAccess requires both score and pages.dev', async () => {
    const mixed = await probePortalAccess({
      fetch: async url => {
        if (String(url).includes('score.factory-wager.com')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/x',
            },
          });
        }
        return new Response('public', { status: 200 });
      },
    });
    expect(mixed.ok).toBe(false);
    expect(mixed.custom.accessEnforced).toBe(true);
    expect(mixed.pages.accessEnforced).toBe(false);
  });

  test('runInfraChecks maps probes to doctor rows', async () => {
    const checks = await runInfraChecks({
      fetch: async url => {
        if (String(url).includes('ledger')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/ledger',
              'www-authenticate': 'Cloudflare-Access',
            },
          });
        }
        return new Response('public', { status: 200 });
      },
    });
    expect(checks.map(c => c.id)).toEqual([
      'infra-ledger-access',
      'infra-portal-access',
    ]);
    expect(checks[0]!.group).toBe('infra');
    expect(checks[0]!.level).toBe('fatal');
    expect(checks[0]!.ok).toBe(true);
    expect(checks[1]!.level).toBe('warn');
    expect(checks[1]!.ok).toBe(false);
    expect(checks[1]!.envScope).toBe('all');
  });
});
