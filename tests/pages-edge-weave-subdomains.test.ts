// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  defaultExpectForPath,
  loadSubdomainsConfig,
  parseSubdomainsConfig,
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
    expect(names).toContain('pages_dev');
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
