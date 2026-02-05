// API Integration - HTTP API Server
//
// Routes:
// GET  /health              - Server health + connection status (JSON)
// GET  /health/live         - Liveness probe (text)
// GET  /health/ready        - Readiness probe (text)
// GET  /health/cli          - CLI-friendly status (text)
// GET  /api/games           - List current games
// GET  /api/games/:id       - Get specific game
// GET  /api/games/:id/history - Get game score history
// GET  /api/odds/:gameId    - Get odds for game
// GET  /api/odds/:gameId/history - Get odds history
// GET  /api/stats           - Database statistics
// GET  /api/session         - Get/set session cookie
// GET  /api/cookies         - View all cookies (CLI debug)
// WS   /ws/stream           - WebSocket live event stream

import type { GameEvent, OddsData } from "./types";
import type { ServerWebSocket } from "bun";
import { ClientPool, getPool } from "./client-pool";
import * as db from "./db";

// WebSocket client data
interface WSData {
  id: string;
  subscriptions: Set<"games" | "odds" | "all">;
  connectedAt: number;
}

// Fallback stores for standalone testing (when no pool provided)
const fallbackGames: Map<string, GameEvent> = new Map();
const fallbackOdds: Map<string, OddsData> = new Map();

// Active pool reference
let activePool: ClientPool | null = null;
let serverStartTime: number = Date.now();
let dbEnabled: boolean = false;

// WebSocket clients
const wsClients: Set<ServerWebSocket<WSData>> = new Set();

// Broadcast to all subscribed WebSocket clients
export function broadcast(type: "game" | "odds", data: GameEvent | OddsData): void {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  const subType = type === "game" ? "games" : "odds";

  for (const client of wsClients) {
    if (client.data.subscriptions.has("all") || client.data.subscriptions.has(subType)) {
      client.send(message);
    }
  }
}

// Get WebSocket stats
export function getWSStats(): { clients: number; subscriptions: Record<string, number> } {
  const subscriptions: Record<string, number> = { games: 0, odds: 0, all: 0 };
  for (const client of wsClients) {
    for (const sub of client.data.subscriptions) {
      subscriptions[sub]++;
    }
  }
  return { clients: wsClients.size, subscriptions };
}

