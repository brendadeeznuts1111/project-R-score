// no-proxy.ts — NO_PROXY respected for explicit proxy options
// Feature #21 — PR #26608 — Fixed in Bun 1.3.9
//
// Previously, NO_PROXY only worked when the proxy was auto-detected from
// http_proxy/HTTP_PROXY env vars. If you explicitly passed a proxy option
// to fetch() or new WebSocket(), NO_PROXY was ignored.
//
// Now, NO_PROXY is always checked — even with an explicit proxy option.
//
// Run: bun run examples/no-proxy.ts

process.env.NO_PROXY = "example.com,localhost";

let pass = 0;
let fail = 0;

function result(label: string, ok: boolean, detail: string) {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label}: ${detail}`);
  ok ? pass++ : fail++;
}

// --- Test 1: Explicit proxy option bypassed via NO_PROXY (the key fix) ---
try {
  const res = await fetch("https://example.com", {
    proxy: "http://127.0.0.1:1", // port 1 = guaranteed fail if proxy is used
    redirect: "follow",
  });
  result("Explicit proxy option + NO_PROXY", true, `status ${res.status}`);
} catch (err: any) {
  if (err.message?.includes("proxy") || err.code === "ECONNREFUSED") {
    result("Explicit proxy option + NO_PROXY", false,
      `Request hit proxy despite NO_PROXY: ${err.message}`);
  } else {
    console.log(`[SKIP] Network unavailable (not a proxy issue): ${err.message}`);
  }
}

// --- Test 2: Env var proxy also bypassed (existing behavior, still works) ---
process.env.HTTPS_PROXY = "http://127.0.0.1:1";
try {
  const res = await fetch("https://example.com", { redirect: "follow" });
  result("Env var proxy + NO_PROXY", true, `status ${res.status}`);
} catch (err: any) {
  if (err.message?.includes("proxy") || err.code === "ECONNREFUSED") {
    result("Env var proxy + NO_PROXY", false,
      `Request hit proxy despite NO_PROXY: ${err.message}`);
  } else {
    console.log(`[SKIP] Network unavailable (not a proxy issue): ${err.message}`);
  }
}
delete process.env.HTTPS_PROXY;

console.log(`\n${pass}/${pass + fail} passed`);
if (fail > 0) process.exit(1);
