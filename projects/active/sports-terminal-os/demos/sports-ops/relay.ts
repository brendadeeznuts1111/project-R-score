/**
 * Sports ops relay.
 *
 * Serves the command center, keeps a Chrome session on fantasy402,
 * stores wagers and spread history in sqlite, and pushes one state
 * document over GET /api/state and WS /ws.
 *
 * Credentials come from the environment only:
 *   F402_USER F402_PASSWORD FOURC_EMAIL FOURC_PASSWORD
 * Chrome profile and sqlite live in demos/.sports-ops/ (gitignored).
 */
import { Database } from "bun:sqlite";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Cdp, openChromeTab } from "./cdp.ts";
import {
  deriveAlerts,
  deriveMovers,
  deriveSharp,
  gameKey,
  historyFromPoints,
  mapScore,
  mapWager,
  type DeskGame,
  type DeskWager,
  type F402Score,
  type F402Wager,
} from "./map.ts";

const root = import.meta.dir;
const htmlPath = join(root, "../sports-ops-command-center.html");
const dataDir = join(root, "../.sports-ops");
const port = Number(Bun.env.SPORTS_OPS_PORT || 8787);
const chromePort = Number(Bun.env.SPORTS_OPS_CHROME_PORT || 9333);
const chromeBin = Bun.env.CHROME_PATH || "/opt/google/chrome/chrome";

mkdirSync(dataDir, { recursive: true });
const db = new Database(join(dataDir, "desk.sqlite"));
db.run(`CREATE TABLE IF NOT EXISTS wagers (
  wager_number TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  seen_at TEXT NOT NULL
)`);
db.run(`CREATE TABLE IF NOT EXISTS spreads (
  game TEXT NOT NULL,
  spread REAL NOT NULL,
  seen_at TEXT NOT NULL
)`);
db.run(`CREATE TABLE IF NOT EXISTS link_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  t TEXT NOT NULL,
  src TEXT NOT NULL,
  detail TEXT NOT NULL
)`);

type Links = { f402: string; fourc: string };
type LogLine = { t: string; src: string; detail: string };

const logs: LogLine[] = [];
let wagers: DeskWager[] = [];
let games: DeskGame[] = [];
let previousGames: DeskGame[] = [];
let movers = deriveMovers([], []);
let links: Links = { f402: "offline", fourc: "seed" };
let latency = "SEED";
let source: "live" | "seed" = "seed";
const sockets = new Set<ServerWebSocket<unknown>>();

function log(src: string, detail: string) {
  const line = { t: new Date().toISOString(), src, detail };
  logs.unshift(line);
  logs.splice(40);
  db.run("INSERT INTO link_log (t, src, detail) VALUES (?, ?, ?)", [line.t, src, detail]);
  console.log(`[${src}] ${detail}`);
}

function currentState() {
  const history = historyFromPoints(
    db.query("SELECT game, spread FROM spreads ORDER BY seen_at ASC").all() as { game: string; spread: number }[],
    games,
  );
  const feed = wagers.length ? deriveAlerts(wagers) : [];
  const sharp = deriveSharp(wagers);
  return {
    source,
    updatedAt: new Date().toISOString(),
    books: null,
    latency,
    noise: 0,
    events: movers.filter((row) => row.hot).map((row) => ({ score: row.hot ? 0.8 : 0.4, what: row.what })),
    feed,
    games,
    movers,
    history,
    betfeed: wagers.slice(0, 40),
    sharp,
    logs,
    links,
  };
}

function publish() {
  const state = currentState();
  const packet = JSON.stringify({ type: "state", state });
  for (const socket of sockets) {
    try {
      socket.send(packet);
    } catch {
      sockets.delete(socket);
    }
  }
}

function rememberWagers(rows: F402Wager[]) {
  const mapped = rows.map(mapWager).filter((row): row is DeskWager => row != null);
  mapped.sort((a, b) => Number(b.id) - Number(a.id) || b.ts.localeCompare(a.ts));
  const insert = db.prepare("INSERT OR REPLACE INTO wagers (wager_number, payload, seen_at) VALUES (?, ?, ?)");
  const now = new Date().toISOString();
  const tx = db.transaction((list: DeskWager[]) => {
    for (const wager of list) insert.run(wager.id, JSON.stringify(wager), now);
  });
  tx(mapped);
  wagers = mapped;
}

