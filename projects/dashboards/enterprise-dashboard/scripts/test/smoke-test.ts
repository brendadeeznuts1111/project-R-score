/**
 * Smoke test for all API endpoints
 */

const BASE = "http://localhost:8080";
const ADMIN_KEY = "eda_test-admin-secret-123";

interface TestResult {
  endpoint: string;
  method: string;
  auth: string;
  status: number;
  expected: number;
  pass: boolean;
  time: number;
}

const results: TestResult[] = [];

async function test(endpoint: string, method: string, auth: "none" | "admin", expectedStatus: number) {
  const headers: Record<string, string> = {};
  if (auth === "admin") {
    headers["Authorization"] = "Bearer " + ADMIN_KEY;
  }

  const start = performance.now();
  try {
    const res = await fetch(BASE + endpoint, { method, headers });
    const time = performance.now() - start;
    const pass = res.status === expectedStatus;
    results.push({
      endpoint,
      method,
      auth,
      status: res.status,
      expected: expectedStatus,
      pass,
      time: Math.round(time * 100) / 100
    });
  } catch (e: any) {
    results.push({
      endpoint,
      method,
      auth,
      status: 0,
      expected: expectedStatus,
      pass: false,
      time: 0
    });
  }
}

// Public endpoints (no auth required)
await test("/health", "GET", "none", 200);
await test("/api/dashboard", "GET", "none", 200);

// Protected endpoints WITHOUT auth (should be 401)
await test("/api/db/stats", "GET", "none", 401);
await test("/api/system", "GET", "none", 401);
await test("/api/pty/sessions", "GET", "none", 401);
await test("/api/projects", "GET", "none", 401);
await test("/api/urlpattern/patterns", "GET", "none", 401);
await test("/api/admin/api-keys", "GET", "none", 401);

// Protected endpoints WITH admin auth (should be 200)
await test("/api/db/stats", "GET", "admin", 200);
await test("/api/db/metrics", "GET", "admin", 200);
await test("/api/db/activity", "GET", "admin", 200);
await test("/api/db/settings", "GET", "admin", 200);
await test("/api/db/snapshots", "GET", "admin", 200);
await test("/api/system", "GET", "admin", 200);
await test("/api/system/live", "GET", "admin", 200);
await test("/api/system/enhanced", "GET", "admin", 200);
await test("/api/system/queue", "GET", "admin", 200);
await test("/api/pty/sessions", "GET", "admin", 200);
await test("/api/pty/stats", "GET", "admin", 200);
await test("/api/projects", "GET", "admin", 200);
await test("/api/urlpattern/patterns", "GET", "admin", 200);
await test("/api/peek-cache/stats", "GET", "admin", 200);
await test("/api/admin/api-keys", "GET", "admin", 200);
await test("/api/topology", "GET", "admin", 200);

// Analytics & metrics
await test("/api/analytics/matrix", "GET", "admin", 200);
await test("/api/metrics/enterprise", "GET", "admin", 200);

// Network endpoints
await test("/api/network/stats", "GET", "admin", 200);
await test("/api/network/config", "GET", "admin", 200);

// Session/theme (public)
await test("/api/session", "GET", "none", 200);
await test("/api/theme", "GET", "none", 200);

// Summary
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
const totalTime = results.reduce((sum, r) => sum + r.time, 0);
const avgTime = totalTime / results.length;

console.log("\n🔥 Smoke Test Results\n");

// Format for table
const formatted = results.map((r, i) => ({
  "#": i + 1,
  "Endpoint": r.endpoint.length > 28 ? r.endpoint.slice(0, 25) + "..." : r.endpoint,
  "Method": r.method,
  "Auth": r.auth === "admin" ? "🔐" : "🌐",
  "Status": r.status,
  "Expected": r.expected,
  "Result": r.pass ? "✅" : "❌",
  "Time": r.time + "ms"
}));

console.log(Bun.inspect.table(formatted, { colors: true }));

console.log("\n📊 Summary: " + passed + "/" + results.length + " passed, " + failed + " failed");
console.log("⏱️  Total: " + totalTime.toFixed(1) + "ms | Avg: " + avgTime.toFixed(2) + "ms/request");

if (failed > 0) {
  console.log("\n❌ Failed tests:");
  results.filter(r => !r.pass).forEach(r => {
    console.log("   " + r.method + " " + r.endpoint + " - got " + r.status + ", expected " + r.expected);
  });
}
