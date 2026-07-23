#!/usr/bin/env bun
/**
 * verify-bun-release.ts — Verify Bun release features (TLS, perf, runtime, release notes).
 *
 * Release-note probes: lib/docs/bun-release-tracker.ts
 *
 * Usage:
 *   bun tools/verify-bun-release.ts
 *   bun tools/verify-bun-release.ts --save
 */
// @see https://bun.com/reference/node/tls/getCACertificates — tls.getCACertificates('system')
// @see https://bun.com/docs/runtime/gc — Bun.gc
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @see https://bun.com/blog/bun-v1.3.14#event-loop-refactor — event loop probes
import { CryptoHasher, inspect, version, revision, spawn, $ } from 'bun';
import { writeFileSync, readFileSync } from 'fs';
import {
  BUN_RELEASE_NOTE_ROWS,
  probeTlsSystemCaCertificates,
  probeProcessExitWithPendingTimer,
  probeTimerRefAfterFire,
  smokeBuiltinObjectsGc,
} from '../lib/docs/bun-release-tracker.ts';

const SAVE_PATH = 'public/registry/release-features.json';
const SHOULD_SAVE = process.argv.includes('--save');

/** Read bunfig.toml once at module init. */
const bunfigText = readFileSync(new URL('../bunfig.toml', import.meta.url), 'utf-8');

type TestResult = { name: string; expected: string; actual: string; passed: boolean };

