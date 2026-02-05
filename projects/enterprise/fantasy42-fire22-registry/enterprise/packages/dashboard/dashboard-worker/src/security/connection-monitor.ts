#!/usr/bin/env bun
/**
 * Connection Security Monitor - Real-time connection monitoring with security alerts
 * Monitors new connections and generates security alerts for suspicious activity
 */

import { logger } from '../../scripts/enhanced-logging-system';
import { errorTracker } from '../../scripts/error-code-index';

// !==!==!===== INTERFACES !==!==!=====
interface ConnectionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  geoLocation?: {
    country: string;
    city: string;
    region: string;
  };
  sessionId?: string;
  userId?: string;
  connectionType: 'websocket' | 'http' | 'api';
}

interface SecurityAlert {
  alertId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alertType: string;
  connection: ConnectionInfo;
  riskScore: number;
  reason: string;
  timestamp: Date;
  resolved: boolean;
}

interface SuspiciousPattern {
  type: 'rapid_connections' | 'geographic_anomaly' | 'known_bad_ip' | 'unusual_user_agent';
  threshold: number;
  timeWindow: number; // in milliseconds
}

// !==!==!===== CONNECTION SECURITY MONITOR !==!==!=====
export class ConnectionSecurityMonitor {
  private connections: Map<string, ConnectionInfo[]> = new Map();
  private alerts: SecurityAlert[] = [];
  private suspiciousIPs: Set<string> = new Set();
  private knownGoodIPs: Set<string> = new Set();

  private readonly suspiciousPatterns: SuspiciousPattern[] = [
    { type: 'rapid_connections', threshold: 10, timeWindow: 60000 }, // 10 connections in 1 minute
    { type: 'geographic_anomaly', threshold: 3, timeWindow: 300000 }, // 3 different countries in 5 minutes
    { type: 'known_bad_ip', threshold: 1, timeWindow: 0 }, // Immediate alert for known bad IPs
    { type: 'unusual_user_agent', threshold: 5, timeWindow: 300000 }, // 5 unusual agents in 5 minutes
  ];

  constructor() {
    this.initializeKnownGoodIPs();
    this.startCleanupInterval();
  }

  // !==!==!===== CONNECTION MONITORING !==!==!=====
  /**
   * Monitor new connection and generate security alerts if suspicious
   */
  public async monitorConnection(connectionInfo: ConnectionInfo): Promise<SecurityAlert | null> {
    logger.info(
      'SECURITY_MONITOR',
      '1.0.0',
      `New connection: ${connectionInfo.connectionType} from ${connectionInfo.ipAddress}`
    );

    // Store connection info
    const ipConnections = this.connections.get(connectionInfo.ipAddress) || [];
    ipConnections.push(connectionInfo);
    this.connections.set(connectionInfo.ipAddress, ipConnections);

    // Analyze connection for suspicious patterns
    const alert = await this.analyzeConnection(connectionInfo);

    if (alert) {
      this.alerts.push(alert);
      await this.handleSecurityAlert(alert);
      return alert;
    }

    return null;
  }

  /**
   * Analyze connection for suspicious patterns
   */
  private async analyzeConnection(connection: ConnectionInfo): Promise<SecurityAlert | null> {
    let riskScore = 0;
    const reasons: string[] = [];

    // Check for rapid connections from same IP
    const recentConnections = this.getRecentConnections(connection.ipAddress, 60000);
    if (recentConnections.length >= 10) {
      riskScore += 40;
      reasons.push('Rapid connection attempts detected');
    }

    // Check for known suspicious IPs
    if (this.suspiciousIPs.has(connection.ipAddress)) {
      riskScore += 60;
      reasons.push('Connection from known suspicious IP');
    }

    // Check for unusual geographic patterns
    if (connection.geoLocation) {
      const geoRisk = await this.analyzeGeographicPattern(connection);
      riskScore += geoRisk.score;
      if (geoRisk.reason) reasons.push(geoRisk.reason);
    }

    // Check user agent patterns
    const uaRisk = this.analyzeUserAgent(connection.userAgent);
    riskScore += uaRisk.score;
    if (uaRisk.reason) reasons.push(uaRisk.reason);

    // Check if IP is in whitelist (reduce risk)
    if (this.knownGoodIPs.has(connection.ipAddress)) {
      riskScore = Math.max(0, riskScore - 20);
    }

    // Generate alert if risk score is high enough
    if (riskScore >= 50) {
      const severity = this.calculateAlertSeverity(riskScore);

      return {
        alertId: this.generateAlertId(),
        severity,
        alertType: 'SUSPICIOUS_CONNECTION',
        connection,
        riskScore,
        reason: reasons.join('; '),
        timestamp: new Date(),
        resolved: false,
      };
    }

    return null;
  }

