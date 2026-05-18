#!/usr/bin/env bun
/**
 * Throughput Stress Test
 * Validates BUN_CONFIG_MAX_HTTP_REQUESTS configuration
 * Tests system under 4k+ sessions/sec load
 */

import { serve } from "bun";

// ============================================
// === TEST SERVER ===
// ============================================

const server = serve({
	port: 3002, // Different port to avoid conflicts
	fetch(req) {
		const url = new URL(req.url);

		// Health endpoint for stress testing
		if (url.pathname === "/api/health") {
			return Response.json({
				status: "ok",
				timestamp: Date.now(),
				pid: process.pid,
			});
		}

		// Simulated risk scoring endpoint
		if (url.pathname === "/api/risk/score") {
			return Response.json({
				sessionId: `test-${Date.now()}`,
				score: Math.random(),
				riskLevel: "low",
				timestamp: Date.now(),
			});
		}

		return new Response("Not Found", { status: 404 });
	},
});

console.info(`🚀 Stress Test Server running on ${server.url}`);
console.info(`📊 Test endpoints:`);
console.info(`   GET ${server.url}/api/health`);
console.info(`   POST ${server.url}/api/risk/score`);
console.info("\n💡 Run stress test with:");
console.info(`   bombardier -c 256 -n 10000 ${server.url}/api/health`);
console.info(`   wrk -t12 -c400 -d30s ${server.url}/api/health`);
