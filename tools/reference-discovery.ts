#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Reference discovery CLI — unused paths, plane mismatches, similar naming clusters.
 *
 *   bun tools/reference-discovery.ts
 *   bun tools/reference-discovery.ts --check
 *   bun tools/reference-discovery.ts --json --skip-unused
 *
 * Agent skill: .agents/skills/reference-discovery/SKILL.md
 * @see docs/harness/tenants/reference-discovery.md
 */
import {
  reportPasses,
  runReferenceDiscovery,
  type ReferenceDiscoveryReport,
  type ReferenceSeverity,
} from '../lib/reference-discovery.ts';

const args = Bun.argv.slice(2);
const jsonOut = args.includes('--json');
const check = args.includes('--check');
const skipUnused = args.includes('--skip-unused');
const minSeverity = (args.find((a, i) => args[i - 1] === '--min-severity') ??
  'warn') as ReferenceSeverity;

const report: ReferenceDiscoveryReport = await runReferenceDiscovery({ skipUnused });

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`reference-discovery · ${report.summary.total} findings`);
  console.log(`  errors=${report.summary.errors} warnings=${report.summary.warnings}`);
  for (const f of report.findings.slice(0, 40)) {
    const tag = f.severity.toUpperCase().padEnd(5);
    console.log(`  [${tag}] ${f.kind} · ${f.title}`);
    if (f.canonical) console.log(`         canonical: ${f.canonical}`);
    if (f.repair) console.log(`         repair: ${f.repair}`);
    const sample = f.samples?.[0];
    if (sample) console.log(`         @ ${sample.file}${sample.line ? `:${sample.line}` : ''}`);
  }
  if (report.findings.length > 40) {
    console.log(`  … ${report.findings.length - 40} more (--json for full report)`);
  }
}

if (check && !reportPasses(report, minSeverity)) {
  console.error(`reference-discovery: FAIL (min-severity=${minSeverity})`);
  process.exit(1);
}
