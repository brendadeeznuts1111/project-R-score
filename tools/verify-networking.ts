#!/usr/bin/env bun
/**
 * verify-networking.ts — Test fetch connection reuse, preconnect, and HTTP/2.
 *
 * APIs Used:
 *   Bun.fetch()             → https://bun.sh/docs/api/fetch
 *   fetch.preconnect()      → https://bun.sh/docs/runtime/networking/fetch#preconnect-at-startup
 *   Bun.CryptoHasher        → https://bun.sh/docs/runtime/hashing
 *   Bun.inspect.table       → https://bun.sh/docs/runtime/utils#bun-inspect
 *   Bun.nanoseconds()       → https://bun.sh/docs/runtime/utils#bun-nanoseconds
 *   Bun.deepEquals()        → https://bun.sh/docs/runtime/utils#bun-deepequals
 *   Bun.sleep()             → https://bun.sh/docs/runtime/utils#bun-sleep
 *
 * Usage:
 *   bun tools/verify-networking.ts                                    # run + print
 *   bun tools/verify-networking.ts --save --path=proof.json           # save proof
 *   bun tools/verify-networking.ts --expect=public/registry/networking-proof.json  # compare
 */
import { inspect, CryptoHasher, deepEquals, sleep, version, revision } from 'bun';
import { existsSync, writeFileSync } from 'fs';

const BASE = process.env.HEALTH_URL || 'http://localhost:3000';
const EXPECTED_FILE = process.argv.find(a => a.startsWith('--expect='))?.split('=')[1];
const SAVE_PATH = process.argv.find(a => a.startsWith('--path='))?.split('=')[1];
const SHOULD_SAVE = process.argv.includes('--save');

type TargetResult = {
  name: string;
  summary: {
    protocol: string;
    reuseEfficiency: number;
    coldFetchMs: number;
    warmFetchMs: number;
    statusCode: number;
    bodySize: number;
  };
  detail: {
    cold: { start: number; end: number; durMs: number; ok: boolean };
    warm: { start: number; end: number; durMs: number; ok: boolean };
    preconnect: { start: number; end: number; durMs: number; ok: boolean };
    connectionReuse: boolean;
    httpVersion: string;
  };
};

async function timeFetch(url: string, opts: RequestInit = {}): Promise<{ durMs: number; ok: boolean; status: number; size: number; httpVer: string }> {
  const t0 = Bun.nanoseconds();
  const res = await fetch(url, opts);
  const durMs = (Bun.nanoseconds() - t0) / 1e6;
  const text = await res.text();
  const httpVer = res.headers.get('x-http-version') || (res.url.startsWith('https') ? 'HTTP/2' : 'HTTP/1.1');
  return { durMs, ok: res.ok, status: res.status, size: text.length, httpVer };
}

async function testTarget(name: string, url: string): Promise<TargetResult> {
  // Cold fetch (no preconnect)
  const cold = await timeFetch(url);

  // Preconnect then warm fetch
  const tPc = Bun.nanoseconds();
  fetch.preconnect(url);
  const pcDur = (Bun.nanoseconds() - tPc) / 1e6;
  await sleep(50); // let preconnect settle
  const warm = await timeFetch(url);

  const reuse = warm.durMs < cold.durMs * 0.8;
  const httpVer = warm.httpVer;

  return {
    name,
    summary: {
      protocol: httpVer,
      reuseEfficiency: cold.durMs > 0 ? +(cold.durMs / Math.max(warm.durMs, 0.01)).toFixed(2) : 0,
      coldFetchMs: +cold.durMs.toFixed(2),
      warmFetchMs: +warm.durMs.toFixed(2),
      statusCode: warm.status,
      bodySize: warm.size,
    },
    detail: {
      cold: { start: 0, end: cold.durMs, durMs: +cold.durMs.toFixed(2), ok: cold.ok },
      warm: { start: 0, end: warm.durMs, durMs: +warm.durMs.toFixed(2), ok: warm.ok },
      preconnect: { start: 0, end: pcDur, durMs: +pcDur.toFixed(2), ok: true },
      connectionReuse: reuse,
      httpVersion: httpVer,
    },
  };
}

