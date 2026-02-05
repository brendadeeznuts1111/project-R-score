// src/headscale-cli.ts
// Bun CLI for Headscale Management

import { Database } from "bun:sqlite";

const DB_PATH = Bun.env.HEADSCALE_DB_PATH || "./headscale.db";
const API_KEY = Bun.env.HEADSCALE_API_KEY || "tskey-api-default";

class HeadscaleCLI {
  private db: Database;

  constructor() {
    this.db = new Database(DB_PATH);
  }

  async createUser(name: string): Promise<void> {
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    try {
      const stmt = this.db.prepare(
        "INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)"
      );
      stmt.run(id, name, createdAt);
      console.log(`✅ User created: ${name} (${id})`);
    } catch (error) {
      console.error(`❌ Error creating user: ${error}`);
    }
  }

  async listUsers(): Promise<void> {
    try {
      const stmt = this.db.prepare("SELECT * FROM users");
      const users = stmt.all();
      console.table(users);
    } catch (error) {
      console.error(`❌ Error listing users: ${error}`);
    }
  }

  async createAuthKey(
    userId: string,
    reusable: boolean = false,
    expirationHours: number = 24
  ): Promise<void> {
    const keyId = crypto.randomUUID();
    const key = `tskey-auth-${crypto.randomUUID().slice(0, 8)}`;
    const expiration = Date.now() + expirationHours * 60 * 60 * 1000;

    try {
      const stmt = this.db.prepare(
        "INSERT INTO auth_keys (id, user_id, key, reusable, expiration, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      );
      stmt.run(keyId, userId, key, reusable ? 1 : 0, expiration, Date.now());
      console.log(`✅ Auth key created: ${key}`);
      console.log(`⏰ Expires in ${expirationHours} hours`);
    } catch (error) {
      console.error(`❌ Error creating auth key: ${error}`);
    }
  }

  async listAuthKeys(userId: string): Promise<void> {
    try {
      const stmt = this.db.prepare(
        "SELECT id, key, reusable, expiration, created_at FROM auth_keys WHERE user_id = ?"
      );
      const keys = stmt.all(userId);
      console.table(keys);
    } catch (error) {
      console.error(`❌ Error listing auth keys: ${error}`);
    }
  }

  async listNodes(userId: string): Promise<void> {
    try {
      const stmt = this.db.prepare(
        "SELECT id, name, ip_address, last_seen, created_at FROM nodes WHERE user_id = ?"
      );
      const nodes = stmt.all(userId);
      console.table(nodes);
    } catch (error) {
      console.error(`❌ Error listing nodes: ${error}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
      stmt.run(userId);
      console.log(`✅ User deleted: ${userId}`);
    } catch (error) {
      console.error(`❌ Error deleting user: ${error}`);
    }
  }

  async deleteNode(nodeId: string): Promise<void> {
    try {
      const stmt = this.db.prepare("DELETE FROM nodes WHERE id = ?");
      stmt.run(nodeId);
      console.log(`✅ Node deleted: ${nodeId}`);
    } catch (error) {
      console.error(`❌ Error deleting node: ${error}`);
    }
  }

  close(): void {
    this.db.close();
  }
}

// CLI Handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const subcommand = args[1];
  const param = args[2];

  const cli = new HeadscaleCLI();

  try {
    switch (command) {
      case "user":
        if (subcommand === "create" && param) {
          await cli.createUser(param);
        } else if (subcommand === "list") {
          await cli.listUsers();
        } else if (subcommand === "delete" && param) {
          await cli.deleteUser(param);
        } else {
          console.log("Usage: headscale-cli user <create|list|delete> [name|id]");
        }
        break;

      case "authkey":
        if (subcommand === "create" && param) {
          const reusable = args.includes("--reusable");
          const expirationIdx = args.indexOf("--expiration");
          const expiration = expirationIdx !== -1 ? parseInt(args[expirationIdx + 1]) : 24;
          await cli.createAuthKey(param, reusable, expiration);
        } else if (subcommand === "list" && param) {
          await cli.listAuthKeys(param);
        } else {
          console.log("Usage: headscale-cli authkey <create|list> <user_id>");
        }
        break;

      case "node":
        if (subcommand === "list" && param) {
          await cli.listNodes(param);
        } else if (subcommand === "delete" && param) {
          await cli.deleteNode(param);
        } else {
          console.log("Usage: headscale-cli node <list|delete> <user_id|node_id>");
        }
        break;

      default:
        console.log(`
Headscale CLI (Bun-native)

Usage: headscale-cli <command> <subcommand> [options]

Commands:
  user create <name>              Create new user
  user list                       List all users
  user delete <id>                Delete user

  authkey create <user_id>        Create auth key
  authkey list <user_id>          List auth keys

  node list <user_id>             List nodes for user
  node delete <node_id>           Delete node

Options:
  --reusable                      Make auth key reusable
  --expiration <hours>            Set expiration in hours (default: 24)

Examples:
  headscale-cli user create admin
  headscale-cli authkey create <user_id> --reusable --expiration 24
  headscale-cli node list <user_id>
        `);
    }
  } finally {
    cli.close();
  }
}

if (import.meta.main) {
  await main();
}

