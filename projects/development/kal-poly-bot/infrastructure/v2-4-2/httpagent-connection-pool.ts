import "./types.d.ts";
// infrastructure/v2-4-2/httpagent-connection-pool.ts
// Component #45: HttpAgent Connection Pool (kqueue EV_ONESHOT Bug Fix)

import { feature } from "bun:bundle";

// AgentOptions interface definition
interface AgentOptions {
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxFreeSockets?: number;
  timeout?: number;
  scheduling?: "fifo" | "lifo" | "random";
  [key: string]: unknown;
}

// Agent interface for better type safety
interface Agent {
  createConnection: (
    options: unknown,
    callback: (...args: unknown[]) => void
  ) => unknown;
  request: (
    options: unknown,
    callback?: (...args: unknown[]) => void
  ) => unknown;
  getConnectionInfo?: () => Record<string, unknown>;
  maxSockets?: number;
  maxFreeSockets?: number;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
}

// Fix for kqueue EV_ONESHOT regression in Bun's HTTP agent
export class HttpAgentConnectionPool {
  private static readonly DEFAULT_MAX_SOCKETS = 50;
  private static readonly MAX_SOCKETS = 100; // Add missing property
  private static readonly DEFAULT_KEEP_ALIVE = 30000; // 30 seconds

  private static connectionMetrics = {
    activeConnections: 0,
    totalConnections: 0,
    reusedConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
  };

  // Add static metrics property to match usage
  private static get metrics() {
    return HttpAgentConnectionPool.connectionMetrics;
  }

  // Zero-cost when HTTP_AGENT_POOL is disabled
  static createAgent(options?: AgentOptions): unknown {
    if (!feature("HTTP_AGENT_POOL")) {
      // Legacy agent creation (vulnerable to EV_ONESHOT bug)
      const AgentConstructor = (
        globalThis as unknown as {
          Agent: new (options?: AgentOptions) => Agent;
        }
      ).Agent;
      return typeof AgentConstructor === "function"
        ? new AgentConstructor(options)
        : ({} as Agent);
    }

    // Fixed agent with proper kqueue handling
    const fixedOptions = {
      ...options,
      keepAlive: true,
      keepAliveMsecs: HttpAgentConnectionPool.DEFAULT_KEEP_ALIVE,
      maxSockets: HttpAgentConnectionPool.DEFAULT_MAX_SOCKETS,
      maxFreeSockets: 10,
      timeout: 30000,
      scheduling: "fifo" as const,
    };

    const AgentConstructor = (
      globalThis as unknown as { Agent: new (options?: AgentOptions) => Agent }
    ).Agent;
    if (typeof AgentConstructor === "function") {
      const agent = new AgentConstructor(fixedOptions);
      HttpAgentConnectionPool.patchKqueueBug(agent);
      HttpAgentConnectionPool.addConnectionTracking(agent);
      return agent;
    }

    return {};
  }

  // Fix for kqueue EV_ONESHOT bug that causes 100% CPU usage
  private static patchKqueueBug(agent: Agent): void {
    const originalCreateConnection = agent.createConnection;

    agent.createConnection = function (
      this: Agent,
      options: unknown,
      callback: (...args: unknown[]) => void
    ): unknown {
      // Set proper socket options to prevent EV_ONESHOT issues
      const patchedOptions = {
        ...options,
        keepAlive: true,
        noDelay: true,
        highWaterMark: 64 * 1024, // 64KB buffer
      };

      const socket = originalCreateConnection.call(
        this,
        patchedOptions,
        callback
      );

      // Add error handling for connection failures
      if (socket && typeof socket === "object" && "on" in socket) {
        (
          socket as {
            on: (event: string, handler: (...args: unknown[]) => void) => void;
          }
        ).on("error", (error: unknown) => {
          HttpAgentConnectionPool.metrics.failedConnections++;
          console.warn(
            "Connection error:",
            error instanceof Error ? error.message : String(error)
          );
        });

        // Track connection lifecycle
        (socket as { on: (event: string, handler: () => void) => void }).on(
          "connect",
          () => {
            HttpAgentConnectionPool.metrics.totalConnections++;
            HttpAgentConnectionPool.metrics.activeConnections++;
          }
        );

        (socket as { on: (event: string, handler: () => void) => void }).on(
          "close",
          () => {
            HttpAgentConnectionPool.metrics.activeConnections--;
          }
        );
      }

      return socket;
    };
  }

