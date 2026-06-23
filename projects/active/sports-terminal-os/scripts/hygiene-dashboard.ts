#!/usr/bin/env bun
/**
 * Hygiene Dashboard — live ANSI terminal monitor for Zone 10
 *
 * Polls GET /ws/metrics every second and renders key pipeline
 * health metrics as ANSI-formatted tables. Uses Bun.inspect.table
 * for nested data and console.clear() for live refresh.
 *
 * Usage:
 *   bun run hygiene:dashboard
 *   bun run hygiene:dashboard --url=http://localhost:3000
 *   bun run hygiene:dashboard --interval=2
 *
 * Requires the Sports Terminal OS server to be running.
 */

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith("--url="))?.split("=")[1] ?? "http://localhost:3000";
const INTERVAL = parseInt(
  args.find((a) => a.startsWith("--interval="))?.split("=")[1] ?? "1",
  10
);

const METRICS_URL = `${BASE}/ws/metrics`;

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const reset = "\x1b[0m";
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

const bar = (val: number, max: number, width: number = 20): string => {
  const filled = Math.min(Math.round((val / max) * width), width);
  return "█".repeat(filled) + "░".repeat(width - filled);
};

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let errorCount = 0;

async function refresh(): Promise<void> {
  try {
    const res = await fetch(METRICS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();
    errorCount = 0;

    const od = m.odds_drift ?? {};
    const pl = m.pipeline ?? {};
    const rb = od.ringBuffer ?? {};
    const rl = od.rateLimit ?? {};
    const bp = od.backpressure ?? {};

    console.clear();
    console.log("");
    console.log(bold("  Sports Terminal OS — Hygiene Dashboard"));
    console.log(dim(`  ${BASE}  |  ${INTERVAL}s refresh  |  ${new Date().toLocaleTimeString()}`));
    console.log("");

    // Row 1: Core metrics
    console.log(
      `  ${cyan("Uptime")}    ${String(m.uptime_seconds).padStart(6)}s  ` +
      `${green("Conns")} ${String(m.connections).padStart(3)}  ` +
      `${yellow("RateLim")} ${String(od.rateLimited ?? 0).padStart(3)}  ` +
      `Auth ${String(od.authenticated ?? 0)}/${String((od.authenticated ?? 0) + (od.anonymous ?? 0))}`
    );
    console.log("");

    // Row 2: Ring buffer
    console.log(
      `  ${cyan("RingBuf")}   topics:${String(rb.topics ?? 0)}  entries:${String(rb.totalEntries ?? 0)}  seq:${String(rb.currentSeq ?? 0)}`
    );

    // Row 3: Rate limit bar
    const rlUsed = od.rateLimited ?? 0;
    const rlMax = rl.maxPerSec ?? 30;
    const rlColor = rlUsed > rlMax * 0.5 ? yellow : green;
    console.log(
      `  ${cyan("RateLim")}   ${rlColor(bar(rlUsed, Math.max(rlMax, 1)))} ${rlUsed}/${rlMax} msg/sec`
    );

    // Row 4: Pipeline
    console.log(
      `  ${cyan("Pipeline")}  webview:${pl.webViewAvailable ? green("✔") : red("✘")}  ` +
      `thumbs:${String(pl.thumbnailsCached ?? 0)}  ` +
      `scrapes:${String(pl.scrapes ?? 0)}/${String((pl.scrapes ?? 0) + (pl.scrapeFailures ?? 0))} ok`
    );

    // Row 5: Backpressure
    const bpUsed = 0; // not tracked per-connection in metrics yet
    const bpMax = bp.limitBytes ?? 65536;
    console.log(
      `  ${cyan("Backpres")} ${dim(bar(0, bpMax))} 0/${(bpMax / 1024).toFixed(0)}KB`
    );

    console.log("");
    console.log(dim("  Ctrl+C to exit"));
    console.log("");
  } catch (err: unknown) {
    errorCount++;
    const msg = err instanceof Error ? err.message : String(err);
    if (errorCount === 1) {
      console.clear();
      console.log("");
      console.log(red(`  ✘ Cannot reach ${METRICS_URL}`));
      console.log(dim(`  ${msg}`));
      console.log(dim(`  Is the server running? bun run src/index.ts`));
      console.log("");
    }
  }
}

// Kick off
console.clear();
console.log("");
console.log(bold("  Hygiene Dashboard starting..."));
console.log(dim(`  Polling ${METRICS_URL} every ${INTERVAL}s`));
console.log("");

await refresh();
setInterval(refresh, INTERVAL * 1000);
