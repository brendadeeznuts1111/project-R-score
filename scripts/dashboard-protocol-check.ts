#!/usr/bin/env bun

import {
  applyDashboardTestEnv,
  getDashboardTestConfig,
  withDashboardServer,
} from "./lib/dashboard-test-server";

const PROTOCOL_FLAG = Bun.argv.find((arg) => arg.startsWith("--protocol="));
const PROTOCOL = PROTOCOL_FLAG ? PROTOCOL_FLAG.split("=")[1]?.toLowerCase() : "";

const PROTOCOL_CASES: Record<
  string,
  { url: string; bodyType: string; scoreUse: string; scoreSize: number; expectedProtocol: string }
> = {
  http: {
    url: "http://example.com",
    bodyType: "string",
    scoreUse: "read",
    scoreSize: 512,
    expectedProtocol: "http:",
  },
  https: {
    url: "https://example.com",
    bodyType: "string",
    scoreUse: "read",
    scoreSize: 512,
    expectedProtocol: "https:",
  },
  s3: {
    url: "s3://demo-bucket/demo-key",
    bodyType: "string",
    scoreUse: "write",
    scoreSize: 4096,
    expectedProtocol: "s3:",
  },
  file: {
    url: "file:///tmp/demo.txt",
    bodyType: "file",
    scoreUse: "read",
    scoreSize: 1024,
    expectedProtocol: "file:",
  },
  data: {
    url: "data:text/plain,hello-protocol",
    bodyType: "inline",
    scoreUse: "read",
    scoreSize: 128,
    expectedProtocol: "data:",
  },
  blob: {
    url: "blob:https://example.com/550e8400-e29b-41d4-a716-446655440000",
    bodyType: "blob",
    scoreUse: "read",
    scoreSize: 256,
    expectedProtocol: "blob:",
  },
  unix: {
    url: "http+unix://%2Ftmp%2Fprotocol.sock:/health",
    bodyType: "string",
    scoreUse: "read",
    scoreSize: 512,
    expectedProtocol: "http+unix:",
  },
};

type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

async function fetchJson(path: string, init?: RequestInit) {
  const { base } = getDashboardTestConfig();
  const res = await fetch(`${base}${path}`, init);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function run(): Promise<number> {
  const checks: CheckResult[] = [];

  try {
    if (PROTOCOL && PROTOCOL_CASES[PROTOCOL]) {
      const spec = PROTOCOL_CASES[PROTOCOL];

      const matrix = await fetchJson("/api/control/protocol-matrix");
      const matrixRows = Array.isArray((matrix.json as any)?.protocols)
        ? (matrix.json as any).protocols
        : [];
      const hasProtocol = matrixRows.some((p: any) => {
        const protocolLabel = String(p?.protocol || "").toLowerCase();
        const scheme = String(p?.scheme || "").toLowerCase();
        if (PROTOCOL === "http") return protocolLabel.includes("http") || scheme.includes("http://");
        if (PROTOCOL === "https") return protocolLabel.includes("https") || scheme.includes("https://");
        if (PROTOCOL === "s3") return protocolLabel.includes("s3") || scheme.includes("s3://");
        if (PROTOCOL === "file") return protocolLabel.includes("file") || scheme.includes("file://");
        if (PROTOCOL === "data") return protocolLabel.includes("data") || scheme.includes("data:");
        if (PROTOCOL === "blob") return protocolLabel.includes("blob") || scheme.includes("blob:");
        if (PROTOCOL === "unix") return protocolLabel.includes("unix") || scheme.includes("unix");
        return false;
      });
      checks.push({
        name: `protocol-matrix-${PROTOCOL}`,
        ok: matrix.res.status === 200 && hasProtocol,
        details: `status=${matrix.res.status} hasProtocol=${hasProtocol}`,
      });

      const scorecard = await fetchJson(`/api/control/protocol-scorecard?use=${encodeURIComponent(spec.scoreUse)}&size=${spec.scoreSize}`);
      const recommend = String((scorecard.json as any)?.recommend || "");
      checks.push({
        name: `protocol-scorecard-${PROTOCOL}`,
        ok: scorecard.res.status === 200 && recommend.length > 0,
        details: `status=${scorecard.res.status} recommend=${recommend || "none"}`,
      });

      const dryRun = await fetchJson("/api/fetch/protocol-router", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: spec.url,
          dryRun: true,
          bodyType: spec.bodyType,
        }),
      });
      const dryOk = Boolean((dryRun.json as any)?.ok);
      const dryProto = String((dryRun.json as any)?.metadata?.protocol || "");
      checks.push({
        name: `protocol-router-dry-run-${PROTOCOL}`,
        ok: dryRun.res.status === 200 && dryOk && dryProto === spec.expectedProtocol,
        details: `status=${dryRun.res.status} ok=${dryOk} protocol=${dryProto || "none"}`,
      });
    } else {
    const matrix = await fetchJson("/api/control/protocol-matrix");
    const protocols = Array.isArray((matrix.json as any)?.protocols)
      ? (matrix.json as any).protocols.length
      : 0;
    checks.push({
      name: "protocol-matrix",
      ok: matrix.res.status === 200 && protocols >= 5,
      details: `status=${matrix.res.status} protocols=${protocols}`,
    });

    const scorecard = await fetchJson("/api/control/protocol-scorecard?use=read&size=512");
    const recommend = String((scorecard.json as any)?.recommend || "");
    checks.push({
      name: "protocol-scorecard",
      ok: scorecard.res.status === 200 && recommend.length > 0,
      details: `status=${scorecard.res.status} recommend=${recommend || "none"}`,
    });

    const dryRun = await fetchJson("/api/fetch/protocol-router", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", dryRun: true }),
    });
    const dryOk = Boolean((dryRun.json as any)?.ok);
    const dryProto = String((dryRun.json as any)?.metadata?.protocol || "");
    checks.push({
      name: "protocol-router-dry-run",
      ok: dryRun.res.status === 200 && dryOk && dryProto === "https:",
      details: `status=${dryRun.res.status} ok=${dryOk} protocol=${dryProto || "none"}`,
    });

    const invalid = await fetchJson("/api/fetch/protocol-router", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "data:text/plain,hello", method: "GET" }),
    });
    const invalidOk = Boolean((invalid.json as any)?.ok);
    const invalidError = String((invalid.json as any)?.error || "");
    checks.push({
      name: "protocol-router-invalid-body-guard",
      ok: invalidOk === false && invalidError.length > 0,
      details: `status=${invalid.res.status} ok=${invalidOk} error=${invalidError || "none"}`,
    });
    }
  } catch (error) {
    checks.push({
      name: "runner",
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    const status = check.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${check.name} :: ${check.details}`);
  }
  const { base } = getDashboardTestConfig();
  console.log(`Checked ${checks.length} protocol assertions against ${base}${PROTOCOL ? ` (protocol=${PROTOCOL})` : ""}`);
  return failed.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  const config = getDashboardTestConfig();
  applyDashboardTestEnv(config);
  const code = await withDashboardServer(config.host, config.port, run);
  process.exit(code);
}
