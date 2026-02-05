/**
 * Socket Inspection System
 *
 * Deep inspection of DNS and TCP sockets for monitoring and security
 */

import { Database } from "bun:sqlite";
import path from "node:path";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");
const SOCKET_DB_PATH = path.join(ROOT_DIR, "monitoring-sockets.db");

export interface DNSQuery {
  id?: number;
  timestamp: number;
  hostname: string;
  queryType: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "PTR";
  resolvedAddresses: string[];
  responseTime: number; // milliseconds
  nameserver: string;
  sourceIP: string;
  environment: string;
  success: boolean;
  error?: string;
  ttl?: number;
}

export interface TCPConnection {
  id?: number;
  timestamp: number;
  sourceIP: string;
  sourcePort: number;
  destIP: string;
  destPort: number;
  protocol: "tcp" | "udp" | "tls" | "ws" | "wss";
  state: "connecting" | "connected" | "closed" | "failed" | "timeout";
  duration: number; // milliseconds
  bytesSent: number;
  bytesReceived: number;
  environment: string;
  userAgent?: string;
  latency?: number; // connection setup time
  tlsVersion?: string;
  tlsCipher?: string;
}

export interface SocketStats {
  totalDNSQueries: number;
  totalTCPConnections: number;
  activeConnections: number;
  topDomains: Array<{ domain: string; queryCount: number }>;
  topDestinations: Array<{ ip: string; port: number; connectionCount: number }>;
  avgDNSTime: number;
  avgConnectionTime: number;
  failureRate: number;
}

export class SocketInspectionSystem {
  private db: Database;
  private activeConnections: Map<string, TCPConnection> = new Map();

