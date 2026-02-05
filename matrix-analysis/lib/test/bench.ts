#!/usr/bin/env bun
// lib/test/bench.ts - Comprehensive benchmark suite for all lib modules
// =============================================================================
// Run: bun run lib/test/bench.ts
// =============================================================================

import { bench as runBench, benchSync } from "../perf.ts";

const RUNS = 100;
const results: { module: string; fn: string; avgMs: number; opsPerSec: string }[] = [];

const add = (module: string, fn: string, avgMs: number) => {
  const ops = avgMs > 0 ? Math.round(1000 / avgMs) : Infinity;
  results.push({
    module,
    fn,
    avgMs: Math.round(avgMs * 1000) / 1000,
    opsPerSec: ops === Infinity ? "Inf" : ops.toLocaleString(),
  });
};

// ─── str.ts ──────────────────────────────────────────────────────────
{
  const { strip, width, wrap, truncate, padEnd, escapeHtml, indexOfLine } = await import("../str.ts");
  const ansiStr = "\x1b[31mhello world\x1b[0m";

  let r = benchSync("b", () => strip(ansiStr), RUNS);
  add("str", "strip(ansi)", r.avgMs);

  r = benchSync("b", () => width("hello world 🦊"), RUNS);
  add("str", "width(emoji)", r.avgMs);

  r = benchSync("b", () => wrap("x".repeat(500), 89), RUNS);
  add("str", "wrap(500ch)", r.avgMs);

  r = benchSync("b", () => truncate("a".repeat(200), 40), RUNS);
  add("str", "truncate(200→40)", r.avgMs);

  r = benchSync("b", () => padEnd("hi", 80), RUNS);
  add("str", "padEnd(80)", r.avgMs);

  r = benchSync("b", () => escapeHtml("<script>alert('xss')</script>"), RUNS);
  add("str", "escapeHtml", r.avgMs);

  const buf = new TextEncoder().encode("abc\ndef\nghi\njkl\n".repeat(100));
  r = benchSync("b", () => indexOfLine(buf, 50), RUNS);
  add("str", "indexOfLine(SIMD)", r.avgMs);
}

// ─── hash.ts ─────────────────────────────────────────────────────────
{
  const { crc32, wyhash, adler32, cityHash32, murmur32v3 } = await import("../hash.ts");
  const data = "benchmark test data ".repeat(50);

  let r = benchSync("b", () => crc32(data), RUNS);
  add("hash", "crc32(1KB)", r.avgMs);

  r = benchSync("b", () => wyhash(data), RUNS);
  add("hash", "wyhash(1KB)", r.avgMs);

  r = benchSync("b", () => adler32(data), RUNS);
  add("hash", "adler32(1KB)", r.avgMs);

  r = benchSync("b", () => cityHash32(data), RUNS);
  add("hash", "cityHash32(1KB)", r.avgMs);

  r = benchSync("b", () => murmur32v3(data), RUNS);
  add("hash", "murmur32v3(1KB)", r.avgMs);
}

// ─── crypto.ts ───────────────────────────────────────────────────────
{
  const { digest, deepEquals, deepMatch, uuidv7 } = await import("../crypto.ts");

  let r = benchSync("b", () => digest("hello world", "sha256"), RUNS);
  add("crypto", "sha256", r.avgMs);

  r = benchSync("b", () => digest("hello world", "md5"), RUNS);
  add("crypto", "md5", r.avgMs);

  r = benchSync("b", () => uuidv7(), RUNS);
  add("crypto", "uuidv7()", r.avgMs);

  const a = { x: 1, y: { z: [1, 2, 3] } };
  const b = { x: 1, y: { z: [1, 2, 3] } };
  r = benchSync("b", () => deepEquals(a, b, true), RUNS);
  add("crypto", "deepEquals", r.avgMs);

  r = benchSync("b", () => deepMatch(a, { x: 1 }), RUNS);
  add("crypto", "deepMatch", r.avgMs);
}

// ─── parse.ts ────────────────────────────────────────────────────────
{
  const { json, json5, toml, yaml, jsonc, jsonl } = await import("../parse.ts");
  const jsonStr = JSON.stringify({ a: 1, b: [1, 2, 3], c: { d: "test" } });

  let r = benchSync("b", () => json(jsonStr), RUNS);
  add("parse", "json", r.avgMs);

  r = benchSync("b", () => json5('{ a: 1, /* comment */ b: 2, }'), RUNS);
  add("parse", "json5", r.avgMs);

  r = benchSync("b", () => toml('[section]\nkey = "value"\nnum = 42'), RUNS);
  add("parse", "toml", r.avgMs);

  r = benchSync("b", () => yaml("name: test\nport: 3000"), RUNS);
  add("parse", "yaml", r.avgMs);

  r = benchSync("b", () => jsonc('{ "a": 1 /* comment */ }'), RUNS);
  add("parse", "jsonc", r.avgMs);

  const jsonlStr = '{"a":1}\n{"a":2}\n{"a":3}\n';
  r = benchSync("b", () => jsonl(jsonlStr), RUNS);
  add("parse", "jsonl(3 lines)", r.avgMs);
}

