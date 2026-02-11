import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function runSearch(args: string[], env: Record<string, string>) {
  const proc = Bun.spawnSync(['bun', 'run', 'scripts/search-smart.ts', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: proc.exitCode,
    stdout: new TextDecoder().decode(proc.stdout).trim(),
    stderr: new TextDecoder().decode(proc.stderr).trim(),
  };
}

describe('search-smart fusion cli', () => {
  test('keeps non-fusion json output shape', () => {
    const out = runSearch(['domain', '--json', '--limit', '3', '--path', './scripts/lib'], {});
    expect(out.exitCode).toBe(0);
    const json = JSON.parse(out.stdout);
    expect(json.fusion?.enabled).toBe(false);
    expect(Array.isArray(json.hits)).toBe(true);
  });

  test('supports --explain-policy with additive JSON fields', () => {
    const out = runSearch(['domain', '--json', '--limit', '3', '--path', './scripts/lib', '--explain-policy'], {});
    expect(out.exitCode).toBe(0);
    const json = JSON.parse(out.stdout);
    expect(json.fusion?.enabled).toBe(false);
    expect(Array.isArray(json.hits)).toBe(true);
    if (json.hits.length > 0) {
      expect(Array.isArray(json.hits[0].policyReasons)).toBe(true);
    }
  });

  test('returns fusion metadata and result annotations', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-fusion-cli-'));
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    await writeFile(
      join(reportsDir, 'health-report.json'),
      JSON.stringify(
        {
          timestamp: '2026-02-08T00:00:00.000Z',
          status: { overall: 'healthy' },
          details: [{ domain: 'api.factory-wager.com', status: 'healthy' }],
        },
        null,
        2
      )
    );

    await writeFile(
      join(benchDir, 'latest.json'),
      JSON.stringify({ rankedProfiles: [{ profile: 'strict', latencyP95Ms: 400 }] }, null, 2)
    );

    const out = runSearch(
      [
        'domain',
        '--json',
        '--limit',
        '3',
        '--path',
        './scripts/lib',
        '--fusion-domain',
        'factory-wager.com',
        '--fusion-source',
        'local',
        '--fusion-json',
      ],
      {
        DOMAIN_HEALTH_REPORT_PATH: join(reportsDir, 'health-report.json'),
        DOMAIN_HEALTH_LATEST_SNAPSHOT_PATH: join(benchDir, 'latest.json'),
      }
    );

    expect(out.exitCode).toBe(0);
    const json = JSON.parse(out.stdout);
    expect(json.fusion?.enabled).toBe(true);
    expect(Array.isArray(json.hits)).toBe(true);
    if (json.hits.length > 0) {
      expect(typeof json.hits[0].fusionScore).toBe('number');
      expect(Array.isArray(json.hits[0].fusionReason)).toBe(true);
    }
  });

  test('exits non-zero for critical readiness when requested', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-fusion-critical-'));
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    await writeFile(
      join(reportsDir, 'health-report.json'),
      JSON.stringify(
        {
          timestamp: '2026-02-08T00:00:00.000Z',
          status: { overall: 'unhealthy' },
          details: [{ domain: 'api.factory-wager.com', status: 'unhealthy' }],
        },
        null,
        2
      )
    );

    await writeFile(
      join(benchDir, 'latest.json'),
      JSON.stringify({ rankedProfiles: [{ profile: 'strict', latencyP95Ms: 1400 }] }, null, 2)
    );

    const out = runSearch(
      [
        'domain',
        '--json',
        '--limit',
        '3',
        '--path',
        './scripts/lib',
        '--fusion-domain',
        'factory-wager.com',
        '--fusion-source',
        'local',
        '--fusion-fail-on-critical',
        '--fusion-strict-p95',
        '900',
      ],
      {
        DOMAIN_HEALTH_REPORT_PATH: join(reportsDir, 'health-report.json'),
        DOMAIN_HEALTH_LATEST_SNAPSHOT_PATH: join(benchDir, 'latest.json'),
      }
    );

    expect(out.exitCode).toBe(3);
  });
});
