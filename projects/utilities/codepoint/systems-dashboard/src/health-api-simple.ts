#!/usr/bin/env bun

/**
 * Health Check API Server
 *
 * Provides REST API endpoints for health monitoring and error reporting
 * Using Bun's built-in HTTP server
 */

import { HealthCheckService } from "./health-check.ts";

const healthService = new HealthCheckService();

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// JSON response helper
const jsonResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};

// Health check endpoints
const routes = {
  // Main health check
  "/api/health": async () => {
    const startTime = Date.now();
    try {
      const health = await healthService.performHealthCheck();
      const responseTime = Date.now() - startTime;

      healthService.recordResponseTime(responseTime);
      healthService.incrementRequestCount();

      return jsonResponse({
        ...health,
        apiResponseTime: responseTime,
      });
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", { endpoint: "/api/health" });

      return jsonResponse({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        services: [],
        system: {
          memory: { used: 0, total: 0, percentage: 0 },
          cpu: { usage: 0, loadAverage: [0, 0, 0] },
          disk: { used: 0, total: 0, percentage: 0 },
          network: { connected: false },
        },
        errors: [
          {
            id: "api-error",
            timestamp: new Date().toISOString(),
            level: "error" as const,
            message: error instanceof Error ? error.message : "Unknown error",
            resolved: false,
          },
        ],
        metrics: {
          totalRequests: (healthService as any).metrics.totalRequests,
          errorRate: 1,
          averageResponseTime: 0,
          activeConnections: 0,
        },
      });
    }
  },

  // Services health
  "/api/health/services": async () => {
    try {
      const health = await healthService.performHealthCheck();
      return jsonResponse(health.services);
    } catch (error) {
      healthService.getErrorTracker().trackError(error as Error, "error", {
        endpoint: "/api/health/services",
      });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },

  // System health
  "/api/health/system": async () => {
    try {
      const systemHealth = await healthService.getSystemHealth();
      return jsonResponse(systemHealth);
    } catch (error) {
      healthService.getErrorTracker().trackError(error as Error, "error", {
        endpoint: "/api/health/system",
      });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },

  // Error logs
  "/api/health/errors": async (request: Request) => {
    try {
      const url = new URL(request.url);
      const limit = url.searchParams.get("limit")
        ? parseInt(url.searchParams.get("limit")!)
        : 50;
      const errors = healthService.getErrorTracker().getErrors(limit);
      return jsonResponse({
        errors,
        stats: healthService.getErrorTracker().getErrorStats(),
      });
    } catch (error) {
      healthService.getErrorTracker().trackError(error as Error, "error", {
        endpoint: "/api/health/errors",
      });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },

  // Resolve error
  "/api/health/errors/:errorId/resolve": async (request: Request) => {
    try {
      const url = new URL(request.url);
      const errorId = url.pathname.split("/").slice(-2)[0];
      healthService.getErrorTracker().resolveError(errorId);
      return jsonResponse({
        success: true,
        message: `Error ${errorId} marked as resolved`,
      });
    } catch (error) {
      healthService.getErrorTracker().trackError(error as Error, "error", {
        endpoint: "/api/health/errors/resolve",
      });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },

  // Clear errors
  "DELETE:/api/health/errors": async (request: Request) => {
    try {
      healthService.getErrorTracker().clearErrors();
      return jsonResponse({ success: true, message: "All errors cleared" });
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/errors",
        });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },

  // Test error endpoint
  "/api/health/test-error": async (request: Request) => {
    if (request.method === "POST") {
      try {
        const body = await request.json().catch(() => ({}));
        const { type = "generic", message = "Test error" } = body;

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
          default:
            error = new Error(`Generic test: ${message}`);
        }

        healthService.getErrorTracker().trackError(error, "error", {
          endpoint: "/api/health/test-error",
          testType: type,
        });

        return jsonResponse({
          success: true,
          message: "Test error logged",
          errorId: error.message,
        });
      } catch (error) {
        healthService.getErrorTracker().trackError(error as Error, "error", {
          endpoint: "/api/health/test-error",
        });
        return jsonResponse(
          { error: error instanceof Error ? error.message : "Unknown error" },
          500
        );
      }
    }
  },

  // Metrics
  "/api/health/metrics": async () => {
    try {
      return jsonResponse((healthService as any).metrics);
    } catch (error) {
      healthService.getErrorTracker().trackError(error as Error, "error", {
        endpoint: "/api/health/metrics",
      });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown error" },
        500
      );
    }
  },

// Start the server
const server = Bun.serve({
  port: 3001,
  async fetch(request: Request) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route the request
    for (const [route, handler] of Object.entries(routes)) {
      const [method, path] = route.includes(':') ? route.split(':') : ['GET', route];

      if (request.method === method && (
        url.pathname === path ||
        (path.includes(':') && url.pathname.startsWith(path.split(':')[0]))
      )) {
        return await handler(request);
      }
    }

    // 404 for unknown routes
    return jsonResponse({ error: 'Not Found' }, 404);
  },
});

console.log("🏥 Health Check API Server running on http://localhost:3001");
console.log("📊 Available endpoints:");
console.log("  GET  /api/health - Full health check");
console.log("  GET  /api/health/services - Services status");
console.log("  GET  /api/health/system - System resources");
console.log("  GET  /api/health/errors - Error logs");
console.log("  POST /api/health/test-error - Test error logging");
console.log("  POST /api/health/errors/:id/resolve - Resolve error");
console.log("  DELETE /api/health/errors - Clear all errors");
console.log("  GET  /api/health/metrics - Performance metrics");

export default server;
