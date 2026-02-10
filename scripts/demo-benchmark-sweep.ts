#!/usr/bin/env bun

import { mkdirSync, readFileSync } from "node:fs";
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
  opsPerSec: number | null;
};

const ROOT = process.cwd();
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");
const REPORTS_DIR = join(ROOT, "reports", "demo-bench");
const LATEST_PATH = join(REPORTS_DIR, "latest.json");

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

function parseCompareLast(): boolean {
  return Bun.argv.includes("--compare-last");
}

function parseMaxRegressionPct(): number {
  const eq = Bun.argv.find((arg) => arg.startsWith("--max-regression-pct="));
  const raw = eq ? eq.split("=")[1] : "20";
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 20;
  return parsed;
}

function readJsonSafe<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function parseOpsPerSec(stdout: string): number | null {
  try {
    const json = JSON.parse(stdout);
    const value = Number(json?.opsPerSec);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
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
  const compareLast = parseCompareLast();
  const maxRegressionPct = parseMaxRegressionPct();

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
      opsPerSec: parseOpsPerSec(run.stdout.trim()),
    });
  }

  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const elapsedTotalMs = Number(results.reduce((sum, item) => sum + item.elapsedMs, 0).toFixed(2));
  const summary: Record<string, unknown> = {
    total: results.length,
    pass,
    fail,
    elapsedTotalMs,
    averageMs: Number((elapsedTotalMs / Math.max(results.length, 1)).toFixed(2)),
    compareLast,
    maxRegressionPct,
  };

  let gate = {
    compared: false,
    regressions: [] as Array<{ id: string; previousOpsPerSec: number; currentOpsPerSec: number; regressionPct: number }>,
    failures: 0,
    pass: true,
  };

  if (compareLast) {
    const previous = readJsonSafe<{ results?: Array<{ id: string; opsPerSec?: number | null }> }>(LATEST_PATH);
    const prevMap = new Map<string, number>();
    for (const row of previous?.results || []) {
      const ops = Number(row.opsPerSec);
      if (Number.isFinite(ops) && ops > 0) prevMap.set(row.id, ops);
    }
    for (const row of results) {
      if (row.opsPerSec == null) continue;
      const prev = prevMap.get(row.id);
      if (!prev || prev <= 0) continue;
      const regressionPct = ((prev - row.opsPerSec) / prev) * 100;
      if (regressionPct > maxRegressionPct) {
        gate.regressions.push({
          id: row.id,
          previousOpsPerSec: prev,
          currentOpsPerSec: row.opsPerSec,
          regressionPct: Number(regressionPct.toFixed(2)),
        });
      }
    }
    gate = {
      compared: true,
      regressions: gate.regressions,
      failures: gate.regressions.length,
      pass: gate.regressions.length === 0,
    };
    summary.compareLastAvailable = prevMap.size > 0;
    summary.regressionFailures = gate.failures;
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  const snapshot = {
    generatedAt: new Date().toISOString(),
    cwd: ROOT,
    summary,
    gate,
    results,
  };
  const stamp = snapshot.generatedAt.replace(/[:.]/g, "-");
  const snapshotPath = join(REPORTS_DIR, `snapshot-${stamp}.json`);
  await Bun.write(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  await Bun.write(LATEST_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);

  console.log(JSON.stringify({ ...snapshot, paths: { latest: LATEST_PATH, snapshot: snapshotPath } }, null, 2));
  if (fail > 0 || (compareLast && !gate.pass)) process.exit(1);
}

await main();
