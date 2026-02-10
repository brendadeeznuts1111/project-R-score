#!/usr/bin/env bun
import { withDashboardServer } from "./lib/dashboard-test-server";

const HOST = process.env.DASHBOARD_HOST || "localhost";
const PORT = Number.parseInt(process.env.DASHBOARD_PORT || "3011", 10);
const BASE = `http://${HOST}:${PORT}`;

type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

function checkEquals(
  checks: CheckResult[],
  name: string,
  actual: unknown,
  expected: unknown
) {
  const ok = actual === expected;
  checks.push({
    name,
    ok,
    details: `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
  });
}

async function run(): Promise<number> {
  const checks: CheckResult[] = [];

  try {
    const mini = await fetchJson("/api/dashboard/mini");
    const miniJson = mini.json || {};
    checks.push({
      name: "mini-status",
      ok: mini.res.status === 200,
      details: `status=${mini.res.status}`,
    });
    checks.push({
      name: "mini-shape-core",
      ok:
        isObject(miniJson) &&
        typeof miniJson.generatedAt === "string" &&
        Number.isFinite(miniJson.port) &&
        isObject(miniJson.bottleneck) &&
        isObject(miniJson.capacity) &&
        isObject(miniJson.headroom) &&
        isObject(miniJson.pooling),
      details: `core=${JSON.stringify({
        generatedAt: miniJson?.generatedAt,
        port: miniJson?.port,
        hasBottleneck: isObject(miniJson?.bottleneck),
        hasCapacity: isObject(miniJson?.capacity),
        hasHeadroom: isObject(miniJson?.headroom),
        hasPooling: isObject(miniJson?.pooling),
      })}`,
    });
    checks.push({
      name: "mini-has-capacity",
      ok: typeof miniJson?.capacity?.summary === "string" &&
        Number.isFinite(miniJson?.capacity?.connectionsPct) &&
        Number.isFinite(miniJson?.capacity?.workersPct) &&
        ["ok", "warn", "fail"].includes(String(miniJson?.capacity?.severity || "")),
      details: `capacity=${JSON.stringify(miniJson?.capacity ?? null)}`,
    });
    checks.push({
      name: "mini-has-headroom",
      ok:
        Number.isFinite(miniJson?.headroom?.connections?.pct) &&
        Number.isFinite(miniJson?.headroom?.workers?.pct) &&
        Number.isFinite(miniJson?.headroom?.connections?.available) &&
        Number.isFinite(miniJson?.headroom?.workers?.available) &&
        ["ok", "warn", "fail"].includes(String(miniJson?.headroom?.connections?.severity || "")) &&
        ["ok", "warn", "fail"].includes(String(miniJson?.headroom?.workers?.severity || "")),
      details: `headroom=${JSON.stringify(miniJson?.headroom ?? null)}`,
    });
    checks.push({
      name: "mini-has-bottleneck",
      ok:
        typeof miniJson?.bottleneck?.kind === "string" &&
        ["ok", "warn", "fail"].includes(String(miniJson?.bottleneck?.severity || "")),
      details: `bottleneck=${JSON.stringify(miniJson?.bottleneck ?? null)}`,
    });
    checks.push({
      name: "mini-pooling-live-shape",
      ok:
        Number.isFinite(miniJson?.pooling?.live?.connections?.inFlight) &&
        Number.isFinite(miniJson?.pooling?.live?.connections?.max) &&
        Number.isFinite(miniJson?.pooling?.live?.workers?.active) &&
        Number.isFinite(miniJson?.pooling?.live?.workers?.max),
      details: `poolingLive=${JSON.stringify(miniJson?.pooling?.live ?? null)}`,
    });

    const sev85 = await fetchJson("/api/dashboard/severity-test?load=85");
    checkEquals(checks, "severity-85-utilization", sev85.json?.severity?.utilization, "fail");
    checkEquals(checks, "severity-85-capacity", sev85.json?.severity?.capacity, "fail");
    checkEquals(checks, "severity-85-headroom", sev85.json?.severity?.headroom, "warn");

    const sev60 = await fetchJson("/api/dashboard/severity-test?load=60");
    checkEquals(checks, "severity-60-utilization", sev60.json?.severity?.utilization, "warn");
    checkEquals(checks, "severity-60-capacity", sev60.json?.severity?.capacity, "warn");
    checkEquals(checks, "severity-60-headroom", sev60.json?.severity?.headroom, "ok");

    const sev30 = await fetchJson("/api/dashboard/severity-test?load=30");
    checkEquals(checks, "severity-30-utilization", sev30.json?.severity?.utilization, "ok");
    checkEquals(checks, "severity-30-capacity", sev30.json?.severity?.capacity, "ok");
    checkEquals(checks, "severity-30-headroom", sev30.json?.severity?.headroom, "ok");
  } catch (error) {
    checks.push({
      name: "runner",
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    console.log(`[${check.ok ? "PASS" : "FAIL"}] ${check.name} :: ${check.details}`);
  }
  console.log(`Checked ${checks.length} dashboard mini assertions against ${BASE}`);
  return failed.length === 0 ? 0 : 1;
}

const code = await withDashboardServer(HOST, PORT, run);
process.exit(code);
