#!/usr/bin/env bun

import { performance } from "node:perf_hooks";

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

function main() {
  const id = parseArg("id");
  if (!id) {
    console.error("[demo-bench] missing --id=<demo-id>");
    process.exit(1);
  }

  const iterations = 200_000;
  let sink = 0;
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    sink ^= hash(`${id}:${i}`);
  }
  const elapsedMs = Math.max(0.001, performance.now() - t0);
  const opsPerSec = Math.round((iterations / elapsedMs) * 1000);
  console.log(
    JSON.stringify(
      {
        id,
        iterations,
        elapsedMs: Number(elapsedMs.toFixed(3)),
        opsPerSec,
        checksum: sink >>> 0,
      },
      null,
      2
    )
  );
}

main();

