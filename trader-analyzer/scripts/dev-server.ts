/**
 * @fileoverview Development Server with Hot Reload
 * @description Bun-native dev server with hot reload and state preservation
 * @module scripts/dev-server
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-DEV-SERVER@0.1.0;instance-id=DEV-SERVER-001;version=0.1.0}]
 * [PROPERTIES:{server={value:"dev-server";@root:"ROOT-DEV";@chain:["BP-BUN-WATCH","BP-HOT-RELOAD"];@version:"0.1.0"}}]
 * [CLASS:DevServer][#REF:v-0.1.0.BP.DEV.SERVER.1.0.A.1.1.DEV.1.1]]
 */

import { Database } from "bun:sqlite";
import { Hono } from "hono";

// Persistent in-memory DB across reloads (using file-based for persistence)
const DB_PATH = "./data/dev-state.db";
const db = new Database(DB_PATH);

// Initialize schema if needed
db.run(`
  CREATE TABLE IF NOT EXISTS dev_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

// Preserve state helper
function preserveState(key: string, value: any): void {
  db.run("INSERT OR REPLACE INTO dev_state (key, value, updated_at) VALUES (?, ?, ?)", [
    key,
    JSON.stringify(value),
    Date.now(),
  ]);
}

function getState(key: string): any | null {
  const row = db.query("SELECT value FROM dev_state WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row ? JSON.parse(row.value) : null;
}

// Hot reload handler (Bun v1.3.3+ watch mode)
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("♻️ Hot reload: preserving state");
    const state = db.query("SELECT count(*) as count FROM dev_state").get() as {
      count: number;
    };
    console.log(`   Preserved ${state.count} state entries`);
  });
}

// Create Hono app
const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    uptime: process.uptime(),
    state: getState("server_started") || null,
  });
});

app.get("/state/:key", (c) => {
  const key = c.req.param("key");
  const value = getState(key);
  return c.json({ key, value });
});

app.post("/state/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  preserveState(key, body);
  return c.json({ success: true, key });
});

// Start server
// Port is hardcoded in constants - see: src/constants/index.ts API_CONSTANTS.PORT
// Can be overridden via PORT environment variable
const port = parseInt(
	process.env.PORT || "3000", // Hardcoded default: 3000 (see API_CONSTANTS.PORT)
	10,
);
preserveState("server_started", { port, timestamp: Date.now() });

console.log(`🚀 Dev server starting on port ${port}`);
console.log(`📦 State preserved in ${DB_PATH}`);
console.log(`♻️  Hot reload enabled (use --watch flag)`);

Bun.serve({
  port,
  fetch: app.fetch,
  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

// Cleanup on exit
process.on("SIGTERM", () => {
  console.log("🛑 Shutting down dev server");
  db.close();
  process.exit(0);
});
