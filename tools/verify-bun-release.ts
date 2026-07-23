#!/usr/bin/env bun
/**
 * verify-bun-release.ts — Verify Bun v1.3.14+ release features.
 * Covers: tls.getCACertificates, escapeHTML perf, ESM loading, built-in objects.
 *
 * Usage:
 *   bun tools/verify-bun-release.ts
 *   bun tools/verify-bun-release.ts --save
 */
import { CryptoHasher, inspect, version, revision } from 'bun';
import { writeFileSync } from 'fs';
import tls from 'node:tls';

const SAVE_PATH = 'public/registry/release-features.json';
const SHOULD_SAVE = process.argv.includes('--save');

async function run() {
  const results: { name: string; expected: string; actual: string; passed: boolean }[] = [];

  // 1. tls.getCACertificates('system')
  try {
    const systemCerts = tls.getCACertificates('system');
    const certCount = systemCerts?.length || 0;
    results.push({ name: "tls.getCACertificates('system')", expected: 'returns certificate array', actual: `${certCount} certs`, passed: Array.isArray(systemCerts) });
  } catch (e: any) {
    results.push({ name: "tls.getCACertificates('system')", expected: 'returns certificate array', actual: `error: ${e.message}`, passed: false });
  }

  // 2. Bun.escapeHTML performance
  const sample = "<div>Hello & 'world'</div>";
  const iterations = 10000;
  const t0 = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) Bun.escapeHTML(sample);
  const avgNs = ((Bun.nanoseconds() - t0) / 1e6 / iterations) * 1e6;
  results.push({ name: 'Bun.escapeHTML performance', expected: '< 500 ns per call', actual: `${avgNs.toFixed(1)} ns`, passed: avgNs < 500 });

  // 3. ESM module load
  const esmT0 = Bun.nanoseconds();
  await import('node:fs');
  const esmMs = (Bun.nanoseconds() - esmT0) / 1e6;
  results.push({ name: 'ESM module load (node:fs)', expected: 'loads successfully', actual: `${esmMs.toFixed(2)}ms`, passed: true });

  // 4. Built-in objects
  try {
    new Request('https://example.com');
    new Response();
    results.push({ name: 'Built-in objects (Request, Response)', expected: 'created without crash', actual: 'ok', passed: true });
  } catch (e: any) {
    results.push({ name: 'Built-in objects (Request, Response)', expected: 'created without crash', actual: `error: ${e.message}`, passed: false });
  }

  // Compute proof hash
  const hasher = new CryptoHasher('sha256');
  for (const r of results) hasher.update(r.name + r.passed);
  const proofHash = hasher.digest('hex');

  const proof = {
    timestamp: new Date().toISOString(),
    bunVersion: version,
    bunRevision: revision?.slice(0, 12) || 'unknown',
    results,
    summary: { passed: results.filter(r => r.passed).length, total: results.length, status: results.every(r => r.passed) ? 'pass' : 'fail' },
    proofHash,
  };

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Bun Release Features Verification                               ║');
  console.log(`║  ${(version + ' / ' + (revision?.slice(0, 8) || 'unknown')).padEnd(58)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const table = inspect(results.map(r => [r.name, r.expected, r.actual, r.passed ? '✅' : '❌']), { colors: true, table: true });
  console.log(table);
  console.log(`\n  📊 ${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);

  if (SHOULD_SAVE) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
  }

  if (proof.summary.passed < proof.summary.total) process.exit(1);
  return proof;
}

if (import.meta.main) await run();
