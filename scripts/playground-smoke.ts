#!/usr/bin/env bun
import { RuntimeEnv } from "../lib/env/runtime";

type SmokeCheck = {
  name: string;
  path: string;
};

const CHECKS: SmokeCheck[] = [
  { name: "health", path: "/api/health" },
  { name: "runtime", path: "/api/control/process/runtime" },
  { name: "workerDiagnostics", path: "/api/control/worker-pool/diagnostics" },
  { name: "trendSummary", path: "/api/dashboard/trends/summary?minutes=5&limit=20" },
];

async function main() {
  const runtime = RuntimeEnv.validate();
  const base = runtime.base;
  const output: Array<Record<string, unknown>> = [];

  for (const check of CHECKS) {
    const started = performance.now();
    const url = `${base}${check.path}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store" });
      const latencyMs = Math.round(performance.now() - started);
      output.push({
        check: check.name,
        url,
        status: response.status,
        ok: response.ok,
        latencyMs,
      });
      if (!response.ok) {
        throw new Error(`${check.name} returned ${response.status}`);
      }
    } catch (error) {
      output.push({
        check: check.name,
        url,
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(JSON.stringify({ base, results: output }, null, 2));
      process.exit(1);
    }
  }

  console.log(JSON.stringify({ base, results: output }, null, 2));
}

await main();