  /**
   * Analyze geographic patterns for anomalies
   */
  private async analyzeGeographicPattern(
    connection: ConnectionInfo
  ): Promise<{ score: number; reason?: string }> {
    if (!connection.geoLocation) return { score: 0 };

    // Get recent connections from same IP or user
    const recentConnections = this.getRecentConnectionsByUser(connection.userId, 300000);

    // Check for multiple countries in short time
    const countries = new Set(
      recentConnections.filter(c => c.geoLocation).map(c => c.geoLocation!.country)
    );

    if (countries.size >= 3) {
      return {
        score: 35,
        reason: `Multiple countries detected: ${Array.from(countries).join(', ')}`,
      };
    }

    // Check for high-risk countries (example list)
    const highRiskCountries = ['Unknown', 'TOR'];
    if (highRiskCountries.includes(connection.geoLocation.country)) {
      return {
        score: 25,
        reason: `Connection from high-risk country: ${connection.geoLocation.country}`,
      };
    }

    return { score: 0 };
  }

  /**
   * Analyze user agent for suspicious patterns
   */
  private analyzeUserAgent(userAgent: string): { score: number; reason?: string } {
    if (!userAgent || userAgent.length < 10) {
      return { score: 20, reason: 'Missing or suspicious user agent' };
    }

    // Check for bot patterns
    const botPatterns = [
      /bot/i,
      /crawl/i,
      /spider/i,
      /scrape/i,
      /curl/i,
      /wget/i,
      /python/i,
      /script/i,
    ];

    for (const pattern of botPatterns) {
      if (pattern.test(userAgent)) {
        return { score: 30, reason: 'Automated tool detected in user agent' };
      }
    }

    // Check for outdated browsers (potential security risk)
    if (userAgent.includes('MSIE') || userAgent.includes('Internet Explorer')) {
      return { score: 15, reason: 'Outdated browser detected' };
    }

    return { score: 0 };
  }

  /**
   * Handle security alert - logging, notifications, and automated responses
   */
  private async handleSecurityAlert(alert: SecurityAlert): Promise<void> {
    // Log security alert
    logger.warning(
      'SECURITY_MONITOR',
      '1.0.0',
      `Security Alert [${alert.severity}]: ${alert.reason} (Risk: ${alert.riskScore})`,
      'E6002'
    );

    // Track error in error index
    errorTracker.trackError('E6002');

    // Automated response based on severity
    switch (alert.severity) {
      case 'CRITICAL':
        await this.handleCriticalAlert(alert);
        break;
      case 'HIGH':
        await this.handleHighAlert(alert);
        break;
      case 'MEDIUM':
        await this.handleMediumAlert(alert);
        break;
    }

    // Log to security incident system
    await this.logSecurityIncident(alert);
  }

  /**
   * Handle critical security alerts
   */
  private async handleCriticalAlert(alert: SecurityAlert): Promise<void> {
    // Add IP to suspicious list
    this.suspiciousIPs.add(alert.connection.ipAddress);

    // Block future connections (in a real system, you'd integrate with firewall/WAF)
    logger.error(
      'SECURITY_MONITOR',
      '1.0.0',
      `CRITICAL ALERT: Blocking IP ${alert.connection.ipAddress}`,
      'E6001'
    );

    // Immediate notification (in production, this would trigger alerts)
    console.log(`🚨 CRITICAL SECURITY ALERT: ${alert.reason}`);
  }

  /**
   * Handle high-severity security alerts
   */
  private async handleHighAlert(alert: SecurityAlert): Promise<void> {
    // Add to watch list
    this.suspiciousIPs.add(alert.connection.ipAddress);

    // Enhanced monitoring
    logger.warning(
      'SECURITY_MONITOR',
      '1.0.0',
      `HIGH ALERT: Enhanced monitoring for IP ${alert.connection.ipAddress}`,
      'E6002'
    );
  }

