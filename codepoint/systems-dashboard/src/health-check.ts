#!/usr/bin/env bun

/**
 * Health Check System for Systems Dashboard
 *
 * Provides comprehensive health monitoring, error handling, and system diagnostics
 * for the Systems Dashboard application.
 */

import { Database } from "bun:sqlite";

// Health check interface
interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  services: ServiceHealth[];
  system: SystemHealth;
  errors: ErrorReport[];
  metrics: HealthMetrics;
}

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
  error?: string;
}

interface SystemHealth {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    connected: boolean;
    latency?: number;
  };
}

interface ErrorReport {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  stack?: string;
  context?: Record<string, any>;
  resolved: boolean;
}

interface HealthMetrics {
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  activeConnections: number;
}

// Error tracking system
class ErrorTracker {
  private errors: ErrorReport[] = [];
  private maxErrors = 1000;

  trackError(
    error: Error,
    level: "error" | "warning" | "info" = "error",
    context?: Record<string, any>
  ): void {
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message: error.message,
      stack: error.stack,
      context,
      resolved: false,
    };

    this.errors.push(errorReport);

    // Keep only the latest errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log error
    console.error(`[${level.toUpperCase()}] ${error.message}`, {
      context,
      stack: error.stack,
    });
  }

  getErrors(limit = 50): ErrorReport[] {
    return this.errors.slice(-limit);
  }

  resolveError(errorId: string): void {
    const error = this.errors.find((e) => e.id === errorId);
    if (error) {
      error.resolved = true;
    }
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorStats(): {
    total: number;
    unresolved: number;
    byLevel: Record<string, number>;
  } {
    const byLevel: Record<string, number> = {};

    this.errors.forEach((error) => {
      byLevel[error.level] = (byLevel[error.level] || 0) + 1;
    });

    return {
      total: this.errors.length,
      unresolved: this.errors.filter((e) => !e.resolved).length,
      byLevel,
    };
  }
}

// Health check service
class HealthCheckService {
  private startTime = Date.now();
  private errorTracker = new ErrorTracker();
  private metrics: HealthMetrics = {
    totalRequests: 0,
    errorRate: 0,
    averageResponseTime: 0,
    activeConnections: 0,
  };

  constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      this.errorTracker.trackError(error, "error", {
        type: "uncaughtException",
      });
      console.error("Uncaught Exception:", error);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      const error = new Error(`Unhandled Promise Rejection: ${reason}`);
      this.errorTracker.trackError(error, "error", {
        type: "unhandledRejection",
        promise: promise.toString(),
      });
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });
  }

  async checkServiceHealth(
    serviceName: string,
    checkFunction: () => Promise<boolean>
  ): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const isHealthy = await checkFunction();
      const responseTime = Date.now() - startTime;

      return {
        name: serviceName,
        status: isHealthy ? "healthy" : "unhealthy",
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.errorTracker.trackError(error as Error, "error", {
        service: serviceName,
      });

      return {
        name: serviceName,
        status: "unhealthy",
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const memInfo = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get memory info
    const totalMemory = require("os").totalmem();
    const freeMemory = require("os").freemem();
    const usedMemory = totalMemory - freeMemory;

    // Get CPU info
    const loadAvg = require("os").loadavg();

    // Get disk info (simplified)
    const stats = require("fs").statSync(".");
    const diskUsed = stats.size || 0;
    const diskTotal = totalMemory; // Fallback to memory for demo

    return {
      memory: {
        used: memInfo.heapUsed,
        total: memInfo.heapTotal,
        percentage: (memInfo.heapUsed / memInfo.heapTotal) * 100,
      },
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage: loadAvg,
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        percentage: (diskUsed / diskTotal) * 100,
      },
      network: {
        connected: true, // Simplified check
      },
    };
  }

  async performHealthCheck(): Promise<HealthCheck> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    // Check various services
    const serviceChecks = await Promise.all([
      this.checkServiceHealth("Database", async () => {
        try {
          const db = new Database(":memory:");
          db.exec("SELECT 1");
          db.close();
          return true;
        } catch {
          return false;
        }
      }),
      this.checkServiceHealth("FileSystem", async () => {
        try {
          await Bun.file("./package.json").text();
          return true;
        } catch {
          return false;
        }
      }),
      this.checkServiceHealth("Network", async () => {
        try {
          await fetch("https://httpbin.org/status/200");
          return true;
        } catch {
          return false;
        }
      }),
      this.checkServiceHealth("Memory", async () => {
        const memUsage = process.memoryUsage();
        return memUsage.heapUsed / memUsage.heapTotal < 0.9; // Less than 90% memory usage
      }),
    ]);

    const systemHealth = await this.getSystemHealth();
    const errors = this.errorTracker.getErrors(10);

    // Determine overall status
    const hasUnhealthyServices = serviceChecks.some(
      (s) => s.status === "unhealthy"
    );
    const hasCriticalErrors = errors.some(
      (e) => e.level === "error" && !e.resolved
    );

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (hasUnhealthyServices || hasCriticalErrors) {
      status = "unhealthy";
    } else if (serviceChecks.some((s) => s.status === "degraded")) {
      status = "degraded";
    }

    return {
      status,
      timestamp,
      uptime,
      version: "1.0.0",
      services: serviceChecks,
      system: systemHealth,
      errors,
      metrics: this.metrics,
    };
  }

  // Metrics tracking
  incrementRequestCount(): void {
    this.metrics.totalRequests++;
  }

  recordResponseTime(time: number): void {
    // Update average response time (simple moving average)
    this.metrics.averageResponseTime =
      this.metrics.averageResponseTime * 0.9 + time * 0.1;
  }

  updateActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  getErrorTracker(): ErrorTracker {
    return this.errorTracker;
  }
}

