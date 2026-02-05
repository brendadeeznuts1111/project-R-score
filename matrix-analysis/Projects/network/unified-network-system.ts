/**
 * Unified Network System
 * Wires together DNS, hostname, IPv4/IPv6, WebSocket, and Database
 * 
 * DNS Configuration:
 * - Set DNS cache TTL via environment variable: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
 * - Default: 30 seconds (Bun's default)
 * - Example: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun unified-network-system.ts
 * - Note: getaddrinfo doesn't provide TTL, so Bun uses a configurable cache duration
 */

import { Database } from "bun:sqlite";
import { serve, type Server, dns } from "bun";
import * as os from "os";
import * as path from "path";

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Safely parse JSON with optional validation
 * Returns undefined on failure instead of throwing, logs corruption for debugging
 */
function safeJsonParse<T>(
  str: string | null | undefined,
  options?: {
    context?: string;
    validate?: (value: unknown) => value is T;
  }
): T | undefined {
  if (!str) return undefined;

  try {
    const parsed = JSON.parse(str);

    if (options?.validate && !options.validate(parsed)) {
      console.warn(
        `[safeJsonParse] Validation failed${options.context ? ` for ${options.context}` : ""}: unexpected shape`
      );
      return undefined;
    }

    return parsed;
  } catch (err) {
    console.warn(
      `[safeJsonParse] Corrupted JSON${options?.context ? ` in ${options.context}` : ""}:`,
      str.slice(0, 100) + (str.length > 100 ? "..." : "")
    );
    return undefined;
  }
}

/** Type guard for string arrays */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

// ============================================================================
// 1. DNS & HOSTNAME RESOLUTION
// ============================================================================

/**
 * DNS Cache Statistics from Bun
 */
interface DNSCacheStats {
  cacheHitsCompleted: number; // Cache hits completed
  cacheHitsInflight: number; // Cache hits in flight
  cacheMisses: number; // Cache misses
  size: number; // Number of items in the DNS cache
  errors: number; // Number of times a connection failed
  totalCount: number; // Number of times a connection was requested at all (including cache hits and misses)
}

interface NetworkInfo {
  hostname: string;
  ipv4: string[];
  ipv6: string[];
  dnsResolved: Map<string, { ipv4?: string[]; ipv6?: string[]; timestamp: number }>;
}

class NetworkResolver {
  private networkInfo: NetworkInfo;
  private dnsCache = new Map<string, { ipv4?: string[]; ipv6?: string[]; timestamp: number }>();

  constructor() {
    this.networkInfo = {
      hostname: os.hostname(),
      ipv4: [],
      ipv6: [],
      dnsResolved: new Map(),
    };
    this.detectLocalIPs();
  }

  /**
   * Detect local IPv4 and IPv6 addresses
   */
  private detectLocalIPs(): void {
    const interfaces = os.networkInterfaces();
    const seenIPv4 = new Set<string>();
    const seenIPv6 = new Set<string>();
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      
      for (const addr of addrs) {
        if (addr.family === "IPv4" && !addr.internal && !seenIPv4.has(addr.address)) {
          this.networkInfo.ipv4.push(addr.address);
          seenIPv4.add(addr.address);
        } else if (addr.family === "IPv6" && !addr.internal && !seenIPv6.has(addr.address)) {
          this.networkInfo.ipv6.push(addr.address);
          seenIPv6.add(addr.address);
        }
      }
    }
  }

  /**
   * Resolve hostname to IP addresses using Bun dns API
   */
  async resolveHostname(hostname: string, prefetch: boolean = true): Promise<{
    ipv4?: string[];
    ipv6?: string[];
    cached: boolean;
  }> {
    // Check cache first
    const cached = this.dnsCache.get(hostname);
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute TTL
      return {
        ipv4: cached.ipv4,
        ipv6: cached.ipv6,
        cached: true,
      };
    }

    // Prefetch DNS if requested
    if (prefetch) {
      // Use default HTTPS port if not specified
      dns.prefetch(hostname, 443);
      // Wait a bit for prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Resolve using dns API
    const ipv4: string[] = [];
    const ipv6: string[] = [];

    try {
      // Try IPv4
      const results4 = await dns.lookup(hostname, { family: 4 });
      for (const result of results4) {
        if (result.address) ipv4.push(result.address);
      }
    } catch {
      // IPv4 resolution failed
    }

    try {
      // Try IPv6
      const results6 = await dns.lookup(hostname, { family: 6 });
      for (const result of results6) {
        if (result.address) ipv6.push(result.address);
      }
    } catch {
      // IPv6 resolution failed
    }

    // Cache results
    const resolved = {
      ipv4: ipv4.length > 0 ? ipv4 : undefined,
      ipv6: ipv6.length > 0 ? ipv6 : undefined,
      timestamp: Date.now(),
    };
    this.dnsCache.set(hostname, resolved);
    this.networkInfo.dnsResolved.set(hostname, resolved);

    return {
      ipv4: resolved.ipv4,
      ipv6: resolved.ipv6,
      cached: false,
    };
  }

  /**
   * Get network information
   */
  getNetworkInfo(): NetworkInfo {
    return { ...this.networkInfo };
  }

  /**
   * Get DNS cache statistics
   * Returns both our internal cache stats and Bun's native DNS cache stats
   */
  getDNSCacheStats(): {
    internal: { size: number; entries: string[] };
    bun: DNSCacheStats | null;
    config: {
      ttl: number | null; // DNS cache TTL in seconds (from BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS)
      defaultTtl: number; // Bun's default TTL (30 seconds)
    };
  } {
    const bunStats = dns.getCacheStats?.() as DNSCacheStats | null;
    const configuredTtl = process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
      ? parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS, 10)
      : null;

    return {
      internal: {
        size: this.dnsCache.size,
        entries: Array.from(this.dnsCache.keys()),
      },
      bun: bunStats,
      config: {
        ttl: configuredTtl,
        defaultTtl: 30, // Bun's default TTL
      },
    };
  }
}

