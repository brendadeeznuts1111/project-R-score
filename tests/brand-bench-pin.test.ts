import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('brand bench pin', () => {
  test('requires rationale metadata for baseline pin', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'brand-pin-'));
    await mkdir(dir, { recursive: true });
    const from = join(dir, 'latest.json');
    const out = join(dir, 'pinned-baseline.json');
    await Bun.write(
      from,
      JSON.stringify(
        {
          runId: 'run-1',
          createdAt: new Date().toISOString(),
          bunVersion: Bun.version,
          platform: process.platform,
          arch: process.arch,
          seedSet: [0, 120, 240],
          iterations: 100,
          warmup: 10,
          operations: {},
          domainInstrumentation: {},
          profileFiles: [],
          status: 'ok',
          violations: [],
        },
        null,
        2
      )
    );

    const failRun = Bun.spawnSync(
      ['bun', 'run', 'scripts/brand-bench-pin.ts', `--from=${from}`, `--out=${out}`],
      { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' }
    );
    expect(failRun.exitCode).toBeGreaterThan(0);

    const okRun = Bun.spawnSync(
      ['bun', 'run', 'scripts/brand-bench-pin.ts', `--from=${from}`, `--out=${out}`, '--rationale=test-pin'],
      { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' }
    );
    expect(okRun.exitCode).toBe(0);

    const pinned = JSON.parse(await readFile(out, 'utf8'));
    expect(pinned.previousBaselineRunId).toBe(null);
    expect(pinned.rationale).toBe('test-pin');
  });
});

