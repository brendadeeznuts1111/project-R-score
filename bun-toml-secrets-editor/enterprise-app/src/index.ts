#!/usr/bin/env bun

/**
 * Enterprise-grade Bun Application
 * Production-ready with security, monitoring, and testing
 */

import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { config } from "./config/config";
import { errorHandler } from "./middleware/error-handler";
import { metricsMiddleware } from "./middleware/metrics";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { setupSentry } from "./observability/sentry";
import { setupTracing } from "./observability/tracing";
import { apiRoutes } from "./routes/api";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { logger as winston } from "./utils/logger";

// Initialize observability
setupTracing();
setupSentry();

// Create app with OpenAPI
const app = new OpenAPIHono();

// Security middleware
app.use("*", cors(config.cors));
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", metricsMiddleware);
app.use("*", rateLimitMiddleware);

// Health check (no auth required)
app.route("/health", healthRoutes);

// Authentication routes
app.route("/auth", authRoutes);

// Protected API routes
app.route("/api", apiRoutes);

// API Documentation
app.doc("/doc", {
	openapi: "3.0.0",
	info: {
		version: "1.0.0",
		title: "Enterprise Bun API",
		description: "Production-ready enterprise application built with Bun",
	},
	servers: [
		{
			url: `http://localhost:${config.port}`,
			description: "Development server",
		},
	],
});

app.get("/swagger", swaggerUI({ url: "/doc" }));

// Error handling (must be last)
app.use("*", errorHandler);

// Graceful shutdown
process.on("SIGTERM", () => {
	winston.info("SIGTERM received, shutting down gracefully");
	process.exit(0);
});

process.on("SIGINT", () => {
	winston.info("SIGINT received, shutting down gracefully");
	process.exit(0);
});

// Start server
const server = {
	port: config.port,
	fetch: app.fetch,
};

winston.info(`🚀 Enterprise server starting on port ${config.port}`);
winston.info(`📚 API Documentation: http://localhost:${config.port}/swagger`);
winston.info(`🏥 Health Check: http://localhost:${config.port}/health`);

export default server;

if (import.meta.main) {
	Bun.serve(server);
}
