#!/usr/bin/env bun
import { RuntimeEnv } from "../lib/env/runtime";

async function main() {
  const runtime = RuntimeEnv.validate();
  const base = runtime.base;
  const endpoints = [
    `${base}/api/health`,
    `${base}/api/control/process/runtime`,
    `${base}/api/control/runtime/drift`,
  ];

  const results = await Promise.all(
    endpoints.map(async (url) => {
      const started = performance.now();
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
        return {
          url,
          ok: response.ok,
          status: response.status,
          latencyMs: Math.round(performance.now() - started),
        };
      } catch (error) {
        return {
          url,
          ok: false,
          status: 0,
          latencyMs: Math.round(performance.now() - started),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  const failed = results.filter((row) => !row.ok);
  console.log(JSON.stringify({ base, host: runtime.host, port: runtime.port, results }, null, 2));
  if (failed.length > 0) {
    process.exit(1);
  }
}

await main();
