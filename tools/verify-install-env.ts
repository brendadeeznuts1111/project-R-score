#!/usr/bin/env bun
/**
 * verify-install-env.ts — Runtime probes for Bun install BUN_CONFIG_* env vars.
 *
 * @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables
 * @see docs/UNIFIED.md — install env policy
 *
 *   bun tools/verify-install-env.ts
 *   bun tools/verify-install-env.ts --save
 *   bun tools/verify-install-env.ts --json
 */
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
import { CryptoHasher, inspect, version, revision } from 'bun';
import { logTable } from '../lib/console-depth.ts';
import {
  ensureVerificationResultsHaveCanonical,
  reportCanonicalCoverageGaps,
} from '../lib/verification/canonical-coverage.ts';
import {
  INSTALL_ENV_PROOF_REPORT_PATH,
  runInstallEnvVerification,
} from '../lib/verification/install-env-probes.ts';

export const SAVE_PATH = 'public/registry/install-env-proof.json';

const asJson = Bun.argv.includes('--json');
const shouldSave = Bun.argv.includes('--save');

const report = await runInstallEnvVerification();
const canonicalCoverage = ensureVerificationResultsHaveCanonical(report.results);
const canonicalOk = reportCanonicalCoverageGaps(canonicalCoverage, 'verify-install-env');

const hasher = new CryptoHasher('sha256');
for (const r of report.results) hasher.update(r.name + r.passed + (r.canonical ?? ''));
const proofHash = hasher.digest('hex');

const proof = {
  type: 'InstallEnvVerificationReport' as const,
  version: '1.0.0' as const,
  timestamp: new Date().toISOString(),
  bunVersion: version,
  bunRevision: (revision || '').slice(0, 12) || 'unknown',
  reportPath: INSTALL_ENV_PROOF_REPORT_PATH,
  results: report.results,
  summary: {
    passed: report.results.filter(r => r.passed).length,
    total: report.results.length,
    status: report.ok && canonicalOk ? ('pass' as const) : ('fail' as const),
  },
  proofHash,
};

if (asJson) {
  console.log(JSON.stringify(proof, null, 2));
} else {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  🔧 Install BUN_CONFIG_* environment verification                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  logTable(
    report.results.map(r => ({
      env: r.envVar,
      expected: r.expected.slice(0, 48),
      actual: r.actual.slice(0, 48),
      docs: r.canonicalKey,
      status: r.passed ? '✅' : '❌',
    })),
    ['env', 'expected', 'actual', 'docs', 'status']
  );
  console.log(`\n  ${report.ok && canonicalOk ? '✅' : '❌'} ${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);
  for (const r of report.results) {
    console.log(`  📖 ${r.envVar}: ${r.canonical}`);
  }
}

if (shouldSave) {
  await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2));
  if (!asJson) console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
}

process.exit(report.ok && canonicalOk ? 0 : 1);