// ============================================================================
// 2. DATABASE INTEGRATION
// ============================================================================

interface ConnectionLog {
  id: number;
  hostname: string;
  ipv4?: string;
  ipv6?: string;
  protocol: "ws" | "wss";
  connected_at: number;
  disconnected_at?: number;
  messages_sent: number;
  messages_received: number;
}

class NetworkDatabase {
  private db: Database;

  constructor(dbPath: string = "./network-system.db") {
    this.db = new Database(dbPath, { create: true });
    this.initSchema();
  }

  private initSchema(): void {
    // Connection logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hostname TEXT NOT NULL,
        ipv4 TEXT,
        ipv6 TEXT,
        protocol TEXT NOT NULL,
        connected_at INTEGER NOT NULL,
        disconnected_at INTEGER,
        messages_sent INTEGER DEFAULT 0,
        messages_received INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_hostname ON connections(hostname);
      CREATE INDEX IF NOT EXISTS idx_connected_at ON connections(connected_at);
      CREATE INDEX IF NOT EXISTS idx_protocol ON connections(protocol);
    `);

    // DNS resolution cache table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dns_cache (
        hostname TEXT PRIMARY KEY,
        ipv4 TEXT,
        ipv6 TEXT,
        resolved_at INTEGER NOT NULL,
        ttl INTEGER DEFAULT 3600
      );

      CREATE INDEX IF NOT EXISTS idx_resolved_at ON dns_cache(resolved_at);
    `);

    // Network events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS network_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        hostname TEXT,
        ip_address TEXT,
        message TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_event_type ON network_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON network_events(timestamp);
    `);
  }

  /**
   * Log connection
   */
  logConnection(hostname: string, ipv4?: string, ipv6?: string, protocol: "ws" | "wss" = "ws"): number {
    const stmt = this.db.prepare(`
      INSERT INTO connections (hostname, ipv4, ipv6, protocol, connected_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(hostname, ipv4 || null, ipv6 || null, protocol, Date.now());
    return result.lastInsertRowid as number;
  }

  /**
   * Update connection on disconnect
   */
  disconnectConnection(connectionId: number, messagesSent: number, messagesReceived: number): void {
    const stmt = this.db.prepare(`
      UPDATE connections
      SET disconnected_at = ?, messages_sent = ?, messages_received = ?
      WHERE id = ?
    `);
    stmt.run(Date.now(), messagesSent, messagesReceived, connectionId);
  }

