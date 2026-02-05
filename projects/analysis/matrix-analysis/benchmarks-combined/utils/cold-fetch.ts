#!/usr/bin/env bun
// Cold fetch benchmark - no preconnect, measures baseline latency
// Usage: hyperfine 'bun scripts/bench/cold-fetch.ts'

const hosts = [
  "https://api.github.com",
  "https://registry.npmjs.org",
  "https://bun.sh",
];

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
console.log(`Cold fetch total: ${totalMs.toFixed(2)}ms`);
console.log(Bun.inspect.table(results.map(r => ({
  Host: r.host.replace("https://", ""),
  "Latency (ms)": r.latencyMs.toFixed(2),
  Status: r.status || "error",
}))));
