import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function setupAndRun(input: {
  latestId: string;
  indexId: string;
  createdAt: string;
}) {
  const dir = await mkdtemp(join(tmpdir(), 'search-loop-status-'));
  const benchDir = join(dir, 'reports', 'search-benchmark');
  await mkdir(benchDir, { recursive: true });
  await writeFile(
    join(benchDir, 'latest.json'),
    JSON.stringify(
      {
        id: input.latestId,
        createdAt: input.createdAt,
        queryPack: 'core_delivery_wide',
        warnings: [],
        deltaBasis: 'same-pack',
        baselineSnapshotId: 'baseline-1',
        rankedProfiles: [{ profile: 'strict', qualityScore: 88.72, avgSignalPct: 100, avgUniqueFamilyPct: 67.76 }],
      },
      null,
      2
    )
  );
  await writeFile(
    join(benchDir, 'index.json'),
    JSON.stringify({ updatedAt: new Date().toISOString(), snapshots: [{ id: input.indexId }] }, null, 2)
  );
  await writeFile(
    join(dir, 'reports', 'search-coverage-loc-latest.json'),
    JSON.stringify(
      {
        roots: ['./lib', './packages/docs-tools/src'],
        overlap: 'remove',
        totals: { files: 1, lines: 10, uniqueFiles: 1, uniqueLines: 10 },
      },
      null,
      2
    )
  );

  const scriptPath = join(process.cwd(), 'scripts', 'search-loop-status.ts');
  const proc = Bun.spawnSync(['bun', scriptPath], {
    cwd: dir,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(proc.exitCode).toBe(0);

  const out = JSON.parse(await readFile(join(dir, 'reports', 'search-loop-status-latest.json'), 'utf8')) as any;
  return out;
}

describe('search loop status freshness', () => {
  test('marks freshness pass when aligned and fresh', async () => {
    const out = await setupAndRun({
      latestId: 'snap-A',
      indexId: 'snap-A',
      createdAt: new Date().toISOString(),
    });
    const freshnessStage = out.stages.find((s: any) => s.id === 'status_freshness');
    expect(out.freshness.isAligned).toBe(true);
    expect(freshnessStage?.status).toBe('pass');
  });

  test('keeps freshness pass when aligned even if snapshot is older', async () => {
    const old = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const out = await setupAndRun({
      latestId: 'snap-B',
      indexId: 'snap-B',
      createdAt: old,
    });
    const freshnessStage = out.stages.find((s: any) => s.id === 'status_freshness');
    expect(out.freshness.isAligned).toBe(true);
    expect(freshnessStage?.status).toBe('pass');
    expect(out.loopClosed).toBe(true);
  });

  test('marks freshness fail when latest/id index are misaligned', async () => {
    const out = await setupAndRun({
      latestId: 'snap-C',
      indexId: 'snap-D',
      createdAt: new Date().toISOString(),
    });
    const freshnessStage = out.stages.find((s: any) => s.id === 'status_freshness');
    expect(out.freshness.isAligned).toBe(false);
    expect(freshnessStage?.status).toBe('fail');
    expect(out.loopClosed).toBe(false);
  });
});
