/**
 * @fileoverview Cloudflare Workers Entry Point
 * @description Main entry point for Cloudflare Workers deployment
 * @module api/workers
 *
 * @see https://developers.cloudflare.com/workers/
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import { logger } from "hono/logger";
import { timing } from "hono/timing";

// Import API routes
import apiRoutes from "./routes";

/**
 * Get environment from Cloudflare Workers
 */
function getEnvironment(): "production" | "staging" | "development" {
	// Check Cloudflare Workers environment
	if (typeof (globalThis as any).ENV !== "undefined") {
		return (globalThis as any).ENV;
	}

	// Check wrangler environment
	if (typeof (globalThis as any).WRANGLER_ENV !== "undefined") {
		const env = (globalThis as any).WRANGLER_ENV;
		if (env === "staging") return "staging";
		if (env === "production") return "production";
	}

	// Default to production
	return "production";
}

/**
 * Create Workers-compatible Hono app
 */
const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", timing());
app.use("*", etag());

// CORS configuration based on environment
const getCorsConfig = () => {
	const env = getEnvironment();

	if (env === "development") {
		return {
			origin: "*",
			allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
			exposeHeaders: ["ETag", "X-API-Version"],
			maxAge: 86400,
		};
	}

	// Staging
	if (env === "staging") {
		return {
			origin: [
				"https://trader-analyzer-markets-staging.utahj4754.workers.dev",
				"https://staging.factory-wager-miniapp.pages.dev",
				"https://*.factory-wager-miniapp.pages.dev",
				"https://*.pages.dev",
				"https://web.telegram.org",
				"https://*.telegram.org",
			],
			allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			allowHeaders: [
				"Content-Type",
				"Authorization",
				"X-Request-Id",
				"X-Telegram-Init-Data",
			],
			exposeHeaders: ["ETag", "X-API-Version"],
			maxAge: 86400,
			credentials: true,
		};
	}

	// Production
	return {
		origin: [
			"https://trader-analyzer-markets.utahj4754.workers.dev",
			"https://web.telegram.org",
		],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
		exposeHeaders: ["ETag", "X-API-Version"],
		maxAge: 86400,
		credentials: true,
	};
};

app.use("*", cors(getCorsConfig()));

// Add API version header
app.use("*", async (c, next) => {
	await next();
	c.header("X-API-Version", "2.0.0");
});

// Health check endpoint
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "2.0.0",
		environment: getEnvironment(),
	});
});

// Mount API routes
app.route("/api", apiRoutes);

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not Found", path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
	console.error("Error:", err);
	return c.json(
		{
			error: err.message || "Internal Server Error",
			timestamp: Date.now(),
			version: "2.0.0",
		},
		500,
	);
});

/**
 * Cloudflare Workers export
 * This is the entry point for Cloudflare Workers
 */
export default {
	fetch: app.fetch,
};