// ─── stream.ts ───────────────────────────────────────────────────────
{
  const { gzip, gunzip, deflate, inflate, zstdCompressSync, zstdDecompressSync, concatBuffers } = await import("../stream.ts");
  const data = "compress me ".repeat(100);

  let r = benchSync("b", () => gzip(data), RUNS);
  add("stream", "gzip(1.2KB)", r.avgMs);

  const gzipped = gzip(data)!;
  r = benchSync("b", () => gunzip(gzipped), RUNS);
  add("stream", "gunzip(1.2KB)", r.avgMs);

  r = benchSync("b", () => deflate(data), RUNS);
  add("stream", "deflate(1.2KB)", r.avgMs);

  const deflated = deflate(data)!;
  r = benchSync("b", () => inflate(deflated), RUNS);
  add("stream", "inflate(1.2KB)", r.avgMs);

  r = benchSync("b", () => zstdCompressSync(data), RUNS);
  add("stream", "zstd(1.2KB)", r.avgMs);

  const zstd = zstdCompressSync(data)!;
  r = benchSync("b", () => zstdDecompressSync(zstd), RUNS);
  add("stream", "zstd-decomp(1.2KB)", r.avgMs);

  const bufs = [new Uint8Array(100), new Uint8Array(200), new Uint8Array(300)];
  r = benchSync("b", () => concatBuffers(bufs), RUNS);
  add("stream", "concatBufs(600B)", r.avgMs);
}

// ─── semver.ts ───────────────────────────────────────────────────────
{
  const { satisfies, order } = await import("../semver.ts");

  let r = benchSync("b", () => satisfies("1.3.8", ">=1.3.0"), RUNS);
  add("semver", "satisfies", r.avgMs);

  r = benchSync("b", () => order("2.0.0", "1.0.0"), RUNS);
  add("semver", "order", r.avgMs);
}

// ─── glob.ts ─────────────────────────────────────────────────────────
{
  const { match, filter } = await import("../glob.ts");
  const files = Array.from({ length: 100 }, (_, i) => `file${i}.${i % 2 === 0 ? "ts" : "js"}`);

  let r = benchSync("b", () => match("*.ts", "app.ts"), RUNS);
  add("glob", "match(simple)", r.avgMs);

  r = benchSync("b", () => filter("*.ts", files), RUNS);
  add("glob", "filter(100 files)", r.avgMs);
}

// ─── sink.ts ─────────────────────────────────────────────────────────
{
  const { buildBuffer, buildString } = await import("../sink.ts");
  const chunks = Array.from({ length: 100 }, (_, i) => `chunk-${i} `);

  let r = benchSync("b", () => buildString(chunks), RUNS);
  add("sink", "buildString(100)", r.avgMs);

  r = benchSync("b", () => buildBuffer(chunks), RUNS);
  add("sink", "buildBuffer(100)", r.avgMs);
}

// ─── markdown.ts ─────────────────────────────────────────────────────
{
  const { html } = await import("../markdown.ts");
  const md = "# Hello\n\n**Bold** and *italic*\n\n- item 1\n- item 2\n\n```\ncode\n```\n";

  let r = benchSync("b", () => html(md), RUNS);
  add("markdown", "html(small)", r.avgMs);
}

// ─── inspect.ts ──────────────────────────────────────────────────────
{
  const { inspect, safeInspect, table } = await import("../inspect.ts");
  const obj = { a: 1, b: { c: [1, 2, 3] }, d: "hello" };

  let r = benchSync("b", () => inspect(obj), RUNS);
  add("inspect", "inspect(obj)", r.avgMs);

  r = benchSync("b", () => safeInspect(obj), RUNS);
  add("inspect", "safeInspect(obj)", r.avgMs);

  const data = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `item-${i}` }));
  r = benchSync("b", () => table(data), RUNS);
  add("inspect", "table(10 rows)", r.avgMs);
}

// ─── transpiler.ts ───────────────────────────────────────────────────
{
  const { transpile } = await import("../transpiler.ts");
  const code = 'const x: number = 1;\nconst y: string = "hello";\nexport { x, y };';

  let r = benchSync("b", () => transpile(code, "ts"), RUNS);
  add("transpiler", "transpile(3 lines)", r.avgMs);
}

// ─── Print Results ───────────────────────────────────────────────────
console.log("\n=== Bun-Native Lib Benchmark Suite ===\n");
console.log(Bun.inspect.table(
  results.map((r) => ({
    Module: r.module,
    Function: r.fn,
    "Avg (ms)": r.avgMs,
    "Ops/sec": r.opsPerSec,
  })),
  { colors: true } as any
));

const totalBenched = results.length;
const subMicro = results.filter((r) => r.avgMs < 0.001).length;
console.log(`\n${totalBenched} benchmarks | ${subMicro} sub-microsecond`);
console.log(`Bun ${Bun.version} (${Bun.revision.slice(0, 8)})`);