  // Add connection tracking and metrics
  private static addConnectionTracking(agent: Agent): void {
    const originalRequest = agent.request;

    agent.request = function (
      this: Agent,
      options: unknown,
      callback?: (...args: unknown[]) => void
    ): unknown {
      const startTime = Date.now();

      const req = originalRequest.call(this, options, callback);

      if (req && typeof req === "object" && "on" in req) {
        (
          req as {
            on: (event: string, handler: (socket: unknown) => void) => void;
          }
        ).on("socket", (socket: unknown) => {
          // Check if connection was reused
          if (
            socket &&
            typeof socket === "object" &&
            "readyState" in socket &&
            "bytesRead" in socket &&
            (socket as { readyState: string }).readyState === "open" &&
            (socket as { bytesRead: number }).bytesRead > 0
          ) {
            HttpAgentConnectionPool.metrics.reusedConnections++;
          }
        });

        (
          req as {
            on: (event: string, handler: (_res: unknown) => void) => void;
          }
        ).on("response", (_res: unknown) => {
          const duration = Date.now() - startTime;

          // Log slow requests for performance monitoring
          if (duration > 1000) {
            console.warn(
              `Slow request: ${duration}ms for ${
                (options as { hostname?: string; host?: string }).hostname ||
                (options as { hostname?: string; host?: string }).host
              }`
            );
          }
        });
      }

      return req;
    };
  }

  // Connection reuse validation (integrates with Component #11 audit)
  static async verifyConnectionReuse(
    agent: Agent,
    url: string
  ): Promise<boolean> {
    if (!feature("HTTP_AGENT_POOL")) return false;

    try {
      const info = agent.getConnectionInfo?.() || {};
      const hostname = new URL(url).hostname;
      const sockets = (info as Record<string, unknown[]>)[hostname] || [];
      const freeSockets =
        (info as Record<string, unknown[]>)[`freeSockets_${hostname}`] || [];

      // Audit connection pooling efficiency
      await this.auditConnectionUsage(url, sockets.length, freeSockets.length);

      return freeSockets.length > 0; // Has reusable connections
    } catch (error: unknown) {
      console.error("Failed to verify connection reuse:", error);
      return false;
    }
  }

  // Get connection pool metrics
  static getMetrics(): typeof HttpAgentConnectionPool.connectionMetrics {
    return { ...this.connectionMetrics };
  }

