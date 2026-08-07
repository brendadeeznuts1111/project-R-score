#!/usr/bin/env bun
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
  minScore: number;
  maxDeadCodePercent: number;
  maxLargeFilePercent: number;
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
  if (report.metrics.largeFilePercent > baseline.maxLargeFilePercent) {
    v.push(
      `largeFilePercent ${report.metrics.largeFilePercent.toFixed(2)} > max ${baseline.maxLargeFilePercent}`
    );
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
  metrics: {
    deadCodePercent: number;
    largeFilePercent: number;
    cyclicDependencyCount: number;
    duplicateDepCount: number;
  };
}): MonorepoHealthBaseline {
  // Round up penalty caps slightly so noise does not flaky-fail; floor score down.
  return {
    formulaVersion: report.formulaVersion,
    minScore: Math.floor(report.score),
    maxDeadCodePercent: Math.ceil(report.metrics.deadCodePercent * 10) / 10 + 1,
    maxLargeFilePercent: Math.ceil(report.metrics.largeFilePercent * 10) / 10 + 1,
    maxCyclicDependencyCount: report.metrics.cyclicDependencyCount + 2,
    maxDuplicateDepCount: report.metrics.duplicateDepCount + 2,
  };
}

async function runUnitTests(): Promise<number> {
  const proc = Bun.spawn(
    [
      'bun',
      'test',
      'tests/monorepo-health.test.ts',
      'tests/monorepo-health-ui.test.ts',
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

  if (JSON_OUT) {
    jsonOut({
      ok: violations.length === 0,
      score: report.score,
      grade: report.grade,
      violations,
      baseline,
      metrics: report.metrics,
    });
  } else {
    console.info(
      `monorepo-health gate: score ${report.score}/100 (${report.grade}) · formula v${report.formulaVersion}`
    );
    console.info(
      `  dead ${report.metrics.deadCodePercent.toFixed(1)}% · large ${report.metrics.largeFilePercent.toFixed(1)}% · cycles ${report.metrics.cyclicDependencyCount} · dupDeps ${report.metrics.duplicateDepCount}`
    );
    console.info(
      `  baseline minScore≥${baseline.minScore} · maxDead≤${baseline.maxDeadCodePercent} · maxLarge≤${baseline.maxLargeFilePercent} · maxCycles≤${baseline.maxCyclicDependencyCount}`
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
