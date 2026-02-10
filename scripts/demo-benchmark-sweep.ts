#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";

type DemoContract = {
  benchCommand: string;
  testCommand: string;
};

type DemoContractFile = {
  modules: Record<string, DemoContract>;
};

type RunResult = {
  id: string;
  ok: boolean;
  exitCode: number;
  elapsedMs: number;
  stdout: string;
  stderr: string;
};

const ROOT = process.cwd();
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");

function parseLimit(): number {
  const eq = Bun.argv.find((arg) => arg.startsWith("--limit="));
  const raw = eq ? eq.split("=")[1] : "";
  const parsed = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.POSITIVE_INFINITY;
  return parsed;
}

function parseFilter(): string {
  const eq = Bun.argv.find((arg) => arg.startsWith("--filter="));
  return (eq ? eq.split("=")[1] : "").trim().toLowerCase();
}

async function runShell(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn({
    cmd: ["zsh", "-lc", command],
    cwd: ROOT,
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
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as DemoContractFile;
  const filter = parseFilter();
  const limit = parseLimit();

  let ids = Object.keys(contract.modules || {}).sort();
  if (filter) ids = ids.filter((id) => id.toLowerCase().includes(filter));
  ids = ids.slice(0, limit);

  if (ids.length === 0) {
    console.error("[demo-bench-sweep] no demo ids selected");
    process.exit(1);
  }

  const results: RunResult[] = [];
  for (const id of ids) {
    const start = performance.now();
    const benchCommand = contract.modules[id]?.benchCommand || `bun run demo:module:bench --id=${id}`;
    const cmd = benchCommand.includes("--id=") ? benchCommand : `bun run demo:module:bench --id=${id}`;
    const run = await runShell(cmd);
    results.push({
      id,
      ok: run.exitCode === 0,
      exitCode: run.exitCode,
      elapsedMs: Number((performance.now() - start).toFixed(2)),
      stdout: run.stdout.trim(),
      stderr: run.stderr.trim(),
    });
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const elapsedTotalMs = Number(results.reduce((sum, item) => sum + item.elapsedMs, 0).toFixed(2));
  const summary = {
    total: results.length,
    pass,
    fail,
    elapsedTotalMs,
    averageMs: Number((elapsedTotalMs / Math.max(results.length, 1)).toFixed(2)),
  };

  console.log(JSON.stringify({ summary, results }, null, 2));
  if (fail > 0) process.exit(1);
}

await main();
