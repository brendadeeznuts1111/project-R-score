import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDomainRegistryStatus } from '../scripts/domain-registry-status';

describe('domain-registry-status', () => {
  test('reports domain mapping and search project counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'domain-registry-status-'));
    const reportsDir = join(dir, 'reports');
    const benchDir = join(reportsDir, 'search-benchmark');
    await mkdir(benchDir, { recursive: true });

    const registryPath = join(dir, 'domain-registry.json');
    await writeFile(
      registryPath,
      JSON.stringify(
        {
          version: '2026.02.08.1',
          domains: [
            {
              domain: 'factory-wager.com',
              bucket: 'bench-bucket',
              prefix: 'domains/factory-wager/cloudflare',
              requiredHeader: 'x-factory-domain-token',
              tokenEnvVar: 'FACTORY_WAGER_DOMAIN_TOKEN',
            },
          ],
        },
        null,
        2
      )
    );

    await writeFile(
      join(benchDir, 'latest.json'),
      JSON.stringify(
        {
          id: 'snap-1',
          queryPack: 'core_delivery',
          path: './lib,./packages/docs-tools/src',
          warnings: [],
        },
        null,
        2
      )
    );

    await writeFile(
      join(reportsDir, 'health-report.json'),
      JSON.stringify(
        {
          details: [
            { domain: 'api.factory-wager.com', status: 'healthy' },
            { domain: 'docs.factory-wager.com', status: 'degraded' },
          ],
        },
        null,
        2
      )
    );

    const payload = await buildDomainRegistryStatus({
      registryPath,
      latestPath: join(benchDir, 'latest.json'),
      healthReportPath: join(reportsDir, 'health-report.json'),
      json: true,
    });

    expect(payload.registry.totalDomains).toBe(1);
    expect(payload.registry.bucketMapped).toBe(1);
    expect(payload.search.projectCount).toBe(2);
    expect(payload.domainHealth.checkedRows).toBe(2);
  });
});
