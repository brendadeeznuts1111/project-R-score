import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSearchStatusContract } from '../scripts/search-status-contract-check';

async function buildFixture(options: {
  latestId: string;
  loopId: string;
  rssGuid: string;
  warnings?: string[];
  coverageLines?: number;
}) {
  const dir = await mkdtemp(join(tmpdir(), 'search-contract-'));
  const reports = join(dir, 'reports');
  const bench = join(reports, 'search-benchmark');
  await mkdir(bench, { recursive: true });
  const warnings = options.warnings || [];
  const lines = options.coverageLines ?? 100;
  await writeFile(
    join(bench, 'latest.json'),
    JSON.stringify({ id: options.latestId, warnings, coverage: { lines } }, null, 2)
  );
  await writeFile(
    join(reports, 'search-loop-status-latest.json'),
    JSON.stringify({ latestSnapshotId: options.loopId, warnings, coverage: { lines } }, null, 2)
  );
  await writeFile(
    join(bench, 'rss.xml'),
    `<?xml version="1.0"?><rss><channel><item><guid>${options.rssGuid}</guid></item></channel></rss>`
  );
  return dir;
}

describe('search status contract checker', () => {
  test('passes when latest, loop status, and rss are aligned', async () => {
    const dir = await buildFixture({
      latestId: 'snap-1',
      loopId: 'snap-1',
      rssGuid: 'snap-1',
      warnings: [],
      coverageLines: 200,
    });
    const result = await runSearchStatusContract({
      latestJsonPath: join(dir, 'reports', 'search-benchmark', 'latest.json'),
      loopStatusPath: join(dir, 'reports', 'search-loop-status-latest.json'),
      rssPath: join(dir, 'reports', 'search-benchmark', 'rss.xml'),
    });
    expect(result.ok).toBe(true);
  });

  test('fails when ids drift between artifacts', async () => {
    const dir = await buildFixture({
      latestId: 'snap-1',
      loopId: 'snap-2',
      rssGuid: 'snap-3',
      warnings: ['latency_p95_warn'],
      coverageLines: 200,
    });
    const result = await runSearchStatusContract({
      latestJsonPath: join(dir, 'reports', 'search-benchmark', 'latest.json'),
      loopStatusPath: join(dir, 'reports', 'search-loop-status-latest.json'),
      rssPath: join(dir, 'reports', 'search-benchmark', 'rss.xml'),
    });
    expect(result.ok).toBe(false);
    const idCheck = result.checks.find((c) => c.id === 'latest_loop_id_alignment');
    expect(idCheck?.ok).toBe(false);
  });
});
