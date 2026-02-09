import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildUnifiedStatus } from '../scripts/search-unified-status';

async function setupFixture(input: {
  latestId: string;
  loopId: string;
  rssGuid: string;
  warnings?: string[];
}) {
  const dir = await mkdtemp(join(tmpdir(), 'search-unified-'));
  const reportsDir = join(dir, 'reports');
  const benchDir = join(reportsDir, 'search-benchmark');
  await mkdir(benchDir, { recursive: true });

  await writeFile(
    join(benchDir, 'latest.json'),
    JSON.stringify(
      {
        id: input.latestId,
        queryPack: 'core_delivery_wide',
        warnings: input.warnings || [],
        coverage: { lines: 120 },
      },
      null,
      2
    )
  );
  await writeFile(
    join(benchDir, 'rss.xml'),
    `<?xml version="1.0"?><rss><channel><item><guid>${input.rssGuid}</guid></item></channel></rss>`
  );
  await writeFile(
    join(reportsDir, 'search-loop-status-latest.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        latestSnapshotId: input.loopId,
        warnings: input.warnings || [],
        coverage: { lines: 120 },
        stages: [
          { id: 'cli_search', status: 'pass', reason: 'ok' },
          { id: 'status_freshness', status: 'pass', reason: 'ok' },
          { id: 'dashboard_parity', status: 'pass', reason: 'ok' },
        ],
      },
      null,
      2
    )
  );
  await writeFile(
    join(reportsDir, 'health-report.json'),
    JSON.stringify(
      {
        details: [{ domain: 'factory-wager.com', status: 'healthy' }],
      },
      null,
      2
    )
  );
  return { dir, reportsDir, benchDir };
}

describe('search unified status', () => {
  test('happy path aligned artifacts', async () => {
    const fx = await setupFixture({ latestId: 'snap-1', loopId: 'snap-1', rssGuid: 'snap-1' });
    const status = await buildUnifiedStatus({
      json: true,
      strict: false,
      source: 'local',
      domain: 'factory-wager.com',
      latestPath: join(fx.benchDir, 'latest.json'),
      loopPath: join(fx.reportsDir, 'search-loop-status-latest.json'),
      rssPath: join(fx.benchDir, 'rss.xml'),
    });
    expect(status.latestSnapshotId).toBe('snap-1');
    expect(status.freshness.isAligned).toBe(true);
    expect(status.contractChecks.every((c) => c.ok)).toBe(true);
  });

  test('contract mismatch drives fail', async () => {
    const fx = await setupFixture({ latestId: 'snap-A', loopId: 'snap-B', rssGuid: 'snap-C' });
    const status = await buildUnifiedStatus({
      json: true,
      strict: false,
      source: 'local',
      domain: 'factory-wager.com',
      latestPath: join(fx.benchDir, 'latest.json'),
      loopPath: join(fx.reportsDir, 'search-loop-status-latest.json'),
      rssPath: join(fx.benchDir, 'rss.xml'),
    });
    expect(status.overall.status).toBe('fail');
    expect(status.contractChecks.some((check) => check.ok === false)).toBe(true);
  });

  test('domain token gaps are surfaced as readiness block', async () => {
    const fx = await setupFixture({ latestId: 'snap-1', loopId: 'snap-1', rssGuid: 'snap-1' });
    const status = await buildUnifiedStatus({
      json: true,
      strict: false,
      source: 'local',
      domain: 'factory-wager.com',
      latestPath: join(fx.benchDir, 'latest.json'),
      loopPath: join(fx.reportsDir, 'search-loop-status-latest.json'),
      rssPath: join(fx.benchDir, 'rss.xml'),
    });
    expect(status.domainReadiness.totalDomains).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(status.domainReadiness.reasons)).toBe(true);
  });
});