export function createServer(port: number = 0, pool?: ClientPool) {
  activePool = pool || null;
  serverStartTime = Date.now();

  return Bun.serve({
    port,
    routes: {
      // JSON health check with full status
      "/health": () => {
        const status = activePool?.getStatus() || {
          sportradar: "disconnected",
          odds: "disconnected",
          lastUpdate: Date.now(),
        };
        // In demo mode, use fallback stores; otherwise try pool first
        const games = isDemoMode()
          ? Array.from(fallbackGames.values())
          : (activePool?.getAllGames() || Array.from(fallbackGames.values()));
        const wsStats = getWSStats();
        return Response.json({
          status: "ok",
          uptime: Date.now() - serverStartTime,
          mode: isDemoMode() ? "demo" : (status.sportradar === "connected" ? "live" : "standalone"),
          connections: status,
          stats: {
            games: games.length,
            liveGames: games.filter(g => g.status === "live").length,
          },
          websocket: wsStats,
        });
      },

      // Liveness probe - is the server running?
      "/health/live": () => {
        return new Response("OK\n", {
          headers: { "Content-Type": "text/plain" },
        });
      },

      // Readiness probe - is the server ready to serve?
      "/health/ready": () => {
        const status = activePool?.getStatus();
        const ready = status?.sportradar === "connected" || status?.odds === "connected";
        const standalone = !status || (status.sportradar === "disconnected" && status.odds === "disconnected");

        // Ready if connected OR in standalone mode
        if (ready || standalone) {
          return new Response("READY\n", {
            headers: { "Content-Type": "text/plain" },
          });
        }
        return new Response("NOT_READY\n", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      },

      // CLI-friendly status (parseable text)
      "/health/cli": () => {
        const status = activePool?.getStatus() || {
          sportradar: "disconnected",
          odds: "disconnected",
          lastUpdate: Date.now(),
        };
        const games = isDemoMode()
          ? Array.from(fallbackGames.values())
          : (activePool?.getAllGames() || Array.from(fallbackGames.values()));
        const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
        const wsStats = getWSStats();
        const mode = isDemoMode() ? "demo" : (status.sportradar === "connected" ? "live" : "standalone");

        const lines = [
          `status=ok`,
          `mode=${mode}`,
          `uptime=${uptime}s`,
          `sportradar=${status.sportradar}`,
          `odds=${status.odds}`,
          `games=${games.length}`,
          `live=${games.filter(g => g.status === "live").length}`,
          `ws_clients=${wsStats.clients}`,
        ];
        return new Response(lines.join("\n") + "\n", {
          headers: { "Content-Type": "text/plain" },
        });
      },

      // Session cookie endpoint
      "/api/session": (req) => {
        const sessionId = req.cookies.get("session_id");

        if (sessionId) {
          // Return existing session
          return Response.json({
            session_id: sessionId,
            message: "Session active",
          });
        }

        // Create new session
        const newSessionId = crypto.randomUUID();
        const cookie = new Bun.Cookie("session_id", newSessionId, {
          httpOnly: false,  // Accessible to JS (for local dev)
          secure: false,    // Allow HTTP (local dev)
          sameSite: "lax",
          maxAge: 86400,    // 24 hours
          path: "/",
        });

        return Response.json(
          { session_id: newSessionId, message: "Session created" },
          { headers: { "Set-Cookie": cookie.toString() } }
        );
      },

      // Debug: view all cookies (CLI-friendly)
      "/api/cookies": (req) => {
        const cookies: Record<string, string> = {};
        for (const [name, value] of req.cookies) {
          cookies[name] = value;
        }

        // CLI format
        const accept = req.headers.get("Accept") || "";
        if (accept.includes("text/plain") || !accept.includes("json")) {
          const lines = Object.entries(cookies).map(([k, v]) => `${k}=${v}`);
          return new Response(
            lines.length ? lines.join("\n") + "\n" : "(no cookies)\n",
            { headers: { "Content-Type": "text/plain" } }
          );
        }

        return Response.json({ cookies });
      },

      "/api/games": {
        GET: () => {
          const games = isDemoMode()
            ? Array.from(fallbackGames.values())
            : (activePool?.getAllGames() || Array.from(fallbackGames.values()));
          return Response.json(games);
        },
      },

      "/api/games/:id": (req) => {
        // Try DB first, then memory
        if (dbEnabled) {
          const game = db.getGame(req.params.id);
          if (game) return Response.json(game);
        }
        const game = isDemoMode()
          ? fallbackGames.get(req.params.id)
          : (activePool?.getGame(req.params.id) || fallbackGames.get(req.params.id));
        if (!game) {
          return Response.json({ error: "Game not found" }, { status: 404 });
        }
        return Response.json(game);
      },

      // Game score history
      "/api/games/:id/history": (req) => {
        if (!dbEnabled) {
          return Response.json({ error: "Database not enabled" }, { status: 503 });
        }
        const limit = Number(new URL(req.url).searchParams.get("limit")) || 100;
        const history = db.getGameHistory(req.params.id, limit);
        return Response.json({ gameId: req.params.id, history });
      },

      "/api/odds/:gameId": (req) => {
        // Try DB first for latest odds
        if (dbEnabled) {
          const odds = db.getLatestOdds(req.params.gameId);
          if (odds) return Response.json(odds);
        }
        const odds = isDemoMode()
          ? fallbackOdds.get(req.params.gameId)
          : (activePool?.getCachedOdds(req.params.gameId) || fallbackOdds.get(req.params.gameId));
        if (!odds) {
          return Response.json({ error: "Odds not found" }, { status: 404 });
        }
        return Response.json(odds);
      },

      // Odds history
      "/api/odds/:gameId/history": (req) => {
        if (!dbEnabled) {
          return Response.json({ error: "Database not enabled" }, { status: 503 });
        }
        const limit = Number(new URL(req.url).searchParams.get("limit")) || 100;
        const history = db.getOddsHistory(req.params.gameId, limit);
        return Response.json({ gameId: req.params.gameId, history });
      },

      // Database stats
      "/api/stats": () => {
        if (!dbEnabled) {
          return Response.json({ error: "Database not enabled" }, { status: 503 });
        }
        const stats = db.getStats();
        return Response.json(stats);
      },

      "/api/*": Response.json({ error: "Not found" }, { status: 404 }),

      // Serve static HTML client
      "/": async () => {
        // Resolve path relative to project root (one level up from src/)
        const projectRoot = import.meta.dir.replace(/\/src$/, "");
        const file = Bun.file(`${projectRoot}/public/index.html`);
        if (await file.exists()) {
          return new Response(file, {
            headers: { "Content-Type": "text/html" },
          });
        }
        return Response.json({ error: "Client not found" }, { status: 404 });
      },

      // WebSocket upgrade endpoint
      "/ws/stream": (req, server) => {
        const url = new URL(req.url);
        const subscribe = url.searchParams.get("subscribe") || "all";

        const upgraded = server.upgrade(req, {
          data: {
            id: crypto.randomUUID(),
            subscriptions: new Set(subscribe.split(",") as ("games" | "odds" | "all")[]),
            connectedAt: Date.now(),
          } satisfies WSData,
        });

        if (!upgraded) {
          return Response.json({ error: "WebSocket upgrade failed" }, { status: 400 });
        }
      },

      // WebSocket stats endpoint
      "/ws/stats": () => {
        return Response.json(getWSStats());
      },

      // Demo mode control
      "/api/demo": {
        GET: () => {
          return Response.json({
            active: isDemoMode(),
            games: fallbackGames.size,
            odds: fallbackOdds.size,
          });
        },
        POST: async (req) => {
          const body = await req.json().catch(() => ({})) as { action?: string; interval?: number };
          if (body.action === "start") {
            startDemoMode(body.interval || 2000);
            return Response.json({ status: "started", interval: body.interval || 2000 });
          }
          if (body.action === "stop") {
            stopDemoMode();
            return Response.json({ status: "stopped" });
          }
          return Response.json({ error: "Invalid action. Use 'start' or 'stop'" }, { status: 400 });
        },
      },
    },

    fetch(req) {
      return Response.json({ error: "Not found" }, { status: 404 });
    },

    error(error: Error) {
      return Response.json({ error: error.message }, { status: 500 });
    },

    websocket: {
      open(ws: ServerWebSocket<WSData>) {
        wsClients.add(ws);
        ws.send(JSON.stringify({
          type: "connected",
          id: ws.data.id,
          subscriptions: Array.from(ws.data.subscriptions),
          timestamp: Date.now(),
        }));
        console.log(`[ws] Client connected: ${ws.data.id} (${wsClients.size} total)`);
      },

      message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
        try {
          const msg = JSON.parse(message.toString());

          // Handle subscription changes
          if (msg.action === "subscribe" && msg.channel) {
            ws.data.subscriptions.add(msg.channel);
            ws.send(JSON.stringify({
              type: "subscribed",
              channel: msg.channel,
              subscriptions: Array.from(ws.data.subscriptions),
            }));
          }

          if (msg.action === "unsubscribe" && msg.channel) {
            ws.data.subscriptions.delete(msg.channel);
            ws.send(JSON.stringify({
              type: "unsubscribed",
              channel: msg.channel,
              subscriptions: Array.from(ws.data.subscriptions),
            }));
          }

          // Handle ping
          if (msg.action === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
          }
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        }
      },

      close(ws: ServerWebSocket<WSData>) {
        wsClients.delete(ws);
        console.log(`[ws] Client disconnected: ${ws.data.id} (${wsClients.size} remaining)`);
      },
    },
  });
}

