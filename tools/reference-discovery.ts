#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
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
import { jsonOut } from '../lib/console-depth.ts';
import {
  publicReportPasses,
  runPublicDiscovery,
  type PublicDiscoveryReport,
} from '../lib/public-discovery.ts';

const args = import.meta.main
  ? applyUnknownLongOptionGuardFor('reference:discover', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const wantJson = args.includes('--json');
const check = args.includes('--check');
const skipUnused = args.includes('--skip-unused');
const publicOnly = args.includes('--public');
const allPlanes = args.includes('--all');
const minSeverity = (args.find((a, i) => args[i - 1] === '--min-severity') ??
  'warn') as ReferenceSeverity;

let report: ReferenceDiscoveryReport | PublicDiscoveryReport;
if (publicOnly) {
  report = await runPublicDiscovery();
} else {
  report = await runReferenceDiscovery({ skipUnused });
}

if (wantJson) {
  jsonOut(report);
} else if (publicOnly) {
  const pub = report as PublicDiscoveryReport;
  console.log(`public-discovery · ${pub.summary.total} findings`);
  console.log(`  errors=${pub.summary.errors} warnings=${pub.summary.warnings}`);
  for (const f of pub.findings.slice(0, 40)) {
    const tag = f.severity.toUpperCase().padEnd(5);
    console.log(`  [${tag}] ${f.kind} · ${f.title}`);
    if (f.repair) console.log(`         repair: ${f.repair}`);
    const sample = f.samples?.[0];
    if (sample) console.log(`         @ ${sample.file}${sample.line ? `:${sample.line}` : ''}`);
  }
  if (pub.findings.length > 40) {
    console.log(`  … ${pub.findings.length - 40} more (--json for full report)`);
  }
} else {
  const harness = report as ReferenceDiscoveryReport;
  console.log(`reference-discovery · ${harness.summary.total} findings`);
  console.log(`  errors=${harness.summary.errors} warnings=${harness.summary.warnings}`);
  for (const f of harness.findings.slice(0, 40)) {
    const tag = f.severity.toUpperCase().padEnd(5);
    console.log(`  [${tag}] ${f.kind} · ${f.title}`);
    if (f.canonical) console.log(`         canonical: ${f.canonical}`);
    if (f.repair) console.log(`         repair: ${f.repair}`);
    const sample = f.samples?.[0];
    if (sample) console.log(`         @ ${sample.file}${sample.line ? `:${sample.line}` : ''}`);
  }
  if (harness.findings.length > 40) {
    console.log(`  … ${harness.findings.length - 40} more (--json for full report)`);
  }
}

if (check) {
  const ok = publicOnly
    ? publicReportPasses(report as PublicDiscoveryReport, minSeverity as 'error' | 'warn' | 'info')
    : reportPasses(report as ReferenceDiscoveryReport, minSeverity);
  if (!ok) {
    console.error(
      `${publicOnly ? 'public-discovery' : 'reference-discovery'}: FAIL (min-severity=${minSeverity})`
    );
    process.exit(1);
  }
}

if (allPlanes && check) {
  const pub = await runPublicDiscovery();
  if (!publicReportPasses(pub, 'error')) {
    console.error('public-discovery: FAIL (composed with --all --check)');
    process.exit(1);
  }
}
