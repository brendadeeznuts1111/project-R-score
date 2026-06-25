#!/usr/bin/env bun
/**
 * Mega‑liner v3 — Bun‑native headless scraping + cron + terminal Markdown reports
 *
 * Single-file demo that demonstrates every new Bun primitive woven into a
 * real‑world odds‑monitoring pipeline:
 *
 *   Bun.WebView       — headless browser scraping + screenshots
 *   Bun.cron          — in‑process cron scheduler (5-field)
 *   Bun.markdown.ansi — Markdown → ANSI terminal rendering
 *   Bun.TOML.parse    — native TOML config parsing
 *   Bun.password      — bcrypt admin auth
 *   Bun.Transpiler    — dynamic filter evaluation
 *   Bun.listen        — Prometheus TCP metrics
 *   Bun.udpSocket     — heartbeat
 *   Bun.serve         — versioned WebSocket + HTTP
 *   bun:sqlite        — in‑memory odds feed database
 *
 * Zero dependencies. One file. Pure Bun.
 *
 * Usage:
 *   bun run demos/mega-liner-v3.ts
 *   ADMIN_PASSWORD=secret bun run demos/mega-liner-v3.ts
 *
 * Endpoints:
 *   ws://localhost:3001/ws/odds-drift   — versioned WebSocket
 *   http://localhost:3001/report         — Markdown hygiene report
 *   tcp://localhost:9090                 — Prometheus metrics
 */

// ---------------------------------------------------------------------------
// 0. Imports
// ---------------------------------------------------------------------------

import { Database } from "bun:sqlite";
import { readConfigFromPackage } from "../src/utils/readme-config-loader";

// ---------------------------------------------------------------------------
// 0.5. Odds Selectors — versioned config from package README
// ---------------------------------------------------------------------------

interface TeamSelector {
  rowSelector: string;
  teamSelector: string;
  oddsSelector: string;
  confSelector?: string;
  type?: string;
}

interface OddsSelectorsConfig {
  [team: string]: TeamSelector;
  fallback: TeamSelector;
}

let oddsSelectors: OddsSelectorsConfig | null = null;

try {
  oddsSelectors = await readConfigFromPackage<OddsSelectorsConfig>(
    "odds-selectors"
  );
  const teams = Object.keys(oddsSelectors).filter((k) => k !== "fallback");
  console.log(
    `📦 Loaded odds-selectors v1.0.0: ${teams.length} teams + fallback`
  );
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`⚠️  odds-selectors not available (${msg}) — using hardcoded fallback`);
}

// ---------------------------------------------------------------------------
// 1. Bun.TOML.parse — native config (self-bootstrapping)
// ---------------------------------------------------------------------------

const CONFIG_PATH = "/tmp/odds-config.toml";

const defaultConfig = `
# Odds Hygiene Thresholds
expected_odds_phrase_alignment = 0.95
expected_bookmaker_resolution = 0.98
expected_bet_slip_confidence = 0.90
expected_odds_format_drift = 0.02
`;

const configToml = await Bun.file(CONFIG_PATH)
  .text()
  .catch(() => defaultConfig);

// Write defaults if file doesn't exist
await Bun.write(CONFIG_PATH, configToml);

const thresholds = Bun.TOML.parse(configToml) as Record<string, number>;
console.log("📋 Config loaded:", thresholds);

// ---------------------------------------------------------------------------
// 2. In‑memory SQLite — odds feed database
// ---------------------------------------------------------------------------

const db = new Database(":memory:");

db.run(`
  CREATE TABLE odds_feed (
    id              INTEGER PRIMARY KEY,
    team_name       TEXT,
    canonical_phrase TEXT,
    canonical_name  TEXT,
    confidence      REAL,
    odds_value      TEXT,
    screenshot      BLOB,
    timestamp       INTEGER
  )
`);

const now = Date.now();
const insert = db.prepare(
  "INSERT INTO odds_feed VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
);

// Seed baseline data
insert.run(1, "Arsenal", "Arsenal", "Arsenal FC", 0.96, "2.00", null, now);
insert.run(2, "Manchester Utd", null, "Manchester United FC", 0.85, "1.80", null, now - 60_000);
insert.run(3, "Real Madrid", null, "Real Madrid CF", 0.70, "1.50", null, now - 120_000);
insert.run(4, "Barcelona", null, null, 0.60, "invalid", null, now - 180_000);
insert.run(5, "Liverpool", "Liverpool", "Liverpool FC", 0.99, "2.20", null, now);