// Event handlers for standalone testing (updates fallback stores + DB)
export function handleGameEvent(event: GameEvent): void {
  fallbackGames.set(event.id, event);
  if (dbEnabled) {
    try {
      db.saveGame(event);
    } catch (e) {
      console.error("[db] Failed to save game:", e);
    }
  }
}

export function handleOddsUpdate(data: OddsData): void {
  fallbackOdds.set(data.gameId, data);
  if (dbEnabled) {
    try {
      db.saveOdds(data);
    } catch (e) {
      console.error("[db] Failed to save odds:", e);
    }
  }
}

// Enable database persistence
export function enableDB(path?: string): void {
  db.initDB(path);
  dbEnabled = true;
  console.log(`[db] Database initialized: ${path || "data/api-integration.db"}`);
}

export function isDBEnabled(): boolean {
  return dbEnabled;
}

// Demo mode - simulates live events
const DEMO_TEAMS = [
  ["Lakers", "Celtics"],
  ["Warriors", "Heat"],
  ["Bucks", "Nets"],
  ["Suns", "Mavericks"],
  ["76ers", "Knicks"],
  ["Nuggets", "Clippers"],
];

const DEMO_STATUSES: GameEvent["status"][] = ["scheduled", "live", "live", "live", "final"];

let demoInterval: Timer | null = null;
let demoGameIndex = 0;

function generateDemoGame(): GameEvent {
  const teams = DEMO_TEAMS[demoGameIndex % DEMO_TEAMS.length];
  const status = DEMO_STATUSES[Math.floor(Math.random() * DEMO_STATUSES.length)];
  const gameId = `demo-${String(demoGameIndex + 1).padStart(3, "0")}`;

  const game: GameEvent = {
    id: gameId,
    sport: "NBA",
    teams: teams as [string, string],
    timestamp: Date.now(),
    status,
  };

  if (status === "live" || status === "final") {
    game.score = [
      Math.floor(Math.random() * 40) + 80,
      Math.floor(Math.random() * 40) + 80,
    ];
  }

  return game;
}

