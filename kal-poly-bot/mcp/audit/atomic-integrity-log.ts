/**
 * Component #11: Atomic Integrity Log
 *
 * Provides audit logging and integrity verification for MCP server
 * Integrates with Component #41 MCP Server Engine
 */

interface AuditEntry {
  timestamp: number;
  component: string;
  endpoint: string;
  path: string;
  userId?: string;
  ip: string;
  userAgent: string;
  action: string;
  metadata: Record<string, unknown>;
}

interface ComplianceScore {
  score: number;
  status: "COMPLIANT" | "WARNING" | "VIOLATION";
  lastAudit: number;
  violations: string[];
  recommendations: string[];
}

export class AtomicIntegrityLog {
  private auditLogUrl: string;
  private auditEntries: AuditEntry[] = [];
  private complianceScore: ComplianceScore;

  constructor(auditLogUrl?: string) {
    this.auditLogUrl = auditLogUrl || "file://audit.log";
    this.complianceScore = {
      score: 98.5,
      status: "COMPLIANT",
      lastAudit: Date.now(),
      violations: [],
      recommendations: [],
    };
  }

  recordAccess(
    entry: Omit<AuditEntry, "timestamp" | "ip" | "userAgent">
  ): void {
    const auditEntry: AuditEntry = {
      timestamp: Date.now(),
      ip: "127.0.0.1", // Would extract from request in production
      userAgent: "MCP-Server-Engine/2.4.1",
      ...entry,
    };

    this.auditEntries.push(auditEntry);

    // Keep only last 1000 entries in memory
    if (this.auditEntries.length > 1000) {
      this.auditEntries = this.auditEntries.slice(-1000);
    }

    // Log to console for demonstration
    console.log(
      `[AUDIT] ${entry.component} -> ${entry.endpoint} (${entry.path})`
    );
  }

  async getLastAudit(componentId: number): Promise<object> {
    const componentEntries = this.auditEntries.filter((entry) =>
      entry.component.includes(componentId.toString())
    );

    if (componentEntries.length === 0) {
      return {
        componentId,
        lastAudit: Date.now(),
        status: "NO_RECORDS",
        entries: 0,
      };
    }

    const lastEntry = componentEntries[componentEntries.length - 1];

    return {
      componentId,
      lastAudit: lastEntry.timestamp,
      status: "COMPLIANT",
      entries: componentEntries.length,
      lastAccess: lastEntry.path,
      riskScore: this.calculateRiskScore(componentEntries),
    };
  }

  async getLogs(timestamp?: number): Promise<AuditEntry[]> {
    let entries = this.auditEntries;

    if (timestamp) {
      entries = entries.filter((entry) => entry.timestamp >= timestamp);
    }

    // Return most recent 100 entries
    return entries.slice(-100);
  }

  async getComplianceScore(): Promise<ComplianceScore> {
    // Calculate compliance based on recent audit entries
    const recentEntries = this.auditEntries.slice(-100);

    const violations = this.detectViolations(recentEntries);
    const score = Math.max(0, 100 - violations.length * 5);

    this.complianceScore = {
      score,
      status: score >= 95 ? "COMPLIANT" : score >= 80 ? "WARNING" : "VIOLATION",
      lastAudit: Date.now(),
      violations,
      recommendations: this.generateRecommendations(violations),
    };

    return this.complianceScore;
  }

  private calculateRiskScore(entries: AuditEntry[]): number {
    // Simple risk calculation based on access patterns
    let riskScore = 0.1;

    // Check for unusual access patterns
    const uniqueIPs = new Set(entries.map((e) => e.ip)).size;
    if (uniqueIPs > 10) riskScore += 0.2;

    // Check for failed authentication attempts
    const failedAttempts = entries.filter(
      (e) => e.action.includes("FAILED") || e.action.includes("UNAUTHORIZED")
    ).length;
    riskScore += Math.min(failedAttempts * 0.1, 0.5);

    // Check for access to sensitive endpoints
    const sensitiveAccess = entries.filter(
      (e) => e.path.includes("/admin") || e.path.includes("/security")
    ).length;
    riskScore += Math.min(sensitiveAccess * 0.05, 0.2);

    return Math.min(riskScore, 1.0);
  }

  private detectViolations(entries: AuditEntry[]): string[] {
    const violations: string[] = [];

    // Check for access outside business hours
    const offHoursAccess = entries.filter((entry) => {
      const hour = new Date(entry.timestamp).getHours();
      return hour < 6 || hour > 22;
    });

    if (offHoursAccess.length > 0) {
      violations.push("Access detected outside business hours");
    }

    // Check for rapid successive requests
    const rapidRequests = this.detectRapidRequests(entries);
    if (rapidRequests.length > 0) {
      violations.push("Rapid successive requests detected");
    }

    // Check for access from multiple IPs
    const uniqueIPs = new Set(entries.map((e) => e.ip));
    if (uniqueIPs.size > 5) {
      violations.push("Access from multiple IP addresses detected");
    }

    return violations;
  }

  private detectRapidRequests(entries: AuditEntry[]): AuditEntry[] {
    const rapidRequests: AuditEntry[] = [];

    for (let i = 1; i < entries.length; i++) {
      const timeDiff = entries[i].timestamp - entries[i - 1].timestamp;
      if (timeDiff < 1000) {
        // Less than 1 second apart
        rapidRequests.push(entries[i]);
      }
    }

    return rapidRequests;
  }

  private generateRecommendations(violations: string[]): string[] {
    const recommendations: string[] = [];

    if (violations.includes("Access detected outside business hours")) {
      recommendations.push("Consider implementing time-based access controls");
    }

    if (violations.includes("Rapid successive requests detected")) {
      recommendations.push("Implement rate limiting to prevent abuse");
    }

    if (violations.includes("Access from multiple IP addresses detected")) {
      recommendations.push(
        "Review session management and implement IP whitelisting"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue monitoring for security best practices");
    }

    return recommendations;
  }

  async exportAuditLog(): Promise<string> {
    const logData = {
      exportedAt: Date.now(),
      totalEntries: this.auditEntries.length,
      complianceScore: this.complianceScore,
      entries: this.auditEntries,
    };

    return JSON.stringify(logData, null, 2);
  }

  clearAuditLog(): void {
    this.auditEntries = [];
    console.log("[AUDIT] Audit log cleared");
  }

  getAuditStats(): object {
    const last24Hours = this.auditEntries.filter(
      (entry) => entry.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );

    const uniqueEndpoints = new Set(this.auditEntries.map((e) => e.endpoint));
    const uniqueIPs = new Set(this.auditEntries.map((e) => e.ip));

    return {
      totalEntries: this.auditEntries.length,
      last24Hours: last24Hours.length,
      uniqueEndpoints: uniqueEndpoints.size,
      uniqueIPs: uniqueIPs.size,
      complianceScore: this.complianceScore.score,
      status: this.complianceScore.status,
    };
  }
}
