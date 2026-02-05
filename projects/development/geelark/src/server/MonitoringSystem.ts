/**
 * Monitoring System
 *
 * Tracks metrics per IP, device/phone, and environment
 * Uses SQLite for persistence via bun:sqlite
 */

import { Database } from "bun:sqlite";
import path from "node:path";

const __dirname = import.meta.dir;
const ROOT_DIR = path.resolve(__dirname, "../..");
const DB_PATH = path.join(ROOT_DIR, "monitoring.db");

export interface MonitoringEvent {
  id?: number;
  timestamp: number;
  ip: string;
  environment: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  deviceType?: string;
  deviceFingerprint?: string;
  path?: string;
}

export interface DeviceInfo {
  fingerprint: string;
  firstSeen: number;
  lastSeen: number;
  requestCount: number;
  userAgent: string;
  deviceType: string;
  environment: string;
  ip: string;
}

export interface IPStats {
  ip: string;
  environment: string;
  requestCount: number;
  lastRequest: number;
  avgResponseTime: number;
  statusCodes: Record<number, number>;
}

export interface EnvironmentMetrics {
  environment: string;
  totalRequests: number;
  uniqueIPs: number;
  uniqueDevices: number;
  avgResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

export class MonitoringSystem {
  private db: Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Monitoring events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monitoring_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        ip TEXT NOT NULL,
        environment TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        statusCode INTEGER NOT NULL,
        responseTime INTEGER NOT NULL,
        userAgent TEXT,
        deviceType TEXT,
        deviceFingerprint TEXT,
        path TEXT
      )
    `);

    // Device tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        fingerprint TEXT PRIMARY KEY,
        firstSeen INTEGER NOT NULL,
        lastSeen INTEGER NOT NULL,
        requestCount INTEGER NOT NULL DEFAULT 1,
        userAgent TEXT NOT NULL,
        deviceType TEXT NOT NULL,
        environment TEXT NOT NULL,
        ip TEXT NOT NULL
      )
    `);

    // IP statistics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ip_stats (
        ip TEXT NOT NULL,
        environment TEXT NOT NULL,
        requestCount INTEGER NOT NULL DEFAULT 1,
        lastRequest INTEGER NOT NULL,
        avgResponseTime INTEGER NOT NULL,
        statusCodes TEXT NOT NULL,
        PRIMARY KEY (ip, environment)
      )
    `);

    // Create indexes for performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON monitoring_events(timestamp)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_ip ON monitoring_events(ip)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_environment ON monitoring_events(environment)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_devices_environment ON devices(environment)`);
  }

  /**
   * Generate device fingerprint from request
   */
  generateDeviceFingerprint(req: Request): string {
    const userAgent = req.headers.get("user-agent") || "";
    const acceptLanguage = req.headers.get("accept-language") || "";
    const acceptEncoding = req.headers.get("accept-encoding") || "";

    // Simple fingerprint based on headers
    const fingerprint = Bun.hash(
      userAgent + "|" + acceptLanguage + "|" + acceptEncoding
    ).toString();

    return fingerprint;
  }

  /**
   * Determine device type from user agent
   */
  determineDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
    if (ua.includes("android")) return "android";
    if (ua.includes("windows phone")) return "windows-phone";
    if (ua.includes("windows")) return "windows";
    if (ua.includes("macintosh") || ua.includes("mac os x")) return "macos";
    if (ua.includes("linux")) return "linux";

    return "unknown";
  }

  /**
   * Get client IP from request
   */
  getClientIP(req: Request): string {
    // Check for forwarded IP (behind proxy)
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    // Check for real IP header
    const realIP = req.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }

    // Return placeholder for local development
    return "127.0.0.1";
  }

  /**
   * Record a monitoring event
   */
  recordEvent(event: MonitoringEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO monitoring_events (
        timestamp, ip, environment, endpoint, method, statusCode,
        responseTime, userAgent, deviceType, deviceFingerprint, path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.timestamp,
      event.ip,
      event.environment,
      event.endpoint,
      event.method,
      event.statusCode,
      event.responseTime,
      event.userAgent || null,
      event.deviceType || null,
      event.deviceFingerprint || null,
      event.path || null
    );

    // Update device tracking
    if (event.deviceFingerprint && event.userAgent) {
      this.updateDevice(event);
    }

    // Update IP stats
    this.updateIPStats(event);
  }

  /**
   * Update or insert device record
   */
  private updateDevice(event: MonitoringEvent): void {
    const existing = this.db.prepare(`
      SELECT * FROM devices WHERE fingerprint = ?
    `).get(event.deviceFingerprint!);

    if (existing) {
      this.db.prepare(`
        UPDATE devices
        SET lastSeen = ?, requestCount = requestCount + 1, ip = ?
        WHERE fingerprint = ?
      `).run(
        event.timestamp,
        event.ip || "",
        event.deviceFingerprint || ""
      );
    } else {
      this.db.prepare(`
        INSERT INTO devices (fingerprint, firstSeen, lastSeen, requestCount, userAgent, deviceType, environment, ip)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?)
      `).run(
        event.deviceFingerprint || "",
        event.timestamp,
        event.timestamp,
        event.userAgent || "",
        event.deviceType || "unknown",
        event.environment || "",
        event.ip || ""
      );
    }
  }

  /**
   * Update IP statistics
   */
  private updateIPStats(event: MonitoringEvent): void {
    const existing = this.db.prepare(`
      SELECT * FROM ip_stats WHERE ip = ? AND environment = ?
    `).get(event.ip, event.environment) as any;

    if (existing) {
      const statusCodes = JSON.parse(existing.statusCodes || "{}");
      statusCodes[event.statusCode!] = (statusCodes[event.statusCode!] || 0) + 1;

      // Update average response time
      const newAvgResponseTime =
        ((existing.avgResponseTime || 0) * (existing.requestCount || 0) + event.responseTime) /
        ((existing.requestCount || 0) + 1);

      this.db.prepare(`
        UPDATE ip_stats
        SET requestCount = requestCount + 1,
            lastRequest = ?,
            avgResponseTime = ?,
            statusCodes = ?
        WHERE ip = ? AND environment = ?
      `).run(
        event.timestamp,
        newAvgResponseTime,
        JSON.stringify(statusCodes),
        event.ip,
        event.environment
      );
    } else {
      const statusCodes = { [event.statusCode]: 1 };
      this.db.prepare(`
        INSERT INTO ip_stats (ip, environment, requestCount, lastRequest, avgResponseTime, statusCodes)
        VALUES (?, ?, 1, ?, ?, ?)
      `).run(
        event.ip,
        event.environment,
        event.timestamp,
        event.responseTime,
        JSON.stringify(statusCodes)
      );
    }
  }

  /**
   * Get metrics for a specific environment
   */
  getEnvironmentMetrics(environment: string): EnvironmentMetrics {
    const totalRequests = this.db.prepare(`
      SELECT COUNT(*) as count FROM monitoring_events WHERE environment = ?
    `).get(environment) as { count: number };

    const uniqueIPs = this.db.prepare(`
      SELECT COUNT(DISTINCT ip) as count FROM monitoring_events WHERE environment = ?
    `).get(environment) as { count: number };

    const uniqueDevices = this.db.prepare(`
      SELECT COUNT(DISTINCT deviceFingerprint) as count FROM monitoring_events WHERE environment = ?
    `).get(environment) as { count: number };

    const avgResponse = this.db.prepare(`
      SELECT AVG(responseTime) as avg FROM monitoring_events WHERE environment = ?
    `).get(environment) as { avg: number };

    const errors = this.db.prepare(`
      SELECT COUNT(*) as count FROM monitoring_events WHERE environment = ? AND statusCode >= 400
    `).get(environment) as { count: number };

    const topEndpoints = this.db.prepare(`
      SELECT endpoint, COUNT(*) as count
      FROM monitoring_events
      WHERE environment = ?
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `).all(environment) as Array<{ endpoint: string; count: number }>;

    return {
      environment,
      totalRequests: totalRequests.count,
      uniqueIPs: uniqueIPs.count,
      uniqueDevices: uniqueDevices.count,
      avgResponseTime: avgResponse.avg || 0,
      errorRate: totalRequests.count > 0 ? errors.count / totalRequests.count : 0,
      topEndpoints,
    };
  }

  /**
   * Get top IPs by request count
   */
  getTopIPs(environment: string, limit: number = 20): Array<{
    ip: string;
    requestCount: number;
    lastRequest: number;
    avgResponseTime: number;
  }> {
    return this.db.prepare(`
      SELECT ip, requestCount, lastRequest, avgResponseTime
      FROM ip_stats
      WHERE environment = ?
      ORDER BY requestCount DESC
      LIMIT ?
    `).all(environment, limit) as any;
  }

  /**
   * Get top devices by request count
   */
  getTopDevices(environment: string, limit: number = 20): Array<{
    fingerprint: string;
    deviceType: string;
    requestCount: number;
    lastSeen: number;
    userAgent: string;
  }> {
    return this.db.prepare(`
      SELECT fingerprint, deviceType, requestCount, lastSeen, userAgent
      FROM devices
      WHERE environment = ?
      ORDER BY requestCount DESC
      LIMIT ?
    `).all(environment, limit) as any;
  }

  /**
   * Get recent events for an IP
   */
  getIPEvents(ip: string, environment: string, limit: number = 50): MonitoringEvent[] {
    return this.db.prepare(`
      SELECT * FROM monitoring_events
      WHERE ip = ? AND environment = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(ip, environment, limit) as any;
  }

  /**
   * Get device events
   */
  getDeviceEvents(fingerprint: string, limit: number = 50): MonitoringEvent[] {
    return this.db.prepare(`
      SELECT * FROM monitoring_events
      WHERE deviceFingerprint = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(fingerprint, limit) as any;
  }

  /**
   * Check if IP is rate limited
   */
  isRateLimited(ip: string, environment: string, maxRequests: number = 100, windowSeconds: number = 60): boolean {
    const windowStart = Date.now() - (windowSeconds * 1000);

    const count = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM monitoring_events
      WHERE ip = ? AND environment = ? AND timestamp > ?
    `).get(ip, environment, windowStart) as { count: number };

    return count.count >= maxRequests;
  }

  /**
   * Get all environments
   */
  getEnvironments(): string[] {
    const result = this.db.prepare(`
      SELECT DISTINCT environment FROM monitoring_events ORDER BY environment
    `).all() as Array<{ environment: string }>;

    return result.map(r => r.environment);
  }

  /**
   * Cleanup old events
   */
  cleanup(olderThanDays: number = 30): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const result = this.db.prepare(`
      DELETE FROM monitoring_events WHERE timestamp < ?
    `).run(cutoff);

    return result.changes;
  }

  /**
   * Get monitoring summary
   */
  getSummary(): {
    totalEvents: number;
    uniqueIPs: number;
    uniqueDevices: number;
    environments: string[];
  } {
    const totalEvents = this.db.prepare(`
      SELECT COUNT(*) as count FROM monitoring_events
    `).get() as { count: number };

    const uniqueIPs = this.db.prepare(`
      SELECT COUNT(DISTINCT ip) as count FROM monitoring_events
    `).get() as { count: number };

    const uniqueDevices = this.db.prepare(`
      SELECT COUNT(DISTINCT deviceFingerprint) as count FROM monitoring_events
    `).get() as { count: number };

    const environments = this.getEnvironments();

    return {
      totalEvents: totalEvents.count,
      uniqueIPs: uniqueIPs.count,
      uniqueDevices: uniqueDevices.count,
      environments,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}
