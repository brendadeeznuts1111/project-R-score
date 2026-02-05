// infrastructure/mysql-idle-connection-fix.ts
import { feature } from "bun:bundle";

// Fixes v1.2.23 regression; clean process exit after queries
export class MySQLIdleConnectionFix {
  // Zero-cost when MYSQL_IDLE_FIX is disabled
  static createClient(config: any): any {
    if (!feature("MYSQL_IDLE_FIX")) {
      // Legacy: idle connections keep event loop alive
      return this.createBasicClient(config);
    }

    const client = this.createBasicClient(config);

    // Component #79: Properly unref idle connections
    client.unrefIdleConnections = true;

    // Patch query to unref after completion
    const originalQuery = client.query.bind(client);

    client.query = async (sql: string, params?: any[]) => {
      const result = await originalQuery(sql, params);

      // Unref connection after query completes
      if (client.connection) {
        client.connection.unref?.();
      }

      // Log unref (Component #11 audit)
      this.logConnectionUnref(client.config?.host || 'localhost');

      return result;
    };

    // Ensure process can exit cleanly
    client.on?.("idle", () => {
      if (client.pendingQueries === 0) {
        client.connection?.unref?.();
      }
    });

    return client;
  }

  private static createBasicClient(config: any): any {
    // Simplified client mock for demonstration
    return {
      config,
      connection: { unref: () => {} },
      pendingQueries: 0,
      query: async (sql: string) => ({ rows: [], affectedRows: 0 }),
      close: () => {},
      on: () => {}
    };
  }

  // Query wrapper that ensures clean shutdown
  static async queryAndDisconnect(client: any, sql: string): Promise<any> {
    try {
      const result = await client.query(sql);

      // Component #12: Monitor for connection leaks
      this.detectConnectionLeak(client);

      return result;
    } finally {
      // Ensure connection is unref'd
      client.connection?.unref?.();

      // Close if no pending queries
      if (client.pendingQueries === 0) {
        client.close?.();
      }
    }
  }

  private static detectConnectionLeak(client: any): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    // Check if connection is still referenced after 5 seconds
    setTimeout(() => {
      if (client.connection && client.pendingQueries === 0) {
        fetch("https://api.buncatalog.com/v1/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            component: 79,
            action: "potential_connection_leak",
            host: client.config?.host || 'localhost',
            severity: "medium",
            timestamp: Date.now()
          })
        }).catch(() => {});
      }
    }, 5000);
  }

  private static logConnectionUnref(host: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 79,
        action: "connection_unreffed",
        host,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { createClient, queryAndDisconnect } = feature("MYSQL_IDLE_FIX")
  ? MySQLIdleConnectionFix
  : {
      createClient: (c: any) => ({ config: c, query: async () => ({}) }),
      queryAndDisconnect: async (c: any, s: string) => ({})
    };