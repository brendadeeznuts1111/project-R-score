#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/bundler/fullstack#production-mode — --production
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/guides — official guides index
// @see https://bun.com/docs/runtime/networking/fetch#fetching-a-url-with-a-timeout — AbortSignal.timeout
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * verify-guides.ts — accessibility + command verification for official Bun
 * onboarding resources (guides index, npm→bun install guide, /get).
 *
 *   bun tools/verify-guides.ts [--save]
 *
 * Proof: public/registry/guides-proof.json
 */

import { bunSpawnArgs } from '../lib/bun-executable.ts';
import { logTable } from '../lib/console-depth.ts';
import { CANONICAL_GUIDES_TOKENS } from './bun-doc-refs.ts';

export type GuideCheck = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  canonical: string;
};
const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('verify:guides', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const TIMEOUT_MS = 10_000;

async function head(url: string): Promise<{ status: number; finalUrl: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  // Drain a small part of the body so the connection completes cleanly
  await res.text().catch(() => '');
  return { status: res.status, finalUrl: res.url };
}

export async function runGuideChecks(): Promise<GuideCheck[]> {
  const results: GuideCheck[] = [];

  for (const [name, meta] of Object.entries(CANONICAL_GUIDES_TOKENS)) {
    try {
      const { status, finalUrl } = await head(meta.url);
      results.push({
        name,
        expected: '200 OK',
        actual: `${status}${finalUrl !== meta.url ? ` → ${finalUrl}` : ''}`,
        passed: status === 200,
        canonical: meta.url,
      });
    } catch (err) {
      results.push({
        name,
        expected: '200 OK',
        actual: `error: ${err instanceof Error ? err.message : String(err)}`,
        passed: false,
        canonical: meta.url,
      });
    }
  }

  // Install guide command validation: bun install is a drop-in for npm install
  const dry = Bun.spawnSync(bunSpawnArgs(['install', '--dry-run']), {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  results.push({
    name: 'install guide: bun install --dry-run works',
    expected: 'exit 0',
    actual: `exit ${dry.exitCode}`,
    passed: dry.exitCode === 0,
    canonical: CANONICAL_GUIDES_TOKENS['Bun Install Guide']!.url,
  });

  const prod = Bun.spawnSync(bunSpawnArgs(['install', '--production', '--dry-run']), {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  results.push({
    name: 'install guide: bun install --production --dry-run works',
    expected: 'exit 0',
    actual: `exit ${prod.exitCode}`,
    passed: prod.exitCode === 0,
    canonical: CANONICAL_GUIDES_TOKENS['Bun Install Guide']!.url,
  });

  return results;
}

export type GuidesProof = {
  timestamp: string;
  bunVersion: string;
  results: GuideCheck[];
  summary: { passed: number; total: number; status: 'pass' | 'fail' };
  proofHash: string;
};

export async function buildGuidesProof(): Promise<GuidesProof> {
  const results = await runGuideChecks();
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
  const proof = await buildGuidesProof();
  logTable(
    proof.results.map(r => ({
      Resource: r.name,
      Expected: r.expected,
      Actual: r.actual,
      Pass: r.passed ? '✅' : '❌',
    }))
  );
  console.log(`\n${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`Proof hash: ${proof.proofHash}`);
  if (argv.includes('--save')) {
    await Bun.write('public/registry/guides-proof.json', JSON.stringify(proof, null, 2));
    console.log('💾 Saved to public/registry/guides-proof.json');
  }
  if (proof.summary.status !== 'pass') process.exit(1);
}
