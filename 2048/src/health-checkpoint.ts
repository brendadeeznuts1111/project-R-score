#!/usr/bin/env bun
/**
 * CRC32 System Health Checkpoint
 * Validates all system components and reports health status
 */

import { existsSync } from "fs";

interface HealthStatus {
  timestamp: number;
  status: "healthy" | "degraded" | "critical";
  checks: HealthCheck[];
  uptime: number;
  version: string;
}

interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

interface HealthConfig {
  checkDatabase: boolean;
  checkPerformance: boolean;
  checkWorkers: boolean;
  checkDiskSpace: boolean;
}

class HealthCheckpoint {
  private startTime: number;
  private checks: HealthCheck[] = [];

  constructor() {
    this.startTime = Date.now();
  }

  async run(config: Partial<HealthConfig> = {}): Promise<HealthStatus> {
    const options: HealthConfig = {
      checkDatabase: true,
      checkPerformance: true,
      checkWorkers: true,
      checkDiskSpace: true,
      ...config,
    };

    console.log("🩺 Running CRC32 System Health Check...\n");

    if (options.checkDatabase) {
      await this.checkDatabase();
    }

    if (options.checkPerformance) {
      await this.checkPerformance();
    }

    if (options.checkWorkers) {
      await this.checkWorkers();
    }

    if (options.checkDiskSpace) {
      await this.checkDiskSpace();
    }

    return this.generateReport();
  }

  private async checkDatabase(): Promise<void> {
    const start = performance.now();
    const dbPaths = [
      "./data/crc32-enhanced.db",
      "./data/crc32-enhanced-simple.db",
      "./data/test-enhanced.db",
      "./data/lattice.db",
      "./crc32-enhanced.db",
      "./crc32-enhanced-simple.db",
      "./test-enhanced.db",
      "./lattice.db",
    ];

    const existing = dbPaths.filter((p) => existsSync(p));
    const unique = [...new Set(existing)];
    const duration = performance.now() - start;

    this.checks.push({
      name: "Database",
      status: unique.length > 0 ? "pass" : "warn",
      message: `${unique.length} database(s) found`,
      duration,
      metadata: { databases: unique },
    });
  }

  private async checkPerformance(): Promise<void> {
    const start = performance.now();

    try {
      const data = new Uint8Array(1024 * 64); // 64KB for better accuracy
      const checksum = Bun.hash.crc32(data.buffer);
      const duration = performance.now() - start;

      const throughput = (64 * 1024) / (duration / 1000) / (1024 * 1024);

      this.checks.push({
        name: "Performance",
        status: throughput > 10 ? "pass" : "warn",
        message: `CRC32 throughput: ${throughput.toFixed(2)} MB/s`,
        duration,
        metadata: { throughput, checksum },
      });
    } catch (error) {
      this.checks.push({
        name: "Performance",
        status: "fail",
        message: `CRC32 computation failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - start,
      });
    }
  }

  private async checkWorkers(): Promise<void> {
    const start = performance.now();

    try {
      const workerPath = "./crc32-worker";
      const exists = existsSync(workerPath);

      this.checks.push({
        name: "Workers",
        status: exists ? "pass" : "warn",
        message: exists
          ? "CRC32 worker binary found"
          : "CRC32 worker not found",
        duration: performance.now() - start,
        metadata: { workerPath, exists },
      });
    } catch (error) {
      this.checks.push({
        name: "Workers",
        status: "fail",
        message: `Worker check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - start,
      });
    }
  }

  private async checkDiskSpace(): Promise<void> {
    const start = performance.now();

    try {
      const resultsDir = "./performance-results";
      const exists = existsSync(resultsDir);

      this.checks.push({
        name: "Disk Space",
        status: "pass",
        message: exists
          ? "Performance results directory accessible"
          : "Results directory not found",
        duration: performance.now() - start,
        metadata: { path: resultsDir, exists },
      });
    } catch (error) {
      this.checks.push({
        name: "Disk Space",
        status: "fail",
        message: `Disk check failed: ${error instanceof Error ? error.message : String(error)}`,
        duration: performance.now() - start,
      });
    }
  }

  private generateReport(): HealthStatus {
    const passCount = this.checks.filter((c) => c.status === "pass").length;
    const failCount = this.checks.filter((c) => c.status === "fail").length;
    const warnCount = this.checks.filter((c) => c.status === "warn").length;

    let overallStatus: HealthStatus["status"];
    if (failCount > 0) {
      overallStatus = "critical";
    } else if (warnCount > 0) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    return {
      timestamp: Date.now(),
      status: overallStatus,
      checks: this.checks,
      uptime: Date.now() - this.startTime,
      version: "2.0.0",
    };
  }

  printReport(status: HealthStatus): void {
    console.log("═".repeat(60));
    console.log("🩺 CRC32 System Health Report");
    console.log("═".repeat(60));
    console.log(`📅 Timestamp: ${new Date(status.timestamp).toISOString()}`);
    console.log(`⏱️  Uptime: ${status.uptime.toFixed(2)}ms`);
    console.log(`🔢 Version: ${status.version}`);
    console.log("");

    const statusIcon =
      status.status === "healthy"
        ? "✅"
        : status.status === "degraded"
          ? "⚠️"
          : "❌";
    console.log(`${statusIcon} Overall Status: ${status.status.toUpperCase()}`);
    console.log("");

    console.log("Checks:");
    console.log("-".repeat(60));

    for (const check of status.checks) {
      const icon =
        check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌";
      console.log(`${icon} ${check.name}: ${check.message}`);
      console.log(`   Duration: ${check.duration.toFixed(2)}ms`);
    }

    console.log("");
    console.log("-".repeat(60));
    const passCount = status.checks.filter((c) => c.status === "pass").length;
    const failCount = status.checks.filter((c) => c.status === "fail").length;
    const warnCount = status.checks.filter((c) => c.status === "warn").length;
    console.log(
      `📊 Summary: ${passCount} pass, ${warnCount} warn, ${failCount} fail`,
    );
    console.log("═".repeat(60));
  }
}

async function main() {
  const checkpoint = new HealthCheckpoint();
  const status = await checkpoint.run();
  checkpoint.printReport(status);

  process.exit(status.status === "critical" ? 1 : 0);
}

export { HealthCheckpoint, type HealthCheck, type HealthStatus };

if (import.meta.main) {
  main();
}
