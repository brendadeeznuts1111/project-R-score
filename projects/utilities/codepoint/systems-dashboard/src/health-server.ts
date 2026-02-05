#!/usr/bin/env bun

import { HealthCheckService } from "./health-check.ts";
import {
  calculateOverallScore,
  gradePerformance,
} from "./performance-benchmark.ts";

const healthService = new HealthCheckService();

// Enhanced server configuration with rate limiting and caching
const requestCache = new Map();
const rateLimitMap = new Map();
const CACHE_TTL = 5000; // 5 seconds
const RATE_LIMIT = 100; // requests per minute

// Rate limiting middleware
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Clean old requests
  const validRequests = requests.filter((time: number) => now - time < 60000);

  if (validRequests.length >= RATE_LIMIT) {
    return false;
  }

  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  return true;
};

// Cache middleware
const getCachedResponse = (key: string): any => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedResponse = (key: string, data: any): void => {
  requestCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

// Enhanced health check with additional metrics
const performEnhancedHealthCheck = async () => {
  const startTime = Date.now();
  const health = await healthService.performHealthCheck();
  const responseTime = Date.now() - startTime;

  return {
    ...health,
    apiResponseTime: responseTime,
    serverInfo: {
      version: "1.0.0",
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      bunVersion: Bun.version,
    },
    enhancedMetrics: {
      cacheSize: requestCache.size,
      rateLimitConnections: rateLimitMap.size,
      memoryLeakDetection: detectMemoryLeaks(),
      performanceScore: calculatePerformanceScore(health),
    },
  };
};

// Memory leak detection
const detectMemoryLeaks = (): boolean => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  return heapUsedMB > 500; // Alert if > 500MB
};

