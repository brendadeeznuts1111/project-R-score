#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see docs/bun-runtime-nits.md — suite spec (Phase 1: 18 probes)
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * verify-bun-runtime-nits.ts — runtime TRUTH probes for easily-misused Bun
 * APIs. Records actual behavior (not Node parity) for inspect options, Web
 * Streams, WHATWG URL, and file I/O, then writes a proof JSON.
 *
 * Probe SSOT: lib/verification/bun-runtime-nits-probes.ts
 *
 *   bun tools/verify-bun-runtime-nits.ts [--save]
 *
 * Proof: public/registry/bun-runtime-nits-proof.json
 */

import { logTable } from '../lib/console-depth.ts';
import { buildSemanticTags } from '../lib/verification/channels.ts';
import {
  BUN_RUNTIME_NITS_PROOF_REPORT_PATH,
  runBunRuntimeNitsVerification,
} from '../lib/verification/bun-runtime-nits-probes.ts';
import { summarizeBySubsystem, subsystemsFromResults } from '../lib/verification/subsystem.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('verify-all', Bun.argv.slice(2))
  : Bun.argv.slice(2);
export type NitProbe = {
  name: string;
  category: 'inspect' | 'streams' | 'url' | 'file-io';
  expected: string; // documented runtime truth (docs/bun-runtime-nits.md)
  actual: string; // measured on this runtime
  passed: boolean;
  canonical: string;
};

export type NitsProof = {
  timestamp: string;
  bunVersion: string;
  results: NitProbe[];
  summary: { passed: number; total: number; status: 'pass' | 'fail' };
  proofHash: string;
};

/** Test/CLI helper — maps lib SSOT rows to the compact NitProbe shape. */
export async function runNitProbes(): Promise<NitProbe[]> {
  const { results } = await runBunRuntimeNitsVerification();
  return results.map(r => ({
    name: r.name,
    category: r.category,
    expected: r.expected,
    actual: r.actual,
    passed: r.passed,
    canonical: r.canonical,
  }));
}

export async function buildNitsProof(): Promise<NitsProof> {
  const results = await runNitProbes();
  const passed = results.filter(r => r.passed).length;
  const body = {
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    results,
    summary: {
      passed,
      total: results.length,
      status: (passed === results.length ? 'pass' : 'fail') as 'pass' | 'fail',
    },
  };
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
  return { ...body, proofHash };
}

if (import.meta.main) {
  const report = await runBunRuntimeNitsVerification();
  const semanticTags = await buildSemanticTags('runtime');
  const passed = report.results.filter(r => r.passed).length;
  const body = {
    type: 'BunRuntimeNitsVerificationReport' as const,
    version: '1.0.0' as const,
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    bunRevision: (Bun.revision || '').slice(0, 12) || 'unknown',
    semanticTags: { ...semanticTags, subsystems: subsystemsFromResults(report.results) },
    reportPath: BUN_RUNTIME_NITS_PROOF_REPORT_PATH,
    results: report.results,
    summary: {
      passed,
      total: report.results.length,
      status: (passed === report.results.length ? 'pass' : 'fail') as 'pass' | 'fail',
      bySubsystem: summarizeBySubsystem(report.results),
    },
  };
  const proofHash = new Bun.CryptoHasher('sha256').update(JSON.stringify(body)).digest('hex');
  const proof = { ...body, proofHash };

  const rows = report.results.map(r => ({
    Test: r.name,
    Expected: r.expected,
    Actual: r.actual,
    Pass: r.passed ? '✅' : '❌',
  }));
  logTable(rows);
  console.log(`\n${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`Proof hash: ${proof.proofHash}`);

  if (argv.includes('--save')) {
    await Bun.write('public/registry/bun-runtime-nits-proof.json', JSON.stringify(proof, null, 2));
    console.log('💾 Saved to public/registry/bun-runtime-nits-proof.json');
  }
  if (proof.summary.status !== 'pass') process.exit(1);
}