function rememberScores(rows: F402Score[]) {
  const next = rows.map(mapScore).filter((row): row is DeskGame => row != null);
  const fresh = deriveMovers(previousGames.length ? previousGames : games, next);
  if (fresh.length) movers = [...fresh, ...movers].slice(0, 8);
  previousGames = games.length ? games : next;
  games = next;
  const insert = db.prepare("INSERT INTO spreads (game, spread, seen_at) VALUES (?, ?, ?)");
  const now = new Date().toISOString();
  for (const game of next) {
    if (game.spread == null) continue;
    const last = db.query("SELECT spread FROM spreads WHERE game = ? ORDER BY seen_at DESC LIMIT 1").get(gameKey(game)) as
      | { spread: number }
      | null;
    if (!last || last.spread !== game.spread) insert.run(gameKey(game), game.spread, now);
  }
}

function toolResult(name: string, args: Record<string, unknown>) {
  const state = currentState();
  const limit = Number(args.limit ?? 15) || 15;
  switch (name) {
    case "get_board_state":
      return {
        source: state.source,
        updatedAt: state.updatedAt,
        games: state.games.length,
        liveGames: state.games.filter((game) => game.live).length,
        alerts: state.feed.length,
        movers: state.movers.length,
        noise: state.noise,
        wagers: state.betfeed.length,
        sharpProfiles: state.sharp.length,
        logLines: state.logs.length,
        historyGames: Object.keys(state.history),
        links: state.links,
      };
    case "list_games":
      return state.games
        .filter((game) => !args.sport || game.sport.toUpperCase() === String(args.sport).toUpperCase())
        .filter((game) => !args.liveOnly || game.live)
        .map((game) => ({
          sport: game.sport,
          away: game.away,
          home: game.home,
          score: `${game.as}-${game.bs}`,
          status: game.status,
          line: game.line,
          live: game.live,
        }));
    case "get_betfeed":
      return state.betfeed
        .filter((wager) => !args.customer || wager.customer === args.customer)
        .filter((wager) => !args.source || wager.source === args.source)
        .slice(0, limit);
    case "get_sharp_profiles":
      return args.customer
        ? state.sharp.filter((row) => row.customer === args.customer)
        : state.sharp.slice(0, limit);
    case "get_alerts":
      return state.feed.filter((row) => !args.severity || row.sev === args.severity).slice(0, limit);
    case "get_movers":
      return { noiseFiltered: state.noise, movers: state.movers.slice(0, limit) };
    case "get_logs":
      return state.logs.filter((row) => !args.src || row.src === args.src).slice(0, limit);
    case "get_line_history": {
      const keys = Object.keys(state.history);
      const needle = String(args.game ?? "").toLowerCase();
      const key = needle ? keys.find((item) => item.toLowerCase().includes(needle)) : keys[0];
      if (!key) return { error: "no history for that game", available: keys };
      return { game: key, ...state.history[key] };
    }
    case "get_link_status":
      return { source: state.source, links: state.links, latency: state.latency, updatedAt: state.updatedAt };
    case "get_dashboard_manifest":
      return {
        planes: {
          wagers: { source: "fantasy402.com", via: "Chrome session → getBetTicker → sqlite", relay: "WS /ws" },
          scores: { source: "fantasy402.com", via: "getScoresLiveDynamic", panels: ["live board", "line history"] },
          odds: { source: "4codds.com", via: "Chrome probe", status: state.links.fourc },
        },
        tools: [
          "get_board_state",
          "list_games",
          "get_betfeed",
          "get_sharp_profiles",
          "get_alerts",
          "get_movers",
          "get_logs",
          "get_line_history",
          "get_link_status",
          "get_dashboard_manifest",
        ],
      };
    default:
      return { error: "unknown tool", name };
  }
}

