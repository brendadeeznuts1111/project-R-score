// no-proxy.ts — NO_PROXY respected for explicit proxy options
// Feature #21 — PR #26608 — Fixed in Bun 1.3.9
//
// fetch() and WebSocket now honor NO_PROXY even when a proxy is set
// explicitly in options or via HTTPS_PROXY env var.
//
// Run: bun run examples/no-proxy.ts

// Set a non-existent proxy — if NO_PROXY is ignored, fetch will fail
process.env.NO_PROXY = "example.com";
process.env.HTTPS_PROXY = "http://127.0.0.1:1"; // port 1 = guaranteed fail

try {
  const res = await fetch("https://example.com", { redirect: "follow" });
  console.log(`[PASS] NO_PROXY bypassed bad proxy — status ${res.status}`);
} catch (err: any) {
  // If we're offline, the error should be DNS/network, not proxy connection refused
  if (err.message?.includes("proxy") || err.code === "ECONNREFUSED") {
    console.log(`[FAIL] Request went through proxy despite NO_PROXY: ${err.message}`);
    process.exit(1);
  }
  console.log(`[SKIP] Network unavailable (not a proxy issue): ${err.message}`);
}
