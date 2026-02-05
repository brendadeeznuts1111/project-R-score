#!/usr/bin/env bun
// ansi-utils.ts - ANSI utilities for multi-tenant dashboard

/**
 * Strip ANSI escape codes from text for clean logging and storage
 * Perfect for audit trails, log files, and API responses
 */
export function cleanLogOutput(text: string): string {
  return Bun.stripANSI(text);
}

/**
 * Create a clean audit trail entry (removes terminal colors)
 */
export function createAuditEntry(
  level: "INFO" | "WARN" | "ERROR",
  tenant: string,
  message: string,
  metadata?: Record<string, any>
): string {
  const timestamp = new Date().toISOString();
  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  
  // Create colored version for terminal display
  const colored = `\x1b[${level === "ERROR" ? "31" : level === "WARN" ? "33" : "32"}m[${level}]\x1b[0m \x1b[36m${tenant}\x1b[0m: ${message}${metaStr}`;
  
  // Return clean version for storage
  return cleanLogOutput(colored);
}

/**
 * Clean dashboard status for file storage
 */
export function cleanDashboardStatus(status: {
  apiServer: boolean;
  dashboard: boolean;
  activeTenants: number;
  criticalViolations: number;
}): string {
  const output = [
    `\x1b[1m\x1b[34m=== Multi-Tenant Dashboard Status ===\x1b[0m`,
    `\x1b[32m● API Server:\x1b[0m ${status.apiServer ? "\x1b[32mRunning\x1b[0m" : "\x1b[31mStopped\x1b[0m"} (port 3333)`,
    `\x1b[32m● Dashboard:\x1b[0m ${status.dashboard ? "\x1b[32mRunning\x1b[0m" : "\x1b[31mStopped\x1b[0m"} (port 3001)`,
    `\x1b[33m● Active Tenants:\x1b[0m ${status.activeTenants}`,
    `\x1b[31m● Critical Violations:\x1b[0m ${status.criticalViolations}`
  ].join("\n");
  
  return cleanLogOutput(output);
}

/**
 * Clean snapshot creation log for audit trail
 */
export function cleanSnapshotLog(tenant: string, filename: string, size: number, sha256: string): string {
  const colored = `\x1b[32m✓\x1b[0m \x1b[36m${new Date().toISOString()}\x1b[0m - \x1b[33mSnapshot created\x1b[0m: \x1b[32m${filename}\x1b[0m (${Math.round(size/1024)} KiB, SHA-256: ${sha256.slice(0,16)}…)`;
  return cleanLogOutput(colored);
}

/**
 * Clean violation report for export
 */
export function cleanViolationReport(violations: Array<{
  tenant: string;
  severity: "critical" | "warning" | "info";
  message: string;
  width: number;
}>): string {
  const lines = [
    `\x1b[1m\x1b[34m=== Violation Report ===\x1b[0m`,
    `\x1b[36mGenerated:\x1b[0m ${new Date().toISOString()}`,
    `\x1b[36mTotal Violations:\x1b[0m ${violations.length}`,
    ""
  ];
  
  violations.forEach(v => {
    const severityColor = v.severity === "critical" ? "31" : v.severity === "warning" ? "33" : "32";
    const line = `\x1b[${severityColor}m${v.severity.toUpperCase()}\x1b[0m \x1b[36m${v.tenant}\x1b[0m: ${v.message} (width: ${v.width})`;
    lines.push(line);
  });
  
  return cleanLogOutput(lines.join("\n"));
}

// Demo usage
if (import.meta.main) {
  console.log("🧪 ANSI Utilities Demo for Multi-Tenant Dashboard");
  console.log("=" .repeat(55));
  
  // Test audit entry creation
  console.log("\n📋 Audit Entry Creation:");
  const auditEntry = createAuditEntry("ERROR", "tenant-a", "Critical violation detected", { width: 95, line: 42 });
  console.log("Clean audit entry:", auditEntry);
  
  // Test dashboard status cleaning
  console.log("\n📊 Dashboard Status:");
  const status = {
    apiServer: true,
    dashboard: true,
    activeTenants: 5,
    criticalViolations: 12
  };
  const cleanStatus = cleanDashboardStatus(status);
  console.log(cleanStatus);
  
  // Test snapshot log cleaning
  console.log("\n📸 Snapshot Log:");
  const snapshotLog = cleanSnapshotLog("tenant-a", "audit-snapshot-tenant-a-2026-02-01.tar.gz", 10240, "abc123def456");
  console.log(snapshotLog);
  
  // Test violation report cleaning
  console.log("\n⚠️  Violation Report:");
  const violations = [
    { tenant: "tenant-a", severity: "critical" as const, message: "Line exceeds 88 characters", width: 95 },
    { tenant: "tenant-b", severity: "warning" as const, message: "Indentation issue", width: 45 },
    { tenant: "tenant-c", severity: "info" as const, message: "Style suggestion", width: 80 }
  ];
  const report = cleanViolationReport(violations);
  console.log(report);
  
  console.log("\n💡 Integration Benefits:");
  console.log("  • Clean log files for storage and analysis");
  console.log("  • Remove terminal colors from audit trails");
  console.log("  • Prepare output for non-ANSI consumers");
  console.log("  • Strip formatting for API responses");
  console.log("  • Generate clean export files");
}

export { Bun };