  /**
   * Cache DNS resolution
   */
  cacheDNSResolution(hostname: string, ipv4?: string[], ipv6?: string[], ttl: number = 3600): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO dns_cache (hostname, ipv4, ipv6, resolved_at, ttl)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      hostname,
      ipv4 ? JSON.stringify(ipv4) : null,
      ipv6 ? JSON.stringify(ipv6) : null,
      Date.now(),
      ttl
    );
  }

  /**
   * Get cached DNS resolution
   */
  getCachedDNS(hostname: string): { ipv4?: string[]; ipv6?: string[] } | null {
    const stmt = this.db.prepare(`
      SELECT ipv4, ipv6, resolved_at, ttl
      FROM dns_cache
      WHERE hostname = ? AND (resolved_at + ttl * 1000) > ?
    `);
    
    const result = stmt.get(hostname, Date.now()) as any;
    if (!result) return null;

    return {
      ipv4: safeJsonParse<string[]>(result.ipv4, {
        context: `dns_cache.ipv4 for ${hostname}`,
        validate: isStringArray,
      }),
      ipv6: safeJsonParse<string[]>(result.ipv6, {
        context: `dns_cache.ipv6 for ${hostname}`,
        validate: isStringArray,
      }),
    };
  }

  /**
   * Log network event
   */
  logEvent(eventType: string, hostname?: string, ipAddress?: string, message?: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO network_events (event_type, hostname, ip_address, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(eventType, hostname || null, ipAddress || null, message || null, Date.now());
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    total: number;
    active: number;
    byProtocol: Record<string, number>;
  } {
    const total = this.db.prepare("SELECT COUNT(*) as count FROM connections").get() as { count: number };
    const active = this.db.prepare(`
      SELECT COUNT(*) as count FROM connections WHERE disconnected_at IS NULL
    `).get() as { count: number };
    
    const byProtocol = this.db.prepare(`
      SELECT protocol, COUNT(*) as count FROM connections GROUP BY protocol
    `).all() as Array<{ protocol: string; count: number }>;

    return {
      total: total.count,
      active: active.count,
      byProtocol: Object.fromEntries(byProtocol.map(p => [p.protocol, p.count])),
    };
  }

  close(): void {
    this.db.close();
  }
}

// ============================================================================
// 3. WEBSOCKET SERVER WITH NETWORK INTEGRATION
// ============================================================================

interface WebSocketClient {
  id: string;
  hostname: string;
  ipv4?: string;
  ipv6?: string;
  connectedAt: number;
  messagesSent: number;
  messagesReceived: number;
  connectionId: number; // Database connection ID
}

class UnifiedNetworkServer {
  private server: Server | null = null;
  private resolver: NetworkResolver;
  private database: NetworkDatabase;
  private clients = new Map<string, WebSocketClient>();
  private port: number;

  constructor(port: number = 3000, dbPath?: string) {
    this.port = port;
    this.resolver = new NetworkResolver();
    this.database = new NetworkDatabase(dbPath);
  }

