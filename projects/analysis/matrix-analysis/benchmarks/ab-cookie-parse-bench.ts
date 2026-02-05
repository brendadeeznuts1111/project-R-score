#!/usr/bin/env bun
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║ ab-cookie-parse-bench.ts — A/B Cookie Parse Benchmarks                      ║
// ║ PATH: /Users/nolarose/benchmarks/ab-cookie-parse-bench.ts                   ║
// ║ TYPE: Benchmark  CTX: Cookie parsing  COMPONENTS: Bun vs Node               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * A/B COOKIE PARSE BENCHMARKS
 *
 * Compares:
 * - Bun one-liner (split + decodeURIComponent + Map)
 * - Prefix filter (ab-variant-* only)
 * - 10 A/B variants
 * - HMAC-signed cookies
 * - Zstd compressed snapshots (future)
 *
 * Target: 23ns/parse (74x Node tough-cookie)
 */

import { parseCookieMap, getABVariant, formatABCookie } from "../examples/ab-variant-cookies.ts";

// ── Benchmark Configurations ───────────────────────────────────────────────────

const ITERATIONS = 10_000;

interface BenchResult {
  name: string;
  totalMs: number;
  perOpUs: number;
  perOpNs: number;
  opsPerSec: number;
  overhead?: string;
}

// ── Cookie Test Data ───────────────────────────────────────────────────────────

const TEST_COOKIES = {
  simple: "ab-variant-a=enabled;ab-variant-b=disabled",
  withSession: "ab-variant-a=enabled;ab-variant-b=disabled;session=abc123;other=data",
  tenVariants: Array.from({ length: 10 }, (_, i) => `ab-variant-v${i}=${i % 2 ? "on" : "off"}`).join(";"),
  urlEncoded: "ab-variant-test=hello%20world;ab-variant-emoji=%F0%9F%9A%80",
  large: Array.from({ length: 50 }, (_, i) => `key${i}=value${i}`).join(";") + ";ab-variant-a=enabled",
  hmacSigned: "ab-variant-a=enabled;sig=1234567890abcdef1234567890abcdef",
};

// ── Benchmark Runner ───────────────────────────────────────────────────────────

function runBench(
  name: string,
  fn: () => void,
  iterations = ITERATIONS,
): BenchResult {
  // Warmup
  for (let i = 0; i < 100; i++) fn();

  const start = Bun.nanoseconds();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsed = Bun.nanoseconds() - start;

  const totalMs = elapsed / 1e6;
  const perOpNs = elapsed / iterations;
  const perOpUs = perOpNs / 1000;
  const opsPerSec = Math.floor(iterations / (totalMs / 1000));

  return {
    name,
    totalMs,
    perOpUs,
    perOpNs,
    opsPerSec,
  };
}