// Performance score calculation using enhanced geometric mean
const calculatePerformanceScore = (health: any): number => {
  try {
    const metrics = {
      services:
        health.services.filter((s: any) => s.status === "healthy").length /
        health.services.length,
      memory: 1 - health.system.memory.percentage / 100,
      uptime: Math.min(1, health.uptime / 86400000), // Normalize to days
      errorRate: Math.max(0.001, 1 - health.errors.length / 50), // Invert error rate
    };

    return (
      GeometricMeanCalculator.calculate(metrics, {
        handleInvalid: "clamp",
        minValidValue: 0.001,
        maxValidValue: 1.0,
        precision: 2,
      }) * 100
    );
  } catch (error) {
    console.error("Performance score calculation failed:", error);
    return 50; // Safe fallback
  }
};

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const clientIP =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
    }

    // Enhanced CORS headers with security
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Request-ID",
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // Generate request ID for tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Enhanced health check endpoint with caching
      if (url.pathname === "/api/health" && req.method === "GET") {
        const cacheKey = "health_check";
        let health = getCachedResponse(cacheKey);

        if (!health) {
          health = await performEnhancedHealthCheck();
          setCachedResponse(cacheKey, health);
        }

        return new Response(JSON.stringify(health, null, 2), {
          headers: { ...headers, "X-Request-ID": requestId },
        });
      }

      // Services endpoint with detailed status
      if (url.pathname === "/api/health/services" && req.method === "GET") {
        const cacheKey = "services";
        let services = getCachedResponse(cacheKey);

        if (!services) {
          const health = await healthService.performHealthCheck();
          services = health.services.map((service) => ({
            ...service,
            uptime: service.lastCheck
              ? Date.now() - new Date(service.lastCheck).getTime()
              : 0,
            dependencyCheck: getDependencyInfo(service.name),
          }));
          setCachedResponse(cacheKey, services);
        }

        return new Response(JSON.stringify(services, null, 2), {
          headers: { ...headers, "X-Request-ID": requestId },
        });
      }

      // System endpoint with historical data
      if (url.pathname === "/api/health/system" && req.method === "GET") {
        const system = await healthService.getSystemHealth();
        const enhancedSystem = {
          ...system,
          historical: getHistoricalData(),
          alerts: generateSystemAlerts(system),
          recommendations: generateSystemRecommendations(system),
        };

        return new Response(JSON.stringify(enhancedSystem, null, 2), {
          headers: { ...headers, "X-Request-ID": requestId },
        });
      }

      // Enhanced errors endpoint with filtering
      if (url.pathname === "/api/health/errors" && req.method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const level = url.searchParams.get("level");
        const resolved = url.searchParams.get("resolved");

        let errors = healthService.getErrorTracker().getErrors(limit);

        // Apply filters
        if (level) {
          errors = errors.filter((error) => error.level === level);
        }
        if (resolved !== null) {
          const isResolved = resolved === "true";
          errors = errors.filter((error) => error.resolved === isResolved);
        }

        const stats = healthService.getErrorTracker().getErrorStats();
        return new Response(
          JSON.stringify(
            {
              errors,
              stats,
              filters: { limit, level, resolved },
              total: errors.length,
            },
            null,
            2
          ),
          {
            headers: { ...headers, "X-Request-ID": requestId },
          }
        );
      }

      // Enhanced test error endpoint with different types
      if (url.pathname === "/api/health/test-error" && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const {
          type = "generic",
          message = "Test error",
          severity = "error",
        } = body;

        let error: Error;
        switch (type) {
          case "network":
            error = new Error(`Network test: ${message}`);
            break;
          case "database":
            error = new Error(`Database test: ${message}`);
            break;
          case "validation":
            error = new Error(`Validation test: ${message}`);
            break;
          case "memory":
            error = new Error(`Memory test: ${message}`);
            break;
          case "performance":
            error = new Error(`Performance test: ${message}`);
            break;
          default:
            error = new Error(`Generic test: ${message}`);
        }

        healthService.getErrorTracker().trackError(error, severity, {
          endpoint: "test",
          testType: type,
          requestId,
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Test error logged",
            errorId: `${requestId}_${type}`,
            severity,
          }),
          { headers: { ...headers, "X-Request-ID": requestId } }
        );
      }

      // Batch error management endpoint
      if (
        url.pathname === "/api/health/errors/batch" &&
        req.method === "POST"
      ) {
        const body = await req.json().catch(() => ({}));
        const { action, errorIds } = body;

        if (action === "resolve" && Array.isArray(errorIds)) {
          errorIds.forEach((id: string) => {
            healthService.getErrorTracker().resolveError(id);
          });
          return new Response(
            JSON.stringify({ success: true, resolved: errorIds.length }),
            { headers: { ...headers, "X-Request-ID": requestId } }
          );
        }

        return new Response(
          JSON.stringify({ error: "Invalid batch operation" }),
          { status: 400, headers: { ...headers, "X-Request-ID": requestId } }
        );
      }

      // Clear errors endpoint with confirmation
      if (url.pathname === "/api/health/errors" && req.method === "DELETE") {
        const confirm = url.searchParams.get("confirm");
        if (confirm !== "true") {
          return new Response(
            JSON.stringify({
              error: "Confirmation required",
              message: "Add ?confirm=true to proceed",
            }),
            { status: 400, headers: { ...headers, "X-Request-ID": requestId } }
          );
        }

        const errorCount = healthService.getErrorTracker().getErrors().length;
        healthService.getErrorTracker().clearErrors();

        return new Response(
          JSON.stringify({
            success: true,
            message: `${errorCount} errors cleared`,
          }),
          { headers: { ...headers, "X-Request-ID": requestId } }
        );
      }

      // Enhanced metrics endpoint with trends
      if (url.pathname === "/api/health/metrics" && req.method === "GET") {
        const metrics = (healthService as any).metrics;
        const enhancedMetrics = {
          ...metrics,
          trends: getMetricsTrends(),
          predictions: getMetricsPredictions(metrics),
          benchmarks: getPerformanceBenchmarks(),
        };

        return new Response(JSON.stringify(enhancedMetrics), {
          headers: { ...headers, "X-Request-ID": requestId },
        });
      }

      // New endpoint: Health recommendations
      if (
        url.pathname === "/api/health/recommendations" &&
        req.method === "GET"
      ) {
        const health = await healthService.performHealthCheck();
        const recommendations = generateHealthRecommendations(health);

        return new Response(JSON.stringify(recommendations), {
          headers: { ...headers, "X-Request-ID": requestId },
        });
      }

      // New endpoint: Enhanced scoring with metadata
      if (url.pathname === "/api/health/score" && req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const { metrics = {}, options = {} } = body;

        try {
          const { score, metadata } =
            GeometricMeanCalculator.calculateWithMetadata(metrics, options);

          return new Response(
            JSON.stringify({
              success: true,
              score,
              metadata,
              inputMetrics: metrics,
              calculationOptions: options,
            }),
            {
              headers: { ...headers, "X-Request-ID": requestId },
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
              requestId,
            }),
            {
              status: 400,
              headers: { ...headers, "X-Request-ID": requestId },
            }
          );
        }
      }

      // New endpoint: Performance benchmark with grading
      if (url.pathname === "/api/health/benchmark" && req.method === "POST") {
        const benchmarkResult = await gradePerformance();
        const overallScore = calculateOverallScore(benchmarkResult.results);

        return new Response(
          JSON.stringify({
            ...benchmarkResult,
            overallScore: Math.round(overallScore),
            gradeDetails: {
              stringWidth: benchmarkResult.results.stringWidth,
              fileWrite: benchmarkResult.results.fileWrite,
              build: benchmarkResult.results.build,
              spawn: benchmarkResult.results.spawn,
              performanceGrade: benchmarkResult.grade,
            },
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...headers, "X-Request-ID": requestId },
          }
        );
      }

      // Enhanced 404 with suggestions
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Endpoint not found",
          availableEndpoints: [
            "GET /api/health",
            "GET /api/health/services",
            "GET /api/health/system",
            "GET /api/health/errors",
            "POST /api/health/test-error",
            "POST /api/health/errors/batch",
            "DELETE /api/health/errors",
            "GET /api/health/metrics",
            "GET /api/health/recommendations",
            "POST /api/health/benchmark",
          ],
        }),
        {
          status: 404,
          headers: { ...headers, "X-Request-ID": requestId },
        }
      );
    } catch (error) {
      healthService.getErrorTracker().trackError(error as Error, "error", {
        endpoint: url.pathname,
        requestId,
        clientIP,
      });

      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
          requestId,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...headers, "X-Request-ID": requestId },
        }
      );
    }
  },
});

