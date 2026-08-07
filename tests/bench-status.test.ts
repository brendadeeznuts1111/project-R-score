/**
 * Claim bun-bench-profiling — metric catalog shape + package.json script wiring.
 */
import { describe, expect, test } from 'bun:test';
import { BENCH_METRIC_CATALOG } from '../tools/bench-status.ts';
import { CRITICAL_PROOF_PATHS } from '../lib/harness/proof.ts';

const ROOT = import.meta.dir + '/..';

describe('bun-bench-profiling catalog', () => {
  test('catalog has the five harness suites', () => {
    expect(BENCH_METRIC_CATALOG.map((r) => r.suite).sort()).toEqual(
      ['brand', 'console-depth', 'deep-inspect', 'limits-lab', 'search'].sort()
    );
  });

  test('every catalog script exists in package.json', async () => {
    const pkg = (await Bun.file(`${ROOT}/package.json`).json()) as {
      scripts: Record<string, string>;
    };
    for (const row of BENCH_METRIC_CATALOG) {
      for (const script of row.scripts) {
        expect(pkg.scripts[script], `missing script ${script}`).toBeString();
      }
    }
    expect(pkg.scripts['bench:status']).toBeString();
    expect(pkg.scripts['bench:console-depth']).toBeString();
  });

  test('profiles.benchmarks.performance lists live scripts only', async () => {
    const pkg = (await Bun.file(`${ROOT}/package.json`).json()) as {
      scripts: Record<string, string>;
      profiles: {
        benchmarks: { performance: { scripts: string[] } };
      };
    };
    const listed = pkg.profiles.benchmarks.performance.scripts;
    expect(listed).not.toContain('benchmark');
    expect(listed).not.toContain('test:load');
    expect(listed).not.toContain('test:stress');
    for (const name of listed) {
      expect(pkg.scripts[name], `dead profile script ${name}`).toBeString();
    }
  });

  test('CRITICAL_PROOF_PATHS registers bun-bench-profiling', () => {
    const path = CRITICAL_PROOF_PATHS.find((p) => p.id === 'bun-bench-profiling');
    expect(path).toBeDefined();
    expect(path?.freshRerun).toContain('bench-status');
  });

  test('tenant + benchmarks README exist', async () => {
    expect(await Bun.file(`${ROOT}/docs/harness/tenants/bun-bench-profiling.md`).exists()).toBe(
      true
    );
    expect(await Bun.file(`${ROOT}/tools/benchmarks/README.md`).exists()).toBe(true);
    expect(await Bun.file(`${ROOT}/docs/performance/README.md`).exists()).toBe(true);
  });
});
