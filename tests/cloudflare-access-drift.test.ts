// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { describe, expect, test } from 'bun:test';
import { diffScopedAccessApps } from '../lib/verification/cloudflare-access-drift.ts';
import { readScopedAccessApps } from '../lib/verification/cloudflare-access-policy.ts';

const configPath = new URL('../.cloudflare-access.yml', import.meta.url);

const policyApps = [
  {
    name: 'ledger',
    domain: 'ledger.factory-wager.com',
    sessionDuration: '4h',
  },
  {
    name: 'FactoryWager Portal',
    domain: 'score.factory-wager.com/portal',
    sessionDuration: '4h',
  },
  {
    name: 'FactoryWager Portal (pages.dev)',
    domain: 'project-r-score.pages.dev/portal',
    sessionDuration: '4h',
  },
];

describe('Cloudflare Access drift', () => {
  test('repository policy lists the three scoped apps at 4h', async () => {
    const apps = readScopedAccessApps(await Bun.file(configPath).text());
    expect(apps).toEqual(policyApps);
  });

  test('ignores unlisted live apps when scoped apps match', () => {
    const report = diffScopedAccessApps(policyApps, [
      ...policyApps.map(app => ({ ...app, id: 'live' })),
      {
        name: 'Registry',
        domain: 'registry.factory-wager.com',
        sessionDuration: '24h',
      },
    ]);
    expect(report.ok).toBe(true);
    expect(report.scopedCount).toBe(3);
    expect(report.drifts).toEqual([]);
  });

  test('reports the live session lengths that exceed the 4h contract', () => {
    const report = diffScopedAccessApps(policyApps, [
      { ...policyApps[0]!, sessionDuration: '24h' },
      { ...policyApps[1]!, sessionDuration: '8h' },
      { ...policyApps[2]!, sessionDuration: '8h' },
    ]);
    expect(report.ok).toBe(false);
    expect(report.drifts).toEqual([
      {
        field: 'session-duration',
        domain: 'ledger.factory-wager.com',
        policy: '4h',
        live: '24h',
      },
      {
        field: 'session-duration',
        domain: 'score.factory-wager.com/portal',
        policy: '4h',
        live: '8h',
      },
      {
        field: 'session-duration',
        domain: 'project-r-score.pages.dev/portal',
        policy: '4h',
        live: '8h',
      },
    ]);
  });

  test('reports a renamed app on the same domain', () => {
    const report = diffScopedAccessApps(policyApps, [
      { ...policyApps[0]!, name: 'ledger-renamed' },
      policyApps[1]!,
      policyApps[2]!,
    ]);
    expect(report.drifts).toEqual([
      {
        field: 'name',
        domain: 'ledger.factory-wager.com',
        policy: 'ledger',
        live: 'ledger-renamed',
      },
    ]);
  });

  test('reports a domain move when the app name still exists', () => {
    const report = diffScopedAccessApps(policyApps, [
      { ...policyApps[0]!, domain: 'ledger.example.com' },
      policyApps[1]!,
      policyApps[2]!,
    ]);
    expect(report.drifts).toEqual([
      {
        field: 'domain',
        domain: 'ledger.factory-wager.com',
        policy: 'ledger.factory-wager.com',
        live: 'ledger.example.com',
      },
    ]);
  });

  test('reports a scoped app missing from the live list', () => {
    const report = diffScopedAccessApps(policyApps, [policyApps[1]!, policyApps[2]!]);
    expect(report.drifts).toEqual([
      {
        field: 'presence',
        domain: 'ledger.factory-wager.com',
        policy: 'ledger',
        live: 'absent',
      },
    ]);
  });
});