console.log("🗄️  SQLite seeded with 5 rows");

// ---------------------------------------------------------------------------
// 3. Bun.password — admin auth (bcrypt)
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = Bun.env.ADMIN_PASSWORD ?? "demo";
const ADMIN_HASH = await Bun.password.hash(ADMIN_PASSWORD, "bcrypt");
console.log("🔐 Admin hash ready (bcrypt)");

// ---------------------------------------------------------------------------
// 4. Bun.Transpiler — dynamic alert filter
// ---------------------------------------------------------------------------

const transpiler = new Bun.Transpiler({ loader: "ts" });
let alertFilter: (alert: Record<string, unknown>) => boolean = eval(
  transpiler.transformSync("(alert: any) => true")
);

// ---------------------------------------------------------------------------
// 5. Metrics computation
// ---------------------------------------------------------------------------

function computeMetrics(): {
  phraseAlignment: number;
  bookmakerRes: number;
  avgConfidence: number;
  formatDrift: number;
  totalRows: number;
} {
  const total = (
    db.query("SELECT COUNT(*) as cnt FROM odds_feed").get() as { cnt: number }
  ).cnt;
  const phrase = (
    db.query(
      "SELECT COUNT(*) as cnt FROM odds_feed WHERE canonical_phrase IS NOT NULL"
    ).get() as { cnt: number }
  ).cnt;
  const bookmaker = (
    db.query(
      "SELECT COUNT(*) as cnt FROM odds_feed WHERE canonical_name IS NOT NULL"
    ).get() as { cnt: number }
  ).cnt;
  const avgConf = (
    db
      .query(
        "SELECT AVG(confidence) as avg FROM odds_feed WHERE timestamp >= ?",
        [Date.now() - 3_600_000]
      )
      .get() as { avg: number | null }
  ).avg ?? 0;
  const driftCount = (
    db
      .query(
        "SELECT COUNT(*) as cnt FROM odds_feed WHERE odds_value GLOB '*[^0-9.]*' AND timestamp >= ?",
        [Date.now() - 300_000]
      )
      .get() as { cnt: number }
  ).cnt;
  const lastRows = (
    db
      .query(
        "SELECT COUNT(*) as cnt FROM odds_feed WHERE timestamp >= ?",
        [Date.now() - 300_000]
      )
      .get() as { cnt: number }
  ).cnt;

  return {
    phraseAlignment: total > 0 ? phrase / total : 0,
    bookmakerRes: total > 0 ? bookmaker / total : 0,
    avgConfidence: avgConf,
    formatDrift: lastRows > 0 ? driftCount / lastRows : 0,
    totalRows: total,
  };
}

// ---------------------------------------------------------------------------
// 6. Bun.markdown.ansi — terminal report rendering
// ---------------------------------------------------------------------------

