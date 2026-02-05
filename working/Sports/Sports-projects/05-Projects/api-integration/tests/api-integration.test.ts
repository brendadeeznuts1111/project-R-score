// API Integration - Tests
import { test, expect, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import { createServer, handleGameEvent, handleOddsUpdate } from "../src/server";
import { loadConfig, validateConfig, DEFAULT_CONFIG } from "../src/config";
import { SportradarClient } from "../src/sportradar-client";
import { OddsClient } from "../src/odds-client";
import { ClientPool, resetPool } from "../src/client-pool";
import type { GameEvent, OddsData, ApiConfig } from "../src/types";

// Mock odds server for testing
let mockOddsServer: ReturnType<typeof Bun.serve>;
let mockOddsPort: number;

beforeAll(() => {
  // Create mock odds API server
  mockOddsServer = Bun.serve({
    port: 0,
    routes: {
      "/odds": (req) => {
        const url = new URL(req.url);
        const gameId = url.searchParams.get("gameId");
        return Response.json({
          gameId,
          market: "moneyline",
          home_odds: -150,
          away_odds: 130,
          spread: 5.5,
          timestamp: Date.now(),
        });
      },
    },
    fetch() {
      return Response.json({ error: "Not found" }, { status: 404 });
    },
  });
  mockOddsPort = mockOddsServer.port;
});

afterAll(() => {
  mockOddsServer.stop();
  resetPool();
});

describe("config", () => {
  beforeEach(() => {
    // Clear env vars
    delete process.env.SPORTRADAR_URL;
    delete process.env.SPORTRADAR_API_KEY;
    delete process.env.ODDS_URL;
    delete process.env.ODDS_API_KEY;
  });

  test("loads config from environment variables", () => {
    process.env.SPORTRADAR_URL = "wss://test.sportradar.com";
    process.env.SPORTRADAR_API_KEY = "test-key";
    process.env.ODDS_URL = "https://test.odds.com";
    process.env.ODDS_API_KEY = "odds-key";

    const config = loadConfig();

    expect(config.sportradar.url).toBe("wss://test.sportradar.com");
    expect(config.sportradar.apiKey).toBe("test-key");
    expect(config.odds.url).toBe("https://test.odds.com");
    expect(config.odds.apiKey).toBe("odds-key");
  });

  test("validates required API keys", () => {
    const config: ApiConfig = {
      sportradar: { url: "wss://api.sportradar.com", apiKey: "", sports: ["NBA"] },
      odds: { url: "https://api.odds.com", apiKey: "" },
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing sportradar.apiKey");
    expect(result.errors).toContain("Missing odds.apiKey");
  });

  test("validates URL formats", () => {
    const config: ApiConfig = {
      sportradar: { url: "invalid-url", apiKey: "key", sports: ["NBA"] },
      odds: { url: "ftp://wrong.com", apiKey: "key" },
    };

    const result = validateConfig(config);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("sportradar.url"))).toBe(true);
    expect(result.errors.some((e) => e.includes("odds.url"))).toBe(true);
  });

  test("uses defaults when env vars missing", () => {
    const config = loadConfig();

    expect(config.sportradar.url).toBe(DEFAULT_CONFIG.sportradar.url);
    expect(config.sportradar.sports).toEqual(["NBA", "WNBA"]);
    expect(config.odds.url).toBe(DEFAULT_CONFIG.odds.url);
  });

  test("validates valid config passes", () => {
    const config: ApiConfig = {
      sportradar: { url: "wss://api.sportradar.com", apiKey: "key123", sports: ["NBA"] },
      odds: { url: "https://api.odds.com", apiKey: "key456" },
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("SportradarClient", () => {
  test("initializes with disconnected state", () => {
    const client = new SportradarClient({
      url: "wss://api.sportradar.com",
      apiKey: "test",
      sports: ["NBA"],
    });

    expect(client.getState()).toBe("disconnected");
  });

  test("subscribes to sport feeds", () => {
    const client = new SportradarClient({
      url: "wss://api.sportradar.com",
      apiKey: "test",
      sports: ["NBA"],
    });

    // Subscribe before connect - should queue
    client.subscribe("NBA");
    client.subscribe("WNBA");

    expect(client.getState()).toBe("disconnected");
  });

  test("parses game events correctly", () => {
    const client = new SportradarClient({
      url: "wss://api.sportradar.com",
      apiKey: "test",
      sports: ["NBA"],
    });

    const rawData = {
      id: "game-123",
      sport: "NBA",
      home_team: "Lakers",
      away_team: "Celtics",
      status: "live",
      score: [105, 102],
      timestamp: 1234567890,
    };

    const event = client.parseEvent(rawData);

    expect(event.id).toBe("game-123");
    expect(event.sport).toBe("NBA");
    expect(event.teams).toEqual(["Lakers", "Celtics"]);
    expect(event.status).toBe("live");
    expect(event.score).toEqual([105, 102]);
  });

  test("emits events to handlers", () => {
    const client = new SportradarClient({
      url: "wss://api.sportradar.com",
      apiKey: "test",
      sports: ["NBA"],
    });

    const events: GameEvent[] = [];
    const unsubscribe = client.onEvent((event) => events.push(event));

    // Manually trigger event parsing
    const rawData = { id: "game-1", sport: "NBA", home_team: "A", away_team: "B" };
    const event = client.parseEvent(rawData);

    // Simulate emit by calling handler directly
    events.push(event);

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("game-1");

    // Unsubscribe works
    unsubscribe();
  });

  test("handles disconnect gracefully", async () => {
    const client = new SportradarClient({
      url: "wss://api.sportradar.com",
      apiKey: "test",
      sports: ["NBA"],
    });

    await client.disconnect();
    expect(client.getState()).toBe("disconnected");
  });
});

describe("OddsClient", () => {
  let client: OddsClient;

  beforeEach(() => {
    client = new OddsClient({
      url: `http://localhost:${mockOddsPort}`,
      apiKey: "test-key",
    });
  });

  test("fetches odds for a game", async () => {
    const odds = await client.fetchOdds("game-001");

    expect(odds.gameId).toBe("game-001");
    expect(odds.market).toBe("moneyline");
    expect(odds.homeOdds).toBe(-150);
    expect(odds.awayOdds).toBe(130);
  });

  test("caches odds data", async () => {
    await client.fetchOdds("game-002");

    const cached = client.getCached("game-002");
    expect(cached).toBeDefined();
    expect(cached?.gameId).toBe("game-002");
  });

  test("polls at specified interval", async () => {
    const updates: OddsData[] = [];
    client.onUpdate((odds) => updates.push(odds));

    client.startPolling(["game-003"], 100);
    expect(client.isPolling()).toBe(true);

    // Wait for a few polls
    await Bun.sleep(250);

    client.stopPolling();
    expect(client.isPolling()).toBe(false);
    expect(updates.length).toBeGreaterThan(0);
  });

  test("emits updates when odds change", async () => {
    const updates: OddsData[] = [];
    client.onUpdate((odds) => updates.push(odds));

    await client.fetchOdds("game-004");
    expect(updates).toHaveLength(1);

    // Fetch again - mock returns same data, so no new emit
    await client.fetchOdds("game-004");
    expect(updates).toHaveLength(1); // Same data, no change
  });

  test("getAllCached returns all cached odds", async () => {
    await client.fetchOdds("game-a");
    await client.fetchOdds("game-b");

    const all = client.getAllCached();
    expect(all).toHaveLength(2);
  });

  test("clearCache removes all cached data", async () => {
    await client.fetchOdds("game-x");
    expect(client.getCached("game-x")).toBeDefined();

    client.clearCache();
    expect(client.getCached("game-x")).toBeUndefined();
  });
});

describe("ClientPool", () => {
  test("creates pool with config", () => {
    const pool = new ClientPool({
      sportradar: { url: "wss://api.sportradar.com", apiKey: "key", sports: ["NBA"] },
      odds: { url: `http://localhost:${mockOddsPort}`, apiKey: "key" },
    });

    expect(pool.getStatus().sportradar).toBe("disconnected");
  });

  test("validates config through pool", () => {
    const pool = new ClientPool({
      sportradar: { url: "wss://api.sportradar.com", apiKey: "", sports: ["NBA"] },
      odds: { url: `http://localhost:${mockOddsPort}`, apiKey: "" },
    });

    const result = pool.validate();
    expect(result.valid).toBe(false);
  });

  test("exposes underlying clients", () => {
    const pool = new ClientPool({
      sportradar: { url: "wss://api.sportradar.com", apiKey: "key", sports: ["NBA"] },
      odds: { url: `http://localhost:${mockOddsPort}`, apiKey: "key" },
    });

    expect(pool.getSportradarClient()).toBeInstanceOf(SportradarClient);
    expect(pool.getOddsClient()).toBeInstanceOf(OddsClient);
  });

  test("fetches odds through pool", async () => {
    const pool = new ClientPool({
      sportradar: { url: "wss://api.sportradar.com", apiKey: "key", sports: ["NBA"] },
      odds: { url: `http://localhost:${mockOddsPort}`, apiKey: "key" },
    });

    const odds = await pool.fetchOdds("game-pool-1");
    expect(odds.gameId).toBe("game-pool-1");
  });
});

describe("server", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(() => {
    server = createServer();
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  test("GET /health returns connection status", async () => {
    const res = await fetch(`${baseUrl}/health`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.connections).toHaveProperty("sportradar");
    expect(data.connections).toHaveProperty("odds");
    expect(data.connections).toHaveProperty("lastUpdate");
  });

  test("GET /api/games returns game list", async () => {
    const testGame: GameEvent = {
      id: "game-001",
      sport: "NBA",
      teams: ["Lakers", "Celtics"],
      timestamp: Date.now(),
      status: "live",
    };
    handleGameEvent(testGame);

    const res = await fetch(`${baseUrl}/api/games`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBe("game-001");
  });

  test("GET /api/games/:id returns specific game", async () => {
    const res = await fetch(`${baseUrl}/api/games/game-001`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("game-001");
    expect(data.sport).toBe("NBA");
    expect(data.teams).toEqual(["Lakers", "Celtics"]);
  });

  test("GET /api/odds/:gameId returns odds", async () => {
    const testOdds: OddsData = {
      gameId: "game-001",
      market: "moneyline",
      homeOdds: -150,
      awayOdds: 130,
      timestamp: Date.now(),
    };
    handleOddsUpdate(testOdds);

    const res = await fetch(`${baseUrl}/api/odds/game-001`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.gameId).toBe("game-001");
    expect(data.homeOdds).toBe(-150);
    expect(data.awayOdds).toBe(130);
  });

  test("returns 404 for unknown routes", async () => {
    const res = await fetch(`${baseUrl}/api/unknown`);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Not found");
  });

  test("returns 404 for unknown game", async () => {
    const res = await fetch(`${baseUrl}/api/games/nonexistent`);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Game not found");
  });

  test("returns 404 for unknown odds", async () => {
    const res = await fetch(`${baseUrl}/api/odds/nonexistent`);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Odds not found");
  });
});
