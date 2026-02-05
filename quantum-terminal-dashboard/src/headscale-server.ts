// src/headscale-server.ts
// Bun-native Headscale Server Implementation

import { Database } from "bun:sqlite";
import { serve } from "bun";

interface HeadscaleConfig {
  port: number;
  metricsPort: number;
  apiKey: string;
  dbPath: string;
  ipRange: string;
}

interface User {
  id: string;
  name: string;
  createdAt: number;
}

interface Node {
  id: string;
  userId: string;
  name: string;
  ipAddress: string;
  publicKey: string;
  lastSeen: number;
  createdAt: number;
}

export class HeadscaleServer {
  private db: Database;
  private config: HeadscaleConfig;
  private users: Map<string, User> = new Map();
  private nodes: Map<string, Node> = new Map();
  private nextIp: number = 1;

  constructor(config: HeadscaleConfig) {
    this.config = config;
    this.db = new Database(config.dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        ip_address TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        last_seen INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS auth_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        reusable BOOLEAN DEFAULT 0,
        expiration INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }

  async createUser(name: string): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      name,
      createdAt: Date.now(),
    };

    const stmt = this.db.prepare(
      "INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)"
    );
    stmt.run(id, name, user.createdAt);

    this.users.set(id, user);
    return user;
  }

  async registerNode(
    userId: string,
    nodeName: string,
    publicKey: string
  ): Promise<Node> {
    const nodeId = crypto.randomUUID();
    const ipAddress = this.allocateIp();

    const node: Node = {
      id: nodeId,
      userId,
      name: nodeName,
      ipAddress,
      publicKey,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    const stmt = this.db.prepare(
      "INSERT INTO nodes (id, user_id, name, ip_address, public_key, last_seen, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      nodeId,
      userId,
      nodeName,
      ipAddress,
      publicKey,
      node.lastSeen,
      node.createdAt
    );

    this.nodes.set(nodeId, node);
    return node;
  }

  private allocateIp(): string {
    const base = "100.64.0.";
    const ip = base + this.nextIp;
    this.nextIp++;
    return ip;
  }

  async getUsers(): Promise<User[]> {
    const stmt = this.db.prepare("SELECT * FROM users");
    return stmt.all() as User[];
  }

  async getNodes(userId: string): Promise<Node[]> {
    const stmt = this.db.prepare("SELECT * FROM nodes WHERE user_id = ?");
    return stmt.all(userId) as Node[];
  }

  async createAuthKey(
    userId: string,
    reusable: boolean = false,
    expirationHours: number = 24
  ): Promise<string> {
    const keyId = crypto.randomUUID();
    const key = `tskey-auth-${crypto.randomUUID().slice(0, 8)}`;
    const expiration = Date.now() + expirationHours * 60 * 60 * 1000;

    const stmt = this.db.prepare(
      "INSERT INTO auth_keys (id, user_id, key, reusable, expiration, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(keyId, userId, key, reusable ? 1 : 0, expiration, Date.now());

    return key;
  }

  async validateAuthKey(key: string): Promise<string | null> {
    const stmt = this.db.prepare(
      "SELECT user_id, expiration FROM auth_keys WHERE key = ?"
    );
    const result = stmt.get(key) as any;

    if (!result) return null;
    if (result.expiration && result.expiration < Date.now()) return null;

    return result.user_id;
  }

  getMetrics(): string {
    const userCount = this.users.size;
    const nodeCount = this.nodes.size;

    return `
# HELP headscale_users_total Total number of users
# TYPE headscale_users_total gauge
headscale_users_total ${userCount}

# HELP headscale_nodes_total Total number of nodes
# TYPE headscale_nodes_total gauge
headscale_nodes_total ${nodeCount}

# HELP headscale_nodes_active Active nodes
# TYPE headscale_nodes_active gauge
headscale_nodes_active ${nodeCount}
    `.trim();
  }

  close(): void {
    this.db.close();
  }
}

// HTTP Server
export async function startHeadscaleServer(config: HeadscaleConfig) {
  const server = new HeadscaleServer(config);

  const mainServer = serve({
    port: config.port,
    async fetch(req: Request) {
      const url = new URL(req.url);
      const auth = req.headers.get("Authorization");

      // Validate API key
      if (url.pathname.startsWith("/api")) {
        if (!auth || auth !== `Bearer ${config.apiKey}`) {
          return new Response("Unauthorized", { status: 401 });
        }
      }

      // Routes
      if (url.pathname === "/health") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/api/v1/users" && req.method === "GET") {
        const users = await server.getUsers();
        return new Response(JSON.stringify(users), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/api/v1/users" && req.method === "POST") {
        const body = await req.json();
        const user = await server.createUser(body.name);
        return new Response(JSON.stringify(user), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname.startsWith("/api/v1/users/") && req.method === "GET") {
        const userId = url.pathname.split("/")[4];
        const nodes = await server.getNodes(userId);
        return new Response(JSON.stringify(nodes), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/api/v1/preauthkeys" && req.method === "POST") {
        const body = await req.json();
        const key = await server.createAuthKey(
          body.user_id,
          body.reusable,
          body.expiration_hours
        );
        return new Response(JSON.stringify({ key }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  // Metrics server
  serve({
    port: config.metricsPort,
    async fetch(req: Request) {
      if (new URL(req.url).pathname === "/metrics") {
        return new Response(server.getMetrics(), {
          headers: { "Content-Type": "text/plain" },
        });
      }
      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`✅ Headscale server running on port ${config.port}`);
  console.log(`📊 Metrics available on port ${config.metricsPort}`);

  return { mainServer, server };
}

// CLI
if (import.meta.main) {
  const config: HeadscaleConfig = {
    port: parseInt(Bun.env.HEADSCALE_PORT || "8080"),
    metricsPort: parseInt(Bun.env.HEADSCALE_METRICS_PORT || "9090"),
    apiKey: Bun.env.HEADSCALE_API_KEY || "tskey-api-default",
    dbPath: Bun.env.HEADSCALE_DB_PATH || "./headscale.db",
    ipRange: "100.64.0.0/10",
  };

  await startHeadscaleServer(config);
}

