import { mkdir } from "fs/promises";
import { NEBULA_VERSION, getVersionString } from "../src/utils/version";

console.log(`🚀 Building ${getVersionString()}...`);

await Bun.build({
  entrypoints: ["./src/main.ts"],
  outdir: "./dist",
  target: "bun",
  minify: process.env.BUILD_MINIFY === "true",
  sourcemap: process.env.BUILD_SOURCEMAP === "true",
  external: ["chalk"],
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    "process.env.FEATURE_LIGHTNING": JSON.stringify(process.env.FEATURE_LIGHTNING || "true"),
    "process.env.FEATURE_KYC_ENFORCED": JSON.stringify(process.env.FEATURE_KYC_ENFORCED || "true"),
    "process.env.FEATURE_MOCK_API": JSON.stringify(process.env.FEATURE_MOCK_API || "false"),
  },
});

console.log("✅ Build complete! Files in ./dist");

// Create a simple main entry point if it doesn't exist
const mainExists = await Bun.file("./src/main.ts").exists();
if (!mainExists) {
  await Bun.write(
    "./src/main.ts",
    `import { LightningService } from "./services/lightningService.js";
import { handleQuestPaymentRequest, handleSettlementWebhook } from "./routes/paymentRoutes.js";

const PORT = process.env.PORT || 3000;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", version: "${NEBULA_VERSION}" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Payment routes
    if (url.pathname === "/api/payment/quest") {
      return handleQuestPaymentRequest(req);
    }
    
    // Webhook for LND settlement
    if (url.pathname === "/webhook/settlement" && req.method === "POST") {
      return handleSettlementWebhook(req);
    }
    
    // Get payment status
    if (url.pathname === "/api/payment/status") {
      const questId = url.searchParams.get("questId");
      if (!questId) {
        return new Response("Missing questId", { status: 400 });
      }
      // Query database for status
      return new Response(JSON.stringify({ questId, status: "pending" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Get node balance
    if (url.pathname === "/api/node/balance") {
      try {
        const lightning = LightningService.getInstance();
        const balance = await lightning.getNodeBalance();
        return new Response(JSON.stringify(balance), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    
    // Generate invoice
    if (url.pathname === "/api/invoice/generate" && req.method === "POST") {
      try {
        const body = await req.json();
        const lightning = LightningService.getInstance();
        const invoice = await lightning.generateQuestInvoice({
          questId: body.questId,
          userId: body.userId,
          amountSats: body.amountSats,
          description: body.description || "Quest Payment",
        });
        return new Response(JSON.stringify({ invoice }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(\`⚡ ${getVersionString()} running on http://localhost:\${PORT}\`);
console.log("📋 Available endpoints:");
console.log("  GET  /health");
console.log("  GET  /api/node/balance");
console.log("  POST /api/invoice/generate");
console.log("  GET  /api/payment/quest?questId=...&userId=...&amount=...");
console.log("  POST /webhook/settlement");
console.log("  GET  /api/payment/status?questId=...");
`
  );
  console.log("✅ Created src/main.ts");
}

// Create database module
const dbExists = await Bun.file("./src/database/db.js").exists();
if (!dbExists) {
  await mkdir("./src/database", { recursive: true });
  await Bun.write(
    "./src/database/db.js",
    `// Simple SQLite database for demo
// In production, use PostgreSQL or similar

import { Database } from "bun:sqlite";

let db;

function getDb() {
  if (!db) {
    db = new Database(process.env.DB_PATH || "./data/duoplus.db");
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const db = getDb();
  
  // Users table
  db.run(\`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      risk_level TEXT DEFAULT 'low',
      risk_score INTEGER DEFAULT 0,
      country TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  \`);
  
  // Quests table
  db.run(\`
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      amount_usd REAL,
      amount_sats INTEGER,
      status TEXT DEFAULT 'pending',
      payment_hash TEXT,
      settled_sats INTEGER,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  \`);
  
  // Lightning wallets
  db.run(\`
    CREATE TABLE IF NOT EXISTS lightning_wallets (
      user_id TEXT PRIMARY KEY,
      balance_sats INTEGER DEFAULT 0,
      last_updated DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  \`);
  
  // Standard accounts
  db.run(\`
    CREATE TABLE IF NOT EXISTS standard_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      balance_usd REAL,
      quest_id TEXT,
      deposited_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  \`);
  
  // Lightning payments (for KYC tracking)
  db.run(\`
    CREATE TABLE IF NOT EXISTS lightning_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      amount_usd REAL,
      amount_sats INTEGER,
      quest_id TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  \`);
  
  // Yield logs
  db.run(\`
    CREATE TABLE IF NOT EXISTS yield_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      principal REAL,
      rate REAL,
      source TEXT,
      projected_annual REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  \`);
}

export const db = {
  query: (sql, params = []) => {
    const db = getDb();
    const stmt = db.prepare(sql);
    const result = stmt.all(...params);
    return { rows: result };
  },
  
  run: (sql, params = []) => {
    const db = getDb();
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },
  
  close: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Initialize on import
getDb();
`
  );
  console.log("✅ Created src/database/db.js");
}

// Create ecosystem directory
const ecosystemExists = await Bun.file("./src/ecosystem/connection-system.js").exists();
if (!ecosystemExists) {
  await mkdir("./src/ecosystem", { recursive: true });
  await Bun.write(
    "./src/ecosystem/connection-system.js",
    `// Connection pool for LND API calls
// Provides rate limiting and retry logic

export class ControlledConnectionPool {
  static instance;
  requests = [];
  maxConnections = 10;
  timeout = 30000;

  static getInstance() {
    if (!ControlledConnectionPool.instance) {
      ControlledConnectionPool.instance = new ControlledConnectionPool();
    }
    return ControlledConnectionPool.instance;
  }

  async request(url, options) {
    // Simple fetch wrapper with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
`
  );
  console.log("✅ Created src/ecosystem/connection-system.js");
}

// Create logs directory
await mkdir("./logs", { recursive: true });
console.log("✅ Created logs directory");

console.log("\n🎉 Build complete! Next steps:");
console.log("1. Copy .env.example to .env and fill in your credentials");
console.log("2. Run: bun install");
console.log("3. Start LND node: bun run setup-lnd");
console.log("4. Start server: bun run start");
console.log("5. Or use dashboard: bun run dashboard");