// Export for use in other modules
export { ErrorTracker, HealthCheckService };
export type {
  ErrorReport,
  HealthCheck,
  HealthMetrics,
  ServiceHealth,
  SystemHealth,
};

// CLI usage
if (import.meta.main) {
  const healthService = new HealthCheckService();

  console.log("🏥 Systems Dashboard Health Check");
  console.log("================================");

  const health = await healthService.performHealthCheck();

  console.log(`Status: ${health.status}`);
  console.log(`Uptime: ${Math.round(health.uptime / 1000)}s`);
  console.log(`Version: ${health.version}`);
  console.log(`Timestamp: ${health.timestamp}`);

  console.log("\n📊 Services:");
  health.services.forEach((service) => {
    const icon =
      service.status === "healthy"
        ? "✅"
        : service.status === "degraded"
          ? "⚠️"
          : "❌";
    console.log(`  ${icon} ${service.name}: ${service.status}`);
    if (service.responseTime) {
      console.log(`     Response time: ${service.responseTime}ms`);
    }
    if (service.error) {
      console.log(`     Error: ${service.error}`);
    }
  });

  console.log("\n💻 System Resources:");
  console.log(`  Memory: ${health.system.memory.percentage.toFixed(1)}%`);
  console.log(`  CPU: ${health.system.cpu.usage.toFixed(2)}s`);
  console.log(`  Disk: ${health.system.disk.percentage.toFixed(1)}%`);

  if (health.errors.length > 0) {
    console.log("\n❌ Recent Errors:");
    health.errors.forEach((error) => {
      const icon =
        error.level === "error"
          ? "🔴"
          : error.level === "warning"
            ? "🟡"
            : "🔵";
      console.log(
        `  ${icon} ${error.message} (${new Date(error.timestamp).toLocaleTimeString()})`
      );
    });
  }

  console.log("\n📈 Metrics:");
  console.log(`  Total Requests: ${health.metrics.totalRequests}`);
  console.log(`  Error Rate: ${(health.metrics.errorRate * 100).toFixed(2)}%`);
  console.log(
    `  Avg Response Time: ${health.metrics.averageResponseTime.toFixed(2)}ms`
  );
  console.log(`  Active Connections: ${health.metrics.activeConnections}`);
}
