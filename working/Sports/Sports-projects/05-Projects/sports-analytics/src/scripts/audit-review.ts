#!/usr/bin/env bun

/**
 * T3-Lattice Registry Audit Review
 * Analyzes audit logs and security compliance
 */

import { LatticeConfigManager } from "../config/lattice.config";
import { LATTICE_REGISTRY } from "../config/lattice.config";

interface AuditEntry {
  timestamp: string;
  endpoint: string;
  requestId: string;
  status: number;
  sessionId: string;
  quantumHash?: string;
}

interface AuditSummary {
  totalEntries: number;
  endpointStats: Record<string, {
    requestCount: number;
    successRate: number;
    averageStatus: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
  quantumAuditCount: number;
  securityEvents: AuditEntry[];
}

async function parseAuditLog(): Promise<AuditEntry[]> {
  const config = LatticeConfigManager.getInstance().getConfig();
  const auditFile = Bun.file(config.auditLogPath);
  
  try {
    const content = await auditFile.text();
    if (!content) return [];

    return content
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string) => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as AuditEntry[];
  } catch (error) {
    console.warn("Could not read audit log:", error);
    return [];
  }
}

function analyzeAuditLog(entries: AuditEntry[]): AuditSummary {
  const summary: AuditSummary = {
    totalEntries: entries.length,
    endpointStats: {},
    timeRange: {
      start: entries.length > 0 ? entries[0].timestamp : '',
      end: entries.length > 0 ? entries[entries.length - 1].timestamp : ''
    },
    quantumAuditCount: 0,
    securityEvents: []
  };

  // Group by endpoint
  const endpointMap = new Map<string, AuditEntry[]>();
  
  entries.forEach(entry => {
    if (!endpointMap.has(entry.endpoint)) {
      endpointMap.set(entry.endpoint, []);
    }
    endpointMap.get(entry.endpoint)!.push(entry);
    
    if (entry.quantumHash) {
      summary.quantumAuditCount++;
    }
    
    // Flag potential security events (4xx and 5xx status codes)
    if (entry.status >= 400 && entry.status < 600) {
      summary.securityEvents.push(entry);
    }
  });

  // Calculate endpoint statistics
  endpointMap.forEach((endpointEntries, endpoint) => {
    const requestCount = endpointEntries.length;
    const successCount = endpointEntries.filter(e => e.status < 400).length;
    const successRate = (successCount / requestCount) * 100;
    const averageStatus = endpointEntries.reduce((sum, e) => sum + e.status, 0) / requestCount;

    summary.endpointStats[endpoint] = {
      requestCount,
      successRate,
      averageStatus
    };
  });

  return summary;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function generateSecurityReport(entries: AuditEntry[]): string {
  if (entries.length === 0) return "No security events detected";

  const report = ["🚨 Security Events Report:", "=" .repeat(30)];
  
  // Group by status code
  const statusGroups = entries.reduce((acc, entry) => {
    if (!acc[entry.status]) {
      acc[entry.status] = [];
    }
    acc[entry.status].push(entry);
    return acc;
  }, {} as Record<number, AuditEntry[]>);

  Object.entries(statusGroups).forEach(([status, events]) => {
    report.push(`\nStatus ${status} (${events.length} events):`);
    events.slice(0, 5).forEach(event => {
      report.push(`  • ${formatTimestamp(event.timestamp)} - ${event.endpoint} (${event.requestId})`);
    });
    
    if (events.length > 5) {
      report.push(`  • ... and ${events.length - 5} more`);
    }
  });

  return report.join('\n');
}

export async function runAuditReview() {
  console.log("🔍 T3-Lattice Registry Audit Review");
  console.log("=" .repeat(50));
  
  try {
    // Parse audit log
    console.log("📋 Reading audit log...");
    const entries = await parseAuditLog();
    
    if (entries.length === 0) {
      console.log("📭 No audit entries found. Audit logging may be disabled.");
      return;
    }

    console.log(`📊 Found ${entries.length} audit entries`);
    console.log();

    // Analyze audit log
    const summary = analyzeAuditLog(entries);
    
    console.log("📈 Audit Summary:");
    console.log(`  Total Entries: ${summary.totalEntries}`);
    console.log(`  Time Range: ${formatTimestamp(summary.timeRange.start)} - ${formatTimestamp(summary.timeRange.end)}`);
    console.log(`  Quantum Audits: ${summary.quantumAuditCount}`);
    console.log(`  Security Events: ${summary.securityEvents.length}`);
    console.log();

    // Endpoint statistics
    console.log("🔗 Endpoint Statistics:");
    Object.entries(summary.endpointStats).forEach(([endpoint, stats]) => {
      console.log(`  ${endpoint}:`);
      console.log(`    Requests: ${stats.requestCount}`);
      console.log(`    Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`    Average Status: ${stats.averageStatus.toFixed(0)}`);
      console.log();
    });

    // Security events
    if (summary.securityEvents.length > 0) {
      console.log(generateSecurityReport(summary.securityEvents));
      console.log();
    }

    // Compliance recommendations
    console.log("🛡️  Compliance Recommendations:");
    
    // Check for high error rates
    const highErrorEndpoints = Object.entries(summary.endpointStats)
      .filter(([_, stats]) => stats.successRate < 95)
      .map(([endpoint]) => endpoint);
    
    if (highErrorEndpoints.length > 0) {
      console.log(`  • High error rates on: ${highErrorEndpoints.join(", ")}`);
    }

    // Check for quantum audit coverage
    const quantumAuditRate = (summary.quantumAuditCount / summary.totalEntries) * 100;
    if (quantumAuditRate < 50) {
      console.log(`  • Low quantum audit coverage: ${quantumAuditRate.toFixed(1)}%`);
    }

    // Check for recent security events
    const recentSecurityEvents = summary.securityEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return eventDate > oneWeekAgo;
    });

    if (recentSecurityEvents.length > 0) {
      console.log(`  • ${recentSecurityEvents.length} security events in the last 7 days`);
    }

    // Overall compliance score
    const avgSuccessRate = Object.values(summary.endpointStats)
      .reduce((sum, stats) => sum + stats.successRate, 0) / Object.keys(summary.endpointStats).length;
    
    const complianceScore = (avgSuccessRate * 0.7) + (Math.min(quantumAuditRate, 100) * 0.3);
    
    console.log(`\n🎯 Overall Compliance Score: ${complianceScore.toFixed(1)}%`);
    
    if (complianceScore >= 95) {
      console.log("✅ Excellent compliance");
    } else if (complianceScore >= 85) {
      console.log("✅ Good compliance");
    } else if (complianceScore >= 75) {
      console.log("⚠️  Fair compliance - improvements needed");
    } else {
      console.log("❌ Poor compliance - immediate action required");
    }

  } catch (error) {
    console.error("❌ Audit review failed:", error);
  }
}

// Run the audit review
runAuditReview().catch(console.error);
