#!/usr/bin/env bun
/**
 * Mega‑liner v8 — Change‑Aware Terminal Dashboard
 *
 * v7 + deepEquals change detection + console.depth rich logging.
 * Only stores screenshots and broadcasts when odds actually change.
 *
 * Every Bun primitive, zero dependencies, one file:
 *
 *   Bun.WebView         — headless browser with `await using` disposal
 *   Bun.Image           — placeholder, resize, modulate, JPEG compression
 *   Bun.CryptoHasher    — SHA‑256 content hashing for screenshot dedup
 *   Bun.cron            — in‑process scraper schedule (every minute)
 *   Bun.markdown.ansi   — live terminal hygiene report
 *   Bun.deep.equals     — structural change detection (skip unchanged scrapes)
 *   console.depth       — rich nested debug output (no [Object] truncation)
 *   Bun.TOML.parse      — native config + selector parsing
 *   Bun.password        — bcrypt admin auth hash
 *   Bun.Transpiler      — dynamic alert filter eval
 *   Bun.listen          — Prometheus TCP metrics (:9090)
 *   Bun.udpSocket       — syslog heartbeat
 *   Bun.serve           — versioned WS + thumbnail HTTP endpoint
 *   bun:sqlite          — odds feed + screenshots + audit log
 *
 * Endpoints:
 *   ws://localhost:3001/ws/odds-drift   — versioned WebSocket (odds-drift-v2.1.0)
 *   http://localhost:3001/report         — Markdown hygiene report
 *   http://localhost:3001/health         — JSON health check
 *   http://localhost:3001/thumbs/:site   — JPEG thumbnail on‑the‑fly
 *   tcp://localhost:9090                 — Prometheus metrics
 *
 * Usage:
 *   bun run demos/mega-liner-v7.ts
 *   ADMIN_PASSWORD=secret bun run demos/mega-liner-v7.ts
 */

// ---------------------------------------------------------------------------
// 0. Imports
// ---------------------------------------------------------------------------

import { Database } from "bun:sqlite";
import { deepEquals } from "bun";
import { readConfigFromPackage } from "../src/utils/readme-config-loader";

// Rich nested debug output — no more [Object] truncation in logs
console.depth = 8;

// ---------------------------------------------------------------------------
// 0.5. Odds Selectors — versioned config from README package
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
  oddsSelectors = await readConfigFromPackage<OddsSelectorsConfig>("odds-selectors");
  const teams = Object.keys(oddsSelectors).filter((k) => k !== "fallback");
  console.log(`📦 odds-selectors v1.0.0: ${teams.length} teams + fallback`);
} catch {
  console.log("⚠️  odds-selectors not found — using hardcoded fallback selectors");
}

// ---------------------------------------------------------------------------
// 1. Bun.TOML.parse — native config (self-bootstrapping)
// ---------------------------------------------------------------------------

const CONFIG_PATH = "/tmp/odds-config.toml";
const defaultConfig = `
expected_odds_phrase_alignment = 0.95
expected_bookmaker_resolution = 0.98
expected_bet_slip_confidence = 0.90
expected_odds_format_drift = 0.02
`;
const configToml = await Bun.file(CONFIG_PATH).text().catch(() => defaultConfig);
await Bun.write(CONFIG_PATH, configToml);
const thresholds = Bun.TOML.parse(configToml) as Record<string, number>;
console.log("📋 Config:", thresholds);

// ---------------------------------------------------------------------------
// 2. bun:sqlite — odds feed + screenshots + audit
// ---------------------------------------------------------------------------

const db = new Database(":memory:");

db.run(`
  CREATE TABLE odds_feed (
    id              INTEGER PRIMARY KEY,
    site            TEXT,
    team_name       TEXT,
    canonical_phrase TEXT,
    canonical_name  TEXT,
    odds_value      TEXT,
    confidence      REAL,
    screenshot_id   INTEGER,
    timestamp       INTEGER
  )
`);

db.run(`
  CREATE TABLE screenshots (
    id          INTEGER PRIMARY KEY,
    site        TEXT,
    url         TEXT,
    width       INTEGER,
    height      INTEGER,
    format      TEXT,
    sha256      TEXT,
    captured_at INTEGER
  )
`);

