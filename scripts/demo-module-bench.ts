#!/usr/bin/env bun

import { performance } from "node:perf_hooks";
import { TIER1_SOURCES, buildBaselineForDemo, validateTier1SourcesForDemo } from "./demo-tier1-baselines";

function parseArg(name: string): string {
  const prefix = `--${name}=`;
  const hit = Bun.argv.find((arg) => arg.startsWith(prefix));
  if (hit) return hit.slice(prefix.length).trim();
  const idx = Bun.argv.findIndex((arg) => arg === `--${name}`);
  if (idx >= 0) return String(Bun.argv[idx + 1] || "").trim();
  return "";
}

function hash(input: string): number {
  let x = 2166136261;
  for (let i = 0; i < input.length; i++) {
    x ^= input.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

function runHashBench(id: string, iterations: number): { elapsedMs: number; checksum: number } {
  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) sink ^= hash(`${id}:${i}`);
  return { elapsedMs: Math.max(0.001, performance.now() - t0), checksum: sink >>> 0 };
}

function runStringBench(iterations: number): { elapsedMs: number; checksum: number } {
  const source = "  bun-v1.3.9-string-path  ";
  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    const out = source.trim().replace("string", "bench").startsWith("bun-") ? 1 : 0;
    sink ^= out;
  }
  return { elapsedMs: Math.max(0.001, performance.now() - t0), checksum: sink >>> 0 };
}

function runMapSizeBench(iterations: number): { elapsedMs: number; checksum: number } {
  const map = new Map<string, number>();
  for (let i = 0; i < 1024; i++) map.set(`k${i}`, i);
  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) sink ^= map.size;
  return { elapsedMs: Math.max(0.001, performance.now() - t0), checksum: sink >>> 0 };
}

function main() {
  const id = parseArg("id");
  if (!id) {
    console.error("[demo-bench] missing --id=<demo-id>");
    process.exit(1);
  }

  const validation = validateTier1SourcesForDemo(id);
  if (!validation.ok) {
    for (const err of validation.errors) console.error(`[demo-bench][fail] ${err}`);
    process.exit(1);
  }

  const baseline = buildBaselineForDemo(id);
  const { mode, iterations, minOpsPerSec } = baseline.benchmark;
  const run = mode === "string" ? runStringBench : mode === "map-size" ? runMapSizeBench : (n: number) => runHashBench(id, n);
  const { elapsedMs, checksum } = run(iterations);
  const opsPerSec = Math.round((iterations / elapsedMs) * 1000);
  const status = opsPerSec >= minOpsPerSec ? "pass" : "fail";

  console.log(
    JSON.stringify(
      {
        id,
        mode,
        iterations,
        elapsedMs: Number(elapsedMs.toFixed(3)),
        opsPerSec,
        baselineMinOpsPerSec: minOpsPerSec,
        status,
        checksum,
        tier1Sources: baseline.sourceIds.map((sourceId) => {
          const source = TIER1_SOURCES[sourceId];
          return {
            id: source.id,
            provider: source.provider,
            url: source.url,
          };
        }),
      },
      null,
      2
    )
  );

  if (status !== "pass") {
    process.exit(1);
  }
}

main();