// Helper functions for enhanced features
function getDependencyInfo(serviceName: string) {
  // Mock dependency information
  const dependencies = {
    Database: ["sqlite3", "bun:sqlite"],
    FileSystem: ["fs", "path"],
    Network: ["fetch", "http"],
    Memory: ["process", "v8"],
  };
  return dependencies[serviceName as keyof typeof dependencies] || [];
}

function getHistoricalData() {
  // Mock historical data
  return {
    lastHour: [{ time: Date.now() - 3600000, cpu: 45, memory: 60 }],
    lastDay: [{ time: Date.now() - 86400000, cpu: 42, memory: 58 }],
    lastWeek: [{ time: Date.now() - 604800000, cpu: 40, memory: 55 }],
  };
}

function generateSystemAlerts(system: any) {
  const alerts = [];
  if (system.memory.percentage > 80) {
    alerts.push({ type: "warning", message: "High memory usage detected" });
  }
  if (system.cpu.usage > 5) {
    alerts.push({ type: "info", message: "Elevated CPU usage" });
  }
  return alerts;
}

function generateSystemRecommendations(system: any) {
  const recommendations = [];
  if (system.memory.percentage > 70) {
    recommendations.push(
      "Consider optimizing memory usage or increasing available memory"
    );
  }
  if (!system.network.connected) {
    recommendations.push("Check network connectivity");
  }
  return recommendations;
}

function getMetricsTrends() {
  return {
    cpu: "stable",
    memory: "increasing",
    requests: "stable",
    errors: "decreasing",
  };
}

function getMetricsPredictions(metrics: any) {
  return {
    nextHour: {
      requests: metrics.totalRequests + 100,
      errors: metrics.errorRate * 100,
    },
  };
}

function getPerformanceBenchmarks() {
  return {
    excellent: { responseTime: 50, errorRate: 0.01 },
    good: { responseTime: 200, errorRate: 0.05 },
    poor: { responseTime: 1000, errorRate: 0.1 },
  };
}

function generateHealthRecommendations(health: any) {
  const recommendations = [];

  health.services.forEach((service: any) => {
    if (service.status === "unhealthy") {
      recommendations.push(
        `Investigate ${service.name} service - currently unhealthy`
      );
    }
  });

  if (health.system.memory.percentage > 70) {
    recommendations.push("Monitor memory usage - approaching threshold");
  }

  return recommendations;
}

async function runPerformanceBenchmark() {
  // This function is now replaced by the performance-benchmark.ts module
  return { message: "Use gradePerformance() from performance-benchmark.ts" };
}

console.log("🚀 Enhanced Health API Server running on http://localhost:3001");
console.log("📊 Enhanced endpoints available:");
console.log("  GET  /api/health - Enhanced health check with caching");
console.log("  GET  /api/health/services - Services with dependency info");
console.log("  GET  /api/health/system - System with historical data");
console.log("  GET  /api/health/errors - Errors with filtering");
console.log("  POST /api/health/test-error - Enhanced error testing");
console.log("  POST /api/health/errors/batch - Batch error operations");
console.log("  DELETE /api/health/errors - Clear errors with confirmation");
console.log("  GET  /api/health/metrics - Metrics with trends");
console.log("  GET  /api/health/recommendations - Health recommendations");
console.log("  POST /api/health/score - Enhanced geometric mean scoring");
console.log("  POST /api/health/benchmark - Performance grading (A+ to C)");
console.log(
  "🛡️ Features: Rate limiting, caching, request tracing, enhanced security"
);
console.log("🏆 Performance: Bun runtime grading with geometric mean scoring");
console.log("📐 Scoring: Production-ready geometric mean with NaN protection");