  /**
   * Handle medium-severity security alerts
   */
  private async handleMediumAlert(alert: SecurityAlert): Promise<void> {
    // Just log for now
    logger.info(
      'SECURITY_MONITOR',
      '1.0.0',
      `MEDIUM ALERT: Monitoring IP ${alert.connection.ipAddress}`
    );
  }

  /**
   * Log security incident for audit trail
   */
  private async logSecurityIncident(alert: SecurityAlert): Promise<void> {
    // This would integrate with your WebLogManager or audit system
    const incidentData = {
      alertId: alert.alertId,
      severity: alert.severity,
      ipAddress: alert.connection.ipAddress,
      userAgent: alert.connection.userAgent,
      connectionType: alert.connection.connectionType,
      riskScore: alert.riskScore,
      reason: alert.reason,
      timestamp: alert.timestamp.toISOString(),
      geoLocation: alert.connection.geoLocation,
    };

    logger.info('AUDIT', '1.0.0', `Security incident logged: ${JSON.stringify(incidentData)}`);
  }

  // !==!==!===== HELPER METHODS !==!==!=====
  /**
   * Get recent connections from specific IP
   */
  private getRecentConnections(ipAddress: string, timeWindow: number): ConnectionInfo[] {
    const connections = this.connections.get(ipAddress) || [];
    const cutoff = new Date(Date.now() - timeWindow);

    return connections.filter(conn => conn.timestamp > cutoff);
  }

  /**
   * Get recent connections from specific user
   */
  private getRecentConnectionsByUser(
    userId: string | undefined,
    timeWindow: number
  ): ConnectionInfo[] {
    if (!userId) return [];

    const allConnections = Array.from(this.connections.values()).flat();
    const cutoff = new Date(Date.now() - timeWindow);

    return allConnections.filter(conn => conn.userId === userId && conn.timestamp > cutoff);
  }

