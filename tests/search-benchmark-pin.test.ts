import { describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { assessTrend, compareSnapshotPayload, resolveBaselinePath, thresholds, type Snapshot } from '../scripts/search-benchmark-pin';

describe('search benchmark pin', () => {
  test('resolveBaselinePath prefers pack-specific baseline when present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-bench-pin-path-'));
    const canonical = join(dir, 'search-benchmark-pinned-baseline.json');
    const perPack = join(dir, 'search-benchmark-pinned-baseline.core_delivery_wide.json');

    await mkdir(dir, { recursive: true });
    await writeFile(canonical, '{}\n', 'utf8');
    await writeFile(perPack, '{}\n', 'utf8');

    const resolved = resolveBaselinePath(undefined, canonical, 'core_delivery_wide');
    expect(resolved).toBe(perPack);
  });

  test('compareSnapshotPayload bootstraps missing baseline when enabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-bench-pin-bootstrap-'));
    const outPath = join(dir, 'search-benchmark-pinned-baseline.json');

    const snapshot: Snapshot = {
      id: 'snap-bootstrap-1',
      createdAt: new Date().toISOString(),
      queryPack: 'core_delivery_wide',
      rankedProfiles: [
        {
          profile: 'strict',
          label: 'Strict',
          latencyP95Ms: 312.5,
          peakHeapUsedMB: 25.4,
          peakRssMB: 145.2,
          qualityScore: 91.4,
          avgUniqueFamilyPct: 72.1,
        },
      ],
      coverage: {
        files: 10,
        lines: 200,
        uniqueFiles: 8,
        uniqueLines: 150,
      },
    };

    const payload = await compareSnapshotPayload(
      snapshot,
      undefined,
      outPath,
      true,
      'snapshot:inline',
      true
    );

    expect(payload.ok).toBe(true);
    expect(payload.compatibility.queryPackMatch).toBe(true);
    expect(payload.baseline.snapshot.id).toBe('snap-bootstrap-1');
    expect(payload.current.snapshot.id).toBe('snap-bootstrap-1');

    const expectedPackPath = join(dir, 'search-benchmark-pinned-baseline.core_delivery_wide.json');
    expect(payload.baselinePath).toBe(expectedPackPath);
    expect(existsSync(expectedPackPath)).toBe(true);

    const baselineRaw = await readFile(expectedPackPath, 'utf8');
    const baseline = JSON.parse(baselineRaw) as { snapshot: { queryPack: string } };
    expect(baseline.snapshot.queryPack).toBe('core_delivery_wide');
  });

  test('pin mode requires rationale metadata', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'search-bench-pin-cli-'));
    await mkdir(dir, { recursive: true });
    const from = join(dir, 'latest.json');
    const out = join(dir, 'search-benchmark-pinned-baseline.core_delivery_wide.json');

    await writeFile(
      from,
      JSON.stringify(
        {
          id: 'snap-pin-1',
          createdAt: new Date().toISOString(),
          queryPack: 'core_delivery_wide',
          rankedProfiles: [{ profile: 'strict', latencyP95Ms: 123, qualityScore: 90, avgUniqueFamilyPct: 70 }],
          coverage: { files: 1, lines: 10, uniqueFiles: 1, uniqueLines: 10 },
        },
        null,
        2
      ),
      'utf8'
    );

    const failRun = Bun.spawnSync(
      ['bun', 'run', 'scripts/search-benchmark-pin.ts', 'pin', '--from', from, '--out', out],
      { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' }
    );
    expect(failRun.exitCode).toBeGreaterThan(0);

    const okRun = Bun.spawnSync(
      [
        'bun',
        'run',
        'scripts/search-benchmark-pin.ts',
        'pin',
        '--from',
        from,
        '--out',
        out,
        '--rationale',
        'refresh-baseline-after-threshold-update',
        '--pinned-by',
        'ci-bot',
      ],
      { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' }
    );
    expect(okRun.exitCode).toBe(0);

    const pinned = JSON.parse(await readFile(out, 'utf8')) as {
      rationale: string;
      pinnedBy: string;
      previousSnapshotId: string | null;
    };
    expect(pinned.rationale).toBe('refresh-baseline-after-threshold-update');
    expect(pinned.pinnedBy).toBe('ci-bot');
    expect(pinned.previousSnapshotId).toBe(null);
  });

  test('trend assessment is disabled when insufficient sample window', () => {
    const gate = thresholds();
    const trend = assessTrend(
      {
        latencyP95Ms: 400,
        peakHeapUsedMB: 40,
        peakRssMB: 180,
        qualityScore: 85,
        reliabilityPct: 60,
      },
      [
        {
          latencyP95Ms: 390,
          peakHeapUsedMB: 39,
          peakRssMB: 178,
          qualityScore: 86,
          reliabilityPct: 61,
        },
      ],
      gate,
      { enabled: true, strict: false, window: 5, minSamples: 3 }
    );
    expect(trend.enabled).toBe(true);
    expect(trend.sampleSize).toBe(1);
    expect(trend.delta).toBeNull();
    expect(trend.failures.length).toBe(0);
  });

  test('trend assessment flags quality and reliability regressions', () => {
    const gate = thresholds();
    const trend = assessTrend(
      {
        latencyP95Ms: 420,
        peakHeapUsedMB: 40,
        peakRssMB: 180,
        qualityScore: 80,
        reliabilityPct: 50,
      },
      [
        { latencyP95Ms: 390, peakHeapUsedMB: 39, peakRssMB: 179, qualityScore: 86, reliabilityPct: 58 },
        { latencyP95Ms: 395, peakHeapUsedMB: 39, peakRssMB: 179, qualityScore: 85, reliabilityPct: 57 },
        { latencyP95Ms: 392, peakHeapUsedMB: 39, peakRssMB: 178, qualityScore: 86, reliabilityPct: 58 },
      ],
      gate,
      { enabled: true, strict: true, window: 5, minSamples: 3 }
    );
    expect(trend.delta).not.toBeNull();
    expect(trend.failures).toContain('qualityScore');
    expect(trend.failures).toContain('reliabilityPct');
  });
});
