#!/usr/bin/env bun
// Preconnect fetch benchmark - uses DNS prefetch warming
// Usage: bun --fetch-preconnect https://api.github.com scripts/bench/preconnect-fetch.ts
// Or:    hyperfine 'bun scripts/bench/cold-fetch.ts' 'bun --fetch-preconnect https://api.github.com,https://registry.npmjs.org,https://bun.sh scripts/bench/preconnect-fetch.ts'

import { dns } from "bun";

const hosts = [
  "https://api.github.com",
  "https://registry.npmjs.org",
  "https://bun.sh",
];

// If not using --fetch-preconnect CLI flag, warm DNS cache programmatically
const cliPreconnect = process.env.BUN_FETCH_PRECONNECT;
if (!cliPreconnect) {
  console.log("Warming DNS cache programmatically...");
  await Promise.all(
    hosts.map(async (url) => {
      const hostname = new URL(url).hostname;
      dns.prefetch(hostname, 443);
    })
  );
  // Small delay to let DNS prefetch complete
  await Bun.sleep(50);
}

const results: { host: string; latencyMs: number; status: number }[] = [];

for (const host of hosts) {
  const start = Bun.nanoseconds();
  try {
    const res = await fetch(host, { method: "HEAD" });
    const latencyMs = (Bun.nanoseconds() - start) / 1_000_000;
    results.push({ host, latencyMs, status: res.status });
  } catch (error) {
    const latencyMs = (Bun.nanoseconds() - start) / 1_000_000;
    results.push({ host, latencyMs, status: 0 });
  }
}

const totalMs = results.reduce((sum, r) => sum + r.latencyMs, 0);
console.log(`Preconnect fetch total: ${totalMs.toFixed(2)}ms`);
console.log(Bun.inspect.table(results.map(r => ({
  Host: r.host.replace("https://", ""),
  "Latency (ms)": r.latencyMs.toFixed(2),
  Status: r.status || "error",
}))));