// Seed baseline data
const now = Date.now();
const insert = db.prepare(
  "INSERT INTO odds_feed VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
insert.run(1, "demo", "Arsenal", "Arsenal", "Arsenal FC", "2.00", 0.96, null, now);
insert.run(2, "demo", "Manchester Utd", null, "Manchester United FC", "1.80", 0.85, null, now - 60_000);
insert.run(3, "demo", "Real Madrid", null, "Real Madrid CF", "1.50", 0.70, null, now - 120_000);
insert.run(4, "demo", "Barcelona", null, null, "invalid", 0.60, null, now - 180_000);
insert.run(5, "demo", "Liverpool", "Liverpool", "Liverpool FC", "2.20", 0.99, null, now);
console.log("🗄️  SQLite: 5 rows seeded, 2 tables");

// ---------------------------------------------------------------------------
// 3. Auth — Bun.password (bcrypt) + Bun.CryptoHasher (API key) + sessions
// ---------------------------------------------------------------------------

const ADMIN_PASSWORD = Bun.env.ADMIN_PASSWORD ?? "demo";
const ADMIN_HASH = await Bun.password.hash(ADMIN_PASSWORD, "bcrypt");

// API key — SHA‑256 hashed at startup (raw key never stored in memory)
const API_KEY_HASH: string | null = Bun.env.ADMIN_API_KEY
  ? new Bun.CryptoHasher("sha256").update(Bun.env.ADMIN_API_KEY).digest("hex") as string
  : null;

// Session store — v7 UUID tokens, SHA‑256 hashed, 1hr TTL
const SESSION_TTL_MS = parseInt(Bun.env.SESSION_TTL_MS ?? "3600000", 10); // 1hr default
const sessions = new Map<string, { user: string; createdAt: number; expires: number }>();

console.log(
  `🔐 Auth: bcrypt + ${API_KEY_HASH ? "API key (SHA‑256)" : "password only"} + sessions (${SESSION_TTL_MS / 1000}s TTL)`
);

/** Verify a password against the bcrypt hash. */
async function verifyPassword(pass: string): Promise<boolean> {
  return Bun.password.verify(pass, ADMIN_HASH);
}

/** Verify an API key against the SHA‑256 hash (constant‑time safe — hash compare). */
function verifyApiKey(key: string): boolean {
  if (!API_KEY_HASH) return false;
  const hashed = new Bun.CryptoHasher("sha256").update(key).digest("hex") as string;
  return hashed === API_KEY_HASH;
}

/** Create a session token (v7 UUID, time‑ordered) and return the plain token. */
function createSession(user: string): string {
  const token = Bun.randomUUIDv7();
  const hashed = new Bun.CryptoHasher("sha256").update(token).digest("hex") as string;
  sessions.set(hashed, {
    user,
    createdAt: Date.now(),
    expires: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

/** Verify a Bearer token against the session store. Returns user or null. */
function verifySession(token: string): { user: string } | null {
  const hashed = new Bun.CryptoHasher("sha256").update(token).digest("hex") as string;
  const session = sessions.get(hashed);
  if (!session) return null;
  if (Date.now() > session.expires) {
    sessions.delete(hashed);
    return null;
  }
  return { user: session.user };
}

/** Garbage‑collect expired sessions. */
function gcSessions(): number {
  const now = Date.now();
  let removed = 0;
  for (const [hash, session] of sessions) {
    if (now > session.expires) {
      sessions.delete(hash);
      removed++;
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------
// 4. Bun.Transpiler — dynamic alert filter
// ---------------------------------------------------------------------------

const transpiler = new Bun.Transpiler({ loader: "ts" });
let alertFilter: (a: Record<string, unknown>) => boolean = eval(
  transpiler.transformSync("(alert: any) => true")
);

// ---------------------------------------------------------------------------
// 5. Metrics computation
// ---------------------------------------------------------------------------

function computeMetrics() {
  const total = (db.query("SELECT COUNT(*) as cnt FROM odds_feed").get() as { cnt: number }).cnt;
  const phrase = (db.query("SELECT COUNT(*) as cnt FROM odds_feed WHERE canonical_phrase IS NOT NULL").get() as { cnt: number }).cnt;
  const bookmaker = (db.query("SELECT COUNT(*) as cnt FROM odds_feed WHERE canonical_name IS NOT NULL").get() as { cnt: number }).cnt;
  const avgConf = (db.query("SELECT AVG(confidence) as avg FROM odds_feed WHERE timestamp >= ?", [Date.now() - 3_600_000]).get() as { avg: number | null }).avg ?? 0;
  const driftCount = (db.query("SELECT COUNT(*) as cnt FROM odds_feed WHERE odds_value GLOB '*[^0-9.]*' AND timestamp >= ?", [Date.now() - 300_000]).get() as { cnt: number }).cnt;
  const lastRows = (db.query("SELECT COUNT(*) as cnt FROM odds_feed WHERE timestamp >= ?", [Date.now() - 300_000]).get() as { cnt: number }).cnt;
  const screenshotCount = (db.query("SELECT COUNT(*) as cnt FROM screenshots").get() as { cnt: number }).cnt;
  return {
    phraseAlignment: total ? phrase / total : 0,
    bookmakerRes: total ? bookmaker / total : 0,
    avgConfidence: avgConf,
    formatDrift: lastRows ? driftCount / lastRows : 0,
    totalRows: total,
    screenshots: screenshotCount,
  };
}

// ---------------------------------------------------------------------------
// 6. Bun.markdown.ansi — terminal report
// ---------------------------------------------------------------------------

function computeMarkdownReport(): string {
  const s = computeMetrics();
  const ok = (v: number, t: number) => (v >= t ? "✅" : "❌");
  return [
    "# Odds Hygiene Report",
    "",
    `| Metric | Value | Threshold | Status |`,
    `|--------|-------|-----------|--------|`,
    `| Phrase alignment | ${(s.phraseAlignment * 100).toFixed(1)}% | ${(thresholds.expected_odds_phrase_alignment * 100).toFixed(1)}% | ${ok(s.phraseAlignment, thresholds.expected_odds_phrase_alignment)} |`,
    `| Bookmaker resolution | ${(s.bookmakerRes * 100).toFixed(1)}% | ${(thresholds.expected_bookmaker_resolution * 100).toFixed(1)}% | ${ok(s.bookmakerRes, thresholds.expected_bookmaker_resolution)} |`,
    `| Avg confidence | ${s.avgConfidence.toFixed(2)} | ${thresholds.expected_bet_slip_confidence} | ${ok(s.avgConfidence, thresholds.expected_bet_slip_confidence)} |`,
    `| Format drift | ${(s.formatDrift * 100).toFixed(1)}% | max ${(thresholds.expected_odds_format_drift * 100).toFixed(1)}% | ${s.formatDrift <= thresholds.expected_odds_format_drift ? "✅" : "❌"} |`,
    "",
    `**Rows:** ${s.totalRows} | **Screenshots:** ${s.screenshots} | **Updated:** ${new Date().toISOString()}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 7. Demo HTML page (matches odds-selectors fallback config)
// ---------------------------------------------------------------------------

const ODDS_DEMO_PATH = "/tmp/odds-demo.html";

// table.odds tr → td:nth-child(1) for team, td:nth-child(2) for odds
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

// ---------------------------------------------------------------------------
// 8. Thumbnail cache (in‑memory, served by HTTP endpoint)
// ---------------------------------------------------------------------------

const thumbCache = new Map<string, Uint8Array>();

/** Previous snapshot per site — used by deepEquals to skip unchanged scrapes. */
const lastSnapshotCache = new Map<string, object>();

// ---------------------------------------------------------------------------
// 9. Bun.WebView + Bun.Image — headless scraping with image pipeline
// ---------------------------------------------------------------------------

let scrapingActive = false;

async function processSite(
  site: string,
  url: string
): Promise<{ site: string; oddsCount: number; placeholder: string } | undefined> {
  const sel = oddsSelectors?.[site] ?? oddsSelectors?.fallback;
  if (!sel) {
    console.log(`⚠️  No selectors for ${site} and no fallback configured`);
    return;
  }

  if (scrapingActive) {
    console.log("⏭️  Scrape skipped — previous still running");
    return;
  }
  scrapingActive = true;

  try {
    // await using — native disposal, no transpile, no finally block
    await using view = new Bun.WebView({ width: 1280, height: 800 });

    // Navigate and wait for load via onNavigated callback (no setTimeout guess)
    const { promise: loaded, resolve: onLoad } = Promise.withResolvers<void>();
    view.onNavigated = () => onLoad();
    await view.navigate(url);
    await loaded;

    // Screenshot with encoding:"buffer" → zero-copy mmap Buffer (no Blob dance)
    const screenshotBytes = await view.screenshot({ encoding: "buffer" }) as Buffer;

    // Bun.Image pipeline — construct directly from Buffer
    const img = new Bun.Image(screenshotBytes);

    // metadata() is async — returns { width, height, format }
    const meta = await img.metadata();
    const imgW = meta.width;
    const imgH = meta.height;

    // SHA‑256 for dedup / audit trail
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(screenshotBytes);
    const sha256 = hasher.digest("hex") as string;

    // Store screenshot metadata
    const row = db
      .query(
        `INSERT INTO screenshots (site, url, width, height, format, sha256, captured_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .get(site, url, imgW, imgH, "png", sha256, Date.now()) as { id: number };
    const screenshotId = row.id;

    // Extract odds via DOM evaluation using versioned selectors
    const evaluateJs = `
      [...document.querySelectorAll('${sel.rowSelector}')].map(row => ({
        team: row.querySelector('${sel.teamSelector}')?.textContent?.trim(),
        odds: row.querySelector('${sel.oddsSelector}')?.textContent?.trim(),
        confidence: ${sel.confSelector ? `row.querySelector('${sel.confSelector}')?.textContent?.trim()` : "null"},
      }))`;

    const odds = (await view.evaluate(evaluateJs)) as Array<{
      team: string | null;
      odds: string | null;
      confidence: string | null;
    }>;

    // Build current snapshot for change detection
    const currentSnapshot = {
      site,
      rows: odds.map(o => ({ team: o.team, odds: o.odds, confidence: o.confidence })),
      img: { width: imgW, height: imgH },
    };

    const prevSnapshot = lastSnapshotCache.get(site);
    const changed = !prevSnapshot || !deepEquals(prevSnapshot, currentSnapshot);

    if (changed) {
      // Upsert into odds_feed
      const upsert = db.prepare(
        `INSERT INTO odds_feed (site, team_name, odds_value, confidence, screenshot_id, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const ts = Date.now();
      for (const o of odds) {
        if (o.team && o.odds) {
          upsert.run(site, o.team, o.odds, parseFloat(o.confidence ?? "0"), screenshotId, ts);
        }
      }

      // Blur‑up placeholder for instant WebSocket preview (base64 data URL)
      const placeholder = (await img.placeholder()) as string;

      // Dark‑mode thumbnail for dashboard (resize + modulate + JPEG compress)
      const thumb = img
        .modulate({ brightness: 0.85, saturation: 0.6 })
        .resize(400, 300, { fit: "inside", filter: "mitchell", withoutEnlargement: true });
      const thumbBytes = await thumb.jpeg({ quality: 85 }).bytes();
      thumbCache.set(site, thumbBytes);

      // Update cache
      lastSnapshotCache.set(site, currentSnapshot);

      console.log(
        `🌐 ${site}: ${odds.length} rows CHANGED, ${screenshotBytes.length}B screenshot, ` +
        `${thumbBytes.byteLength}B thumb, sha256=${sha256.slice(0, 12)}…`
      );

      return { site, oddsCount: odds.length, placeholder, changed: true, prevSnapshot };
    }

    // Unchanged — skip storage, keep existing cache
    console.log(
      `⏭️  ${site}: unchanged (deepEquals), ${odds.length} rows — skipped storage`
    );

    return { site, oddsCount: odds.length, placeholder: null, changed: false, prevSnapshot };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ ${site} scrape failed:`, msg);
    return undefined;
  } finally {
    scrapingActive = false;
  }
}

// ---------------------------------------------------------------------------
// 9.5. Admin auth handlers
// ---------------------------------------------------------------------------

async function handleAdminLogin(req: Request): Promise<Response> {
  // Try Bearer token first (already logged in)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const session = verifySession(authHeader.slice(7));
    if (session) {
      return Response.json({ status: "ok", user: session.user, method: "token" });
    }
    return Response.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Try Basic Auth
  if (authHeader.startsWith("Basic ")) {
    try {
      const [user, pass] = atob(authHeader.slice(6)).split(":");
      if (await verifyPassword(pass)) {
        const token = createSession(user || "admin");
        return Response.json({ status: "ok", user: user || "admin", token, method: "password" });
      }
    } catch { /* fall through */ }
    return Response.json({ error: "Invalid credentials" }, { status: 403 });
  }

  // Try API key (query param or X-Api-Key header)
  const keyParam = new URL(req.url).searchParams.get("key");
  const keyHeader = req.headers.get("X-Api-Key");
  const apiKey = keyParam ?? keyHeader;
  if (apiKey && verifyApiKey(apiKey)) {
    const token = createSession("admin");
    return Response.json({ status: "ok", user: "admin", token, method: "apikey" });
  }

  return Response.json(
    { error: "Authenticate with Basic Auth, X-Api-Key header, or ?key= query param" },
    { status: 401 }
  );
}

function requireAuth(req: Request): { user: string } | null {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    return verifySession(authHeader.slice(7));
  }
  // Also allow API key for non-login admin routes
  const keyHeader = req.headers.get("X-Api-Key");
  const keyParam = new URL(req.url).searchParams.get("key");
  const apiKey = keyParam ?? keyHeader;
  if (apiKey && verifyApiKey(apiKey)) {
    return { user: "admin" };
  }
  return null;
}

function handleAdminSessions(req: Request): Response {
  const auth = requireAuth(req);
  if (!auth) return Response.json({ error: "Authentication required" }, { status: 401 });

  const list = [...sessions.entries()].map(([hash, s]) => ({
    hashPrefix: (hash as string).slice(0, 12),
    user: s.user,
    createdAt: new Date(s.createdAt).toISOString(),
    expires: new Date(s.expires).toISOString(),
    active: Date.now() <= s.expires,
  }));

  return Response.json({ sessions: list, total: list.length });
}

function handleAdminLogout(req: Request): Response {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const hashed = new Bun.CryptoHasher("sha256")
      .update(authHeader.slice(7))
      .digest("hex") as string;
    sessions.delete(hashed);
    return Response.json({ status: "ok", message: "Logged out" });
  }
  return Response.json({ error: "Bearer token required" }, { status: 400 });
}

// ---------------------------------------------------------------------------
// 10. Bun.serve — versioned WebSocket + thumbnail HTTP
// ---------------------------------------------------------------------------

const server = Bun.serve({
  port: 3001,
  fetch(req, srv) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws/odds-drift") {
      if (srv.upgrade(req)) return;
      return new Response("WebSocket upgrade failed", { status: 426 });
    }

    // Thumbnail endpoint — serve cached JPEG on‑the‑fly
    if (url.pathname.startsWith("/thumbs/")) {
      const site = url.pathname.split("/").pop()!.replace(/\.\w+$/, "");
      const bytes = thumbCache.get(site);
      if (!bytes) return new Response("Not found", { status: 404 });
      return new Response(bytes, {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=60" },
      });
    }

    // Markdown report
    if (url.pathname === "/report") {
      return new Response(computeMarkdownReport(), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }

    // ── Admin routes (auth required) ──

    // POST /admin/login — password, API key, or existing Bearer token
    if (req.method === "POST" && url.pathname === "/admin/login") {
      return handleAdminLogin(req);
    }

    // DELETE /admin/sessions — logout (invalidate current token)
    if (req.method === "DELETE" && url.pathname === "/admin/sessions") {
      return handleAdminLogout(req);
    }

    // GET /admin/sessions — list active sessions (Bearer token required)
    if (url.pathname === "/admin/sessions") {
      return handleAdminSessions(req);
    }

    // Health check
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        protocol: "odds-drift-v3.0.0",
        uptime: process.uptime(),
        thumbnails: thumbCache.size,
        snapshotsCached: lastSnapshotCache.size,
        activeSessions: sessions.size,
      });
    }

    return new Response(
      "Mega‑liner v7 — /ws/odds-drift | /report | /health | /thumbs/:site",
      { status: 200 }
    );
  },

  websocket: {
    backpressureLimit: 64 * 1024,
    idleTimeout: 120,

    open(ws) {
      ws.subscribe("odds-hygiene");
      ws.send(
        JSON.stringify({
          type: "handshake",
          protocol: "odds-drift-v2.1.0",
          serverTime: Date.now(),
        })
      );
      console.log("🔌 WS client connected (odds-hygiene)");
    },

    message(ws, msg) {
      try {
        const data = JSON.parse(msg as string);
        if (data.type === "set_filter") {
          try {
            const code = transpiler.transformSync(`(alert) => ${data.filter ?? "true"}`);
            alertFilter = eval(code);
            ws.send(JSON.stringify({ type: "filter_updated", data: { filter: data.filter } }));
          } catch {
            ws.send(JSON.stringify({ type: "filter_error", data: { message: "Invalid filter" } }));
          }
        }
      } catch { /* ignore non-JSON */ }
    },

    close(ws) {
      ws.unsubscribe("odds-hygiene");
      console.log("🔌 WS client disconnected");
    },
  },
});

console.log(`🚀 Mega‑liner v8 (Change‑Aware) on ${server.url}`);

// ---------------------------------------------------------------------------
// 11. Scrape orchestrator — called by cron + initial run
// ---------------------------------------------------------------------------

async function scrapeAllSites(): Promise<void> {
  console.log("⏰ Scraping all sites…");

  // Session GC — clean expired tokens on each cron tick
  const removed = gcSessions();
  if (removed > 0) console.log(`🗑️  Session GC: removed ${removed} expired`);

  const result = await processSite("demo", `file://${ODDS_DEMO_PATH}`);

  if (result) {
    const stats = computeMetrics();

    if (result.changed) {
      const payload = {
        site: result.site,
        oddsCount: result.oddsCount,
        metrics: stats,
        placeholder: result.placeholder,
        thumbnail: `/thumbs/${result.site}.jpg`,
        changed: true,
        timestamp: Date.now(),
      };

      // Broadcast structured JSON to WS clients
      server.publish(
        "odds-hygiene",
        JSON.stringify({
          type: "data",
          protocol: "odds-drift-v3.0.0",
          payload,
        })
      );

      // Rich console output via Bun.inspect (respects console.depth)
      console.log(Bun.inspect({ event: "data:changed", ...payload }));
    } else {
      const payload = {
        site: result.site,
        status: "unchanged",
        metrics: stats,
        timestamp: Date.now(),
      };

      // Lightweight heartbeat — no change, just confirm we're alive
      server.publish(
        "odds-hygiene",
        JSON.stringify({
          type: "heartbeat",
          protocol: "odds-drift-v3.0.0",
          payload,
        })
      );

      console.log(`📡 Heartbeat: ${result.site} unchanged (deepEquals)`);
    }
  }
}

// ---------------------------------------------------------------------------
// 12. Bun.cron — every minute
// ---------------------------------------------------------------------------

const cronJob = Bun.cron("* * * * *", () => scrapeAllSites());
console.log("⏰ Cron: every minute");

// ---------------------------------------------------------------------------
// 13. Bun.listen — Prometheus TCP (:9090)
// ---------------------------------------------------------------------------

Bun.listen({
  port: 9090,
  hostname: "127.0.0.1",
  socket: {
    data(socket) {
      const s = computeMetrics();
      socket.write(
        [
          "# HELP odds_phrase_alignment Phrase alignment ratio",
          "# TYPE odds_phrase_alignment gauge",
          `odds_phrase_alignment ${s.phraseAlignment}`,
          "",
          "# HELP odds_bookmaker_resolution Bookmaker resolution ratio",
          "# TYPE odds_bookmaker_resolution gauge",
          `odds_bookmaker_resolution ${s.bookmakerRes}`,
          "",
          "# HELP odds_screenshots_total Total screenshots captured",
          "# TYPE odds_screenshots_total counter",
          `odds_screenshots_total ${s.screenshots}`,
          "",
        ].join("\n")
      );
      socket.end();
    },
  },
});

console.log("📊 Prometheus on tcp://127.0.0.1:9090");

// ---------------------------------------------------------------------------
// 14. Bun.udpSocket — syslog heartbeat (every 10s)
// ---------------------------------------------------------------------------

const udp = await Bun.udpSocket({});
setInterval(() => udp.send("ping", 514, "127.0.0.1"), 10_000);
console.log("💓 UDP heartbeat: 127.0.0.1:514 every 10s");

// ---------------------------------------------------------------------------
// 15. Terminal report (Bun.markdown.ansi, every 30s)
// ---------------------------------------------------------------------------

setInterval(() => {
  const md = computeMarkdownReport();
  const ansi = Bun.markdown.ansi(md, {});
  console.clear();
  process.stdout.write(ansi + "\n");
  console.log("─".repeat(60));
  console.log("Ctrl+C to stop | /report | /thumbs/:site | :9090 Prometheus");
}, 30_000);

// ---------------------------------------------------------------------------
// 16. Initial scrape
// ---------------------------------------------------------------------------

await scrapeAllSites();

console.log("✅ Mega‑liner v8 ready — deepEquals change detection, console.depth=8, `using` native");
console.log("");
