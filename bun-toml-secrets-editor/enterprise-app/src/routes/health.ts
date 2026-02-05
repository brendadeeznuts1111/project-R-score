/**
 * Health Check Routes
 * Comprehensive health monitoring for enterprise applications
 */

import { Hono } from "hono";
import { checkDatabaseHealth, checkRedisHealth } from "../utils/health-checks";
import { logger } from "../utils/logger";
import { getSystemMetrics } from "../utils/metrics";
import { createErrorResponse, createSuccessResponse } from "../utils/response";

const healthRoutes = new Hono();

/**
 * Basic health check
 * GET /health
 */
healthRoutes.get("/", async (c) => {
	try {
		const startTime = Date.now();

		// Basic health check
		const health = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			version: process.env.npm_package_version || "1.0.0",
			environment: process.env.NODE_ENV || "development",
			responseTime: Date.now() - startTime,
		};

		return c.json(createSuccessResponse(health));
	} catch (error) {
		logger.error("Health check failed", { error: error.message });
		return c.json(createErrorResponse("Health check failed", 503), 503);
	}
});

/**
 * Detailed health check with dependencies
 * GET /health/detailed
 */
healthRoutes.get("/detailed", async (c) => {
	try {
		const startTime = Date.now();

		// Check all dependencies
		const [dbHealth, redisHealth, systemMetrics] = await Promise.allSettled([
			checkDatabaseHealth(),
			checkRedisHealth(),
			getSystemMetrics(),
		]);

		const health = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			version: process.env.npm_package_version || "1.0.0",
			environment: process.env.NODE_ENV || "development",
			responseTime: Date.now() - startTime,

			// Dependency health
			dependencies: {
				database:
					dbHealth.status === "fulfilled"
						? dbHealth.value
						: { status: "unhealthy", error: dbHealth.reason?.message },
				redis:
					redisHealth.status === "fulfilled"
						? redisHealth.value
						: { status: "unhealthy", error: redisHealth.reason?.message },
				system:
					systemMetrics.status === "fulfilled"
						? systemMetrics.value
						: { status: "unhealthy", error: systemMetrics.reason?.message },
			},
		};

		// Determine overall status
		const unhealthyDeps = Object.values(health.dependencies).filter(
			(dep) => dep.status === "unhealthy",
		);
		if (unhealthyDeps.length > 0) {
			health.status = "degraded";
			if (
				unhealthyDeps.some(
					(dep) =>
						dep.status === "unhealthy" && dep.error?.includes("connection"),
				)
			) {
				health.status = "unhealthy";
			}
		}

		const statusCode =
			health.status === "healthy"
				? 200
				: health.status === "degraded"
					? 200
					: 503;

		return c.json(createSuccessResponse(health), statusCode);
	} catch (error) {
		logger.error("Detailed health check failed", { error: error.message });
		return c.json(createErrorResponse("Health check failed", 503), 503);
	}
});

/**
 * Readiness probe (for Kubernetes)
 * GET /health/ready
 */
healthRoutes.get("/ready", async (c) => {
	try {
		// Check critical dependencies
		const [dbHealth, redisHealth] = await Promise.allSettled([
			checkDatabaseHealth(),
			checkRedisHealth(),
		]);

		const isReady =
			dbHealth.status === "fulfilled" && redisHealth.status === "fulfilled";

		if (isReady) {
			return c.json(
				createSuccessResponse({
					status: "ready",
					timestamp: new Date().toISOString(),
				}),
			);
		} else {
			return c.json(createErrorResponse("Service not ready", 503), 503);
		}
	} catch (error) {
		logger.error("Readiness check failed", { error: error.message });
		return c.json(createErrorResponse("Readiness check failed", 503), 503);
	}
});

/**
 * Liveness probe (for Kubernetes)
 * GET /health/live
 */
healthRoutes.get("/live", async (c) => {
	try {
		// Basic liveness check - just check if the process is running
		const liveness = {
			status: "alive",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			pid: process.pid,
			memory: process.memoryUsage(),
		};

		return c.json(createSuccessResponse(liveness));
	} catch (error) {
		logger.error("Liveness check failed", { error: error.message });
		return c.json(createErrorResponse("Liveness check failed", 503), 503);
	}
});

/**
 * Metrics endpoint
 * GET /health/metrics
 */
healthRoutes.get("/metrics", async (c) => {
	try {
		const metrics = await getSystemMetrics();

		return c.json(
			createSuccessResponse({
				timestamp: new Date().toISOString(),
				metrics,
			}),
		);
	} catch (error) {
		logger.error("Metrics check failed", { error: error.message });
		return c.json(createErrorResponse("Metrics check failed", 503), 503);
	}
});

export { healthRoutes };