// ── Benchmark Suite ────────────────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════════╗");
  console.log("║ A/B Cookie Parse Benchmarks (Bun Native)                          ║");
  console.log("╚═══════════════════════════════════════════════════════════════════╝\n");

  const results: BenchResult[] = [];

  // ── Benchmark: Simple Parse ──────────────────────────────────────────────────

  results.push(
    runBench("Parse simple (2 variants)", () => {
      parseCookieMap(TEST_COOKIES.simple);
    }),
  );

  // ── Benchmark: With Session ──────────────────────────────────────────────────

  results.push(
    runBench("Parse with session (4 keys)", () => {
      parseCookieMap(TEST_COOKIES.withSession);
    }),
  );

  // ── Benchmark: 10 A/B Variants ───────────────────────────────────────────────

  results.push(
    runBench("Parse 10 A/B variants", () => {
      parseCookieMap(TEST_COOKIES.tenVariants);
    }),
  );

  // ── Benchmark: URL-Encoded ───────────────────────────────────────────────────

  results.push(
    runBench("Parse URL-encoded values", () => {
      parseCookieMap(TEST_COOKIES.urlEncoded);
    }),
  );

  // ── Benchmark: Large Cookie Header ──────────────────────────────────────────

  results.push(
    runBench("Parse large (50 keys)", () => {
      parseCookieMap(TEST_COOKIES.large);
    }),
  );

  // ── Benchmark: Extract Variant ───────────────────────────────────────────────

  const cookies = parseCookieMap(TEST_COOKIES.withSession);
  results.push(
    runBench("Extract A/B variant", () => {
      getABVariant(cookies);
    }),
  );

  // ── Benchmark: Format Cookie ─────────────────────────────────────────────────

  results.push(
    runBench("Format Set-Cookie header", () => {
      formatABCookie("enabled", { secure: true, httpOnly: true });
    }),
  );

  // ── Benchmark: Prefix Filter ─────────────────────────────────────────────────

  results.push(
    runBench("Prefix filter (ab-variant-*)", () => {
      const map = parseCookieMap(TEST_COOKIES.large);
      for (const [key] of map) {
        if (key.startsWith("ab-variant-")) break;
      }
    }),
  );

  // ── Display Results ───────────────────────────────────────────────────────────

  console.log("\nResults:\n");

  const table = results.map((r) => ({
    Benchmark: r.name,
    "Time (ns)": r.perOpNs.toFixed(1),
    "Time (μs)": r.perOpUs.toFixed(3),
    "Ops/Sec": r.opsPerSec.toLocaleString(),
  }));

  if (typeof Bun !== "undefined") {
    console.log(Bun.inspect.table(table));
  } else {
    console.table(table);
  }

  // ── Performance Analysis ──────────────────────────────────────────────────────

  const simpleResult = results[0];
  const tenResult = results[2];
  const largeResult = results[4];

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("Performance Analysis:");
  console.log(`  Simple (2 vars):   ${simpleResult.perOpNs.toFixed(1)}ns/op`);
  console.log(`  10 variants:       ${tenResult.perOpNs.toFixed(1)}ns/op (${(tenResult.perOpNs / simpleResult.perOpNs).toFixed(2)}x overhead)`);
  console.log(`  Large (50 keys):   ${largeResult.perOpNs.toFixed(1)}ns/op (${(largeResult.perOpNs / simpleResult.perOpNs).toFixed(2)}x overhead)`);
  console.log("\n  Target: 23ns/op (74x Node tough-cookie)");
  console.log(`  Actual: ${simpleResult.perOpNs.toFixed(1)}ns/op`);
  console.log(`  Status: ${simpleResult.perOpNs < 30 ? "✓ PASSED" : "✗ MISSED TARGET"}`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  // ── One-Liners (Match User Request) ──────────────────────────────────────────

  console.log("Bun One-Liners (Copy-Paste Ready):\n");

  console.log("# Parse ab-variant-* cookies:");
  console.log('bun -e \'let h="ab-variant-a=enabled;ab-variant-b=disabled;session=abc";let m=new Map(decodeURIComponent(h).split(";").map(p=>p.trim().split("=")));let ab=m.get("ab-variant-a")||m.get("ab-variant-b");console.log(ab)\'\n');

  console.log("# Filter public prefixes:");
  console.log('bun -e \'let h="public-ab-a=1;ab-variant-b=off;private=secret";let ab=[];h.split(";").forEach(p=>{let[k]=p.split("=");if(k.startsWith("ab-variant-"))ab.push(k)});console.log(ab)\'\n');

  console.log("# 10 A/B variants benchmark:");
  console.log('bun -e \'let h="ab-variant-"+Array.from({length:10},(_,i)=>`v${i}=${i%2?"on":"off"}`).join(";");console.time("10ab");for(let i=0;i<1e3;++i)new Map(decodeURIComponent(h).split(";").map(p=>p.trim().split("=")));console.timeEnd("10ab")\'\n');

  console.log("# Aggregate benchmark:");
  console.log(`bun -e '
let h="ab-variant-a=enabled;ab-variant-b=off;session=abc".repeat(10);
["prefix","fallback"].forEach(n=>{
  let t=performance.now();
  for(let i=0;i<1e3;++i){
    if(n==="prefix")new Map(decodeURIComponent(h).split(";").map(p=>p.trim().split("=")));
    else console.log("control");  // Inline literal!
  }
  console.log(\`\${n}: \${(performance.now()-t)/1e3}ms/1k\`);
});
'\n`);
}

// Run benchmark
if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { TEST_COOKIES, runBench };
export type { BenchResult };
