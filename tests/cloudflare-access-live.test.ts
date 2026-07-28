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
    expect(open.evidence).toMatch(/public/);
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
    expect(checks.map(c => c.id)).toContain('infra-ledger-access');
    expect(checks.map(c => c.id)).toContain('infra-portal-access');
    expect(checks.find(c => c.id === 'infra-ledger-access')?.group).toBe('infra');
    expect(checks.find(c => c.id === 'infra-ledger-access')?.level).toBe('fatal');
    expect(checks.find(c => c.id === 'infra-ledger-access')?.ok).toBe(true);
    expect(checks.find(c => c.id === 'infra-portal-access')?.level).toBe('warn');
    expect(checks.find(c => c.id === 'infra-portal-access')?.ok).toBe(false);
  });

  test('runInfraChecks offline uses policy SSOT (not fake green skip)', async () => {
    const checks = await runInfraChecks({ skipLive: true, cwd: process.cwd() });
    // policy + surfaces bake + ledger + portal
    expect(checks.map(c => c.id)).toEqual([
      'infra-access-policy',
      'infra-surfaces-state',
      'infra-ledger-access',
      'infra-portal-access',
    ]);
    expect(checks.find(c => c.id === 'infra-ledger-access')?.message).toContain('policy');
    expect(checks.find(c => c.id === 'infra-ledger-access')?.ok).toBe(true);
    expect(checks.find(c => c.id === 'infra-portal-access')?.message).toContain('policy has');
    expect(checks.find(c => c.id === 'infra-surfaces-state')?.ok).toBe(true);
  });

  test('runInfraChecks live includes host inventory ids', async () => {
    const checks = await runInfraChecks({
      skipLive: false,
      fetch: async url => {
        const u = String(url);
        if (u.includes('ledger')) {
          return new Response(null, {
            status: 302,
            headers: {
              location: 'https://factory-wager.cloudflareaccess.com/cdn-cgi/access/login/x',
            },
          });
        }
        if (u.includes('terminal')) {
          return new Response('Bad Gateway', { status: 502 });
        }
        return new Response('ok', { status: 200 });
      },
    });
    const ids = checks.map(c => c.id);
    expect(ids).toContain('infra-access-policy');
    expect(ids).toContain('infra-ledger-access');
    expect(ids).toContain('infra-portal-access');
    expect(ids).toContain('infra-surfaces-state');
    expect(ids).toContain('infra-terminal-host');
    expect(ids).toContain('infra-reasonix-dns');
    // terminal inventory is retired; ok depends on real DNS (NXDOMAIN → pass; residual 502 → fail)
    const terminal = checks.find(c => c.id === 'infra-terminal-host');
    expect(terminal?.message).toMatch(/retired|inventory=retired/);
    expect(checks.find(c => c.id === 'infra-reasonix-dns')?.level).toBe('info');
  });
});