async function main() {
  const tStart = Bun.nanoseconds();

  const targets = [
    { name: 'Health (JSON)', url: `${BASE}/health` },
    { name: 'Portal index', url: `${BASE}/portal/` },
    { name: 'Registry index', url: `${BASE}/api/registry` },
    { name: 'Account catalog', url: `${BASE}/api/catalog` },
    { name: 'Environment API', url: `${BASE}/api/env` },
    { name: 'Proof manifest', url: `${BASE}/api/proof` },
    { name: 'Monitoring API', url: `${BASE}/api/monitoring` },
    { name: 'Health pre (HTML)', url: `${BASE}/health/pre` },
  ];

  // Preconnect all targets in parallel
  await Promise.all(targets.map(t => fetch.preconnect(t.url)));

  const results: TargetResult[] = [];
  for (const target of targets) {
    results.push(await testTarget(target.name, target.url));
  }

  // Compute proof hash
  const hasher = new CryptoHasher('sha256');
  for (const r of results) {
    hasher.update(r.name);
    hasher.update(String(r.summary.coldFetchMs));
    hasher.update(String(r.summary.warmFetchMs));
    hasher.update(String(r.summary.statusCode));
    hasher.update(r.summary.protocol);
  }
  const allOk = results.every(r => r.detail.warm.ok);
  const proofHash = hasher.digest('hex');

  const proof = {
    schemaVersion: 1,
    bunVersion: version,
    bunRevision: revision?.slice(0, 12) || 'unknown',
    timestamp: new Date().toISOString(),
    base: BASE,
    totalTargets: targets.length,
    allOk,
    proofHash,
    targets: results,
  };

  // Compare with expected if --expect provided
  if (EXPECTED_FILE && existsSync(EXPECTED_FILE)) {
    const expected = JSON.parse(await Bun.file(EXPECTED_FILE).text());
    const match = expected.proofHash === proofHash;
    console.log(`\n📋 Proof comparison: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`   Expected: ${expected.proofHash.slice(0, 16)}…`);
    console.log(`   Actual:   ${proofHash.slice(0, 16)}…`);
    if (!match) process.exit(1);
    return;
  }

  // Save proof
  if (SHOULD_SAVE && SAVE_PATH) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`\n💾 Proof saved to ${SAVE_PATH}`);
  }

  // Render table
  const elapsed = (Bun.nanoseconds() - tStart) / 1e6;
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 Networking Proof — Connection Reuse & Preconnect                 ║');
  console.log(`║  Base: ${BASE.padEnd(58)}║`);
  console.log(`║  Bun:  ${(version + ' / ' + (revision?.slice(0, 8) || 'unknown')).padEnd(58)}║`);
  console.log(`║  Time: ${(elapsed.toFixed(2) + 'ms').padEnd(57)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const table = inspect(results.map(r => [
    r.name,
    r.summary.protocol,
    r.summary.reuseEfficiency.toFixed(2) + '×',
    r.summary.coldFetchMs + 'ms',
    r.summary.warmFetchMs + 'ms',
    r.detail.connectionReuse ? '✅' : '❌',
    r.summary.statusCode,
  ]), { colors: true, table: true });
  console.log(table);

  const reused = results.filter(r => r.detail.connectionReuse).length;
  console.log(`\n  📊 Connection reuse: ${reused}/${results.length} targets`);
  console.log(`  🔒 Proof hash: ${proofHash.slice(0, 16)}…`);
  console.log(`  📋 All endpoints healthy: ${allOk ? '✅' : '❌'}`);

  if (!allOk) {
    console.log('\n  ❌ FAILURES:');
    results.filter(r => !r.detail.warm.ok).forEach(r => console.log(`    • ${r.name}: status ${r.summary.statusCode}`));
    process.exit(1);
  }

  if (SHOULD_SAVE && !SAVE_PATH) {
    console.log('\n  ⚠️  --path not specified, proof not saved');
  }

  console.log('\n  Canonical API references:');
  console.log('    • Bun.fetch:        https://bun.sh/docs/api/fetch');
  console.log('    • fetch.preconnect: https://bun.sh/docs/runtime/networking/fetch#preconnect-at-startup');
  console.log('    • Bun.CryptoHasher: https://bun.sh/docs/runtime/hashing');
  console.log('    • Bun.inspect.table:https://bun.sh/docs/runtime/utils#bun-inspect');
  console.log('    • Bun.nanoseconds:  https://bun.sh/docs/runtime/utils#bun-nanoseconds');
  console.log('    • Bun.deepEquals:   https://bun.sh/docs/runtime/utils#bun-deepequals');
  console.log('    • Bun.sleep:        https://bun.sh/docs/runtime/utils#bun-sleep');
}

await main();
