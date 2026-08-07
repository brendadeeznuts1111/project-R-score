#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Public-plane discovery CLI — portal chrome, registry refs, static anti-patterns.
 *
 *   bun tools/public-discovery.ts
 *   bun tools/public-discovery.ts --check
 *   bun tools/public-discovery.ts --json
 *
 * Agent skill: .agents/skills/public-discovery/SKILL.md
 * @see docs/harness/tenants/public-plane.md
 */
import {
  parsePublicSeverity,
  publicReportPasses,
  runPublicDiscovery,
} from '../lib/public-discovery.ts';
import { cliOut } from '../lib/console/index.ts';
import {
  applyUnknownLongOptionGuardFor,
  PUBLIC_DISCOVERY_ALLOWED_LONG,
} from '../lib/docs/ref-id-tool-flags.ts';

export { PUBLIC_DISCOVERY_ALLOWED_LONG };

const args = import.meta.main
  ? applyUnknownLongOptionGuardFor('public:discovery', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const asJson = args.includes('--json');
const check = args.includes('--check');
const minSeverity = parsePublicSeverity(
  args.find((a, i) => args[i - 1] === '--min-severity') ?? 'error'
);

const report = await runPublicDiscovery();

if (asJson) {
  cliOut(report, { json: true });
} else {
  console.log(`public-discovery · ${report.summary.total} findings`);
  console.log(`  errors=${report.summary.errors} warnings=${report.summary.warnings}`);
  for (const f of report.findings.slice(0, 40)) {
    const tag = f.severity.toUpperCase().padEnd(5);
    console.log(`  [${tag}] ${f.kind} · ${f.title}`);
    if (f.repair) console.log(`         repair: ${f.repair}`);
    const sample = f.samples?.[0];
    if (sample) console.log(`         @ ${sample.file}${sample.line ? `:${sample.line}` : ''}`);
  }
  if (report.findings.length > 40) {
    console.log(`  … ${report.findings.length - 40} more (--json for full report)`);
  }
}

if (check && !publicReportPasses(report, minSeverity)) {
  console.error(`public-discovery: FAIL (min-severity=${minSeverity})`);
  process.exit(1);
}
