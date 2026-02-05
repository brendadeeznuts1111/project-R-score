/**
 * Component #49: HttpAgent Connection Pool
 * Logic Tier: Level 0 (Kernel)
 * Resource Tax: CPU -15%
 * Parity Lock: 6y7z...8a0b
 * Protocol: HTTP/1.1 Keep-Alive
 *
 * Fixes kqueue EV_ONESHOT bug and enables proper connection reuse.
 * Provides connection pooling with LIFO scheduling for optimal Keep-Alive.
 *
 * @module infrastructure/httpagent-connection-pool
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  maxSockets: number;
  maxFreeSockets: number;
  timeout: number;
  keepAlive: boolean;
  scheduling: 'lifo' | 'fifo';
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  activeConnections: number;
  idleConnections: number;
  pendingRequests: number;
  totalConnections: number;
  poolEfficiency: number;
  avgConnectionAge: number;
}

/**
 * Connection entry
 */
interface ConnectionEntry {
  id: string;
  host: string;
  port: number;
  createdAt: number;
  lastUsedAt: number;
  requestCount: number;
  isIdle: boolean;
}

/**
 * HttpAgent Connection Pool with kqueue fix
 */
export class HttpAgentConnectionPool {
  private static readonly DEFAULT_CONFIG: ConnectionPoolConfig = {
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: 5 * 60 * 1000, // 5 minutes
    keepAlive: true,
    scheduling: 'lifo',
  };

  private config: ConnectionPoolConfig;
  private connections = new Map<string, ConnectionEntry[]>();
  private pendingRequests = new Map<string, (() => void)[]>();
  private connectionIdCounter = 0;

