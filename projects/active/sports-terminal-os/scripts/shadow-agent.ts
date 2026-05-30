#!/usr/bin/env bun
/**
 * Shadow Agent Worker — Cookie Renewal Automation
 *
 * Uses Bun's native WebView (WebKit-based, headless) to navigate to the
 * Buckeye login page, extract fresh Cloudflare cookies (cf_clearance,
 * __cf_bm), and push them to the main server's /api/internal/update-cookies
 * endpoint. No Puppeteer, no Chromium, no npm installs — zero dependencies.
 *
 * Designed to run via system cron or Bun.cron every 15 minutes.
 *
 * Usage:
 *   bun run scripts/shadow-agent.ts                  # extract + push
 *   bun run scripts/shadow-agent.ts --dry-run        # validate config only
 *   bun run scripts/shadow-agent.ts --session <id>   # target specific session
 *
 * Environment:
 *   BUCKEYE_LOGIN_URL     — Buckeye login page URL (required)
 *   BUCKEYE_USERNAME      — Buckeye account username (required)
 *   BUCKEYE_PASSWORD      — Buckeye account password (required)
 *   INTERNAL_API_TOKEN    — Shared secret for /api/internal/update-cookies
 *   SERVER_URL            — Main server URL (default: http://localhost:3000)
 *   PROXY_URL             — Optional proxy for outbound traffic
 *   TELEGRAM_BOT_TOKEN    — Bot token for failure alerts (optional)
 *   TELEGRAM_CHAT_ID      — Chat ID for alert delivery (optional)
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  loginUrl: process.env.BUCKEYE_LOGIN_URL || "",
  username: process.env.BUCKEYE_USERNAME || "",
  password: process.env.BUCKEYE_PASSWORD || "",
  serverUrl: (process.env.SERVER_URL || "http://localhost:3000").replace(/\/$/, ""),
  internalToken: process.env.INTERNAL_API_TOKEN || "",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const sessionArgIdx = args.indexOf("--session");
const TARGET_SESSION = sessionArgIdx >= 0 ? args[sessionArgIdx + 1] : undefined;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";

function log(level: string, color: string, msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`${color}[${ts} ${level}]${RESET} ${msg}`);
}

const info = (msg: string) => log("INFO", CYAN, msg);
const ok = (msg: string) => log("OK", GREEN, msg);
const warn = (msg: string) => log("WARN", YELLOW, msg);
const err = (msg: string) => log("ERR", RED, msg);

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

function validateConfig(): string[] {
  const missing: string[] = [];
  if (!CONFIG.loginUrl) missing.push("BUCKEYE_LOGIN_URL");
  if (!CONFIG.username) missing.push("BUCKEYE_USERNAME");
  if (!CONFIG.password) missing.push("BUCKEYE_PASSWORD");
  if (!CONFIG.internalToken) missing.push("INTERNAL_API_TOKEN");
  return missing;
}

// ---------------------------------------------------------------------------
// Telegram alert
// ---------------------------------------------------------------------------

async function sendTelegramAlert(message: string): Promise<void> {
  if (!CONFIG.telegramBotToken || !CONFIG.telegramChatId) {
    warn("Telegram not configured — alert not sent");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONFIG.telegramChatId,
        text: `⚠️ **Shadow Agent Alert**\n${message}`,
        parse_mode: "Markdown",
      }),
    });

    if (!resp.ok) {
      warn(`Telegram alert failed: ${resp.status}`);
    }
  } catch {
    warn("Telegram alert delivery failed (network)");
  }
}

// ---------------------------------------------------------------------------
// Cookie push to main server
// ---------------------------------------------------------------------------

interface PushResult {
  ok: boolean;
  statusCode: number;
  body: string;
}

async function pushCookies(
  sessionId: string,
  cfClearance: string,
  cfBm?: string,
  expiresAt?: number
): Promise<PushResult> {
  const url = `${CONFIG.serverUrl}/api/internal/update-cookies`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": CONFIG.internalToken,
      },
      body: JSON.stringify({
        sessionId,
        cfClearance,
        cfBm,
        expiresAt,
      }),
    });

    const body = await resp.text();

    return {
      ok: resp.ok,
      statusCode: resp.status,
      body,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false,
      statusCode: 0,
      body: msg,
    };
  }
}

// ---------------------------------------------------------------------------
// Session discovery
// ---------------------------------------------------------------------------

interface ActiveSession {
  sessionId: string;
  ttlSeconds: number;
}

async function discoverSessions(): Promise<ActiveSession[]> {
  try {
    const resp = await fetch(`${CONFIG.serverUrl}/api/internal/health`, {
      headers: { "X-Internal-Token": CONFIG.internalToken },
    });

    if (!resp.ok) return [];

    const data = (await resp.json()) as {
      sessions?: Array<{ sessionId: string; ttlSeconds: number }>;
    };
    return data.sessions || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Cookie extraction (native Bun WebView — zero dependencies)
// ---------------------------------------------------------------------------

/**
 * Bun's built-in WebView uses the platform-native WebKit engine.
 * Cloudflare sees a legitimate browser profile, no stealth plugin needed.
 *
 * API surface:
 *   new WebView({ headless, width, height, userAgent, proxy })
 *   wv.navigate(url)           — sync navigation
 *   wv.onNavigated = callback  — fires on page load
 *   wv.evaluate(jsString)      — run JS, returns Promise<result>
 *   wv.loading                 — boolean, true while page loads
 *   wv.close()                 — tear down
 */
