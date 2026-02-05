#!/usr/bin/env bun
/**
 * @fileoverview 9.1.5.22.0.0.0: WebSocket Audit Server CLI
 * @description CLI wrapper for WebSocket audit server
 * @module scripts/audit-websocket
 * 
 * Cross-Reference Hub:
 * - @see 9.1.5.21.0.0.0 → WebSocket Audit Server
 * - @see 7.4.6.0.0.0.0 → Bun WebSocket API Documentation
 */

import { startWebSocketAuditServer } from "../src/audit/websocket-audit-server";

const port = parseInt(process.env.AUDIT_WS_PORT || process.argv[2] || "3002");
const hostname = process.env.AUDIT_WS_HOSTNAME || process.argv[3] || "localhost";

console.log(`🚀 Starting WebSocket Audit Server...`);
console.log(`📡 Port: ${port}`);
console.log(`🌐 Hostname: ${hostname}`);

const wsServer = startWebSocketAuditServer(port, hostname);

// Graceful shutdown
process.on("SIGINT", async () => {
	console.log("\n👋 Shutting down...");
	await wsServer.shutdown();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	console.log("\n👋 Shutting down...");
	await wsServer.shutdown();
	process.exit(0);
});