function loadSessionEnv() {
  const path = join(dataDir, "session.env");
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadSessionEnv();

const LOGIN_JS = `(async (user, pass) => {
  if (location.pathname.includes("manager") && sessionStorage.getItem("token")) {
    return { ok: true, href: location.href, reused: true };
  }
  if (!location.pathname.endsWith("/") && !document.querySelector('[data-field="user"]')) {
    location.href = "https://fantasy402.com/";
    return { ok: false, href: location.href, moved: true };
  }
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const btn = document.querySelector('[data-action="login"]');
    const jq = window.$;
    if (btn && jq && jq._data && jq._data(btn, "events") && jq._data(btn, "events").click) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const userEl = document.querySelector('[data-field="user"]');
  const passEl = document.querySelector('[data-field="pass"]');
  const btn = document.querySelector('[data-action="login"]');
  if (!userEl || !passEl || !btn) return { ok: false, href: location.href, reason: "login form missing" };
  userEl.value = user;
  passEl.value = pass;
  btn.click();
  const end = Date.now() + 25000;
  while (Date.now() < end) {
    if (location.pathname.includes("manager") && sessionStorage.getItem("token")) return { ok: true, href: location.href };
    await new Promise((r) => setTimeout(r, 250));
  }
  return { ok: false, href: location.href, reason: document.body.innerText.replace(/\\s+/g, " ").slice(0, 160) };
})(${JSON.stringify(Bun.env.F402_USER ?? "")}, ${JSON.stringify(Bun.env.F402_PASSWORD ?? "")})`;

async function readTicker(page: Cdp): Promise<F402Wager[]> {
  const payload = await page.evaluate<{ ok: boolean; rows?: F402Wager[] }>(`new Promise((resolve) => {
    const jq = window.$;
    if (!jq) { resolve({ ok: false }); return; }
    const agentID = String(sessionStorage.getItem("customerID") || "").trim();
    jq.ajax({
      url: "/cloud/api/Manager/getBetTicker",
      type: "POST",
      data: { agentID, wagerNumber: 0, operation: "getBetTicker", RRO: 1 },
      success: (data) => resolve({ ok: true, rows: (data && data.LIST) || [] }),
      error: () => resolve({ ok: false })
    });
  })`);
  return payload.ok && payload.rows ? payload.rows : [];
}

async function readScores(page: Cdp): Promise<F402Score[]> {
  const payload = await page.evaluate<{ ok: boolean; rows?: F402Score[]; status?: number }>(`new Promise((resolve) => {
    const jq = window.$;
    if (!jq) { resolve({ ok: false, status: 0 }); return; }
    jq.ajax({
      url: "/cloud/api/Report/getScoresLiveDynamic",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ operation: "getScoresLiveDynamic" }),
      success: (data) => resolve({ ok: true, rows: (data && data.Scores) || [] }),
      error: (xhr) => resolve({ ok: false, status: xhr.status })
    });
  })`);
  return payload.ok && payload.rows ? payload.rows : [];
}

async function probeFourc(): Promise<void> {
  try {
    const tab = await openChromeTab(chromePort, "https://4codds.com/");
    const page = await Cdp.connect(tab.webSocketDebuggerUrl);
    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await new Promise((r) => setTimeout(r, 3500));
    const info = await page.evaluate<{ title: string; text: string; hasPass: boolean }>(`({
      title: document.title,
      text: document.body ? document.body.innerText.replace(/\\s+/g, " ").slice(0, 240) : "",
      hasPass: Boolean(document.querySelector('input[type="password"]'))
    })`);
    page.close();
    const blocked = /blocked|attention required|cloudflare/i.test(`${info.title} ${info.text}`);
    if (blocked) links.fourc = "blocked";
    else if (info.hasPass && !(Bun.env.FOURC_PASSWORD || "").length) links.fourc = "signin";
    else if (info.hasPass) links.fourc = "signin";
    else links.fourc = "live";
    log("4c", links.fourc === "blocked" ? "cloudflare blocked this network" : `page ${info.title || "open"}`);
  } catch (error) {
    links.fourc = "blocked";
    log("4c", error instanceof Error ? error.message : "probe failed");
  }
}

async function waitForTarget(needle: string, timeoutMs = 25000): Promise<string> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const list = (await fetch(`http://127.0.0.1:${chromePort}/json/list`).then((res) => res.json())) as {
      type?: string;
      url?: string;
      webSocketDebuggerUrl?: string;
    }[];
    const hit = list.find((target) => target.type === "page" && (target.url ?? "").includes(needle) && target.webSocketDebuggerUrl);
    if (hit?.webSocketDebuggerUrl) return hit.webSocketDebuggerUrl;
    await Bun.sleep(400);
  }
  throw new Error(`${needle} tab did not open`);
}

