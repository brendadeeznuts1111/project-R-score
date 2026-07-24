#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * verify-registry-client.ts — Live probes for RegistryClient resolve/download/publish.
 *
 * @see docs/registry-client.md
 * @see packages/registry-client/README.md
 *
 *   bun tools/verify-registry-client.ts
 *   bun tools/verify-registry-client.ts --save
 *   bun tools/verify-registry-client.ts --json
 */
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
import { CryptoHasher, revision, version } from 'bun';
import { logTable } from '../lib/console-depth.ts';
import {
  ensureVerificationResultsHaveCanonical,
  reportCanonicalCoverageGaps,
} from '../lib/verification/canonical-coverage.ts';
import { REGISTRY_CLIENT_CANONICAL_KEYS, validateCanonicalKeys } from './canonical-helpers.ts';
import {
  REGISTRY_CLIENT_PROOF_REPORT_PATH,
  REGISTRY_CLIENT_SDK_VERSION,
  runRegistryClientVerification,
} from '../lib/verification/registry-client-probes.ts';

export const SAVE_PATH = 'public/registry/registry-client-proof.json';

validateCanonicalKeys(REGISTRY_CLIENT_CANONICAL_KEYS);

const asJson = Bun.argv.includes('--json');
const shouldSave = Bun.argv.includes('--save');

const report = await runRegistryClientVerification();
const canonicalCoverage = ensureVerificationResultsHaveCanonical(report.results);
const canonicalOk = reportCanonicalCoverageGaps(canonicalCoverage, 'verify-registry-client');

const hasher = new CryptoHasher('sha256');
for (const r of report.results) hasher.update(r.name + r.passed + (r.canonical ?? ''));
const proofHash = hasher.digest('hex');

const proof = {
  type: 'RegistryClientVerificationReport' as const,
  version: '1.0.0' as const,
  sdkVersion: REGISTRY_CLIENT_SDK_VERSION,
  timestamp: new Date().toISOString(),
  bunVersion: version,
  bunRevision: (revision || '').slice(0, 12) || 'unknown',
  reportPath: REGISTRY_CLIENT_PROOF_REPORT_PATH,
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
  console.log('║  📦 Registry client SDK verification (resolve · download · publish)  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  logTable(
    report.results.map(r => ({
      probe: r.probe,
      expected: r.expected.slice(0, 52),
      actual: r.actual.slice(0, 52),
      lane: r.lane ?? '—',
      docs: r.canonicalKey,
      status: r.passed ? '✅' : '❌',
    })),
    ['probe', 'expected', 'actual', 'lane', 'docs', 'status']
  );
  console.log(`\n  SDK @factorywager/registry-client v${REGISTRY_CLIENT_SDK_VERSION}`);
  console.log(
    `  ${report.ok && canonicalOk ? '✅' : '❌'} ${proof.summary.passed}/${proof.summary.total} passed`
  );
  console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);
  for (const r of report.results) {
    console.log(`  📖 ${r.probe}: ${r.canonical}`);
  }
}

if (shouldSave) {
  await Bun.write(SAVE_PATH, JSON.stringify(proof, null, 2));
  if (!asJson) console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
}

process.exit(report.ok && canonicalOk ? 0 : 1);
