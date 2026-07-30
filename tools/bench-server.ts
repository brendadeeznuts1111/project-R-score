#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/http/server#reference — Server
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * bench-server.ts — Benchmark registry server throughput against Bun baseline.
 *
 * Bun docs: ~160,000 req/s (hello world, Linux)
 * Our server: real routes with JSON, file I/O, SQLite
 *
 * Usage:
 *   bun tools/bench-server.ts              # 5000 req/target, 6 endpoints
 *   bun tools/bench-server.ts --quick      # 1000 req/target
 *   bun tools/bench-server.ts --all        # all routes + warmup
 */
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
import { inspect } from 'bun';

async function main(): Promise<void> {
  const BASE = Bun.env.BENCH_URL || 'http://localhost:3000';
  const N = Bun.argv.includes('--quick') ? 1000 : 5000;

  const targets = [
    { name: 'Static /ready', url: '/ready' },
    { name: 'JSON /health', url: '/health' },
    { name: 'Registry index', url: '/api/registry' },
    { name: 'Portal /portal/', url: '/portal/' },
    { name: 'Env /api/env', url: '/api/env' },
    { name: 'Proof /api/proof', url: '/api/proof' },
    { name: 'Catalog /api/catalog', url: '/api/catalog' },
    { name: 'Monitoring /api/monitoring', url: '/api/monitoring' },
  ];

  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log(`║  ⚡ Server Benchmark — ${N} req/target                               ║`);
  console.log(`║  Bun ${Bun.version} — ${BASE.padEnd(49)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  for (const t of targets) await fetch(BASE + t.url);

  const results: { name: string; rps: number; ok: number; err: number; totalMs: string }[] = [];
  for (const t of targets) {
    const t0 = Bun.nanoseconds();
    let ok = 0;
    let err = 0;
    for (let i = 0; i < N; i++) {
      try {
        const res = await fetch(BASE + t.url);
        if (res.ok) ok++;
        else err++;
        await res.arrayBuffer();
      } catch {
        err++;
      }
    }
    const totalMs = (Bun.nanoseconds() - t0) / 1e6;
    const rps = Math.round((N / totalMs) * 1000);
    results.push({ name: t.name, rps, ok, err, totalMs: totalMs.toFixed(0) });
  }

  console.log(
    inspect(
      results.map(r => [
        r.name,
        r.rps.toLocaleString() + ' req/s',
        r.ok + '/' + (r.ok + r.err) + ' ok',
        r.totalMs + 'ms',
      ]),
      { colors: true, table: true }
    )
  );
  const avg = Math.round(results.reduce((s, r) => s + r.rps, 0) / results.length);
  console.log(`\n  📊 Average: ${avg.toLocaleString()} req/s (${targets.length} routes, macOS)`);
  console.log('  📋 Bun baseline: ~160,000 req/s (hello world, Linux)');
}

if (import.meta.main) {
  await main();
}
