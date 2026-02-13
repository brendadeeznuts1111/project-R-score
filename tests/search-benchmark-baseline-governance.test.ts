import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('search benchmark baseline governance', () => {
  test('fails when baseline rationale metadata is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-bench-governance-fail-'));
    const searchDir = join(dir, '.search');
    await mkdir(searchDir, { recursive: true });
    await writeFile(
      join(searchDir, 'search-benchmark-pinned-baseline.core_delivery_wide.json'),
      JSON.stringify(
        {
          version: 1,
          pinnedAt: new Date().toISOString(),
          source: 'reports/search-benchmark/latest.json',
          snapshot: { id: 'snap-1', createdAt: new Date().toISOString(), queryPack: 'core_delivery_wide' },
          strict: { latencyP95Ms: 1, peakHeapUsedMB: 1, peakRssMB: 1, qualityScore: 1, reliabilityPct: 1 },
          coverage: { files: 1, lines: 1, uniqueFiles: 1, uniqueLines: 1 },
        },
        null,
        2
      ),
      'utf8'
    );

    const run = Bun.spawnSync(
      ['bun', 'run', join(process.cwd(), 'scripts', 'search-benchmark-baseline-governance.ts'), '--json'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
    );
    expect(run.exitCode).toBeGreaterThan(0);
  });

  test('passes when baseline governance metadata is present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-bench-governance-pass-'));
    const searchDir = join(dir, '.search');
    await mkdir(searchDir, { recursive: true });
    await writeFile(
      join(searchDir, 'search-benchmark-pinned-baseline.core_delivery_wide.json'),
      JSON.stringify(
        {
          version: 1,
          pinnedAt: new Date().toISOString(),
          source: 'reports/search-benchmark/latest.json',
          rationale: 'promote-latest-core-wide-after-quality-review',
          pinnedBy: 'ci-bot',
          previousSnapshotId: null,
          snapshot: { id: 'snap-2', createdAt: new Date().toISOString(), queryPack: 'core_delivery_wide' },
          strict: { latencyP95Ms: 1, peakHeapUsedMB: 1, peakRssMB: 1, qualityScore: 1, reliabilityPct: 1 },
          coverage: { files: 1, lines: 1, uniqueFiles: 1, uniqueLines: 1 },
        },
        null,
        2
      ),
      'utf8'
    );

    const run = Bun.spawnSync(
      ['bun', 'run', join(process.cwd(), 'scripts', 'search-benchmark-baseline-governance.ts'), '--json'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
    );
    expect(run.exitCode).toBe(0);
  });
});
