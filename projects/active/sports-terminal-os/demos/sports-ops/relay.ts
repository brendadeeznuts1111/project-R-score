/**
 * Sports ops relay.
 *
 * Serves the command center, keeps a Bun.WebView session on fantasy402
 * and 4codds, stores wagers and spread history in sqlite, and pushes one
 * state document over GET /api/state and WS /ws.
 *
 * Logins live in Bun.secrets (service com.factorywager.sports-ops).
 * demos/.sports-ops/session.env is only a bootstrap and is gitignored,
 * along with the WebView profile and sqlite database.
 */
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-fileurltopath — Bun.fileURLToPath
import { fileURLToPath } from "bun";
import { Database } from "bun:sqlite";
import { runLiveSession } from "./browse.ts";
import { loadUnified } from "./desk-read.ts";
import { loadDeskLogins } from "./secrets.ts";
import {
  deriveMovers,
  gameKey,
  historyFromPoints,
  mapScore,
  mapWager,
  type DeskGame,
  type DeskWager,
  type F402Score,
  type F402Wager,
} from "./map.ts";

const htmlPath = fileURLToPath(new URL("../../../../../public/sports-ops/index.html", import.meta.url));
const dataDir = fileURLToPath(new URL("../.sports-ops", import.meta.url));
const port = Number(Bun.env.SPORTS_OPS_PORT || 8787);
const chromeBin =
  Bun.env.CHROME_PATH ||
  Bun.which("google-chrome") ||
  Bun.which("google-chrome-stable") ||
  Bun.which("chromium") ||
  "/opt/google/chrome/chrome";

await Bun.write(`${dataDir}/.keep`, "");
const db = new Database(`${dataDir}/desk.sqlite`);
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
db.run(`CREATE TABLE IF NOT EXISTS fourc_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seen_at TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL
)`);

type Links = { f402: string; fourc: string };
type LogLine = { t: string; src: string; detail: string };

const logs: LogLine[] = [];
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
  return {
    ...loadUnified(db, {
      source,
      updatedAt: new Date().toISOString(),
      games,
      movers,
      logs,
      links,
      latency,
      noise: 0,
      history,
      events: movers.filter((row) => row.hot).map((row) => ({ score: row.hot ? 0.8 : 0.4, what: row.what })),
    }),
    socket: true,
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
          wagers: { source: "fantasy402.com", via: "Bun.WebView → getBetTicker → sqlite", relay: "WS /ws" },
          scores: { source: "fantasy402.com", via: "getScoresLiveDynamic", panels: ["live board", "line history"] },
          odds: { source: "4codds.com", via: "Bun.WebView persistent profile", status: state.links.fourc },
          secrets: { service: "com.factorywager.sports-ops" },
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

function rememberFourc(row: { status: string; title: string }) {
  db.run("INSERT INTO fourc_status (seen_at, status, title) VALUES (?, ?, ?)", [
    new Date().toISOString(),
    row.status,
    row.title.slice(0, 120),
  ]);
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
    if (
      url.pathname === "/" ||
      url.pathname === "/sports-ops" ||
      url.pathname === "/sports-ops/" ||
      url.pathname.endsWith("index.html")
    ) return html();
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
void (async () => {
  const logins = await loadDeskLogins(`${dataDir}/session.env`);
  log(
    "secrets",
    `store ${logins.store} · f402 ${logins.f402User && logins.f402Password ? "ready" : "missing"} · 4c ${logins.fourcPassword ? "ready" : logins.fourcEmail ? "email-only" : "missing"}`,
  );
  await runLiveSession({
    profileDir: `${dataDir}/webview`,
    chromePath: chromeBin,
    logins,
    hooks: {
      log,
      onWagers(rows) {
        rememberWagers(rows);
      },
      onScores(rows) {
        rememberScores(rows);
      },
      onLinks(next, nextLatency) {
        links = next;
        latency = nextLatency;
        if (next.f402 === "live") source = "live";
        publish();
      },
      onFourc: rememberFourc,
    },
  });
})().catch((error) => log("relay", error instanceof Error ? error.message : "browser failed"));