  /**
   * Calculate alert severity based on risk score
   */
  private calculateAlertSeverity(riskScore: number): SecurityAlert['severity'] {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 65) return 'HIGH';
    if (riskScore >= 50) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `SEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize known good IPs (whitelist)
   */
  private initializeKnownGoodIPs(): void {
    // In production, this would load from configuration or database
    const knownGoodIPs = [
      '127.0.0.1',
      '::1',
      '192.168.1.0/24', // Local network
      // Add your known good IPs here
    ];

    // For simplicity, just add exact IPs to the set
    // In production, you'd implement CIDR matching
    knownGoodIPs.forEach(ip => {
      if (!ip.includes('/')) {
        this.knownGoodIPs.add(ip);
      }
    });
  }

  /**
   * Start cleanup interval to remove old connection data
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldConnections();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Clean up old connection data to prevent memory leaks
   */
  private cleanupOldConnections(): void {
    const cutoff = new Date(Date.now() - 3600000); // Keep 1 hour of data

    for (const [ip, connections] of this.connections) {
      const recentConnections = connections.filter(conn => conn.timestamp > cutoff);

      if (recentConnections.length === 0) {
        this.connections.delete(ip);
      } else {
        this.connections.set(ip, recentConnections);
      }
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(
      alert => Date.now() - alert.timestamp.getTime() < 86400000 // Keep 24 hours
    );

    logger.debug(
      'SECURITY_MONITOR',
      '1.0.0',
      `Cleanup completed: ${this.connections.size} IPs tracked, ${this.alerts.length} alerts stored`
    );
  }

  // !==!==!===== PUBLIC API !==!==!=====
  /**
   * Get current security status
   */
  public getSecurityStatus(): {
    activeConnections: number;
    suspiciousIPs: number;
    recentAlerts: number;
    highRiskConnections: number;
  } {
    const recentAlerts = this.alerts.filter(
      alert => Date.now() - alert.timestamp.getTime() < 3600000 // Last hour
    );

    const highRiskAlerts = recentAlerts.filter(
      alert => alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
    );

    return {
      activeConnections: Array.from(this.connections.values()).flat().length,
      suspiciousIPs: this.suspiciousIPs.size,
      recentAlerts: recentAlerts.length,
      highRiskConnections: highRiskAlerts.length,
    };
  }

  /**
   * Get recent security alerts
   */
  public getRecentAlerts(limit: number = 10): SecurityAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Manually resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('SECURITY_MONITOR', '1.0.0', `Alert ${alertId} resolved manually`);
      return true;
    }
    return false;
  }

  /**
   * Add IP to whitelist
   */
  public whitelistIP(ipAddress: string): void {
    this.knownGoodIPs.add(ipAddress);
    this.suspiciousIPs.delete(ipAddress);
    logger.info('SECURITY_MONITOR', '1.0.0', `IP ${ipAddress} added to whitelist`);
  }

  /**
   * Add IP to blacklist
   */
  public blacklistIP(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);
    this.knownGoodIPs.delete(ipAddress);
    logger.warning('SECURITY_MONITOR', '1.0.0', `IP ${ipAddress} added to blacklist`);
  }
}

// !==!==!===== SINGLETON INSTANCE !==!==!=====
export const connectionMonitor = new ConnectionSecurityMonitor();

// !==!==!===== PACKAGE REFERENCE PATTERN MATCHER !==!==!=====
export class PackageReferenceTracker {
  private packagePattern = /\[pk:([^@]+)@([^\]]+)\]/g;
  private detectedPackages: Map<string, { version: string; lastSeen: Date }> = new Map();

  /**
   * Extract and track package references from log messages
   */
  public trackPackageReferences(logMessage: string): { name: string; version: string }[] {
    const packages: { name: string; version: string }[] = [];
    let match;

    // Reset regex index
    this.packagePattern.lastIndex = 0;

    while ((match = this.packagePattern.exec(logMessage)) !== null) {
      const [, name, version] = match;
      packages.push({ name, version });

      // Track the package
      this.detectedPackages.set(name, {
        version,
        lastSeen: new Date(),
      });
    }

    if (packages.length > 0) {
      logger.debug(
        'PATTERN_MATCH',
        '2.1.0',
        `Detected packages: ${packages.map(p => `${p.name}@${p.version}`).join(', ')}`
      );
    }

    return packages;
  }

  /**
   * Get tracked packages
   */
  public getTrackedPackages(): Map<string, { version: string; lastSeen: Date }> {
    return new Map(this.detectedPackages);
  }

  /**
   * Check for package version mismatches or security issues
   */
  public validatePackages(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const now = Date.now();

    for (const [name, info] of this.detectedPackages) {
      // Check for outdated packages (older than 30 days)
      const daysSinceLastSeen = (now - info.lastSeen.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastSeen > 30) {
        issues.push(
          `Package ${name}@${info.version} not seen in ${Math.round(daysSinceLastSeen)} days`
        );
      }

      // Check for development versions in production logs
      if (info.version.includes('dev') || info.version.includes('beta')) {
        issues.push(`Development package ${name}@${info.version} detected in logs`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const packageTracker = new PackageReferenceTracker();

// !==!==!===== DEMO USAGE !==!==!=====
if (import.meta.main) {
  console.log('🔐 **CONNECTION SECURITY MONITOR DEMO** 🔐');
  console.log('='.repeat(60));

  // Demo connection monitoring
  const demoConnection: ConnectionInfo = {
    id: 'conn_demo_123',
    ipAddress: '203.0.113.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timestamp: new Date(),
    connectionType: 'websocket',
    geoLocation: {
      country: 'US',
      city: 'New York',
      region: 'NY',
    },
  };

  connectionMonitor.monitorConnection(demoConnection);

  // Demo package tracking
  const demoLogMessages = [
    '[SUCCESS] [DATABASE] [v1.0.0] Cache warmed successfully [pk:@cloudflare/kv@^2.0.0]',
    '[ERROR] [API] [v2.0.0] [E3002][WARNING]Rate limit exceeded [pk:@fire22/api@1.3.2]',
    '[DEBUG] [PATTERN_MATCH] [v2.1.0] Regex compiled: /\\[pk:([^@]+)@([^\\]]+)\\]/g',
  ];

  demoLogMessages.forEach(message => {
    packageTracker.trackPackageReferences(message);
  });

  console.log('\n📊 Security Status:');
  console.log(connectionMonitor.getSecurityStatus());

  console.log('\n📦 Tracked Packages:');
  console.log(Array.from(packageTracker.getTrackedPackages()));

  console.log('\n✅ Connection Security Monitor ready!');
}
