#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Monorepo-health continuous gate — unit tests + score ratchet + schema.
 *
 *   bun run check:monorepo-health              # tests + collect + ratchet (ci:core)
 *   bun scripts/check-monorepo-health.ts --tests-only   # pre-commit when health files staged
 *   bun scripts/check-monorepo-health.ts --write-baseline
 *   bun scripts/check-monorepo-health.ts --no-write        # CI ratchet without artifact mutation
 *   bun scripts/check-monorepo-health.ts --json
 *
 * Does **not** fail solely on grade=critical (repo score is currently mid-30s);
 * fails when metrics regress past scripts/monorepo-health-baseline.json floors.
 *
 * Shares collect SSOT with tools/monorepo-health.ts; import-graph pre-commit
 * already enforces cycle/deep-relative via monorepo-health.scanSourceImports.
 */
import {
  collectMonorepoHealth,
  writeMonorepoHealthArtifacts,
} from '../lib/harness/monorepo-health.ts';
import { appendHealthHistory } from '../lib/harness/monorepo-health-history.ts';
import { parseHealthReportSchemaIssues } from '../lib/harness/monorepo-health-ui.ts';
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut, logDepth } from '../lib/console-depth.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('check:monorepo-health', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = process.cwd();
const BASELINE_PATH = joinPath(ROOT, 'scripts/monorepo-health-baseline.json');
const WRITE_BASELINE = argv.includes('--write-baseline');
const TESTS_ONLY = argv.includes('--tests-only');
const JSON_OUT = argv.includes('--json');
const NO_HISTORY = argv.includes('--no-history') || Bun.env.CI === 'true';
const NO_WRITE = argv.includes('--no-write');

export type MonorepoHealthBaseline = {
  formulaVersion: number;
  /** Absolute goal, reported separately from the no-regression verdict. */
  targetScore: number;
  minScore: number;
  maxDeadCodePercent: number;
  /** Absolute count avoids treating source deletion as a percentage regression. */
  maxLargeFileCount: number;
  maxCyclicDependencyCount: number;
  maxDuplicateDepCount: number;
};

export async function loadBaseline(path = BASELINE_PATH): Promise<MonorepoHealthBaseline> {
  const raw = (await Bun.file(path).json()) as MonorepoHealthBaseline;
  return raw;
}

export function ratchetViolations(
  report: {
    score: number;
    formulaVersion: number;
    largeFileCount: number;
    metrics: {
      deadCodePercent: number;
      largeFilePercent: number;
      cyclicDependencyCount: number;
      duplicateDepCount: number;
    };
  },
  baseline: MonorepoHealthBaseline
): string[] {
  const v: string[] = [];
  if (report.formulaVersion !== baseline.formulaVersion) {
    v.push(
      `formulaVersion ${report.formulaVersion} ≠ baseline ${baseline.formulaVersion} (re-pin baseline when formula changes)`
    );
  }
  if (report.score < baseline.minScore) {
    v.push(`score ${report.score} < minScore ${baseline.minScore}`);
  }
  if (report.metrics.deadCodePercent > baseline.maxDeadCodePercent) {
    v.push(
      `deadCodePercent ${report.metrics.deadCodePercent.toFixed(2)} > max ${baseline.maxDeadCodePercent}`
    );
  }
  if (report.largeFileCount > baseline.maxLargeFileCount) {
    v.push(`largeFileCount ${report.largeFileCount} > max ${baseline.maxLargeFileCount}`);
  }
  if (report.metrics.cyclicDependencyCount > baseline.maxCyclicDependencyCount) {
    v.push(
      `cyclicDependencyCount ${report.metrics.cyclicDependencyCount} > max ${baseline.maxCyclicDependencyCount}`
    );
  }
  if (report.metrics.duplicateDepCount > baseline.maxDuplicateDepCount) {
    v.push(
      `duplicateDepCount ${report.metrics.duplicateDepCount} > max ${baseline.maxDuplicateDepCount}`
    );
  }
  return v;
}

export function baselineFromReport(report: {
  score: number;
  formulaVersion: number;
  largeFileCount: number;
  metrics: {
    deadCodePercent: number;
    largeFilePercent: number;
    cyclicDependencyCount: number;
    duplicateDepCount: number;
  };
}): MonorepoHealthBaseline {
  // Pin the observed state. Percentage ceilings retain only 0.1 point of
  // rounding tolerance; absolute counts receive no free headroom.
  return {
    formulaVersion: report.formulaVersion,
    targetScore: 90,
    minScore: Math.floor(report.score * 10) / 10,
    maxDeadCodePercent: Math.ceil(report.metrics.deadCodePercent * 10) / 10,
    maxLargeFileCount: report.largeFileCount,
    maxCyclicDependencyCount: report.metrics.cyclicDependencyCount,
    maxDuplicateDepCount: report.metrics.duplicateDepCount,
  };
}

