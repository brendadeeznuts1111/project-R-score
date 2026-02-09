import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateReadiness, loadDomainHealthSummary } from '../scripts/lib/domain-health-read';

describe('domain-health-read', () => {
  test('loads local summary and evaluates readiness', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'domain-health-read-'));
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    const healthReportPath = join(reportsDir, 'health-report.json');
    const latestPath = join(benchDir, 'latest.json');

    await writeFile(
      healthReportPath,
      JSON.stringify(
        {
          timestamp: '2026-02-08T00:00:00.000Z',
          status: { overall: 'healthy' },
          details: [
            { domain: 'api.factory-wager.com', status: 'healthy' },
            { domain: 'docs.factory-wager.com', status: 'healthy' },
          ],
        },
        null,
        2
      )
    );

    await writeFile(
      latestPath,
      JSON.stringify(
        {
          createdAt: '2026-02-08T00:00:00.000Z',
          rankedProfiles: [{ profile: 'strict', latencyP95Ms: 450 }],
        },
        null,
        2
      )
    );

    const summary = await loadDomainHealthSummary({
      domain: 'factory-wager.com',
      source: 'local',
      strictP95: 900,
      localHealthReportPath: healthReportPath,
      localLatestSnapshotPath: latestPath,
    });

    expect(summary.overall.status).toBe('healthy');
    expect(summary.dns.status).toBe('healthy');

    const readiness = evaluateReadiness(summary, 900);
    expect(readiness.status).toBe('degraded');
    expect(readiness.reasons.join(' ')).toContain('cookie telemetry unavailable');
  });

  test('returns degraded summary when r2 is unavailable', async () => {
    const summary = await loadDomainHealthSummary({ domain: 'factory-wager.com', source: 'r2' });
    expect(summary.source).toBe('r2');
    expect(summary.notes.join(' ')).toContain('r2_');
  });

  test('marks local cookie status as unknown fallback', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'domain-health-cookie-local-'));
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    await writeFile(
      join(reportsDir, 'health-report.json'),
      JSON.stringify({ timestamp: '2026-02-08T00:00:00.000Z', status: { overall: 'healthy' }, details: [] }, null, 2)
    );
    await writeFile(join(benchDir, 'latest.json'), JSON.stringify({ rankedProfiles: [] }, null, 2));

    const summary = await loadDomainHealthSummary({
      source: 'local',
      localHealthReportPath: join(reportsDir, 'health-report.json'),
      localLatestSnapshotPath: join(benchDir, 'latest.json'),
    });
    expect(summary.cookie.status).toBe('unknown');
  });
});
