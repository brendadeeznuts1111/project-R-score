// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  defaultExpectForPath,
  loadSubdomainsConfig,
  parseSubdomainsConfig,
  probeSubdomainCheck,
} from '../lib/verification/pages-edge-weave-subdomains.ts';

describe('pages-edge-weave-subdomains', () => {
  test('defaultExpectForPath', () => {
    expect(defaultExpectForPath('/health')).toBe('json');
    expect(defaultExpectForPath('/api/registry/health')).toBe('json');
    expect(defaultExpectForPath('/registry/portal-weave.json')).toBe('json');
    expect(defaultExpectForPath('/')).toBe('ok');
  });

  test('parseSubdomainsConfig brands name/domain and normalizes checks', () => {
    const cfg = parseSubdomainsConfig({
      schemaVersion: 1,
      kind: 'weave-subdomain-probes',
      subdomains: [
        {
          name: 'score',
          domain: 'score.factory-wager.com',
          checks: ['/health', { path: '/', expect: 'ok' }],
        },
      ],
    });
    expect(cfg.subdomains).toHaveLength(1);
    expect(String(cfg.subdomains[0]?.name)).toBe('score');
    expect(String(cfg.subdomains[0]?.domain)).toBe('score.factory-wager.com');
    expect(cfg.subdomains[0]?.checks).toEqual([
      { path: '/health', expect: 'json' },
      { path: '/', expect: 'ok' },
    ]);
  });

  test('loadSubdomainsConfig reads committed matrix', async () => {
    const cfg = await loadSubdomainsConfig();
    expect(cfg.schemaVersion).toBe(1);
    expect(cfg.subdomains.length).toBeGreaterThanOrEqual(3);
    const names = cfg.subdomains.map(s => String(s.name));
    expect(names).toContain('score');
    expect(names).toContain('registry');
    expect(names).toContain('tennis');
    expect(names).toContain('pages_dev');

    const tennis = cfg.subdomains.find(s => String(s.name) === 'tennis');
    expect(String(tennis?.domain)).toBe('tennis.factory-wager.com');
    expect(tennis?.checks).toEqual([
      { path: '/api/version', expect: 'json' },
      { path: '/api/glossary', expect: 'json' },
      { path: '/api/v1/marketdata/desk', expect: 'bearer-auth' },
      { path: '/api/v1/research/status', expect: 'bearer-auth' },
      { path: '/api/v1/trading/executions', expect: 'bearer-auth' },
      { path: '/api/v1/partners/capacity', expect: 'bearer-auth' },
      { path: '/api/v1/accounting/finance', expect: 'bearer-auth' },
    ]);
  });

  test('parses configured bearer-auth endpoint expectations', () => {
    const cfg = parseSubdomainsConfig({
      schemaVersion: 1,
      kind: 'weave-subdomain-probes',
      subdomains: [
        {
          name: 'tennis',
          domain: 'tennis.factory-wager.com',
          checks: [{ path: '/api/v1/marketdata/desk', expect: 'bearer-auth' }],
        },
      ],
    });
    expect(cfg.subdomains[0]?.checks[0]).toEqual({
      path: '/api/v1/marketdata/desk',
      expect: 'bearer-auth',
    });
  });

  test('bearer-auth probe accepts only the configured auth rejection', async () => {
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/closed') {
          return Response.json(
            { ok: false, code: 'unauthorized', error: 'Partner service token required.' },
            { status: 401 }
          );
        }
        if (path === '/unconfigured') {
          return Response.json(
            { ok: false, code: 'contract_auth_unconfigured', error: 'not configured' },
            { status: 503 }
          );
        }
        return Response.json({ ok: true });
      },
    });
    try {
      const closed = await probeSubdomainCheck(`${server.url}closed`, 'bearer-auth', {
        retries: 1,
        backoffMs: 0,
      });
      expect(closed).toEqual(
        expect.objectContaining({ ok: true, httpStatus: 401, detail: '401 bearer-auth' })
      );

      const unconfigured = await probeSubdomainCheck(
        `${server.url}unconfigured`,
        'bearer-auth',
        {
          retries: 1,
          backoffMs: 0,
        }
      );
      expect(unconfigured.ok).toBe(false);
      expect(unconfigured.detail).toContain('expected configured bearer rejection 401, got 503');

      const open = await probeSubdomainCheck(`${server.url}open`, 'bearer-auth', {
        retries: 1,
        backoffMs: 0,
      });
      expect(open.ok).toBe(false);
      expect(open.detail).toContain('expected configured bearer rejection 401, got 200');
    } finally {
      server.stop(true);
    }
  });

  test('rejects unknown host / empty checks', () => {
    expect(() =>
      parseSubdomainsConfig({
        schemaVersion: 1,
        kind: 'weave-subdomain-probes',
        subdomains: [{ name: 'score', domain: 'not a host', checks: ['/health'] }],
      })
    ).toThrow();
    expect(() =>
      parseSubdomainsConfig({
        schemaVersion: 1,
        kind: 'weave-subdomain-probes',
        subdomains: [{ name: 'score', domain: 'score.factory-wager.com', checks: [] }],
      })
    ).toThrow(/checks/);
  });
});