async function extractCookies(): Promise<{
  cfClearance: string;
  cfBm?: string;
  expiresAt?: number;
}> {
  const { WebView } = require("bun");

  const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15";

  const wvOptions: Record<string, unknown> = {
    headless: true,
    width: 1280,
    height: 720,
    userAgent: UA,
  };

  if (process.env.PROXY_URL) {
    wvOptions.proxy = process.env.PROXY_URL;
  }

  info("Launching native WebView (WebKit, headless)...");
  const wv = new WebView(wvOptions);

  // Track navigation completion
  let navigationDone = false;
  let navigationError: string | null = null;
  wv.onNavigated = (url: string) => {
    navigationDone = true;
    info(`Navigated to: ${url}`);
  };
  // @ts-expect-error — onNavigationFailed exists at runtime
  wv.onNavigationFailed = (url: string, error: string) => {
    navigationError = `Navigation to ${url} failed: ${error}`;
    navigationDone = true;
  };

  try {
    // ── 1. Navigate to Buckeye login ──
    info(`Navigating to ${CONFIG.loginUrl}...`);
    wv.navigate(CONFIG.loginUrl);

    // Wait for initial navigation
    await waitForNavigation(wv, 30000);
    if (navigationError) throw new Error(navigationError);

    // ── 2. Wait for Cloudflare challenge ──
    info("Waiting for Cloudflare challenge...");
    const cfPassed = await waitForCfChallenge(wv, 45000);
    if (!cfPassed) {
      warn("Cloudflare challenge may still be active — proceeding anyway");
    }

    // ── 3. Handle login form if present ──
    const hasLoginForm = await wv.evaluate(
      `!!(document.querySelector('input[type="text"], input[type="email"], input[name="username"], input[name="email"]') && document.querySelector('input[type="password"]'))`
    );

    if (hasLoginForm) {
      info("Login form detected — authenticating...");

      // Fill username
      await wv.evaluate(
        `var f = document.querySelector('input[type="text"], input[type="email"], input[name="username"], input[name="email"]'); if(f) { f.value = ${JSON.stringify(CONFIG.username)}; f.dispatchEvent(new Event('input', { bubbles: true })); }`
      );

      // Fill password
      await wv.evaluate(
        `var f = document.querySelector('input[type="password"]'); if(f) { f.value = ${JSON.stringify(CONFIG.password)}; f.dispatchEvent(new Event('input', { bubbles: true })); }`
      );

      // Click submit
      await wv.evaluate(
        `var btn = document.querySelector('button[type="submit"], input[type="submit"]'); if(btn) btn.click();`
      );

      // Wait for post-login redirect
      navigationDone = false;
      navigationError = null;
      await waitForNavigation(wv, 15000);
    } else {
      info("No login form detected — proceeding with cookie extraction");
    }

    // ── 4. Wait for cookies to settle ──
    await sleep(3000);

    // ── 5. Extract cookies ──
    const cookieStr: string = await wv.evaluate("document.cookie");
    const cookies = parseCookies(cookieStr);
    info(`Extracted ${Object.keys(cookies).length} cookies from browser session`);

    const cfClearance = cookies["cf_clearance"];
    const cfBm = cookies["__cf_bm"];

    if (!cfClearance) {
      throw new Error(
        "cf_clearance cookie not found. Cloudflare challenge may have failed."
      );
    }

    ok(`cf_clearance: ${cfClearance.slice(0, 20)}...`);
    if (cfBm) {
      ok(`__cf_bm: ${cfBm.slice(0, 20)}...`);
    } else {
      warn("__cf_bm cookie not found (non-critical)");
    }

    // Expiration: document.cookie doesn't expose expiry for HttpOnly cookies.
    // Default to 30 minutes from now (typical Cloudflare clearance TTL).
    const expiresAt = Math.floor(Date.now() / 1000) + 1800;

    return {
      cfClearance,
      cfBm,
      expiresAt,
    };
  } finally {
    wv.close();
    info("WebView closed");
  }
}

