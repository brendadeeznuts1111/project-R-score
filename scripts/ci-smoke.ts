#!/usr/bin/env bun

import {
  applyDashboardTestEnv,
  getDashboardTestConfig,
  withDashboardServer,
} from "./lib/dashboard-test-server";

type SmokeCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

async function fetchJson(base: string, path: string) {
  const response = await fetch(`${base}${path}`, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function runSmoke(): Promise<number> {
  const checks: SmokeCheck[] = [];
  const { base } = getDashboardTestConfig();

  try {
    const health = await fetchJson(base, "/api/health");
    checks.push({
      name: "health",
      ok: health.response.status === 200 && typeof health.payload?.status === "string",
      detail: `status=${health.response.status}`,
    });

    const runtimePorts = await fetchJson(base, "/api/control/runtime/ports");
    checks.push({
      name: "runtime-ports",
      ok:
        runtimePorts.response.status === 200 &&
        Number.isFinite(runtimePorts.payload?.requestedPort) &&
        Number.isFinite(runtimePorts.payload?.activePort) &&
        typeof runtimePorts.payload?.remapped === "boolean",
      detail: `status=${runtimePorts.response.status} requested=${runtimePorts.payload?.requestedPort ?? "n/a"} active=${runtimePorts.payload?.activePort ?? "n/a"}`,
    });

    const trends = await fetchJson(base, "/api/dashboard/trends/summary?minutes=15&limit=20");
    checks.push({
      name: "trends-summary",
      ok:
        trends.response.status === 200 &&
        trends.payload?.source === "sqlite" &&
        Number.isFinite(trends.payload?.summary?.count),
      detail: `status=${trends.response.status} count=${trends.payload?.summary?.count ?? "n/a"}`,
    });
  } catch (error) {
    checks.push({
      name: "runner",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  for (const check of checks) {
    console.log(`[${check.ok ? "PASS" : "FAIL"}] ${check.name} :: ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.ok).length;
  console.log(`Checked ${checks.length} smoke assertions against ${base}`);
  return failed === 0 ? 0 : 1;
}

if (import.meta.main) {
  const config = getDashboardTestConfig();
  applyDashboardTestEnv(config);
  const code = await withDashboardServer(config.host, config.port, runSmoke);
  process.exit(code);
}
