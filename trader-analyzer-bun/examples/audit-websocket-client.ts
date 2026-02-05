#!/usr/bin/env bun
/**
 * @fileoverview 9.1.5.23.0.0.0: WebSocket Audit Client Example
 * @description Example client for connecting to WebSocket audit server
 * @module examples/audit-websocket-client
 * 
 * Cross-Reference Hub:
 * - @see 9.1.5.21.0.0.0 → WebSocket Audit Server
 * - @see 7.4.6.0.0.0.0 → Bun WebSocket API Documentation
 */

/**
 * 9.1.5.23.0.0.0: WebSocket Audit Client Example
 * 
 * Demonstrates how to connect to the WebSocket audit server and receive
 * real-time audit updates.
 */

const WS_URL = process.env.AUDIT_WS_URL || "ws://localhost:3002/audit/ws";

console.log(`🔌 Connecting to ${WS_URL}...`);

const socket = new WebSocket(WS_URL);

socket.addEventListener("open", () => {
	console.log("✅ Connected to audit server");

	// Subscribe to audit topics
	socket.send(
		JSON.stringify({
			type: "subscribe",
			payload: { topic: "audit:progress" },
		}),
	);

	socket.send(
		JSON.stringify({
			type: "subscribe",
			payload: { topic: "audit:matches" },
		}),
	);

	socket.send(
		JSON.stringify({
			type: "subscribe",
			payload: { topic: "audit:orphans" },
		}),
	);

	socket.send(
		JSON.stringify({
			type: "subscribe",
			payload: { topic: "audit:results" },
		}),
	);

	// Start an audit
	socket.send(
		JSON.stringify({
			type: "start_audit",
			payload: {
				patterns: ["\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+"],
				directory: "src/",
				useWorkers: false,
			},
		}),
	);
});

socket.addEventListener("message", (event) => {
	const data = JSON.parse(event.data as string);
	const { type, ...rest } = data;

	switch (type) {
		case "connected":
			console.log(`✅ Connected as client: ${rest.clientId}`);
			console.log(`📡 Subscribed to topics: ${rest.topics.join(", ")}`);
			break;

		case "subscribed":
			console.log(`📡 Subscribed to: ${rest.topic}`);
			break;

		case "audit_started":
			console.log(`🚀 Audit started: ${rest.auditId}`);
			break;

		case "progress":
			console.log(`📊 Progress: ${rest.progress}% - ${rest.status || ""}`);
			break;

		case "match":
			console.log(`🔍 Match: ${rest.pattern} in ${rest.file}:${rest.line}`);
			break;

		case "orphan":
			console.log(`⚠️  Orphan: ${rest.docNumber} in ${rest.file}`);
			break;

		case "audit_completed":
			console.log(`✅ Audit completed: ${rest.auditId}`);
			console.log(`   Duration: ${rest.result.duration}ms`);
			console.log(`   Matches: ${rest.result.totalMatches}`);
			console.log(`   Orphans: ${rest.result.totalOrphans}`);
			console.log(`   Undocumented: ${rest.result.totalUndocumented}`);
			break;

		case "pong":
			console.log(`🏓 Pong received`);
			break;

		default:
			console.log(`📨 Message:`, data);
	}
});

socket.addEventListener("error", (error) => {
	console.error("❌ WebSocket error:", error);
});

socket.addEventListener("close", (event) => {
	console.log(`👋 Connection closed: Code ${event.code}, Reason: ${event.reason}`);
	process.exit(0);
});

// Keep process alive
process.on("SIGINT", () => {
	console.log("\n👋 Closing connection...");
	socket.close();
	process.exit(0);
});
