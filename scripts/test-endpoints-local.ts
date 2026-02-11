#!/usr/bin/env bun

type EndpointCheck = {
  name: string;
  method: "GET" | "POST";
  path: string;
  expectedStatus: number;
  body?: unknown;
};

const baseUrl = (process.env.PLAYGROUND_BASE_URL || "http://localhost:3011").replace(/\/+$/, "");
const timeoutMs = Number(process.env.ENDPOINT_TEST_TIMEOUT_MS || "4000");

const checks: EndpointCheck[] = [
  { name: "info", method: "GET", path: "/api/info", expectedStatus: 200 },
  { name: "demos", method: "GET", path: "/api/demos", expectedStatus: 200 },
  {
    name: "protocol-router-dryrun",
    method: "POST",
    path: "/api/fetch/protocol-router",
    expectedStatus: 200,
    body: { url: "https://example.com", method: "GET", dryRun: true, bodyType: "string" },
  },
  { name: "workspace-panel", method: "GET", path: "/api/control/script-orchestration-panel", expectedStatus: 200 },
];

let failures = 0;
console.log(`Endpoint smoke target: ${baseUrl}`);
console.log(`Timeout: ${timeoutMs}ms`);

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: check.method,
      headers: check.body ? { "content-type": "application/json" } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsed = Date.now() - start;
    if (res.status !== check.expectedStatus) {
      failures++;
      console.log(`FAIL ${check.name} ${res.status} expected=${check.expectedStatus} ${elapsed}ms ${check.path}`);
      continue;
    }
    console.log(`PASS ${check.name} ${res.status} ${elapsed}ms ${check.path}`);
  } catch (error) {
    failures++;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL ${check.name} error=${message} ${check.path}`);
  }
}

if (failures > 0) {
  console.error(`Endpoint smoke failed: ${failures}/${checks.length} checks failed`);
  process.exit(1);
}

console.log(`Endpoint smoke passed: ${checks.length}/${checks.length} checks`);