function generateDemoOdds(gameId: string): OddsData {
  const homeOdds = Math.floor(Math.random() * 300) - 200; // -200 to +100
  const awayOdds = homeOdds > 0 ? -(homeOdds + 20) : Math.abs(homeOdds) - 20;

  return {
    gameId,
    market: "moneyline",
    homeOdds,
    awayOdds,
    spread: Math.round((Math.random() * 10 - 5) * 2) / 2, // -5 to +5, half points
    timestamp: Date.now(),
  };
}

export function startDemoMode(intervalMs: number = 2000): void {
  if (demoInterval) return;

  console.log(`[demo] Starting demo mode (${intervalMs}ms interval)`);

  // Generate initial games
  for (let i = 0; i < 3; i++) {
    const game = generateDemoGame();
    handleGameEvent(game);
    broadcast("game", game);
    demoGameIndex++;
  }

  demoInterval = setInterval(() => {
    // Randomly choose: new game, update existing, or odds update
    const action = Math.random();

    if (action < 0.3) {
      // New game
      const game = generateDemoGame();
      handleGameEvent(game);
      broadcast("game", game);
      console.log(`[demo] New game: ${game.id} - ${game.teams.join(" vs ")}`);
      demoGameIndex++;
    } else if (action < 0.6) {
      // Update existing game score
      const games = Array.from(fallbackGames.values()).filter(g => g.status === "live");
      if (games.length > 0) {
        const game = games[Math.floor(Math.random() * games.length)];
        if (game.score) {
          game.score[Math.random() < 0.5 ? 0 : 1] += Math.floor(Math.random() * 3) + 1;
          game.timestamp = Date.now();
          handleGameEvent(game);
          broadcast("game", game);
          console.log(`[demo] Score update: ${game.id} - ${game.score.join("-")}`);
        }
      }
    } else {
      // Odds update
      const games = Array.from(fallbackGames.values());
      if (games.length > 0) {
        const game = games[Math.floor(Math.random() * games.length)];
        const odds = generateDemoOdds(game.id);
        handleOddsUpdate(odds);
        broadcast("odds", odds);
        console.log(`[demo] Odds update: ${game.id} - ${odds.homeOdds}/${odds.awayOdds}`);
      }
    }
  }, intervalMs);
}

export function stopDemoMode(): void {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
    console.log("[demo] Demo mode stopped");
  }
}

export function isDemoMode(): boolean {
  return demoInterval !== null;
}

// Start server with ClientPool if run directly
if (import.meta.main) {
  const port = Number(Bun.env.PORT) || 3001;
  const pool = getPool();
  const demoMode = Bun.env.DEMO === "1" || Bun.argv.includes("--demo");
  const demoInterval = Number(Bun.env.DEMO_INTERVAL) || 2000;
  const useDB = Bun.env.DB !== "0" && !Bun.argv.includes("--no-db");
  const dbPath = Bun.env.DB_PATH || "data/api-integration.db";

  // Initialize database (enabled by default)
  if (useDB) {
    enableDB(dbPath);
  }

  // Wire up event logging + WebSocket broadcast + DB persistence
  pool.onGameEvent((game) => {
    console.log(`[game] ${game.id}: ${game.teams.join(" vs ")} - ${game.status}`);
    handleGameEvent(game);
    broadcast("game", game);
  });

  pool.onOddsUpdate((odds) => {
    console.log(`[odds] ${odds.gameId}: ${odds.homeOdds}/${odds.awayOdds}`);
    handleOddsUpdate(odds);
    broadcast("odds", odds);
  });

  // Start server
  const server = createServer(port, pool);
  console.log(`API Integration server running at http://localhost:${server.port}`);
  console.log(`WebSocket endpoint: ws://localhost:${server.port}/ws/stream`);

  if (demoMode) {
    // Start demo mode
    startDemoMode(demoInterval);
  } else {
    // Check if API keys are configured
    const validation = pool.validate();
    if (!validation.valid) {
      console.log("Running in standalone mode (no API keys configured)");
      console.log("Set SPORTRADAR_API_KEY and ODDS_API_KEY to enable live data");
      console.log("Or run with --demo or DEMO=1 for simulated events");
    } else {
      // Attempt to connect with valid config
      pool.connect().then(() => {
        console.log("Connected to Sportradar WebSocket");
        pool.startOddsPolling(5000);
        console.log("Started odds polling (5s interval)");
      }).catch((err) => {
        console.log(`Connection failed: ${err.message}`);
      });
    }
  }
}