  /**
   * Start the unified network server
   */
  start(): void {
    const networkInfo = this.resolver.getNetworkInfo();
    
    const dnsConfig = this.resolver.getDNSCacheStats().config;
    const ttlDisplay = dnsConfig.ttl 
      ? `${dnsConfig.ttl}s (configured)` 
      : `${dnsConfig.defaultTtl}s (default)`;

    // Format IPv6 addresses (limit display to first 3 for readability)
    const ipv4Display = networkInfo.ipv4.length > 0 
      ? networkInfo.ipv4.join(", ") 
      : "None";
    const ipv6Display = networkInfo.ipv6.length > 0
      ? networkInfo.ipv6.length > 3
        ? `${networkInfo.ipv6.slice(0, 3).join(", ")} ... (+${networkInfo.ipv6.length - 3} more)`
        : networkInfo.ipv6.join(", ")
      : "None";

    console.log("🚀 Starting Unified Network Server");
    console.log(`📡 Hostname: ${networkInfo.hostname}`);
    console.log(`🔷 IPv4: ${ipv4Display}`);
    console.log(`🔶 IPv6: ${ipv6Display}`);
    console.log(`🌐 WebSocket: ws://${networkInfo.hostname}:${this.port}`);
    console.log(`💾 Database: Connected`);
    console.log(`🔍 DNS Cache TTL: ${ttlDisplay}`);
    if (!dnsConfig.ttl) {
      console.log(`   💡 Set BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS to customize (default: 30s)`);
    }
    console.log();

    try {
      this.server = serve({
        port: this.port,
        hostname: "0.0.0.0", // Listen on all interfaces
      
      fetch: async (req, server) => {
        const url = new URL(req.url);

        // WebSocket upgrade
        if (url.pathname === "/ws" || url.pathname === "/websocket") {
          const clientIP = this.getClientIP(req);
          const success = server.upgrade(req, {
            data: {
              clientIP,
              upgradeTime: Date.now(),
            },
          });

          if (success) {
            return undefined; // Upgrade successful
          }
          return new Response("WebSocket upgrade failed", { status: 400 });
        }

        // Health check
        if (url.pathname === "/health") {
          const stats = this.database.getConnectionStats();
          const dnsStats = this.resolver.getDNSCacheStats();
          
          return Response.json({
            status: "healthy",
            network: {
              hostname: networkInfo.hostname,
              ipv4: networkInfo.ipv4,
              ipv6: networkInfo.ipv6,
            },
            connections: stats,
            dns: {
              internal: dnsStats.internal,
              bun: dnsStats.bun,
              config: dnsStats.config,
              hitRate: dnsStats.bun && dnsStats.bun.totalCount > 0
                ? ((dnsStats.bun.cacheHitsCompleted / dnsStats.bun.totalCount) * 100).toFixed(1) + "%"
                : "0%",
            },
            timestamp: Date.now(),
          });
        }

        // Network info endpoint
        if (url.pathname === "/network") {
          return Response.json({
            ...networkInfo,
            dnsCache: Array.from(networkInfo.dnsResolved.entries()).map(([host, data]) => ({
              hostname: host,
              ipv4: data.ipv4,
              ipv6: data.ipv6,
              cached: true,
            })),
          });
        }

        // Database stats
        if (url.pathname === "/stats") {
          const stats = this.database.getConnectionStats();
          return Response.json(stats);
        }

        return new Response("Unified Network Server", { status: 200 });
      },

      websocket: {
        open: async (ws) => {
          const clientIP = (ws.data as any).clientIP || "unknown";
          const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Resolve client hostname/IP
          let hostname = "unknown";
          let ipv4: string | undefined;
          let ipv6: string | undefined;

          try {
            // Try to resolve client IP (if it's a hostname)
            if (clientIP !== "unknown" && !this.isIP(clientIP)) {
              const resolved = await this.resolver.resolveHostname(clientIP, true);
              hostname = clientIP;
              ipv4 = resolved.ipv4?.[0];
              ipv6 = resolved.ipv6?.[0];
            } else {
              hostname = clientIP;
              ipv4 = this.isIPv4(clientIP) ? clientIP : undefined;
              ipv6 = this.isIPv6(clientIP) ? clientIP : undefined;
            }
          } catch {
            hostname = clientIP;
          }

          // Log connection to database
          const connectionId = this.database.logConnection(hostname, ipv4, ipv6, "ws");
          this.database.logEvent("connection", hostname, ipv4 || ipv6, "WebSocket connected");

          // Store client info
          const client: WebSocketClient = {
            id: clientId,
            hostname,
            ipv4,
            ipv6,
            connectedAt: Date.now(),
            messagesSent: 0,
            messagesReceived: 0,
            connectionId,
          };

          this.clients.set(clientId, client);
          (ws as any).clientId = clientId;

          console.log(`🔌 Client connected: ${clientId}`);
          console.log(`   Hostname: ${hostname}`);
          console.log(`   IPv4: ${ipv4 || "N/A"}`);
          console.log(`   IPv6: ${ipv6 || "N/A"}\n`);

          // Send welcome message with network info
          ws.send(JSON.stringify({
            type: "welcome",
            clientId,
            server: {
              hostname: networkInfo.hostname,
              ipv4: networkInfo.ipv4,
              ipv6: networkInfo.ipv6,
            },
            client: {
              hostname,
              ipv4,
              ipv6,
            },
            timestamp: Date.now(),
          }));
        },

        message: (ws, message) => {
          const clientId = (ws as any).clientId;
          const client = this.clients.get(clientId);
          if (!client) return;

          client.messagesReceived++;
          this.database.logEvent("message_received", client.hostname, client.ipv4 || client.ipv6);

          try {
            const data = typeof message === "string" ? JSON.parse(message) : JSON.parse(new TextDecoder().decode(message));
            
            // Handle DNS resolution requests
            if (data.type === "resolve") {
              this.handleDNSResolution(ws, data.hostname, client);
              return;
            }

            // Echo message back
            ws.send(JSON.stringify({
              type: "echo",
              original: data,
              timestamp: Date.now(),
            }));

            client.messagesSent++;
          } catch (error: any) {
            ws.send(JSON.stringify({
              type: "error",
              message: error.message,
            }));
          }
        },

        close: (ws) => {
          const clientId = (ws as any).clientId;
          const client = this.clients.get(clientId);
          if (!client) return;

          // Update database
          this.database.disconnectConnection(
            client.connectionId,
            client.messagesSent,
            client.messagesReceived
          );
          this.database.logEvent("disconnection", client.hostname, client.ipv4 || client.ipv6);

          console.log(`🔌 Client disconnected: ${clientId} (${client.hostname})`);
          this.clients.delete(clientId);
        },

        error: (ws, error) => {
          const clientId = (ws as any).clientId;
          const client = this.clients.get(clientId);
          console.error(`❌ WebSocket error for ${clientId}:`, error);
          
          if (client) {
            this.database.logEvent("error", client.hostname, client.ipv4 || client.ipv6, error.message);
          }
        },
      },
    });

      console.log(`✅ Server running on port ${this.port}\n`);
    } catch (error: any) {
      if (error.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${this.port} is already in use`);
        console.error(`\n💡 Solutions:`);
        console.error(`   1. Stop the process using port ${this.port}:`);
        console.error(`      lsof -ti:${this.port} | xargs kill -9`);
        console.error(`   2. Use a different port:`);
        console.error(`      PORT=${this.port + 1} bun unified-network-system.ts`);
        console.error(`   3. Set custom port via environment variable:`);
        console.error(`      PORT=8080 bun unified-network-system.ts\n`);
        throw error;
      } else {
        console.error(`\n❌ Failed to start server: ${error.message}\n`);
        throw error;
      }
    }
  }

  /**
   * Handle DNS resolution request from client
   */
  private async handleDNSResolution(ws: any, hostname: string, client: WebSocketClient): Promise<void> {
    try {
      // Check database cache first
      const cached = this.database.getCachedDNS(hostname);
      if (cached) {
        ws.send(JSON.stringify({
          type: "dns_resolved",
          hostname,
          ipv4: cached.ipv4,
          ipv6: cached.ipv6,
          cached: true,
          timestamp: Date.now(),
        }));
        return;
      }

      // Resolve using network resolver
      const resolved = await this.resolver.resolveHostname(hostname, true);
      
      // Cache in database
      this.database.cacheDNSResolution(hostname, resolved.ipv4, resolved.ipv6);
      
      // Send response
      ws.send(JSON.stringify({
        type: "dns_resolved",
        hostname,
        ipv4: resolved.ipv4,
        ipv6: resolved.ipv6,
        cached: false,
        timestamp: Date.now(),
      }));

      this.database.logEvent("dns_resolution", hostname, resolved.ipv4?.[0] || resolved.ipv6?.[0]);
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: "error",
        message: `DNS resolution failed: ${error.message}`,
      }));
    }
  }

  /**
   * Get client IP from request
   */
  private getClientIP(req: Request): string {
    // Try X-Forwarded-For header
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    // Try X-Real-IP header
    const realIP = req.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }

    return "unknown";
  }

  /**
   * Check if string is an IP address
   */
  private isIP(ip: string): boolean {
    return this.isIPv4(ip) || this.isIPv6(ip);
  }

  /**
   * Check if string is IPv4
   */
  private isIPv4(ip: string): boolean {
    const parts = ip.split(".");
    return parts.length === 4 && parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  /**
   * Check if string is IPv6
   */
  private isIPv6(ip: string): boolean {
    return ip.includes(":") && ip.split(":").length <= 8;
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      clients: this.clients.size,
      network: this.resolver.getNetworkInfo(),
      database: this.database.getConnectionStats(),
    };
  }

  /**
   * Stop server
   */
  stop(): void {
    if (this.server) {
      this.server.stop();
      this.database.close();
      console.log("🛑 Server stopped");
    }
  }
}

// ============================================================================
// 4. EXPORTS & MAIN
// ============================================================================

export { UnifiedNetworkServer, NetworkResolver, NetworkDatabase };

// Main execution
if (import.meta.main) {
  const port = parseInt(process.env.PORT || "3000", 10);
  const dbPath = process.env.DB_PATH;
  
  let server: UnifiedNetworkServer | null = null;
  
  try {
    server = new UnifiedNetworkServer(port, dbPath);
    server.start();
  } catch (error: any) {
    if (error.code === "EADDRINUSE") {
      // Try alternative ports
      console.log(`\n🔄 Trying alternative ports...\n`);
      let started = false;
      
      for (let altPort = port + 1; altPort <= port + 10; altPort++) {
        try {
          server = new UnifiedNetworkServer(altPort, dbPath);
          server.start();
          console.log(`\n✅ Started on alternative port ${altPort} instead of ${port}\n`);
          started = true;
          break;
        } catch {
          // Continue to next port
        }
      }
      
      if (!started) {
        console.error(`\n❌ Could not find an available port (tried ${port}-${port + 10})\n`);
        process.exit(1);
      }
    } else {
      console.error(`\n❌ Failed to start server: ${error.message}\n`);
      process.exit(1);
    }
  }

  // Graceful shutdown (only if server started successfully)
  if (server) {
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down...");
      server!.stop();
      process.exit(0);
    });
  }
}