async function runUnitTests(): Promise<number> {
  const proc = Bun.spawn(
    [
      'bun',
      'test',
      'tests/monorepo-health.test.ts',
      'tests/monorepo-health-ui.test.ts',
      'tests/file-removal-candidates.test.ts',
      '--timeout=60000',
    ],
    { cwd: ROOT, stdout: 'inherit', stderr: 'inherit' }
  );
  return (await proc.exited) ?? 1;
}

async function main(): Promise<void> {
  const testCode = await runUnitTests();
  if (testCode !== 0) {
    console.error('❌ monorepo-health unit tests failed');
    process.exit(testCode);
  }

  if (TESTS_ONLY) {
    console.info('✅ monorepo-health tests-only OK');
    process.exit(0);
  }

  const report = await collectMonorepoHealth({
    withBuild: true,
    withTests: false,
    withCoverage: false,
  });
  const schemaErrs = parseHealthReportSchemaIssues(report);
  if (schemaErrs.length) {
    console.error('❌ monorepo-health report schema:');
    for (const e of schemaErrs) console.error(`  · ${e}`);
    process.exit(1);
  }

  if (!NO_WRITE) {
    await writeMonorepoHealthArtifacts(report, { archive: false });
    // Pages-facing registry bake (ops-summary + TOC + /api/health consume this).
    try {
      const { reportToRegistryBake, MONOREPO_HEALTH_REGISTRY_REL } =
        await import('../lib/monitoring/monorepo-health-slice.ts');
      const bake = reportToRegistryBake(report);
      await Bun.write(
        joinPath(ROOT, MONOREPO_HEALTH_REGISTRY_REL),
        JSON.stringify(bake, null, 2) + '\n'
      );
    } catch {
      /* registry bake optional when public/ not writable */
    }
  }
  if (!NO_HISTORY && !NO_WRITE) {
    try {
      await appendHealthHistory(report);
    } catch {
      /* history optional in CI if reports unwritable — still wrote latest via artifacts */
    }
  }

  if (WRITE_BASELINE) {
    const next = baselineFromReport(report);
    await Bun.write(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
    console.info(`✅ wrote ${BASELINE_PATH}`);
    logDepth(next);
    process.exit(0);
  }

  const baseline = await loadBaseline();
  const violations = ratchetViolations(report, baseline);
  const meetsTarget = report.score >= baseline.targetScore;

  if (JSON_OUT) {
    jsonOut({
      ok: violations.length === 0,
      score: report.score,
      grade: report.grade,
      meetsTarget,
      violations,
      baseline,
      metrics: report.metrics,
    });
  } else {
    console.info(
      `monorepo-health gate: score ${report.score}/100 (${report.grade}) · formula v${report.formulaVersion}`
    );
    console.info(
      `  dead ${report.metrics.deadCodePercent.toFixed(1)}% · large ${report.largeFileCount} files (${report.metrics.largeFilePercent.toFixed(1)}%) · cycles ${report.metrics.cyclicDependencyCount} · dupDeps ${report.metrics.duplicateDepCount}`
    );
    console.info(
      `  ratchet minScore≥${baseline.minScore} · maxDead≤${baseline.maxDeadCodePercent} · maxLargeFiles≤${baseline.maxLargeFileCount} · maxCycles≤${baseline.maxCyclicDependencyCount}`
    );
    console.info(
      `  target score≥${baseline.targetScore}: ${meetsTarget ? 'met' : `gap ${(baseline.targetScore - report.score).toFixed(1)}`}`
    );
    if (violations.length) {
      console.error('❌ monorepo-health ratchet regressions:');
      for (const v of violations) console.error(`  · ${v}`);
      console.error(
        '   repair: fix metrics, or owners re-pin: bun scripts/check-monorepo-health.ts --write-baseline'
      );
      process.exit(1);
    }
    console.info('✅ monorepo-health gate OK (tests + schema + ratchet)');
  }

  process.exit(violations.length ? 1 : 0);
}

if (import.meta.main) {
  await main();
}