async function run(): Promise<{ timestamp: string; bunVersion: string; bunRevision: string; results: TestResult[]; summary: { passed: number; total: number; status: string }; proofHash: string }> {
  const results: TestResult[] = [];

  // 1. tls.getCACertificates('system') — Node parity without --use-system-ca (#24339 / #29526)
  const tlsProbe = probeTlsSystemCaCertificates();
  results.push({
    name: "tls.getCACertificates('system')",
    expected: 'non-empty on linux/win32; array on macOS (no --use-system-ca)',
    actual: `${tlsProbe.count} certs · ${tlsProbe.platform} · ${tlsProbe.note}`,
    passed: tlsProbe.nodeParity,
  });

  // 1b. Incremental GC built-in smoke (Request/Response allocation)
  const gcSmoke = smokeBuiltinObjectsGc();
  results.push({
    name: 'Built-in objects GC smoke (Request/Response)',
    expected: '2000 allocs + optional Bun.gc without crash',
    actual: gcSmoke.ok ? `ok (${gcSmoke.count} allocs)` : 'failed',
    passed: gcSmoke.ok,
  });

  // 2. Bun.escapeHTML performance
  const sample = "<div>Hello & 'world'</div>";
  const iterations = 10000;
  const t0 = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) Bun.escapeHTML(sample);
  const avgNs = ((Bun.nanoseconds() - t0) / iterations);
  results.push({ name: 'Bun.escapeHTML performance', expected: '< 500 ns per call', actual: `${avgNs.toFixed(1)} ns`, passed: avgNs < 500 });

  // 3. ESM module load
  const esmT0 = Bun.nanoseconds();
  await import('node:fs');
  results.push({ name: 'ESM module load (node:fs)', expected: 'loads successfully', actual: `${((Bun.nanoseconds() - esmT0) / 1e6).toFixed(2)}ms`, passed: true });

  // 4. Event loop refactor — unref pending timer + ref on fired timer
  const pendingTimer = await probeProcessExitWithPendingTimer();
  results.push({
    name: 'Process exit with pending timer',
    expected: 'exits before unref timer fires',
    actual: pendingTimer.note,
    passed: pendingTimer.ok,
  });

  const refAfterFire = await probeTimerRefAfterFire();
  results.push({
    name: 'timer.ref() after fired setTimeout',
    expected: 'process exits (ref does not keep loop alive)',
    actual: refAfterFire.note,
    passed: refAfterFire.ok,
  });

  // 5. WebSocket cleanup
  try {
    const ws = new WebSocket('ws://localhost:9999');
    await Bun.sleep(100);
    ws.close();
    results.push({ name: 'WebSocket cleanup on close', expected: 'no crash or leak', actual: 'ok', passed: true });
  } catch (e: any) {
    results.push({ name: 'WebSocket cleanup on close', expected: 'no crash or leak', actual: `error: ${e.message}`, passed: false });
  }

  // 6. Child process stdin pipe cleanup
  try {
    const proc = spawn(['echo', 'hello'], { stdin: 'pipe' });
    await proc.exited;
    results.push({ name: 'Child process stdin pipe cleanup', expected: 'exits without hanging', actual: 'exited', passed: proc.exitCode === 0 });
  } catch (e: any) {
    results.push({ name: 'Child process stdin pipe cleanup', expected: 'exits without hanging', actual: `error: ${e.message}`, passed: false });
  }

  // 7. Bun Shell basics
  try {
    const result = await $`echo -n "hello"`.text();
    results.push({ name: 'Bun Shell basics', expected: 'echo works', actual: `"${result}"`, passed: result === 'hello' });
  } catch (e: any) {
    results.push({ name: 'Bun Shell basics', expected: 'echo works', actual: `error: ${e.message}`, passed: false });
  }

  // 8. structuredClone Blob
  try {
    const blob = new Blob(['hello']);
    const cloned = structuredClone(blob);
    const text = await cloned.text();
    results.push({ name: 'structuredClone Blob', expected: 'clone works', actual: text === 'hello' ? 'ok' : 'mismatch', passed: text === 'hello' });
  } catch (e: any) {
    results.push({ name: 'structuredClone Blob', expected: 'clone works', actual: `error: ${e.message}`, passed: false });
  }

  // 9. Bun.password.hash
  try {
    const hash = await Bun.password.hash('test');
    results.push({ name: 'Bun.password.hash', expected: 'returns a string', actual: typeof hash, passed: typeof hash === 'string' });
  } catch (e: any) {
    results.push({ name: 'Bun.password.hash', expected: 'returns a string', actual: `error: ${e.message}`, passed: false });
  }

  // 10. Bun.inspect depth (unlimited in canary)
  results.push({
    name: 'Bun.inspect depth', expected: 'unlimited in canary',
    actual: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes('d: 1') ? 'unlimited' : 'depth=2',
    passed: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes('d: 1'),
  });

  // 11. Bun.hash returns bigint
  results.push({ name: 'Bun.hash returns bigint', expected: 'bigint', actual: typeof Bun.hash('hello'), passed: typeof Bun.hash('hello') === 'bigint' });

  // 12. Bun.version / Bun.revision
  results.push({ name: 'Bun.version / Bun.revision', expected: 'both available', actual: `${version} (${(revision || '').slice(0, 8)})`, passed: !!version && !!revision });

  // 13. using / await using (TC39 Explicit Resource Management)
  try {
    class R { val = 42; [Symbol.dispose]() {} }
    { using r = new R(); if (r.val !== 42) throw new Error('using failed'); }
    class AR { val = 84; [Symbol.asyncDispose]() { return Promise.resolve(); } }
    await using ar = new AR();
    results.push({ name: 'using / await using (Explicit Resource Mgmt)', expected: 'works without lowering', actual: `using=${new R().val}, await using=${ar.val}`, passed: true });
  } catch (e: any) {
    results.push({ name: 'using / await using (Explicit Resource Mgmt)', expected: 'works without lowering', actual: `error: ${e.message}`, passed: false });
  }

  // 14. Built-in objects
  try {
    new Request('https://example.com');
    new Response();
    results.push({ name: 'Built-in objects (Request, Response)', expected: 'created without crash', actual: 'ok', passed: true });
  } catch (e: any) {
    results.push({ name: 'Built-in objects (Request, Response)', expected: 'created without crash', actual: `error: ${e.message}`, passed: false });
  }

  // 15. no-orphans (--no-orphans / BUN_FEATURE_FLAG_NO_ORPHANS)
  results.push({
    name: '--no-orphans support', expected: 'configured in bunfig + env',
    actual: `bunfig=${bunfigText.includes('noOrphans')}, env=${!!process.env.BUN_FEATURE_FLAG_NO_ORPHANS}`,
    passed: process.env.BUN_FEATURE_FLAG_NO_ORPHANS === '1',
  });

  // 16. Bun.Image — native image processing (v1.3.14)
  try {
    const PNG_1x1_RED = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const bytes = Buffer.from(PNG_1x1_RED, 'base64');
    const img = new Bun.Image(bytes);
    const meta = await img.metadata();
    const resized = img.resize(2, 2);
    const resizedMeta = await resized.metadata();
    const webp = await resized.webp({ quality: 80 }).bytes();
    const placeholder = await img.placeholder();
    results.push({
      name: 'Bun.Image (load, metadata, encode, placeholder)',
      expected: 'loads, metadata correct, encodes WebP, generates placeholder',
      actual: `${meta.width}x${meta.height} ${meta.format} encoded=${(webp.length / 1024).toFixed(1)}KB placeholder=${placeholder.length}B`,
      passed: meta.width === 1 && meta.height === 1 && meta.format === 'png' && webp.length > 0 && placeholder.startsWith('data:image/png;base64,'),
    });
  } catch (e: any) {
    results.push({ name: 'Bun.Image (load, metadata, encode, placeholder)', expected: 'loads, metadata correct, encodes WebP, generates placeholder', actual: `error: ${e.message}`, passed: false });
  }

  const passed = results.filter(r => r.passed).length;
  const hasher = new CryptoHasher('sha256');
  for (const r of results) hasher.update(r.name + r.passed);
  const proofHash = hasher.digest('hex');

  const proof = {
    timestamp: new Date().toISOString(),
    bunVersion: version,
    bunRevision: (revision || '').slice(0, 12) || 'unknown',
    releaseNotes: BUN_RELEASE_NOTE_ROWS.map(r => ({
      id: r.id,
      title: r.title,
      verify: r.verify,
      refs: r.refs,
    })),
    results,
    summary: { passed, total: results.length, status: passed === results.length ? 'pass' : 'fail' },
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
