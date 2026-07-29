#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Combined harness + public-plane discovery CLI.
 *
 *   bun tools/discovery-compose.ts --json
 *   bun tools/discovery-compose.ts --check
 *
 * Agent skills: reference-discovery · public-discovery · audit-gap-close · public-audit-gap-close
 * @see docs/harness/tenants/public-plane.md
 */
import {
  combinedReportPasses,
  runCombinedDiscovery,
  type CombinedDiscoveryReport,
} from '../lib/discovery-compose.ts';
import type { ReferenceSeverity } from '../lib/reference-discovery.ts';
import { jsonOut } from '../lib/console-depth.ts';

const args = Bun.argv.slice(2);
const asJson = args.includes('--json');
const check = args.includes('--check');
const skipUnused = args.includes('--skip-unused');
const minSeverity = (args.find((a, i) => args[i - 1] === '--min-severity') ??
  'error') as ReferenceSeverity;

const report: CombinedDiscoveryReport = await runCombinedDiscovery({ skipUnused });

if (asJson) {
  jsonOut(report);
} else {
  console.log(`discovery-compose · ${report.summary.totalFindings} findings`);
  console.log(
    `  harness errors=${report.summary.harnessErrors} warnings=${report.summary.harnessWarnings}`
  );
  console.log(
    `  public  errors=${report.summary.publicErrors} warnings=${report.summary.publicWarnings}`
  );
  for (const plane of [
    { label: 'harness', findings: report.harness.findings },
    { label: 'public', findings: report.publicPlane.findings },
  ]) {
    for (const f of plane.findings.filter(x => x.severity === 'error').slice(0, 8)) {
      console.log(`  [ERROR/${plane.label}] ${f.kind ?? 'finding'} · ${f.title}`);
    }
  }
}

if (check && !combinedReportPasses(report, { skipUnused, harnessMinSeverity: minSeverity })) {
  console.error(`discovery-compose: FAIL (min-severity=${minSeverity})`);
  process.exit(1);
}