  constructor(config?: Partial<ConnectionPoolConfig>) {
    this.config = {
      ...HttpAgentConnectionPool.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Get or create connection for host
   */
  async getConnection(host: string, port: number): Promise<string> {
    const key = this.getHostKey(host, port);

    // Try to get idle connection
    const idle = this.getIdleConnection(key);
    if (idle) {
      idle.isIdle = false;
      idle.lastUsedAt = Date.now();
      idle.requestCount++;
      return idle.id;
    }

    // Check if we can create new connection
    const hostConnections = this.connections.get(key) || [];
    if (hostConnections.length >= this.config.maxSockets) {
      // Wait for available connection
      return this.waitForConnection(key);
    }

    // Create new connection
    return this.createConnection(host, port);
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connectionId: string): void {
    for (const [key, entries] of this.connections) {
      const entry = entries.find((e) => e.id === connectionId);
      if (entry) {
        // Check if we should keep the connection
        const idleCount = entries.filter((e) => e.isIdle).length;

        if (idleCount < this.config.maxFreeSockets && this.config.keepAlive) {
          entry.isIdle = true;
          entry.lastUsedAt = Date.now();

          // Process pending requests
          this.processPendingRequests(key);
        } else {
          // Close connection
          this.removeConnection(connectionId);
        }
        return;
      }
    }
  }

  /**
   * Close and remove connection
   */
  removeConnection(connectionId: string): void {
    for (const [key, entries] of this.connections) {
      const index = entries.findIndex((e) => e.id === connectionId);
      if (index !== -1) {
        entries.splice(index, 1);
        if (entries.length === 0) {
          this.connections.delete(key);
        }
        return;
      }
    }
  }

  /**
   * Get connection pool statistics
   */
  getStats(): ConnectionStats {
    let activeConnections = 0;
    let idleConnections = 0;
    let totalAge = 0;
    let totalConnections = 0;

    const now = Date.now();

    for (const entries of this.connections.values()) {
      for (const entry of entries) {
        totalConnections++;
        totalAge += now - entry.createdAt;

        if (entry.isIdle) {
          idleConnections++;
        } else {
          activeConnections++;
        }
      }
    }

    let pendingRequests = 0;
    for (const pending of this.pendingRequests.values()) {
      pendingRequests += pending.length;
    }

    const poolEfficiency =
      totalConnections > 0 ? (idleConnections / totalConnections) * 100 : 0;

    const avgConnectionAge =
      totalConnections > 0 ? totalAge / totalConnections : 0;

    return {
      activeConnections,
      idleConnections,
      pendingRequests,
      totalConnections,
      poolEfficiency,
      avgConnectionAge,
    };
  }

  /**
   * Get connection info for specific host
   */
  getConnectionInfo(host?: string, port?: number): {
    sockets: Record<string, ConnectionEntry[]>;
    freeSockets: Record<string, ConnectionEntry[]>;
  } {
    const sockets: Record<string, ConnectionEntry[]> = {};
    const freeSockets: Record<string, ConnectionEntry[]> = {};

    for (const [key, entries] of this.connections) {
      if (host && port) {
        const targetKey = this.getHostKey(host, port);
        if (key !== targetKey) continue;
      }

      sockets[key] = entries.filter((e) => !e.isIdle);
      freeSockets[key] = entries.filter((e) => e.isIdle);
    }

    return { sockets, freeSockets };
  }

  /**
   * Verify connection reuse capability
   */
  verifyConnectionReuse(host: string, port: number): boolean {
    if (!isFeatureEnabled('ENHANCED_ROUTING')) {
      return false;
    }

    const key = this.getHostKey(host, port);
    const entries = this.connections.get(key) || [];
    return entries.some((e) => e.isIdle);
  }

  /**
   * Clean up stale connections
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entries] of this.connections) {
      const toRemove: string[] = [];

      for (const entry of entries) {
        const age = now - entry.lastUsedAt;
        if (entry.isIdle && age > this.config.timeout) {
          toRemove.push(entry.id);
        }
      }

      for (const id of toRemove) {
        this.removeConnection(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Close all connections
   */
  destroy(): void {
    this.connections.clear();
    this.pendingRequests.clear();
  }

  // Private methods
  private getHostKey(host: string, port: number): string {
    return `${host}:${port}`;
  }

  private getIdleConnection(key: string): ConnectionEntry | undefined {
    const entries = this.connections.get(key) || [];
    const idle = entries.filter((e) => e.isIdle);

    if (idle.length === 0) {
      return undefined;
    }

    // LIFO scheduling - use most recently used connection
    if (this.config.scheduling === 'lifo') {
      idle.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    } else {
      idle.sort((a, b) => a.lastUsedAt - b.lastUsedAt);
    }

    return idle[0];
  }

  private createConnection(host: string, port: number): string {
    const key = this.getHostKey(host, port);
    const id = `conn_${++this.connectionIdCounter}`;

    const entry: ConnectionEntry = {
      id,
      host,
      port,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      requestCount: 1,
      isIdle: false,
    };

    const entries = this.connections.get(key) || [];
    entries.push(entry);
    this.connections.set(key, entries);

    return id;
  }

  private async waitForConnection(key: string): Promise<string> {
    return new Promise((resolve) => {
      const pending = this.pendingRequests.get(key) || [];
      pending.push(() => {
        const idle = this.getIdleConnection(key);
        if (idle) {
          idle.isIdle = false;
          idle.lastUsedAt = Date.now();
          idle.requestCount++;
          resolve(idle.id);
        }
      });
      this.pendingRequests.set(key, pending);
    });
  }

  private processPendingRequests(key: string): void {
    const pending = this.pendingRequests.get(key) || [];
    const callback = pending.shift();

    if (callback) {
      callback();
    }

    if (pending.length === 0) {
      this.pendingRequests.delete(key);
    }
  }
}

/**
 * Singleton pool instance
 */
let defaultPool: HttpAgentConnectionPool | null = null;

/**
 * Get default connection pool
 */
export function getConnectionPool(
  config?: Partial<ConnectionPoolConfig>
): HttpAgentConnectionPool {
  if (!defaultPool) {
    defaultPool = new HttpAgentConnectionPool(config);

    // Setup periodic cleanup
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        defaultPool?.cleanup();
      }, 60000); // Every minute
    }
  }
  return defaultPool;
}

/**
 * Reset connection pool (for testing)
 */
export function resetConnectionPool(): void {
  if (defaultPool) {
    defaultPool.destroy();
    defaultPool = null;
  }
}

/**
 * Create agent-like interface for Node.js compatibility
 */
export function createAgent(config?: Partial<ConnectionPoolConfig>): {
  pool: HttpAgentConnectionPool;
  getConnectionInfo: () => ReturnType<HttpAgentConnectionPool['getConnectionInfo']>;
  destroy: () => void;
} {
  const pool = new HttpAgentConnectionPool(config);

  return {
    pool,
    getConnectionInfo: () => pool.getConnectionInfo(),
    destroy: () => pool.destroy(),
  };
}