// ── WebView helpers ──

/** Poll until navigation completes or timeout. */
function waitForNavigation(wv: any, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (!wv.loading) {
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        warn(`Navigation timed out after ${timeoutMs}ms`);
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

/** Poll until Cloudflare challenge clears (page title doesn't contain "Just a moment"). */
async function waitForCfChallenge(wv: any, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const title: string = await wv.evaluate("document.title");
      const bodyText: string = await wv.evaluate("document.body ? document.body.innerText.slice(0, 200) : ''");

      if (
        !title.includes("Just a moment") &&
        !title.includes("Checking") &&
        !bodyText.includes("Checking your browser") &&
        !bodyText.includes("DDoS protection")
      ) {
        return true;
      }
    } catch {
      // evaluate may throw if page is still loading — retry
    }
    await sleep(1500);
  }
  return false;
}

/** Parse document.cookie string into a key-value map. */
function parseCookies(cookieStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieStr) return result;

  for (const pair of cookieStr.split("; ")) {
    const eq = pair.indexOf("=");
    if (eq > 0) {
      result[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
  }
  return result;
}

/** Promise-based sleep. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Cookie health probe — event-driven refresh trigger
// ---------------------------------------------------------------------------

interface ProbeResult {
  sessionId: string;
  healthy: boolean;
  statusCode: number;
  error?: string;
}

/**
 * Check whether a session's current cf_clearance cookie is still valid
 * by making a lightweight request to the Buckeye proxy.
 *
 * If the proxy returns 403 (Forbidden), the cookie has expired and needs
 * refresh. Any other status (200, 401, 503) means the cookie is still
 * accepted by Cloudflare — skip the expensive WebView extraction.
 *
 * This turns the Shadow Agent from time-based (always refresh every 15 min)
 * to event-driven (only refresh when cookies actually die).
 */
async function probeCookieHealth(sessionId: string): Promise<ProbeResult> {
  const proxyUrl = process.env.BUCKEYE_PROXY_URL || CONFIG.serverUrl;
  const probeUrl = `${proxyUrl.replace(/\/$/, "")}/api/proxy/health`;

  try {
    const resp = await fetch(probeUrl, {
      method: "GET",
      headers: {
        "X-Internal-Token": CONFIG.internalToken,
        "X-Session-Id": sessionId,
      },
      // Don't follow redirects — Cloudflare 403 is what we're looking for
      redirect: "manual",
    });

    const healthy = resp.status !== 403;

    return {
      sessionId,
      healthy,
      statusCode: resp.status,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Network error";
    return {
      sessionId,
      healthy: false,
      statusCode: 0,
      error: msg,
    };
  }
}

/**
 * Probe all active sessions. Returns which need refresh.
 * If BUCKEYE_PROXY_URL is not set, assumes all sessions need refresh
 * (falls back to time-based behavior).
 */
async function probeAllSessions(
  sessionIds: string[]
): Promise<{ healthy: string[]; stale: string[]; results: ProbeResult[] }> {
  if (!process.env.BUCKEYE_PROXY_URL) {
    info("BUCKEYE_PROXY_URL not set — skipping health probe, refreshing all sessions");
    return { healthy: [], stale: sessionIds, results: [] };
  }

  info(`Probing cookie health for ${sessionIds.length} sessions...`);
  const results: ProbeResult[] = [];

  for (const sid of sessionIds) {
    const result = await probeCookieHealth(sid);
    results.push(result);

    if (result.healthy) {
      ok(`Session ${sid}: healthy (${result.statusCode})`);
    } else {
      warn(`Session ${sid}: STALE (${result.statusCode}${result.error ? ` — ${result.error}` : ""})`);
    }
  }

  const healthy = results.filter((r) => r.healthy).map((r) => r.sessionId);
  const stale = results.filter((r) => !r.healthy).map((r) => r.sessionId);

  info(`${healthy.length} healthy, ${stale.length} stale (of ${sessionIds.length} total)`);
  return { healthy, stale, results };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\n${BOLD}${CYAN}=== Shadow Agent Worker ===${RESET}\n`);

  // 1. Validate config
  const missing = validateConfig();
  if (missing.length > 0) {
    err(`Missing environment variables: ${missing.join(", ")}`);
    console.log("\nRequired:");
    console.log("  BUCKEYE_LOGIN_URL    — Buckeye login page");
    console.log("  BUCKEYE_USERNAME     — Account username");
    console.log("  BUCKEYE_PASSWORD     — Account password");
    console.log("  INTERNAL_API_TOKEN   — Shared secret for internal API");
    console.log("\nOptional:");
    console.log("  BUCKEYE_PROXY_URL    — Proxy for health probe (skips extraction if healthy)");
    console.log("  TELEGRAM_BOT_TOKEN   — Bot token for failure alerts");
    console.log("  TELEGRAM_CHAT_ID     — Chat ID for alert delivery\n");
    process.exit(1);
  }

  info(`Server: ${CONFIG.serverUrl}`);
  info(`Login:  ${CONFIG.loginUrl}`);
  info(`User:   ${CONFIG.username}`);

  if (DRY_RUN) {
    info("DRY RUN — skipping extraction and push");

    // Check if main server is reachable
    const sessions = await discoverSessions();
    info(`Active sessions: ${sessions.length}`);
    for (const s of sessions) {
      info(`  ${s.sessionId} (TTL ${s.ttlSeconds}s)`);
    }

    if (sessions.length === 0) {
      warn("No active sessions — create one via POST /api/proxy/auth first");
    }

    console.log(`\n${GREEN}Dry run complete.${RESET} Run without --dry-run to extract + push.\n`);
    return;
  }

  // 2. Discover sessions (or use --session)
  let sessionIds: string[];

  if (TARGET_SESSION) {
    sessionIds = [TARGET_SESSION];
    info(`Targeting session: ${TARGET_SESSION}`);
  } else {
    const sessions = await discoverSessions();
    sessionIds = sessions.map((s) => s.sessionId);
    info(`Found ${sessionIds.length} active sessions`);
  }

  if (sessionIds.length === 0) {
    err("No active sessions to refresh. Create one via POST /api/proxy/auth first.");
    await sendTelegramAlert("Cookie refresh failed: no active sessions found.");
    process.exit(1);
  }

  // 3. Probe cookie health — only extract if stale
  const { healthy, stale } = await probeAllSessions(sessionIds);

  if (stale.length === 0) {
    ok(`All ${healthy.length} sessions healthy — skipping extraction`);
    console.log(`\n${GREEN}No refresh needed.${RESET}\n`);
    return;
  }

  // 4. Extract fresh cookies via native Bun WebView
  info(`${stale.length} stale session(s) — launching WebView extraction...`);
  let cookies: { cfClearance: string; cfBm?: string; expiresAt?: number };

  try {
    cookies = await extractCookies();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown extraction error";
    err(`Cookie extraction failed: ${msg}`);
    await sendTelegramAlert(`Cookie extraction failed: ${msg}`);
    process.exit(1);
  }

  // 5. Push to stale sessions only
  let pushed = 0;
  let failed = 0;
  let skipped = healthy.length;

  for (const sessionId of stale) {
    info(`Pushing cookies to session ${sessionId}...`);
    const result = await pushCookies(
      sessionId,
      cookies.cfClearance,
      cookies.cfBm,
      cookies.expiresAt
    );

    if (result.ok) {
      ok(`Session ${sessionId}: updated (${result.statusCode})`);
      pushed++;
    } else {
      err(`Session ${sessionId}: push failed (${result.statusCode}) — ${result.body}`);
      failed++;
    }
  }

  // 6. Summary
  console.log(`\n${BOLD}--- Summary ---${RESET}`);
  if (skipped > 0) console.log(`${CYAN}Skipped (healthy): ${skipped}${RESET}`);
  console.log(`${GREEN}Pushed: ${pushed}${RESET}`);
  if (failed > 0) console.log(`${RED}Failed: ${failed}${RESET}`);

  if (failed > 0 && pushed === 0) {
    await sendTelegramAlert(
      `Cookie refresh: ALL ${stale.length} stale sessions failed to update. ` +
      `Check Shadow Agent logs.`
    );
    process.exit(1);
  } else if (failed > 0) {
    await sendTelegramAlert(
      `Cookie refresh: ${pushed}/${stale.length} stale sessions updated. ` +
      `${failed} failures, ${skipped} healthy skipped.`
    );
  }

  ok(`Done — ${pushed} refreshed, ${skipped} skipped (healthy).\n`);
}

main().catch((e) => {
  err(`Fatal: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