function computeMarkdownReport(): string {
  const stats = computeMetrics();
  const passed = (val: number, threshold: number) => (val >= threshold ? "✅" : "❌");

  return [
    "# Odds Hygiene Report",
    "",
    `| Metric | Value | Threshold | Status |`,
    `|--------|-------|-----------|--------|`,
    `| Phrase alignment | ${(stats.phraseAlignment * 100).toFixed(1)}% | ${(thresholds.expected_odds_phrase_alignment * 100).toFixed(1)}% | ${passed(stats.phraseAlignment, thresholds.expected_odds_phrase_alignment)} |`,
    `| Bookmaker resolution | ${(stats.bookmakerRes * 100).toFixed(1)}% | ${(thresholds.expected_bookmaker_resolution * 100).toFixed(1)}% | ${passed(stats.bookmakerRes, thresholds.expected_bookmaker_resolution)} |`,
    `| Avg confidence | ${stats.avgConfidence.toFixed(2)} | ${thresholds.expected_bet_slip_confidence} | ${passed(stats.avgConfidence, thresholds.expected_bet_slip_confidence)} |`,
    `| Format drift | ${(stats.formatDrift * 100).toFixed(1)}% | max ${(thresholds.expected_odds_format_drift * 100).toFixed(1)}% | ${stats.formatDrift <= thresholds.expected_odds_format_drift ? "✅" : "❌"} |`,
    "",
    `---`,
    `**Total rows:** ${stats.totalRows} | **Updated:** ${new Date().toISOString()}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 7. Bun.WebView — headless scraping + screenshots
// ---------------------------------------------------------------------------

const ODDS_DEMO_PATH = "/tmp/odds-demo.html";

// Create a self-contained demo page for the headless browser
// Demo page uses the fallback selectors from odds-selectors config
// (table.odds tr → td:nth-child(1) for team, td:nth-child(2) for odds)
await Bun.write(
  ODDS_DEMO_PATH,
  `<!DOCTYPE html>
<html><body>
  <h1>Live Odds</h1>
  <table class="odds">
    <tr><td>Arsenal</td><td>2.10</td><td>0.96</td></tr>
    <tr><td>Liverpool</td><td>1.95</td><td>0.99</td></tr>
  </table>
</body></html>`
);

let scrapingActive = false;

async function scrapeOddsPage(): Promise<
  Array<{ team: string; odds: string }> | undefined
> {
  if (scrapingActive) {
    console.log("⏭️  Scrape skipped — previous run still active");
    return;
  }
  scrapingActive = true;

  try {
    // Create headless browser — Bun.WebView auto-detects Chrome/Edge/Safari
    await using view = new Bun.WebView({ width: 1280, height: 800 });

    // Navigate to the odds page (use file:// for self-contained demo;
    // replace with a real sportsbook URL in production)
    await view.navigate(`file://${ODDS_DEMO_PATH}`);

    // Wait for the page to settle
    await new Promise((r) => setTimeout(r, 500));

    // Build selector string from odds-selectors config (or hardcoded fallback)
    const sel = oddsSelectors?.fallback ?? {
      rowSelector: "#odds-table tr",
      teamSelector: ".team",
      oddsSelector: ".odds",
    };

    // Extract odds values via DOM evaluation using versioned selectors
    const evaluateJs = `
      [...document.querySelectorAll('${sel.rowSelector}')].map(row => ({
        team: row.querySelector('${sel.teamSelector}')?.textContent?.trim(),
        odds: row.querySelector('${sel.oddsSelector}')?.textContent?.trim(),
      }))`;

    const odds = (await view.evaluate(evaluateJs)) as Array<{
      team: string;
      odds: string;
    }>;

    console.log("🌐 Scraped odds:", odds);

    // Take a screenshot as audit evidence
    const screenshot: Blob = await view.screenshot({ format: "png" });
    if (screenshot && screenshot.size > 0) {
      const buf = await screenshot.arrayBuffer();
      db.run("UPDATE odds_feed SET screenshot = ? WHERE team_name = ?", [
        new Uint8Array(buf),
        "Arsenal",
      ]);
      console.log(`📸 Screenshot stored (${screenshot.size} bytes)`);
    }

    // Update feed with scraped values
    const now = Date.now();
    for (const row of odds) {
      if (row.team && row.odds) {
        // Upsert: update if exists, insert if new
        const existing = db
          .query("SELECT id FROM odds_feed WHERE team_name = ?", [row.team])
          .get() as { id: number } | null;

        if (existing) {
          db.run(
            "UPDATE odds_feed SET odds_value = ?, timestamp = ? WHERE id = ?",
            [row.odds, now, existing.id]
          );
        } else {
          const maxId =
            (
              db.query("SELECT MAX(id) as mx FROM odds_feed").get() as {
                mx: number;
              }
            ).mx ?? 0;
          insert.run(
            maxId + 1,
            row.team,
            null,
            null,
            0.8,
            row.odds,
            null,
            now
          );
        }
      }
    }

    // Broadcast to WebSocket subscribers
    server.publish(
      "odds-hygiene",
      JSON.stringify({
        type: "odds_update",
        data: { odds, timestamp: now },
      })
    );

    return odds;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Scrape failed:", msg);

    // Broadcast error to subscribers
    server.publish(
      "odds-hygiene",
      JSON.stringify({
        type: "scrape_error",
        data: { error: msg, timestamp: Date.now() },
      })
    );
  } finally {
    scrapingActive = false;
  }
}

