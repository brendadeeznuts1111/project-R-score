#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Project-scoped bun install platform verification.
 *
 * @see https://bun.com/docs/pm/cli/install#platform-specific-dependencies
 * @see docs/UNIFIED.md
 *
 *   bun tools/verify-install-platform.ts
 *   bun tools/verify-install-platform.ts --dry-run
 *   bun tools/verify-install-platform.ts --json
 *   bun tools/verify-install-platform.ts --save
 */
// @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags
import { version, revision } from 'bun';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import {
  ensureVerificationResultsHaveCanonical,
  INSTALL_PLATFORM_PROOF_REPORT_PATH,
  reportCanonicalCoverageGaps,
} from '../lib/verification/canonical-coverage.ts';
import { runProjectInstallPlatformVerification } from '../lib/verification/install-platform.ts';
import { summarizeBySubsystem, subsystemsFromResults } from '../lib/verification/subsystem.ts';
import type { VerificationResult } from '../lib/verification/types.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('verify-all', Bun.argv.slice(2))
  : Bun.argv.slice(2);
export const SAVE_PATH = 'public/registry/install-platform.json';

const asJson = argv.includes('--json');
const dryRun = argv.includes('--dry-run');
const shouldSave = argv.includes('--save');

const semanticTags = await buildSemanticTags('runtime');
const report = await runProjectInstallPlatformVerification({ dryRun });

const results: VerificationResult[] = report.rows.map(row => ({
  name: row.name,
  expected: `${row.scope}: ${row.aspect}`,
  actual: row.note,
  passed: row.ok,
  canonical: row.canonical,
  canonicalKey: row.canonicalKey,
  canonicalKind: row.canonicalKind,
  canonicalStability: row.canonicalStability,
  subsystem: row.subsystem ?? 'package-manager',
  introducedIn: row.introducedIn,
  _links: row._links,
}));

const canonicalCoverage = ensureVerificationResultsHaveCanonical(results);
const canonicalOk = reportCanonicalCoverageGaps(canonicalCoverage, 'verify-install-platform');

const proof = {
  type: 'InstallPlatformVerificationReport' as const,
  version: '1.0.0' as const,
  timestamp: new Date().toISOString(),
  bunVersion: version,
  bunRevision: (revision || '').slice(0, 12) || 'unknown',
  semanticTags: { ...semanticTags, subsystems: subsystemsFromResults(results) },
  dryRun: report.dryRun,
  reportPath: INSTALL_PLATFORM_PROOF_REPORT_PATH,
  toolchain: {
    path: report.toolchain.path,
    source: report.toolchain.source,
    runtimeVersion: report.toolchain.runtimeVersion,
    spawnedVersion: report.toolchain.spawnedVersion,
    matchesRuntime: report.toolchain.matchesRuntime,
  },
  results,
  summary: {
    passed: results.filter(r => r.passed).length,
    total: results.length,
    skipped: report.rows.filter(r => r.skipped).length,
    status: report.ok && canonicalOk ? ('pass' as const) : ('fail' as const),
    bySubsystem: summarizeBySubsystem(results),
  },
};

if (asJson) {
  jsonOut(proof);
} else {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  📦 Install platform verification (project-scoped aspects)          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  if (dryRun) {
    console.log('  mode: --dry-run (profile SSOT only; install spawns skipped)\n');
  }
  logTable(
    report.rows.map(r => ({
      aspect: r.aspect,
      canonical: r.canonicalKey,
      scope: r.scope,
      note: r.note,
      status: r.skipped ? '⏭️' : r.ok ? '✅' : '❌',
    })),
    ['aspect', 'canonical', 'scope', 'note', 'status']
  );
  const ran = report.rows.filter(r => !r.skipped).length;
  const skipped = report.rows.filter(r => r.skipped).length;
  console.log(
    `\n  ${report.ok && canonicalOk ? '✅' : '❌'} ${report.rows.filter(r => r.ok).length}/${report.rows.length} aspects passed` +
      (skipped > 0 ? ` (${ran} ran, ${skipped} skipped)` : '')
  );
  for (const row of report.rows) {
    console.log(`  📖 ${row.aspect}: ${row.canonical}`);
  }
}

if (shouldSave) {
  await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2));
  if (!asJson) console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
}

process.exit(report.ok && canonicalOk ? 0 : 1);
