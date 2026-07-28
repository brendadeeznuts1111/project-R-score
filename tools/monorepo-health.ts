#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Monorepo health score CLI (0–100).
 *
 *   bun tools/monorepo-health.ts
 *   bun tools/monorepo-health.ts --json
 *   bun tools/monorepo-health.ts --no-build
 *   bun tools/monorepo-health.ts --with-tests
 *   bun tools/monorepo-health.ts --archive
 *   bun run monorepo:health
 *
 * Formula + collect: lib/harness/monorepo-health.ts
 */
import {
  collectMonorepoHealth,
  writeMonorepoHealthArtifacts,
  type MonorepoHealthReport,
} from '../lib/harness/monorepo-health.ts';
import { getConsoleDepth, logTable } from '../lib/console-depth.ts';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const noBuild = argv.includes('--no-build');
const withTests = argv.includes('--with-tests');
const archive = argv.includes('--archive');
const help = argv.includes('--help') || argv.includes('-h');

if (help) {
  console.log(`Usage: bun tools/monorepo-health.ts [options]

  --json         print report JSON only
  --no-build     skip Bun.build metafile (dead code / cycles)
  --with-tests   run focused bun test sample for failure rate
  --archive      also write a tar of the report via Bun.Archive when available
  --help         this message

Health = 100 − 2·dupDeps − 0.5·dead% − 1·large% − 5·testFail% − 1.5·cycles + 0.2·coverage%
Target ≥ 90 (healthy).
`);
  process.exit(0);
}

const report = await collectMonorepoHealth({
  withBuild: !noBuild,
  withTests,
});

const { jsonPath, archivePath } = await writeMonorepoHealthArtifacts(report, {
  archive,
});

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printHuman(report, jsonPath, archivePath);
}

// CI-friendly exit: critical → 1
if (report.grade === 'critical') process.exitCode = 1;

function printHuman(r: MonorepoHealthReport, jsonPath: string, archivePath?: string): void {
  console.log(`\n🧭 Monorepo health · Bun ${r.bunVersion} · depth=${getConsoleDepth()}`);
  console.log(`   score ${r.score}/100 · ${r.grade} · formula v${r.formulaVersion}`);
  console.log(
    `   files ${r.fileCount} · workspaces ${r.workspacePackageCount} · large ${r.largeFileCount}`
  );
  if (r.entrypointsUsed.length) {
    console.log(
      `   entrypoints ${r.entrypointsUsed.map(e => e.replace(r.root + '/', '')).join(', ')}`
    );
  }

  logTable(
    [
      {
        Metric: 'duplicateDepCount',
        Value: r.metrics.duplicateDepCount,
        Penalty: -r.breakdown.duplicateDepPenalty,
      },
      {
        Metric: 'deadCodePercent',
        Value: Number(r.metrics.deadCodePercent.toFixed(2)),
        Penalty: -Number(r.breakdown.deadCodePenalty.toFixed(2)),
      },
      {
        Metric: 'largeFilePercent',
        Value: Number(r.metrics.largeFilePercent.toFixed(2)),
        Penalty: -Number(r.breakdown.largeFilePenalty.toFixed(2)),
      },
      {
        Metric: 'testFailureRate',
        Value: Number(r.metrics.testFailureRate.toFixed(2)),
        Penalty: -Number(r.breakdown.testFailurePenalty.toFixed(2)),
      },
      {
        Metric: 'cyclicDependencyCount',
        Value: r.metrics.cyclicDependencyCount,
        Penalty: -Number(r.breakdown.cyclePenalty.toFixed(2)),
      },
      {
        Metric: 'testCoveragePercent',
        Value: Number(r.metrics.testCoveragePercent.toFixed(2)),
        Penalty: `+${r.breakdown.coverageBonus.toFixed(2)}`,
      },
    ],
    ['Metric', 'Value', 'Penalty']
  );

  if (r.notes.length) {
    console.log('\nnotes:');
    for (const n of r.notes) console.log(`  · ${n}`);
  }
  console.log(`\n→ ${jsonPath}`);
  if (archivePath) console.log(`→ ${archivePath}`);
  console.log('');
}