  constructor(dbPath: string = SOCKET_DB_PATH) {
    // @ts-ignore - Using dynamic import
    const { Database } = require("bun:sqlite");
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // DNS queries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dns_queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        hostname TEXT NOT NULL,
        queryType TEXT NOT NULL,
        resolvedAddresses TEXT NOT NULL,
        responseTime REAL NOT NULL,
        nameserver TEXT NOT NULL,
        sourceIP TEXT NOT NULL,
        environment TEXT NOT NULL,
        success INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        ttl INTEGER
      )
    `);

    // TCP connections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tcp_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        sourceIP TEXT NOT NULL,
        sourcePort INTEGER NOT NULL,
        destIP TEXT NOT NULL,
        destPort INTEGER NOT NULL,
        protocol TEXT NOT NULL,
        state TEXT NOT NULL,
        duration REAL NOT NULL,
        bytesSent INTEGER NOT NULL DEFAULT 0,
        bytesReceived INTEGER NOT NULL DEFAULT 0,
        environment TEXT NOT NULL,
        userAgent TEXT,
        latency REAL,
        tlsVersion TEXT,
        tlsCipher TEXT
      )
    `);

    // Socket events table (for real-time tracking)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS socket_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        sourceIP TEXT NOT NULL,
        destination TEXT NOT NULL,
        details TEXT NOT NULL,
        environment TEXT NOT NULL
      )
    `);

    // Indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_dns_timestamp ON dns_queries(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_dns_hostname ON dns_queries(hostname)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_dns_source ON dns_queries(sourceIP)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tcp_timestamp ON tcp_connections(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tcp_dest ON tcp_connections(destIP, destPort)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tcp_source ON tcp_connections(sourceIP)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_socket_events_timestamp ON socket_events(timestamp)`);
  }

  /**
   * Record a DNS query
   */
  recordDNSQuery(query: DNSQuery): void {
    this.db.prepare(`
      INSERT INTO dns_queries (
        timestamp, hostname, queryType, resolvedAddresses, responseTime,
        nameserver, sourceIP, environment, success, error, ttl
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      query.timestamp,
      query.hostname,
      query.queryType,
      JSON.stringify(query.resolvedAddresses),
      query.responseTime,
      query.nameserver,
      query.sourceIP,
      query.environment,
      query.success ? 1 : 0,
      query.error || null,
      query.ttl || null
    );

    // Log socket event
    this.logSocketEvent({
      timestamp: query.timestamp,
      type: query.success ? "dns_success" : "dns_failure",
      sourceIP: query.sourceIP,
      destination: query.hostname,
      details: JSON.stringify({
        queryType: query.queryType,
        responseTime: query.responseTime,
        resolvedAddresses: query.resolvedAddresses,
        error: query.error,
      }),
      environment: query.environment,
    });
  }

  /**
   * Record a TCP connection
   */
  recordTCPConnection(connection: TCPConnection): void {
    this.db.prepare(`
      INSERT INTO tcp_connections (
        timestamp, sourceIP, sourcePort, destIP, destPort, protocol,
        state, duration, bytesSent, bytesReceived, environment,
        userAgent, latency, tlsVersion, tlsCipher
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      connection.timestamp,
      connection.sourceIP,
      connection.sourcePort,
      connection.destIP,
      connection.destPort,
      connection.protocol,
      connection.state,
      connection.duration,
      connection.bytesSent,
      connection.bytesReceived,
      connection.environment,
      connection.userAgent || null,
      connection.latency || null,
      connection.tlsVersion || null,
      connection.tlsCipher || null
    );

    // Track active connections
    const key = `${connection.sourceIP}:${connection.sourcePort}->${connection.destIP}:${connection.destPort}`;
    if (connection.state === "connected") {
      this.activeConnections.set(key, connection);
    } else if (connection.state === "closed" || connection.state === "failed") {
      this.activeConnections.delete(key);
    }

    // Log socket event
    this.logSocketEvent({
      timestamp: connection.timestamp,
      type: `tcp_${connection.state}`,
      sourceIP: connection.sourceIP,
      destination: `${connection.destIP}:${connection.destPort}`,
      details: JSON.stringify({
        protocol: connection.protocol,
        duration: connection.duration,
        bytesSent: connection.bytesSent,
        bytesReceived: connection.bytesReceived,
        latency: connection.latency,
      }),
      environment: connection.environment,
    });
  }

  /**
   * Log socket event
   */
  private logSocketEvent(event: {
    timestamp: number;
    type: string;
    sourceIP: string;
    destination: string;
    details: string;
    environment: string;
  }): void {
    this.db.prepare(`
      INSERT INTO socket_events (timestamp, type, sourceIP, destination, details, environment)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      event.timestamp,
      event.type,
      event.sourceIP,
      event.destination,
      event.details,
      event.environment
    );
  }

  /**
   * Get socket statistics
   */
  getSocketStats(environment?: string): SocketStats {
    let envFilter = "";
    const params: any[] = [];

    if (environment) {
      envFilter = "WHERE environment = ?";
      params.push(environment);
    }

    const totalDNS = this.db
      .prepare(`SELECT COUNT(*) as count FROM dns_queries ${envFilter}`)
      .get(...params) as { count: number };

    const totalTCP = this.db
      .prepare(`SELECT COUNT(*) as count FROM tcp_connections ${envFilter}`)
      .get(...params) as { count: number };

    const activeCount = this.activeConnections.size;

    // Get top domains
    const topDomainsRows = this.db.prepare(`
      SELECT hostname, COUNT(*) as count
      FROM dns_queries
      ${envFilter ? "WHERE environment = ?" : ""}
      GROUP BY hostname
      ORDER BY count DESC
      LIMIT 20
    `).all(...(environment ? [environment] : [])) as any[];

    const topDomains = topDomainsRows.map(row => ({
      domain: row.hostname,
      queryCount: row.count,
    }));

    // Get top destinations
    const topDestsRows = this.db.prepare(`
      SELECT destIP, destPort, COUNT(*) as count
      FROM tcp_connections
      ${envFilter ? "WHERE environment = ?" : ""}
      GROUP BY destIP, destPort
      ORDER BY count DESC
      LIMIT 20
    `).all(...(environment ? [environment] : [])) as any[];

    const topDestinations = topDestsRows.map(row => ({
      ip: row.destIP,
      port: row.destPort,
      connectionCount: row.count,
    }));

    // Average DNS time
    const avgDNSTimeRow = this.db.prepare(`
      SELECT AVG(responseTime) as avg
      FROM dns_queries
      ${envFilter ? "WHERE environment = ?" : ""}
      ${envFilter ? "AND success = 1" : "WHERE success = 1"}
    `).get(...(environment ? [environment] : [])) as { avg: number | null };

    // Average connection time
    const avgConnTimeRow = this.db.prepare(`
      SELECT AVG(duration) as avg
      FROM tcp_connections
      ${envFilter ? "WHERE environment = ?" : ""}
      ${envFilter ? "AND state = 'connected'" : "WHERE state = 'connected'"}
    `).get(...(environment ? [environment] : [])) as { avg: number | null };

    // Failure rate
    const dnsFailures = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM dns_queries
      ${envFilter ? "WHERE environment = ?" : ""}
      ${envFilter ? "AND success = 0" : "WHERE success = 0"}
    `).get(...(environment ? [environment] : [])) as { count: number };

    const tcpFailures = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM tcp_connections
      ${envFilter ? "WHERE environment = ?" : ""}
      ${envFilter ? "AND state = 'failed'" : "WHERE state = 'failed'"}
    `).get(...(environment ? [environment] : [])) as { count: number };

    const totalFailures = dnsFailures.count + tcpFailures.count;
    const totalOperations = totalDNS.count + totalTCP.count;
    const failureRate = totalOperations > 0 ? totalFailures / totalOperations : 0;

    return {
      totalDNSQueries: totalDNS.count,
      totalTCPConnections: totalTCP.count,
      activeConnections: activeCount,
      topDomains,
      topDestinations,
      avgDNSTime: avgDNSTimeRow?.avg || 0,
      avgConnectionTime: avgConnTimeRow?.avg || 0,
      failureRate,
    };
  }

  /**
   * Get DNS queries for a hostname
   */
  getDNSQueries(hostname: string, limit: number = 100): DNSQuery[] {
    const rows = this.db
      .prepare(`
        SELECT * FROM dns_queries
        WHERE hostname LIKE ?
        ORDER BY timestamp DESC
        LIMIT ?
      `)
      .all(`%${hostname}%`, limit) as any[];

    return rows.map(row => ({
      ...row,
      resolvedAddresses: JSON.parse(row.resolvedAddresses),
      success: row.success === 1,
    }));
  }

  /**
   * Get TCP connections for a destination
   */
  getTCPConnections(destIP: string, destPort?: number, limit: number = 100): TCPConnection[] {
    let query = "SELECT * FROM tcp_connections WHERE destIP = ?";
    const params: any[] = [destIP];

    if (destPort) {
      query += " AND destPort = ?";
      params.push(destPort);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows;
  }

  /**
   * Get recent socket events
   */
  getSocketEvents(type?: string, limit: number = 100): any[] {
    let query = "SELECT * FROM socket_events";
    const params: any[] = [];

    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  /**
   * Get DNS query patterns
   */
  getDNSPatterns(limit: number = 20): {
    slowQueries: DNSQuery[];
    failedQueries: DNSQuery[];
    frequentQueries: Array<{ hostname: string; count: number }>;
  } {
    // Slow queries (response time > 1000ms)
    const slowRows = this.db
      .prepare(`
        SELECT * FROM dns_queries
        WHERE responseTime > 1000 AND success = 1
        ORDER BY responseTime DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    // Failed queries
    const failedRows = this.db
      .prepare(`
        SELECT * FROM dns_queries
        WHERE success = 0
        ORDER BY timestamp DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    // Most frequent queries
    const frequentRows = this.db
      .prepare(`
        SELECT hostname, COUNT(*) as count
        FROM dns_queries
        GROUP BY hostname
        ORDER BY count DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    return {
      slowQueries: slowRows.map(row => ({
        ...row,
        resolvedAddresses: JSON.parse(row.resolvedAddresses),
        success: true,
      })),
      failedQueries: failedRows.map(row => ({
        ...row,
        resolvedAddresses: JSON.parse(row.resolvedAddresses),
        success: false,
      })),
      frequentQueries: frequentRows,
    };
  }

  /**
   * Get TCP connection patterns
   */
  getTCPPatterns(limit: number = 20): {
    longConnections: TCPConnection[];
    failedConnections: TCPConnection[];
    highVolumeConnections: Array<{ destIP: string; destPort: number; totalBytes: number }>;
  } {
    // Long connections (duration > 60 seconds)
    const longRows = this.db
      .prepare(`
        SELECT * FROM tcp_connections
        WHERE duration > 60000 AND state = 'connected'
        ORDER BY duration DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    // Failed connections
    const failedRows = this.db
      .prepare(`
        SELECT * FROM tcp_connections
        WHERE state = 'failed' OR state = 'timeout'
        ORDER BY timestamp DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    // High volume connections
    const volumeRows = this.db
      .prepare(`
        SELECT destIP, destPort,
               SUM(bytesSent + bytesReceived) as totalBytes
        FROM tcp_connections
        GROUP BY destIP, destPort
        ORDER BY totalBytes DESC
        LIMIT ?
      `)
      .all(limit) as any[];

    return {
      longConnections: longRows,
      failedConnections: failedRows,
      highVolumeConnections: volumeRows,
    };
  }

  /**
   * Detect suspicious DNS activity
   */
  detectSuspiciousDNS(): {
    dnsTunneling?: Array<{ hostname: string; queryCount: number; avgLength: number }>;
    fastFlux?: Array<{ hostname: string; ipCount: number; changeRate: number }>;
    domainGenerationAlgorithms?: Array<{ pattern: string; matchCount: number }>;
    suspiciousTLDs?: Array<{ tld: string; queryCount: number }>;
  } {
    const results: any = {};

    // Check for DNS tunneling (high query rate, long hostnames)
    const tunnelingRows = this.db
      .prepare(`
        SELECT hostname,
               COUNT(*) as queryCount,
               AVG(LENGTH(hostname)) as avgLength
        FROM dns_queries
        WHERE LENGTH(hostname) > 50
        GROUP BY hostname
        HAVING queryCount > 100
        ORDER BY queryCount DESC
        LIMIT 10
      `)
      .all() as any[];

    if (tunnelingRows.length > 0) {
      results.dnsTunneling = tunnelingRows;
    }

    // Check for fast-flux (many IP addresses for single domain)
    const fastFluxRows = this.db
      .prepare(`
        SELECT hostname,
               COUNT(DISTINCT json_each.value) as ipCount,
               CAST(COUNT(*) as REAL) / COUNT(DISTINCT json_each.value) as changeRate
        FROM dns_queries, json_each(resolvedAddresses)
        WHERE success = 1
        GROUP BY hostname
        HAVING ipCount > 10
        ORDER BY changeRate DESC
        LIMIT 10
      `)
      .all() as any[];

    if (fastFluxRows.length > 0) {
      results.fastFlux = fastFluxRows;
    }

    // Check for suspicious TLDs
    const suspiciousTLDs = this.db
      .prepare(`
        SELECT SUBSTR(hostname, -INSTR(hostname, '.') + 1) as tld,
               COUNT(*) as queryCount
        FROM dns_queries
        WHERE LENGTH(hostname) - LENGTH(REPLACE(hostname, '.', '')) >= 2
        GROUP BY tld
        ORDER BY queryCount DESC
        LIMIT 10
      `)
      .all() as any[];

    if (suspiciousTLDs.length > 0) {
      results.suspiciousTLDs = suspiciousTLDs;
    }

    return results;
  }

  /**
   * Get active connections
   */
  getActiveConnections(): TCPConnection[] {
    return Array.from(this.activeConnections.values());
  }

  /**
   * Cleanup old socket data
   */
  cleanup(olderThanDays: number = 7): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const dnsDeleted = this.db
      .prepare("DELETE FROM dns_queries WHERE timestamp < ?")
      .run(cutoff).changes;

    const tcpDeleted = this.db
      .prepare("DELETE FROM tcp_connections WHERE timestamp < ?")
      .run(cutoff).changes;

    const eventsDeleted = this.db
      .prepare("DELETE FROM socket_events WHERE timestamp < ?")
      .run(cutoff).changes;

    return dnsDeleted + tcpDeleted + eventsDeleted;
  }

  /**
   * Export socket data
   */
  exportData(format: "json" | "csv" = "json", environment?: string): string {
    const envFilter = environment ? `WHERE environment = '${environment}'` : "";

    if (format === "csv") {
      // DNS queries
      const dnsCSV = this.db
        .prepare(`SELECT * FROM dns_queries ${envFilter}`)
        .all();

      // TCP connections
      const tcpCSV = this.db
        .prepare(`SELECT * FROM tcp_connections ${envFilter}`)
        .all();

      return JSON.stringify({
        dns: dnsCSV,
        tcp: tcpCSV,
      });
    }

    // JSON format
    const dnsData = this.db.prepare(`SELECT * FROM dns_queries ${envFilter}`).all();
    const tcpData = this.db.prepare(`SELECT * FROM tcp_connections ${envFilter}`).all();
    const eventData = this.db.prepare(`SELECT * FROM socket_events ${envFilter}`).all();

    return JSON.stringify({
      dns: dnsData.map((row: any) => ({
        ...row,
        resolvedAddresses: JSON.parse(row.resolvedAddresses),
        success: row.success === 1,
      })),
      tcp: tcpData,
      events: eventData,
    }, null, 2);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
