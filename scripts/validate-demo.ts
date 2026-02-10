#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");

function parseId(): string {
  const eq = Bun.argv.find((arg) => arg.startsWith("--id="));
  if (eq) return eq.split("=")[1];
  const idx = Bun.argv.findIndex((arg) => arg === "--id");
  if (idx >= 0) return String(Bun.argv[idx + 1] || "");
  return "";
}

async function run(cmd: string) {
  const proc = Bun.spawn({
    cmd: ["zsh", "-lc", cmd],
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

async function main() {
  const id = parseId();
  if (!id) {
    console.error("[validate:demo] missing --id=<demo-id>");
    process.exit(1);
  }

  const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as {
    modules: Record<string, { testCommand: string; benchCommand: string }>;
  };
  const module = contract.modules[id];
  if (!module) {
    console.error(`[validate:demo] unknown demo id '${id}'`);
    process.exit(1);
  }

  const test = await run(module.testCommand);
  if (test.exitCode !== 0) {
    console.error(`[validate:demo] test failed id=${id}\n${test.stdout}\n${test.stderr}`);
    process.exit(test.exitCode || 1);
  }

  const bench = await run(module.benchCommand);
  if (bench.exitCode !== 0) {
    console.error(`[validate:demo] bench failed id=${id}\n${bench.stdout}\n${bench.stderr}`);
    process.exit(bench.exitCode || 1);
  }

  console.log(`[validate:demo][pass] id=${id}`);
}

await main();

