#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Capture ops loop throughput metrics to reports/ops-loop-*.json
 *
 *   bun tools/ops-loop-report.ts --out reports/ops-loop-baseline.json
 *   bun tools/ops-loop-report.ts --out reports/ops-loop-post.json --fixture
 */
import { openOperationsDb } from '../lib/operations/db.ts';
import {
  loopThroughputLift,
  queryLoopMetricsSlice,
  type OpsLoopReport,
} from '../lib/operations/ops-loop-metrics.ts';
import { runOpsLoopFixture } from '../lib/operations/ops-loop-fixture.ts';

const ROOT = `${import.meta.dir}/..`;

function usage(): never {
  console.log(`Usage: bun tools/ops-loop-report.ts --out <path> [--fixture] [--compare baseline.json]

  --out PATH       Write JSON report (required)
  --fixture        Run in-memory closed-loop demo before capture
  --compare PATH   Print lift vs another report after write
`);
  process.exit(0);
}

const argv = Bun.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) usage();

const outIdx = argv.indexOf('--out');
if (outIdx < 0 || !argv[outIdx + 1]) {
  console.error('--out is required');
  usage();
}
const outPath = argv[outIdx + 1]!;
const useFixture = argv.includes('--fixture');
const compareIdx = argv.indexOf('--compare');
const comparePath = compareIdx >= 0 ? argv[compareIdx + 1] : undefined;

async function loadVelocity() {
  const timingPath = `${ROOT}/reports/harness-gate-timing.json`;
  const file = Bun.file(timingPath);
  if (!(await file.exists())) return undefined;
  const t = (await file.json()) as { totalMs?: number; generatedAt?: string };
  return { harnessGateSumMs: t.totalMs, harnessGeneratedAt: t.generatedAt };
}

async function main(): Promise<void> {
  let source: OpsLoopReport['source'] = 'live';
  let db = openOperationsDb();
  try {
    if (useFixture) {
      db.close();
      db = await runOpsLoopFixture();
      source = 'fixture';
    }

    const report: OpsLoopReport = {
      capturedAt: new Date().toISOString(),
      source,
      metrics: queryLoopMetricsSlice(db),
      velocity: await loadVelocity(),
    };

    await Bun.write(outPath, `${JSON.stringify(report, null, 2)}\n`);

    if (comparePath) {
      const baselineFile = Bun.file(comparePath);
      if (await baselineFile.exists()) {
        const baseline = (await baselineFile.json()) as OpsLoopReport;
        const lift = loopThroughputLift(baseline.metrics, report.metrics);
        console.log(
          JSON.stringify(
            {
              baselineRate: baseline.metrics.loopCompletionRate,
              postRate: report.metrics.loopCompletionRate,
              throughputLift: lift,
              manualStepsDelta:
                baseline.metrics.manualStepsPerCycle - report.metrics.manualStepsPerCycle,
            },
            null,
            2
          )
        );
      }
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  await main();
}
