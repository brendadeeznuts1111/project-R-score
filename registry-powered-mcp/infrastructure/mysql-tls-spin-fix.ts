// infrastructure/mysql-tls-spin-fix.ts
import { feature } from "bun:bundle";

// Timer init after connection; prevents 100% CPU
export class MySQLTLSSpinFix {
  private static connectionTimers = new WeakMap<any, any>();

  // Zero-cost when MYSQL_TLS_FIX is disabled
  static createConnection(config: any): any {
    if (!feature("MYSQL_TLS_FIX")) {
      // Legacy: timers initialized prematurely (causes CPU spin)
      return new (this.getLegacyMySQLClient())(config);
    }

    // Component #78: Delay timer initialization until after TLS handshake
    const client = {
      ...new (Bun.MySQLClient)(config),
      tlsHandshakeComplete: false,
      pendingTimers: [] as any[]
    };

    // Override TLS handler
    const originalConnect = client.connect.bind(client);

    client.connect = async () => {
      await originalConnect();

      // Wait for TLS handshake to complete
      await this.waitForTLSHandshake(client);

      // Now safe to initialize timers
      this.initializeTimersSafely(client);

      // Log fix application (Component #11 audit)
      this.logTLSHandshakeComplete(client.config.host);
    };

    return client;
  }

  private static async waitForTLSHandshake(client: any): Promise<void> {
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (client.tlsState === 'connected' || client.encrypted) {
          clearInterval(checkInterval);
          client.tlsHandshakeComplete = true;
          resolve();
        }
      }, 10);

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(); // Proceed anyway
      }, 30000);
    });
  }

  private static initializeTimersSafely(client: any): void {
    // Only initialize timers after TLS is ready
    if (client.config.sslmode === 'require' || client.config.sslmode === 'prefer') {
      // Clear any prematurely set timers
      for (const timer of client.pendingTimers || []) {
        clearTimeout(timer);
      }

      // Set proper keep-alive timer
      client.keepAliveTimer = setTimeout(() => {
        client.ping();
      }, 60000); // 1 minute keep-alive
    }
  }

  // Query wrapper that waits for TLS
  static async safeQuery(client: any, sql: string): Promise<any> {
    if (!feature("MYSQL_TLS_FIX")) {
      return client.query(sql);
    }

    // Ensure TLS handshake complete before query
    if (!client.tlsHandshakeComplete && (client.config.sslmode === 'require' || client.config.sslmode === 'prefer')) {
      await this.waitForTLSHandshake(client);
    }

    const result = await client.query(sql);

    // Component #12: Monitor for TLS anomalies
    if (client.lastQueryTime > 5000) { // Slow query
      this.logSlowTLSTest(client.config.host);
    }

    return result;
  }

  private static logTLSHandshakeComplete(host: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 78,
        action: "tls_handshake_complete",
        host,
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static logSlowTLSTest(host: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 78,
        action: "slow_tls_query_detected",
        host,
        severity: "low",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static getLegacyMySQLClient(): any {
    return Bun.MySQLClient;
  }
}

// Zero-cost export
export const { createConnection, safeQuery } = feature("MYSQL_TLS_FIX")
  ? MySQLTLSSpinFix
  : {
      createConnection: (c: any) => new (Bun.MySQLClient)(c),
      safeQuery: (c: any, s: string) => c.query(s)
    };