// ---------------------------------------------------------------------------
// 8. Bun.serve — versioned WebSocket + HTTP
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: 3001,
  fetch(req, srv) {
    const url = new URL(req.url);

    // WebSocket upgrade for odds-drift (versioned protocol)
    if (url.pathname === "/ws/odds-drift") {
      if (srv.upgrade(req)) return;
      return new Response("WebSocket upgrade failed", { status: 426 });
    }

    // Markdown hygiene report
    if (url.pathname === "/report") {
      const md = computeMarkdownReport();
      return new Response(md, {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        protocol: "odds-drift-v2.1.0",
        uptime: process.uptime(),
      });
    }

    return new Response("Mega‑liner v3 — /ws/odds-drift | /report | /health", {
      status: 200,
    });
  },

  websocket: {
    backpressureLimit: 64 * 1024,
    idleTimeout: 120,

    open(ws) {
      // Subscribe to the odds-hygiene topic (Bun pubsub)
      ws.subscribe("odds-hygiene");

      // Send versioned handshake
      ws.send(
        JSON.stringify({
          type: "handshake",
          protocol: "odds-drift-v2.1.0",
          serverTime: Date.now(),
        })
      );

      console.log(`🔌 Client connected (topic: odds-hygiene)`);
    },

    message(ws, msg) {
      try {
        const data = JSON.parse(msg as string);
        if (data.type === "set_filter") {
          // Dynamic filter update via Bun.Transpiler
          try {
            const code = transpiler.transformSync(
              `(alert) => ${data.filter ?? "true"}`
            );
            alertFilter = eval(code);
            ws.send(
              JSON.stringify({
                type: "filter_updated",
                data: { filter: data.filter },
              })
            );
          } catch {
            ws.send(
              JSON.stringify({
                type: "filter_error",
                data: { message: "Invalid filter expression" },
              })
            );
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    },

    close(ws) {
      ws.unsubscribe("odds-hygiene");
      console.log("🔌 Client disconnected");
    },
  },
});

console.log(`🚀 Mega‑liner v3 running on ${server.url}`);

// ---------------------------------------------------------------------------
// 9. Bun.cron — in‑process scraping every minute
// ---------------------------------------------------------------------------

const cronJob = Bun.cron("* * * * *", async () => {
  console.log("⏰ Cron: scraping odds...");
  await scrapeOddsPage();
});

console.log("⏰ Cron job registered (every minute)");

// ---------------------------------------------------------------------------
// 10. Bun.listen — Prometheus TCP metrics endpoint
// ---------------------------------------------------------------------------

Bun.listen({
  port: 9090,
  hostname: "127.0.0.1",
  socket: {
    data(socket) {
      const stats = computeMetrics();
      const metrics = [
        "# HELP odds_phrase_alignment Phrase alignment ratio",
        "# TYPE odds_phrase_alignment gauge",
        `odds_phrase_alignment ${stats.phraseAlignment}`,
        "",
        "# HELP odds_bookmaker_resolution Bookmaker name resolution ratio",
        "# TYPE odds_bookmaker_resolution gauge",
        `odds_bookmaker_resolution ${stats.bookmakerRes}`,
        "",
        "# HELP odds_avg_confidence Average confidence score",
        "# TYPE odds_avg_confidence gauge",
        `odds_avg_confidence ${stats.avgConfidence}`,
        "",
        "# HELP odds_format_drift Format drift ratio",
        "# TYPE odds_format_drift gauge",
        `odds_format_drift ${stats.formatDrift}`,
        "",
      ].join("\n");
      socket.write(metrics);
      socket.end();
    },
  },
});

console.log("📊 Prometheus metrics on tcp://127.0.0.1:9090");

// ---------------------------------------------------------------------------
// 11. Bun.udpSocket — heartbeat (syslog)
// ---------------------------------------------------------------------------

const udp = await Bun.udpSocket({});
setInterval(() => {
  udp.send("ping", 514, "127.0.0.1");
}, 10_000);

console.log("💓 UDP heartbeat active (every 10s to 127.0.0.1:514)");

// ---------------------------------------------------------------------------
// 12. Terminal report rendering (every 30s)
// ---------------------------------------------------------------------------

setInterval(() => {
  const mdReport = computeMarkdownReport();
  const ansi = Bun.markdown.ansi(mdReport, {});
  console.clear();
  process.stdout.write(ansi + "\n");
  console.log("─".repeat(60));
  console.log("Press Ctrl+C to stop | /report for raw markdown | :9090 for Prometheus");
}, 30_000);

// ---------------------------------------------------------------------------
// 13. Kick off first scrape immediately
// ---------------------------------------------------------------------------

await scrapeOddsPage();

// Keep alive (cron job refs the event loop)
console.log("✅ Mega‑liner v3 ready. Cron active. Terminal report every 30s.");
console.log("");
