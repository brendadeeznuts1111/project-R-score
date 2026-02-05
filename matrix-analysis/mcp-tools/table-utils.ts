#!/usr/bin/env bun
// table-utils.ts - Table utilities for multi-tenant dashboard

/**
 * Display tenant violations in a formatted table
 */
export function displayTenantViolations(violations: Array<{
  tenant: string;
  violations: number;
  critical: number;
  warning: number;
  info: number;
}>): string {
  return Bun.inspect.table(violations);
}

/**
 * Display specific columns from tenant data
 */
export function displayTenantSummary(violations: Array<{
  tenant: string;
  violations: number;
  critical: number;
  warning: number;
  info: number;
}>, columns: string[] = ["tenant", "violations", "critical"]): string {
  return Bun.inspect.table(violations, columns);
}

/**
 * Display snapshot information table
 */
export function displaySnapshotTable(snapshots: Array<{
  tenant: string;
  filename: string;
  size: number;
  sha256: string;
  createdAt: string;
}>, colored: boolean = true): string {
  const options = colored ? { colors: true } : undefined;
  return Bun.inspect.table(snapshots, ["tenant", "filename", "size", "sha256"], options);
}

/**
 * Display API performance metrics
 */
export function displayApiMetrics(metrics: Array<{
  endpoint: string;
  avgTime: number;
  requests: number;
  successRate: number;
}>, columns?: string[]): string {
  const defaultColumns = ["endpoint", "avgTime", "successRate"];
  return Bun.inspect.table(metrics, columns || defaultColumns);
}

/**
 * Display compliance scores across tenants
 */
export function displayComplianceScores(scores: Array<{
  tenant: string;
  score: number;
  status: "compliant" | "warning" | "critical";
  lastChecked: string;
}>, colored: boolean = true): string {
  const options = colored ? { colors: true } : undefined;
  return Bun.inspect.table(scores, ["tenant", "score", "status"], options);
}

/**
 * Display system status overview
 */
export function displaySystemStatus(status: {
  apiServer: boolean;
  dashboard: boolean;
  database: boolean;
  activeTenants: number;
  totalSnapshots: number;
}): string {
  const statusArray = [
    { component: "API Server", status: status.apiServer ? "✅ Running" : "❌ Stopped", uptime: "2h 15m" },
    { component: "Dashboard", status: status.dashboard ? "✅ Running" : "❌ Stopped", uptime: "2h 15m" },
    { component: "Database", status: status.database ? "✅ Connected" : "❌ Disconnected", uptime: "2h 15m" },
    { component: "Active Tenants", status: status.activeTenants.toString(), uptime: "N/A" },
    { component: "Total Snapshots", status: status.totalSnapshots.toString(), uptime: "N/A" }
  ];
  
  return Bun.inspect.table(statusArray, ["component", "status"]);
}

/**
 * Display recent violations with details
 */
export function displayRecentViolations(violations: Array<{
  id: string;
  tenant: string;
  type: string;
  severity: "critical" | "warning" | "info";
  preview: string;
  timestamp: string;
}>, limit: number = 10): string {
  const recent = violations.slice(0, limit);
  return Bun.inspect.table(recent, ["id", "tenant", "severity", "preview"]);
}

/**
 * Display export job status
 */
export function displayExportJobs(jobs: Array<{
  id: string;
  tenant: string;
  type: "csv" | "json" | "xlsx";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  createdAt: string;
  completedAt?: string;
}>, colored: boolean = true): string {
  const options = colored ? { colors: true } : undefined;
  return Bun.inspect.table(jobs, ["id", "tenant", "type", "status", "progress"], options);
}

/**
 * Create a summary dashboard table
 */
export function createDashboardSummary(data: {
  totalTenants: number;
  activeTenants: number;
  totalViolations: number;
  criticalViolations: number;
  snapshotsCreated: number;
  apiUptime: string;
}): string {
  const summary = [
    { metric: "Total Tenants", value: data.totalTenants.toString(), status: "📊" },
    { metric: "Active Tenants", value: data.activeTenants.toString(), status: "✅" },
    { metric: "Total Violations", value: data.totalViolations.toString(), status: data.criticalViolations > 0 ? "⚠️" : "✅" },
    { metric: "Critical Violations", value: data.criticalViolations.toString(), status: data.criticalViolations > 0 ? "🚨" : "✅" },
    { metric: "Snapshots Created", value: data.snapshotsCreated.toString(), status: "📸" },
    { metric: "API Uptime", value: data.apiUptime, status: "⚡" }
  ];
  
  return Bun.inspect.table(summary, ["metric", "value", "status"], { colors: true });
}

// Demo usage
if (import.meta.main) {
  console.log("🧪 Table Utilities Demo for Multi-Tenant Dashboard");
  console.log("=" .repeat(60));
  
  // Sample data for demonstration
  const violations = [
    { tenant: "tenant-a", violations: 12, critical: 3, warning: 7, info: 2 },
    { tenant: "tenant-b", violations: 8, critical: 1, warning: 5, info: 2 },
    { tenant: "tenant-c", violations: 15, critical: 5, warning: 8, info: 2 }
  ];
  
  const snapshots = [
    { tenant: "tenant-a", filename: "audit-snapshot-2026-02-01.tar.gz", size: 10240, sha256: "abc123...", createdAt: "2026-02-01T11:30:00Z" },
    { tenant: "tenant-b", filename: "audit-snapshot-2026-02-01.tar.gz", size: 11264, sha256: "def456...", createdAt: "2026-02-01T11:30:00Z" },
    { tenant: "tenant-c", filename: "audit-snapshot-2026-02-01.tar.gz", size: 9984, sha256: "ghi789...", createdAt: "2026-02-01T11:30:00Z" }
  ];
  
  const apiMetrics = [
    { endpoint: "/api/tenants", avgTime: 8, requests: 150, successRate: 100 },
    { endpoint: "/api/historical-compliance", avgTime: 45, requests: 89, successRate: 98.9 },
    { endpoint: "/api/recent-violations", avgTime: 32, requests: 234, successRate: 99.1 }
  ];
  
  console.log("\n📊 Tenant Violations:");
  console.log(displayTenantViolations(violations));
  
  console.log("\n🎯 Critical Violations Summary:");
  console.log(displayTenantSummary(violations, ["tenant", "critical"]));
  
  console.log("\n📸 Snapshot Information:");
  console.log(displaySnapshotTable(snapshots));
  
  console.log("\n⚡ API Performance:");
  console.log(displayApiMetrics(apiMetrics));
  
  console.log("\n📋 Dashboard Summary:");
  const summary = createDashboardSummary({
    totalTenants: 5,
    activeTenants: 3,
    totalViolations: 35,
    criticalViolations: 9,
    snapshotsCreated: 12,
    apiUptime: "2h 15m"
  });
  console.log(summary);
  
  console.log("\n💡 Integration Benefits:");
  console.log("  • Beautiful table formatting for CLI output");
  console.log("  • Selective column display for focused views");
  console.log("  • Color support for enhanced readability");
  console.log("  • Perfect for admin dashboards and reports");
  console.log("  • Built-in to Bun (no dependencies required)");
}

export { Bun };
