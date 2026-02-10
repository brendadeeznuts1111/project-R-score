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

function check(checks: CheckResult[], name: string, ok: boolean, details: string) {
  checks.push({ name, ok, details });
}

async function run(): Promise<number> {
  const checks: CheckResult[] = [];

  try {
    const health = await fetchJson("/api/health");
    check(
      checks,
      "health-contract",
      health.res.status === 200 &&
        typeof health.json?.status === "string" &&
        typeof health.json?.timestamp === "string" &&
        typeof health.json?.service === "string" &&
        typeof health.json?.version === "string" &&
        typeof health.json?.runtime?.bunVersion === "string" &&
        Array.isArray(health.json?.checks),
      `status=${health.res.status}`
    );
    check(
      checks,
      "health-trace-header",
      typeof health.res.headers.get("x-trace-id") === "string" &&
        String(health.res.headers.get("x-trace-id") || "").length >= 6 &&
        Number.isFinite(Number.parseFloat(String(health.res.headers.get("x-trace-duration-ms") || "NaN"))),
      `traceId=${String(health.res.headers.get("x-trace-id") || "missing")} duration=${String(health.res.headers.get("x-trace-duration-ms") || "missing")}`
    );

    const dashboard = await fetchJson("/api/dashboard");
    check(
      checks,
      "dashboard-contract",
      dashboard.res.status === 200 &&
        typeof dashboard.json?.status === "string" &&
        typeof dashboard.json?.runtime?.bunVersion === "string" &&
        Number.isFinite(dashboard.json?.metrics?.system?.inFlightRequests) &&
        Number.isFinite(dashboard.json?.metrics?.system?.activeWorkers),
      `status=${dashboard.res.status}`
    );

    const runtime = await fetchJson("/api/dashboard/runtime");
    check(
      checks,
      "dashboard-runtime-contract",
      runtime.res.status === 200 &&
        typeof runtime.json?.bunVersion === "string" &&
        typeof runtime.json?.bunRevision === "string" &&
        typeof runtime.json?.platform === "string" &&
        typeof runtime.json?.arch === "string" &&
        Number.isFinite(runtime.json?.pid) &&
        Number.isFinite(runtime.json?.port),
      `status=${runtime.res.status}`
    );

    const mini = await fetchJson("/api/dashboard/mini");
    check(
      checks,
      "dashboard-mini-contract",
      mini.res.status === 200 &&
        typeof mini.json?.capacity?.summary === "string" &&
        Number.isFinite(mini.json?.headroom?.connections?.pct) &&
        Number.isFinite(mini.json?.headroom?.workers?.pct),
      `status=${mini.res.status}`
    );

    const trends = await fetchJson("/api/dashboard/trends?minutes=15&limit=50");
    check(
      checks,
      "dashboard-trends-contract",
      trends.res.status === 200 &&
        trends.json?.source === "sqlite" &&
        trends.json?.initialized === true &&
        Number.isFinite(trends.json?.summary?.count) &&
        Number.isFinite(trends.json?.summary?.avgLoadMaxPct) &&
        Number.isFinite(trends.json?.summary?.avgCapacityPct) &&
        Number.isFinite(trends.json?.summary?.deltaLoadMaxPct) &&
        Number.isFinite(trends.json?.summary?.deltaCapacityPct) &&
        Number.isFinite(trends.json?.summary?.windowCoveragePct) &&
        Number.isFinite(trends.json?.summary?.severityCounts?.ok) &&
        Number.isFinite(trends.json?.summary?.severityCounts?.warn) &&
        Number.isFinite(trends.json?.summary?.severityCounts?.fail) &&
        Array.isArray(trends.json?.points) &&
        trends.json?.summary?.count >= 1,
      `status=${trends.res.status} count=${trends.json?.summary?.count}`
    );

    const trendSummary = await fetchJson("/api/dashboard/trends/summary?minutes=15&limit=50");
    check(
      checks,
      "dashboard-trends-summary-contract",
      trendSummary.res.status === 200 &&
        trendSummary.json?.source === "sqlite" &&
        trendSummary.json?.initialized === true &&
        Number.isFinite(trendSummary.json?.summary?.count) &&
        Number.isFinite(trendSummary.json?.summary?.avgLoadMaxPct) &&
        Number.isFinite(trendSummary.json?.summary?.avgCapacityPct) &&
        Number.isFinite(trendSummary.json?.summary?.windowCoveragePct) &&
        typeof trendSummary.json?.summary?.sparklineLoad === "string" &&
        typeof trendSummary.json?.summary?.sparklineCapacity === "string" &&
        Number.isFinite(trendSummary.json?.window?.minutes) &&
        Number.isFinite(trendSummary.json?.window?.limit),
      `status=${trendSummary.res.status} count=${trendSummary.json?.summary?.count}`
    );

    const traces = await fetchJson("/api/dashboard/traces?limit=20");
    check(
      checks,
      "dashboard-traces-contract",
      traces.res.status === 200 &&
        traces.json?.source === "in-memory-request-traces" &&
        Number.isFinite(traces.json?.bufferSize) &&
        Number.isFinite(traces.json?.capacity) &&
        Number.isFinite(traces.json?.summary?.statusBuckets?.ok2xx) &&
        Array.isArray(traces.json?.traces) &&
        traces.json?.traces?.length >= 1 &&
        typeof traces.json?.traces?.[0]?.id === "string" &&
        typeof traces.json?.traces?.[0]?.path === "string" &&
        Number.isFinite(traces.json?.traces?.[0]?.status),
      `status=${traces.res.status} traces=${traces.json?.traces?.length ?? 0}`
    );

    const severity = await fetchJson("/api/dashboard/severity-test?load=42");
    check(
      checks,
      "dashboard-severity-contract",
      severity.res.status === 200 &&
        ["ok", "warn", "fail"].includes(String(severity.json?.severity?.utilization || "")) &&
        ["ok", "warn", "fail"].includes(String(severity.json?.severity?.capacity || "")) &&
        ["ok", "warn", "fail"].includes(String(severity.json?.severity?.headroom || "")),
      `status=${severity.res.status}`
    );

    const components = await fetchJson("/api/control/component-status");
    check(
      checks,
      "component-status-contract",
      components.res.status === 200 &&
        Number.isFinite(components.json?.summary?.rowCount) &&
        Number.isFinite(components.json?.summary?.stableCount) &&
        Number.isFinite(components.json?.summary?.betaCount) &&
        Array.isArray(components.json?.rows) &&
        components.json?.rows.length >= 10 &&
        typeof components.json?.rows?.[0]?.component === "string" &&
        typeof components.json?.rows?.[0]?.file === "string" &&
        typeof components.json?.rows?.[0]?.status === "string",
      `status=${components.res.status} rows=${components.json?.rows?.length ?? 0}`
    );

    const readiness = await fetchJson("/api/control/deployment-readiness");
    check(
      checks,
      "deployment-readiness-contract",
      readiness.res.status === 200 &&
        Number.isFinite(readiness.json?.summary?.productionReadyCount) &&
        Number.isFinite(readiness.json?.summary?.betaStagingCount) &&
        Number.isFinite(readiness.json?.summary?.overallReadiness) &&
        Array.isArray(readiness.json?.matrix?.productionReady) &&
        Array.isArray(readiness.json?.matrix?.betaStaging) &&
        readiness.json?.matrix?.productionReady?.length >= 10 &&
        readiness.json?.matrix?.betaStaging?.length >= 1,
      `status=${readiness.res.status} ready=${readiness.json?.matrix?.productionReady?.length ?? 0} beta=${readiness.json?.matrix?.betaStaging?.length ?? 0}`
    );

    const performance = await fetchJson("/api/control/performance-impact");
    check(
      checks,
      "performance-impact-contract",
      performance.res.status === 200 &&
        typeof performance.json?.overall?.before === "string" &&
        typeof performance.json?.overall?.after === "string" &&
        typeof performance.json?.overall?.improvement === "string" &&
        Number.isFinite(performance.json?.summary?.componentCount) &&
        Array.isArray(performance.json?.components) &&
        performance.json?.components?.length >= 5 &&
        typeof performance.json?.components?.[0]?.name === "string" &&
        typeof performance.json?.components?.[0]?.metric === "string" &&
        typeof performance.json?.components?.[0]?.gain === "string",
      `status=${performance.res.status} components=${performance.json?.components?.length ?? 0}`
    );

    const security = await fetchJson("/api/control/security-posture");
    check(
      checks,
      "security-posture-contract",
      security.res.status === 200 &&
        Number.isFinite(security.json?.summary?.reviewed) &&
        Number.isFinite(security.json?.summary?.pending) &&
        Number.isFinite(security.json?.summary?.criticalIssues) &&
        Number.isFinite(security.json?.totals?.componentCount) &&
        Array.isArray(security.json?.components) &&
        security.json?.components?.length >= 1 &&
        typeof security.json?.components?.[0]?.file === "string" &&
        typeof security.json?.components?.[0]?.reviewDate === "string",
      `status=${security.res.status} components=${security.json?.components?.length ?? 0}`
    );

    const domain = await fetchJson("/api/control/domain-graph?domain=orchestration");
    check(
      checks,
      "domain-graph-contract",
      domain.res.status === 200 &&
        typeof domain.json?.domain === "string" &&
        Array.isArray(domain.json?.availableDomains) &&
        typeof domain.json?.mermaid === "string" &&
        String(domain.json?.mermaid || "").includes("```mermaid"),
      `status=${domain.res.status} domain=${domain.json?.domain ?? "n/a"}`
    );

    const featureMatrix = await fetchJson("/api/control/feature-matrix");
    const featureRows = Array.isArray(featureMatrix.json?.rows) ? featureMatrix.json.rows : [];
    const featureNames = new Set(featureRows.map((row: any) => String(row?.feature || "")));
    check(
      checks,
      "feature-matrix-contract",
      featureMatrix.res.status === 200 &&
        Number.isFinite(featureMatrix.json?.summary?.rowCount) &&
        featureRows.length >= 20 &&
        featureNames.has("RegExp SIMD Prefix Search") &&
        featureNames.has("RegExp Fixed-Count Parentheses JIT") &&
        featureNames.has("String.startsWith Intrinsic") &&
        featureNames.has("Set/Map.size Intrinsic") &&
        featureNames.has("String.trim Intrinsic") &&
        featureNames.has("Object.defineProperty Intrinsic") &&
        featureNames.has("String.replace Rope Return") &&
        featureNames.has("Bun.markdown API") &&
        featureNames.has("metafile markdown output") &&
        featureNames.has("mimalloc update") &&
        featureNames.has("N-API typeof AsyncContextFrame fix") &&
        featureNames.has("heap snapshot crash fix") &&
        featureNames.has("node:vm SyntheticModule async_hooks fix") &&
        featureNames.has("node:http2 Rare Crash Fixes") &&
        featureNames.has("HTTP/2 gRPC stream state fix") &&
        featureNames.has("HTTP Chunked Parser Smuggling Fix") &&
        featureNames.has("CompileTarget SIMD Type Fix") &&
        featureNames.has("CompileTarget Baseline/Modern Type Fix") &&
        featureNames.has("Socket.reload Type Fix") &&
        featureNames.has("npm i -g bun Windows cmd-shim fix"),
      `status=${featureMatrix.res.status} rows=${featureRows.length}`
    );

    const bundleAnalyze = await fetchJson("/api/control/bundle/analyze");
    check(
      checks,
      "bundle-analyze-contract",
      bundleAnalyze.res.status === 200 &&
        bundleAnalyze.json?.ok === true &&
        typeof bundleAnalyze.json?.entrypoint === "string" &&
        Number.isFinite(bundleAnalyze.json?.summary?.inputCount) &&
        Number.isFinite(bundleAnalyze.json?.summary?.outputCount) &&
        Number.isFinite(bundleAnalyze.json?.summary?.inputBytes) &&
        Number.isFinite(bundleAnalyze.json?.summary?.outputBytes) &&
        Number.isFinite(bundleAnalyze.json?.summary?.compressionRatio) &&
        Array.isArray(bundleAnalyze.json?.largestInputs) &&
        Array.isArray(bundleAnalyze.json?.largestOutputs) &&
        Array.isArray(bundleAnalyze.json?.externalDependencies),
      `status=${bundleAnalyze.res.status} ok=${String(bundleAnalyze.json?.ok)}`
    );

    const bundleAnalyzeEntry = await fetchJson("/api/control/bundle/analyze?entry=scratch/bun-v1.3.9-examples/playground-web/app.js");
    check(
      checks,
      "bundle-analyze-entry-contract",
      bundleAnalyzeEntry.res.status === 200 &&
        bundleAnalyzeEntry.json?.ok === true &&
        typeof bundleAnalyzeEntry.json?.entrypoint === "string" &&
        String(bundleAnalyzeEntry.json?.entrypoint).endsWith("/scratch/bun-v1.3.9-examples/playground-web/app.js"),
      `status=${bundleAnalyzeEntry.res.status} ok=${String(bundleAnalyzeEntry.json?.ok)} entry=${String(bundleAnalyzeEntry.json?.entrypoint || "n/a")}`
    );

    const bundleAnalyzeBlocked = await fetchJson("/api/control/bundle/analyze?entry=../outside.ts");
    check(
      checks,
      "bundle-analyze-entry-blocked-contract",
      bundleAnalyzeBlocked.res.status === 200 &&
        bundleAnalyzeBlocked.json?.ok === false &&
        typeof bundleAnalyzeBlocked.json?.error === "string",
      `status=${bundleAnalyzeBlocked.res.status} ok=${String(bundleAnalyzeBlocked.json?.ok)} error=${String(bundleAnalyzeBlocked.json?.error || "n/a")}`
    );

    const demoValidate = await fetchJson("/api/control/demo-module/validate?id=markdown-simd");
    check(
      checks,
      "demo-module-validate-contract",
      demoValidate.res.status === 200 &&
        demoValidate.json?.ok === true &&
        demoValidate.json?.id === "markdown-simd" &&
        Number.isFinite(demoValidate.json?.exitCode),
      `status=${demoValidate.res.status} ok=${String(demoValidate.json?.ok)}`
    );

    const demoBench = await fetchJson("/api/control/demo-module/bench?id=markdown-simd");
    check(
      checks,
      "demo-module-bench-contract",
      demoBench.res.status === 200 &&
        demoBench.json?.ok === true &&
        demoBench.json?.id === "markdown-simd" &&
        Number.isFinite(demoBench.json?.exitCode),
      `status=${demoBench.res.status} ok=${String(demoBench.json?.ok)}`
    );

    const demoFullLoop = await fetchJson("/api/control/demo-module/full-loop?id=markdown-simd");
    check(
      checks,
      "demo-module-full-loop-contract",
      demoFullLoop.res.status === 200 &&
        demoFullLoop.json?.ok === true &&
        demoFullLoop.json?.id === "markdown-simd" &&
        Number.isFinite(demoFullLoop.json?.durationMs) &&
        demoFullLoop.json?.steps?.validate?.ok === true &&
        demoFullLoop.json?.steps?.bench?.ok === true &&
        demoFullLoop.json?.steps?.run?.ok === true,
      `status=${demoFullLoop.res.status} ok=${String(demoFullLoop.json?.ok)}`
    );

    const buildMetafileFullLoop = await fetchJson("/api/control/demo-module/full-loop?id=build-metafile");
    check(
      checks,
      "demo-module-full-loop-build-metafile-contract",
      buildMetafileFullLoop.res.status === 200 &&
        buildMetafileFullLoop.json?.ok === true &&
        buildMetafileFullLoop.json?.id === "build-metafile" &&
        Number.isFinite(buildMetafileFullLoop.json?.durationMs) &&
        buildMetafileFullLoop.json?.steps?.validate?.ok === true &&
        buildMetafileFullLoop.json?.steps?.bench?.ok === true &&
        buildMetafileFullLoop.json?.steps?.run?.ok === true,
      `status=${buildMetafileFullLoop.res.status} ok=${String(buildMetafileFullLoop.json?.ok)}`
    );
  } catch (error) {
    check(
      checks,
      "runner",
      false,
      error instanceof Error ? error.message : String(error)
    );
  }

  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`[${c.ok ? "PASS" : "FAIL"}] ${c.name} :: ${c.details}`);
  }
  console.log(`Checked ${checks.length} dashboard endpoint assertions against ${BASE}`);
  return failed.length === 0 ? 0 : 1;
}

const code = await withDashboardServer(HOST, PORT, run);
process.exit(code);
