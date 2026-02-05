#!/usr/bin/env bun

/**
 * Health Check API Server
 *
 * Provides REST API endpoints for health monitoring and error reporting
 */

import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { HealthCheckService } from "./health-check.ts";

const healthService = new HealthCheckService();
const app = new Elysia()
  .use(swagger())
  .get("/api/health", async () => {
    const startTime = Date.now();
    try {
      const health = await healthService.performHealthCheck();
      const responseTime = Date.now() - startTime;

      healthService.recordResponseTime(responseTime);
      healthService.incrementRequestCount();

      return {
        ...health,
        apiResponseTime: responseTime,
      };
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", { endpoint: "/api/health" });

      return {
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
          totalRequests: healthService["metrics"].totalRequests,
          errorRate: 1,
          averageResponseTime: 0,
          activeConnections: 0,
        },
      };
    }
  })
  .get("/api/health/services", async () => {
    try {
      const health = await healthService.performHealthCheck();
      return health.services;
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/services",
        });
      throw error;
    }
  })
  .get("/api/health/system", async () => {
    try {
      const systemHealth = await healthService.getSystemHealth();
      return systemHealth;
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/system",
        });
      throw error;
    }
  })
  .get("/api/health/errors", async ({ query }) => {
    try {
      const limit = query.limit ? parseInt(query.limit as string) : 50;
      const errors = healthService.getErrorTracker().getErrors(limit);
      return {
        errors,
        stats: healthService.getErrorTracker().getErrorStats(),
      };
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/errors",
        });
      throw error;
    }
  })
  .post("/api/health/errors/:errorId/resolve", async ({ params }) => {
    try {
      healthService.getErrorTracker().resolveError(params.errorId);
      return {
        success: true,
        message: `Error ${params.errorId} marked as resolved`,
      };
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/errors/resolve",
        });
      throw error;
    }
  })
  .delete("/api/health/errors", async () => {
    try {
      healthService.getErrorTracker().clearErrors();
      return { success: true, message: "All errors cleared" };
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/errors",
        });
      throw error;
    }
  })
  .post("/api/health/test-error", async ({ body }) => {
    try {
      // Endpoint for testing error handling
      const { type = "generic", message = "Test error" } = (body as any) || {};

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

      return {
        success: true,
        message: "Test error logged",
        errorId: error.message,
      };
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/test-error",
        });
      throw error;
    }
  })
  .get("/api/health/metrics", async () => {
    try {
      return healthService["metrics"];
    } catch (error) {
      healthService
        .getErrorTracker()
        .trackError(error as Error, "error", {
          endpoint: "/api/health/metrics",
        });
      throw error;
    }
  })
  .listen(3001);

console.log("🏥 Health Check API Server running on http://localhost:3001");
console.log(
  "📖 Swagger documentation available at http://localhost:3001/swagger"
);

export default app;