async function runBrowser() {
  const user = Bun.env.F402_USER ?? "";
  const password = Bun.env.F402_PASSWORD ?? "";
  if (!user || !password) {
    log("f402", "set F402_USER and F402_PASSWORD to open a session");
    return;
  }
  const child = spawn(chromeBin, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${join(dataDir, "chrome")}`,
    "about:blank",
  ], { stdio: "ignore" });
  child.on("exit", (code) => log("chrome", `exit ${code ?? "?"}`));
  for (let i = 0; i < 30; i++) {
    try {
      const version = await fetch(`http://127.0.0.1:${chromePort}/json/version`);
      if (version.ok) break;
    } catch {
      await Bun.sleep(200);
    }
  }
  const tab = await openChromeTab(chromePort, "https://fantasy402.com/");
  let page = await Cdp.connect(tab.webSocketDebuggerUrl);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  try {
    const login = await page.evaluate<{ ok: boolean; reason?: string }>(LOGIN_JS, 30000);
    if (!login.ok) log("f402", login.reason || "login still settling");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("navigated or closed")) throw error;
  }
  const managerWs = await waitForTarget("manager.html");
  page.close();
  page = await Cdp.connect(managerWs);
  await page.send("Page.enable");
  await page.send("Runtime.enable");
  await page.send("Network.enable");
  page.onEvent = (event) => {
    if (event.method !== "Network.responseReceived") return;
    const response = event.params.response as { url?: string; status?: number } | undefined;
    const requestId = String(event.params.requestId ?? "");
    const url = response?.url ?? "";
    if (!url.includes("getBetTicker") || response?.status !== 200) return;
    void page.send("Network.getResponseBody", { requestId }).then((body) => {
      const raw = body as { body?: string; base64Encoded?: boolean };
      const text = raw.base64Encoded ? Buffer.from(raw.body ?? "", "base64").toString("utf8") : raw.body ?? "";
      const data = JSON.parse(text) as { LIST?: F402Wager[] };
      const list = Array.isArray(data.LIST) ? data.LIST : [];
      rememberWagers(list);
      links.f402 = "live";
      source = "live";
      latency = "5s";
      log("f402", `${list.length} ticker rows`);
      publish();
    }).catch(() => {});
  };
  log("f402", "session open");
  await page.send("Page.navigate", { url: "https://fantasy402.com/manager.html?bet-ticker=active" });
  await Bun.sleep(5000);
  const pullLive = async () => {
    const started = Date.now();
    const [scoreRows, tickerRows] = await Promise.all([readScores(page), readTicker(page)]);
    rememberScores(scoreRows);
    if (tickerRows.length) rememberWagers(tickerRows);
    latency = `${Date.now() - started}ms`;
    if (scoreRows.length || tickerRows.length) {
      links.f402 = "live";
      source = "live";
      log("f402", `${tickerRows.length} wagers · ${scoreRows.length} games`);
      publish();
    }
  };
  await pullLive();
  setInterval(() => {
    void pullLive().catch((error) => log("f402", error instanceof Error ? error.message : "poll failed"));
  }, 15000);
  await probeFourc();
  publish();
}

const html = () => new Response(Bun.file(htmlPath), { headers: { "content-type": "text/html; charset=utf-8" } });

Bun.serve({
  port,
  hostname: "127.0.0.1",
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return undefined;
      return new Response("upgrade failed", { status: 400 });
    }
    if (url.pathname === "/" || url.pathname.endsWith("sports-ops-command-center.html")) return html();
    if (url.pathname === "/api/state") return Response.json(currentState());
    if (url.pathname === "/api/logs") return Response.json(logs);
    if (url.pathname === "/api/mcp" && req.method === "POST") {
      return req.json().then((body: { name?: string; arguments?: Record<string, unknown> }) => {
        const name = String(body.name ?? "");
        return Response.json(toolResult(name, body.arguments ?? {}));
      });
    }
    return new Response("missing", { status: 404 });
  },
  websocket: {
    open(socket) {
      sockets.add(socket);
      socket.send(JSON.stringify({ type: "state", state: currentState() }));
    },
    message() {},
    close(socket) {
      sockets.delete(socket);
    },
  },
});

log("relay", `http://127.0.0.1:${port}/`);
void runBrowser().catch((error) => log("relay", error instanceof Error ? error.message : "browser failed"));