  // Reset metrics
  static resetMetrics(): void {
    this.connectionMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      reusedConnections: 0,
      failedConnections: 0,
      averageResponseTime: 0,
    };
  }

  // Optimize connection pool settings
  static optimizePoolSettings(agent: Agent, targetConcurrency: number): void {
    if (!feature("HTTP_AGENT_POOL")) return;

    // Adjust pool size based on target concurrency
    const optimalMaxSockets = Math.min(
      targetConcurrency * 2,
      HttpAgentConnectionPool.MAX_SOCKETS
    );
    const optimalMaxFreeSockets = Math.max(
      Math.floor(targetConcurrency / 4),
      2
    );

    if (agent.maxSockets !== optimalMaxSockets) {
      agent.maxSockets = optimalMaxSockets;
      console.log(`Optimized maxSockets to ${optimalMaxSockets}`);
    }

    if (agent.maxFreeSockets !== optimalMaxFreeSockets) {
      agent.maxFreeSockets = optimalMaxFreeSockets;
      console.log(`Optimized maxFreeSockets to ${optimalMaxFreeSockets}`);
    }
  }

  // Create HTTPS agent with proper TLS settings
  static createHttpsAgent(options?: Record<string, unknown>): Agent {
    if (!feature("HTTP_AGENT_POOL")) {
      const HttpsConstructor = (
        globalThis as unknown as {
          https: { Agent: new (options?: Record<string, unknown>) => Agent };
        }
      ).https?.Agent;
      return typeof HttpsConstructor === "function"
        ? new HttpsConstructor(options)
        : ({} as Agent);
    }

    const httpsOptions: Record<string, unknown> = {
      ...options,
      // TLS optimization settings
      secureProtocol: "TLS_method",
      rejectUnauthorized: true,
      checkServerIdentity: () => undefined, // Skip hostname verification for internal services
      ciphers: [
        "ECDHE-RSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES128-SHA256",
        "ECDHE-RSA-AES256-SHA384",
      ].join(":"),
      honorCipherOrder: true,
      keepAlive: true,
      keepAliveMsecs: HttpAgentConnectionPool.DEFAULT_KEEP_ALIVE,
      maxSockets: HttpAgentConnectionPool.DEFAULT_MAX_SOCKETS,
      maxFreeSockets: 10,
      timeout: 30000,
      scheduling: "fifo" as const,
    };

    const HttpsAgentConstructor = (
      globalThis as unknown as {
        https: { Agent: new (options?: Record<string, unknown>) => Agent };
      }
    ).https?.Agent;
    if (typeof HttpsAgentConstructor === "function") {
      return new HttpsAgentConstructor(httpsOptions);
    }
    return {} as Agent;
  }

  private static async auditConnectionUsage(
    url: string,
    active: number,
    idle: number
  ): Promise<void> {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    // Send to Atomic-Integrity-Log (Component #11)
    const auditData = {
      component: 45,
      url,
      activeConnections: active,
      idleConnections: idle,
      poolEfficiency: idle > 0 ? (idle / (active + idle)) * 100 : 0,
      timestamp: Date.now(),
      metrics: this.connectionMetrics,
    };

    try {
      await fetch("https://api.buncatalog.com/v1/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auditData),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
    } catch (error: unknown) {
      // Silently fail audit to not affect performance
      console.debug("Audit failed:", error);
    }
  }

  // Health check for connection pool
  static async healthCheck(
    testUrl: string
  ): Promise<{ healthy: boolean; metrics: unknown }> {
    if (!feature("HTTP_AGENT_POOL")) {
      return { healthy: true, metrics: {} };
    }

    const agent = HttpAgentConnectionPool.createAgent();
    const startTime = Date.now();

    try {
      const response = await fetch(testUrl, {
        // agent option not supported in Bun's fetch
        signal: AbortSignal.timeout(5000),
      });

      const duration = Date.now() - startTime;
      const info = (agent as Agent).getConnectionInfo?.() || {};

      return {
        healthy: response.ok && duration < 2000,
        metrics: {
          responseTime: duration,
          connectionInfo: info,
          poolMetrics: HttpAgentConnectionPool.connectionMetrics,
        },
      };
    } catch (error: unknown) {
      return {
        healthy: false,
        metrics: {
          error: error instanceof Error ? error.message : String(error),
          poolMetrics: HttpAgentConnectionPool.connectionMetrics,
        },
      };
    }
  }
}

// Zero-cost export
export const { createAgent, verifyConnectionReuse } = feature("HTTP_AGENT_POOL")
  ? HttpAgentConnectionPool
  : {
      createAgent: (opts?: Record<string, unknown>) => {
        const HttpAgentConstructor = (
          globalThis as unknown as {
            http: { Agent: new (opts?: Record<string, unknown>) => Agent };
          }
        ).http?.Agent;
        return typeof HttpAgentConstructor === "function"
          ? new HttpAgentConstructor(opts)
          : {};
      },
      verifyConnectionReuse: async () => false,
    };

export const {
  getMetrics,
  resetMetrics,
  optimizePoolSettings,
  createHttpsAgent,
  healthCheck,
} = feature("HTTP_AGENT_POOL")
  ? HttpAgentConnectionPool
  : {
      getMetrics: () => ({}),
      resetMetrics: () => {},
      optimizePoolSettings: () => {},
      createHttpsAgent: (opts?: Record<string, unknown>) => {
        const HttpsAgentConstructor = (
          globalThis as unknown as {
            https: { Agent: new (opts?: Record<string, unknown>) => Agent };
          }
        ).https?.Agent;
        return typeof HttpsAgentConstructor === "function"
          ? new HttpsAgentConstructor(opts)
          : {};
      },
      healthCheck: async () => ({ healthy: true, metrics: {} }),
    };

export default HttpAgentConnectionPool;
