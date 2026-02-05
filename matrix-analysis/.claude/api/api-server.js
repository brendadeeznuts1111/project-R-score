#!/usr/bin/env bun

import { S3Client } from "bun";
import {
	compressState,
	createSnapshotFromCookies,
	decompressState,
} from "../../examples/ab-variant-compressed.ts";
// A/B variant typed modules (Bun resolves .ts from .js)
import {
	getPoolSize,
	getABVariant as getTypedABVariant,
	parseCookieMap,
} from "../../examples/ab-variant-cookies.ts";
import {
	parseTenantCookieMap,
	resolveTenantFromRequest,
	tenantPrefix,
} from "../../examples/ab-variant-multi-tenant.ts";
import {
	loadSnapshot,
	openDb,
	snapshotAndPersist,
} from "../../examples/ab-variant-omega-pools-zstd.ts";
import { phoneSanitizer } from "../core/shared/phone-sanitizer.js";
import { coreLogger as logger } from "../shared/logger.js";
import { createABRouter } from "./routes/ab.js";
// Route modules (decomposed from this file)
import { createPhoneRouter } from "./routes/phone.js";
import { createStorageRouter } from "./routes/storage.js";

// Load environment variables
try {
	const envContent = await Bun.file(".env").text();
	for (const line of envContent.split("\n")) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith("#")) {
			const [key, ...valueParts] = trimmed.split("=");
			if (key && valueParts.length) {
				process.env[key.trim()] = valueParts.join("=").trim();
			}
		}
	}
} catch {
	logger.info("No .env file found");
}

// Get S3 client
function getS3Client() {
	return new S3Client({
		accessKeyId: process.env.S3_ACCESS_KEY_ID,
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
		bucket: process.env.S3_BUCKET,
		endpoint: process.env.S3_ENDPOINT,
		region: process.env.S3_REGION || "us-east-1",
	});
}

// Parse cookies from request into a decoded Map
function parseCookies(req) {
	const raw = req.headers.get("cookie");
	if (!raw) return new Map();
	return new Map(
		decodeURIComponent(raw)
			.split(";")
			.map((p) => {
				const eq = p.indexOf("=");
				if (eq === -1) return [p.trim(), ""];
				return [p.slice(0, eq).trim(), p.slice(eq + 1).trim()];
			}),
	);
}

// A/B variant config — TOML import (parsed at load, inlined at build)
// Falls back to globalThis defines for pre-built bundles
import abConfig from "../../bunfig-ab-variants.toml" with { type: "toml" };

const _abDefines = abConfig?.define ?? {};

// Strip outer quotes from TOML define values: "\"enabled\"" → "enabled"
function _unquote(val, fallback) {
	if (val == null) return fallback;
	const s = String(val);
	if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
	return s;
}

const _AB_VARIANT_A =
	typeof globalThis.AB_VARIANT_A !== "undefined"
		? globalThis.AB_VARIANT_A
		: _unquote(_abDefines.AB_VARIANT_A, "enabled");
const _AB_VARIANT_B =
	typeof globalThis.AB_VARIANT_B !== "undefined"
		? globalThis.AB_VARIANT_B
		: _unquote(_abDefines.AB_VARIANT_B, "disabled");
const _AB_VARIANT_POOL_A =
	typeof globalThis.AB_VARIANT_POOL_A !== "undefined"
		? globalThis.AB_VARIANT_POOL_A
		: parseInt(_unquote(_abDefines.AB_VARIANT_POOL_A, "5"), 10);
const _AB_VARIANT_POOL_B =
	typeof globalThis.AB_VARIANT_POOL_B !== "undefined"
		? globalThis.AB_VARIANT_POOL_B
		: parseInt(_unquote(_abDefines.AB_VARIANT_POOL_B, "3"), 10);
const _DEFAULT_VARIANT =
	typeof globalThis.DEFAULT_VARIANT !== "undefined"
		? globalThis.DEFAULT_VARIANT
		: _unquote(_abDefines.DEFAULT_VARIANT, "control");

// Get A/B variant from cookies (prefix match) > define > default
// Returns { variant, source } where source = "cookie" | "define" | "default"
function getABVariant(cookies) {
	for (const [k, v] of cookies) {
		if (k.startsWith("ab-variant-")) return { variant: v, source: "cookie" };
	}
	if (_AB_VARIANT_A !== _DEFAULT_VARIANT)
		return { variant: _AB_VARIANT_A, source: "define" };
	if (_AB_VARIANT_B !== _DEFAULT_VARIANT)
		return { variant: _AB_VARIANT_B, source: "define" };
	return { variant: _DEFAULT_VARIANT, source: "default" };
}

// Get pool size from A/B variant cookie or build-time define
function getABPoolSize(variant, cookies) {
	const cookiePool = cookies.get("poolSize");
	if (cookiePool) return parseInt(cookiePool, 10);
	return variant === "enabled" ? _AB_VARIANT_POOL_A : _AB_VARIANT_POOL_B;
}

// Zstd cookie snapshot - compress A/B state for session persistence
// Bun.zstdCompressSync: 85% shrink at 50 cookies, ~3μs compress
function snapshotCookies(cookies, variant, source) {
	const state = JSON.stringify({
		variant,
		source,
		cookies: [...cookies],
		ts: Date.now(),
	});
	return Bun.zstdCompressSync(Buffer.from(state));
}

function restoreSnapshot(compressed) {
	const decompressed = Bun.zstdDecompressSync(compressed);
	return JSON.parse(Buffer.from(decompressed).toString());
}

// Format bytes
function _formatBytes(bytes) {
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "0 B";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
}

// Test CDN performance
async function _testCDNPerformance() {
	try {
		const start = Date.now();
		const response = await fetch("https://cdn.factory-wager.com/", {
			method: "HEAD",
		});
		const latency = Date.now() - start;
		return response.ok ? latency : -1;
	} catch {
		return -1;
	}
}

// Get storage statistics
async function getStorageStats() {
	const client = getS3Client();

	let allObjects = [];
	let continuationToken = null;

	do {
		const response = await client.list({ maxKeys: 1000, continuationToken });
		allObjects = allObjects.concat(response.contents || []);
		continuationToken = response.nextContinuationToken;
	} while (continuationToken);

	const totalSize = allObjects.reduce(
		(sum, obj) => sum + parseInt(obj.Size || "0", 10),
		0,
	);
	const totalObjects = allObjects.length;

	// File type analysis
	const fileTypes = {};
	const sizeDistribution = { small: 0, medium: 0, large: 0, xlarge: 0 };

	for (const obj of allObjects) {
		const size = parseInt(obj.Size || "0", 10);
		const ext = obj.Key?.split(".").pop()?.toLowerCase() || "no-extension";

		fileTypes[ext] = (fileTypes[ext] || 0) + 1;

		if (size < 1024 * 1024) sizeDistribution.small++;
		else if (size < 10 * 1024 * 1024) sizeDistribution.medium++;
		else if (size < 100 * 1024 * 1024) sizeDistribution.large++;
		else sizeDistribution.xlarge++;
	}

	// Recent activity (mock for now)
	const recentActivity = [
		{ type: "upload", file: "dashboard.html", time: "Just now" },
		{ type: "upload", file: "enterprise-test.txt", time: "2 minutes ago" },
		{ type: "upload", file: "advanced-test.txt", time: "5 minutes ago" },
		{ type: "upload", file: "enhanced-test.txt", time: "10 minutes ago" },
	];

	return {
		totalObjects,
		totalSize,
		fileTypes,
		sizeDistribution: [
			sizeDistribution.small,
			sizeDistribution.medium,
			sizeDistribution.large,
			sizeDistribution.xlarge,
		],
		recentActivity,
		lastUpdated: new Date().toISOString(),
	};
}

// Test CDN performance
async function testCDNPerformance() {
	try {
		const start = Date.now();
		const response = await fetch("https://cdn.factory-wager.com/dashboard.html");
		await response.arrayBuffer();
		return Date.now() - start;
	} catch {
		return -1;
	}
}

// ── A/B WebSocket + Worker Infrastructure ────────────────────────────────────

// Sub-protocols: "ab-events" (per-request), "ab-metrics" (aggregated)
const AB_PROTOCOLS = ["ab-events", "ab-metrics"];

// Connected WS clients by sub-protocol
const abEventSubs = new Set();
const abMetricSubs = new Set();

// In-memory metrics aggregation
const abMetrics = {
	impressions: 0,
	variants: {}, // { "enabled": count, "disabled": count, "control": count }
	pools: {}, // { poolSize: count }
	tenants: {}, // { tenantId: count }
	lastReset: Date.now(),
};

function recordABEvent(variant, poolSize, source, tenantId) {
	abMetrics.impressions++;
	abMetrics.variants[variant] = (abMetrics.variants[variant] || 0) + 1;
	abMetrics.pools[poolSize] = (abMetrics.pools[poolSize] || 0) + 1;
	if (tenantId) {
		abMetrics.tenants[tenantId] = (abMetrics.tenants[tenantId] || 0) + 1;
	}
}

function broadcastABEvent(event) {
	const msg = JSON.stringify(event);
	for (const ws of abEventSubs) {
		ws.send(msg);
	}
}

function broadcastABMetrics() {
	if (abMetricSubs.size === 0) return;
	const snapshot = {
		type: "metrics",
		ts: Date.now(),
		windowMs: Date.now() - abMetrics.lastReset,
		impressions: abMetrics.impressions,
		variants: { ...abMetrics.variants },
		pools: { ...abMetrics.pools },
		tenants: { ...abMetrics.tenants },
	};
	const msg = JSON.stringify(snapshot);
	for (const ws of abMetricSubs) {
		ws.send(msg);
	}
}

// Broadcast metrics every 1s when subscribers exist
const metricsInterval = setInterval(() => {
	broadcastABMetrics();
}, 1000);

// Persistence worker (zstd compress + SQLite write off main thread)
const persistenceWorker = new Worker(
	new URL("./ab-persistence-worker.ts", import.meta.url).href,
);

const pendingLoads = new Map(); // requestId -> { resolve, reject }

persistenceWorker.onmessage = (event) => {
	const msg = event.data;

	if (msg.type === "ready") {
		logger.info("A/B persistence worker ready");
	} else if (msg.type === "persisted") {
		// Snapshot persisted — broadcast to event subscribers
		broadcastABEvent({
			type: "persisted",
			sessionId: msg.sessionId,
			snapshotSize: msg.snapshotSize,
			variant: msg.variant,
			poolSize: msg.poolSize,
			ts: Date.now(),
		});
	} else if (msg.type === "loaded") {
		const pending = pendingLoads.get(msg.requestId);
		if (pending) {
			pending.resolve(msg.snapshot);
			pendingLoads.delete(msg.requestId);
		}
	}
};

persistenceWorker.onerror = (err) => {
	logger.error("A/B persistence worker error:", err);
};

function persistSnapshot(sessionId, state) {
	persistenceWorker.postMessage({ type: "persist", sessionId, state });
}

function loadSnapshotAsync(sessionId) {
	const requestId = crypto.randomUUID();
	return new Promise((resolve, reject) => {
		pendingLoads.set(requestId, { resolve, reject });
		persistenceWorker.postMessage({ type: "load", sessionId, requestId });
		// Timeout after 5s
		setTimeout(() => {
			if (pendingLoads.has(requestId)) {
				pendingLoads.delete(requestId);
				reject(new Error("Snapshot load timeout"));
			}
		}, 5000);
	});
}

// ── Route Modules ────────────────────────────────────────────────────────────

const handlePhone = createPhoneRouter({ phoneSanitizer, logger });

const handleAB = createABRouter({
	getABVariant,
	getABPoolSize,
	snapshotCookies,
	restoreSnapshot,
	compressState,
	decompressState,
	createSnapshotFromCookies,
	resolveTenantFromRequest,
	tenantPrefix,
	parseTenantCookieMap,
	getPoolSize,
	recordABEvent,
	broadcastABEvent,
	persistSnapshot,
	loadSnapshotAsync,
	abEventSubs,
	abMetricSubs,
	abMetrics,
	AB_PROTOCOLS,
	getServerPort: () => server.port,
});

const handleStorage = createStorageRouter({ getS3Client, logger });

// ── Prefix-based route dispatch ──────────────────────────────────────────────

const ROUTE_TABLE = [
	{ prefix: "/api/phone/", handler: handlePhone },
	{ prefix: "/api/ab/", handler: handleAB },
	{ prefix: "/api/cookies", handler: handleAB },
	{ prefix: "/api/upload", handler: handleStorage },
	{ prefix: "/api/cdn/", handler: handleStorage },
];

// API server
const server = Bun.serve({
	port: parseInt(process.env.API_PORT || process.env.PORT || "3001", 10),
	async fetch(req) {
		const url = new URL(req.url);
		const cookies = parseCookies(req);

		// CORS headers
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		};

		if (req.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// ── WebSocket upgrade: /api/ab/status ──────────────────────────
		if (
			url.pathname === "/api/ab/status" &&
			req.headers.get("upgrade") === "websocket"
		) {
			const requested = req.headers.get("sec-websocket-protocol") || "";
			const protocols = requested.split(",").map((p) => p.trim());
			const matched = protocols.find((p) => AB_PROTOCOLS.includes(p)) || "ab-events"; // default to events

			const upgraded = server.upgrade(req, {
				data: { protocol: matched, connectedAt: Date.now() },
				headers: { "Sec-WebSocket-Protocol": matched },
			});

			if (upgraded) return undefined;
			return Response.json(
				{ error: "WebSocket upgrade failed" },
				{ status: 400, headers: corsHeaders },
			);
		}

		try {
			// ── Core routes (stats, health) ────────────────────────────
			switch (url.pathname) {
				case "/api/stats": {
					const stats = await getStorageStats();
					const cdnLatency = await testCDNPerformance();
					return Response.json({ ...stats, cdnLatency }, { headers: corsHeaders });
				}

				case "/api/health": {
					const healthCdnLatency = await testCDNPerformance();
					return Response.json(
						{
							status: "healthy",
							timestamp: new Date().toISOString(),
							services: {
								storage: "operational",
								cdn: healthCdnLatency > 0 ? "operational" : "degraded",
								api: "operational",
							},
						},
						{ headers: corsHeaders },
					);
				}
			}

			// ── Delegated route dispatch ───────────────────────────────
			for (const { prefix, handler } of ROUTE_TABLE) {
				if (url.pathname.startsWith(prefix) || url.pathname === prefix) {
					const result = await handler(req, url, cookies, corsHeaders);
					if (result) return result;
				}
			}

			// ── 404 fallback ──────────────────────────────────────────
			return new Response("Not found", {
				status: 404,
				headers: corsHeaders,
			});
		} catch (error) {
			logger.error("API Error:", error);
			return Response.json(
				{ error: error.message },
				{ status: 500, headers: corsHeaders },
			);
		}
	},

	// ── WebSocket handler (A/B status sub-protocols) ────────────────────
	websocket: {
		open(ws) {
			const { protocol } = ws.data;
			if (protocol === "ab-metrics") {
				abMetricSubs.add(ws);
				ws.send(
					JSON.stringify({
						type: "connected",
						protocol: "ab-metrics",
						intervalMs: 1000,
						ts: Date.now(),
					}),
				);
			} else {
				abEventSubs.add(ws);
				ws.send(
					JSON.stringify({
						type: "connected",
						protocol: "ab-events",
						ts: Date.now(),
					}),
				);
			}
			logger.info(
				`WS ${protocol} client connected (events=${abEventSubs.size} metrics=${abMetricSubs.size})`,
			);
		},

		message(ws, message) {
			try {
				const msg = JSON.parse(message);
				if (msg.type === "ping") {
					ws.send(JSON.stringify({ type: "pong", ts: Date.now() }));
				} else if (msg.type === "reset-metrics") {
					abMetrics.impressions = 0;
					abMetrics.variants = {};
					abMetrics.pools = {};
					abMetrics.tenants = {};
					abMetrics.lastReset = Date.now();
					ws.send(JSON.stringify({ type: "metrics-reset", ts: Date.now() }));
				} else if (msg.type === "subscribe") {
					const newProto = msg.protocol;
					if (newProto === "ab-metrics") {
						abEventSubs.delete(ws);
						abMetricSubs.add(ws);
					} else if (newProto === "ab-events") {
						abMetricSubs.delete(ws);
						abEventSubs.add(ws);
					}
					ws.send(JSON.stringify({ type: "subscribed", protocol: newProto }));
				}
			} catch {
				// Non-JSON messages ignored
			}
		},

		close(ws) {
			abEventSubs.delete(ws);
			abMetricSubs.delete(ws);
		},
	},
});

logger.info(`🚀 R2 Dashboard API Server running on http://localhost:${server.port}`);
logger.info(`📊 Dashboard available at: https://cdn.factory-wager.com/dashboard.html`);
logger.info(`🔗 API endpoints:`);
logger.info(`   Storage Stats: http://localhost:${server.port}/api/stats`);
logger.info(`   Phone Sanitize: http://localhost:${server.port}/api/phone/sanitize`);
logger.info(`   Phone Batch: http://localhost:${server.port}/api/phone/batch`);
logger.info(`   Email Sanitize: http://localhost:${server.port}/api/phone/email`);
logger.info(`   Phone Stats: http://localhost:${server.port}/api/phone/stats`);
logger.info(`   Phone Analytics: http://localhost:${server.port}/api/phone/analytics`);
logger.info(
	`   Top Countries: http://localhost:${server.port}/api/phone/analytics/top-countries`,
);
logger.info(
	`   Success Trends: http://localhost:${server.port}/api/phone/analytics/trends`,
);
logger.info(`   Phone History: http://localhost:${server.port}/api/phone/history`);
logger.info(
	`   History Search: http://localhost:${server.port}/api/phone/history/search`,
);
logger.info(`   Custom Rules: http://localhost:${server.port}/api/phone/rules`);
logger.info(`   Enable Rules: http://localhost:${server.port}/api/phone/rules/enable`);
logger.info(`   Phone Reputation: http://localhost:${server.port}/api/phone/reputation`);
logger.info(`   SMS Start: http://localhost:${server.port}/api/phone/sms/start`);
logger.info(`   SMS Verify: http://localhost:${server.port}/api/phone/sms/verify`);
logger.info(
	`   Set Disposition: http://localhost:${server.port}/api/cdn/set-disposition`,
);
logger.info(`   Health Check: http://localhost:${server.port}/api/health`);
logger.info(`🔌 A/B WebSocket Status:`);
logger.info(`   WS Upgrade:   ws://localhost:${server.port}/api/ab/status`);
logger.info(`   Sub-protocols: ab-events (per-request), ab-metrics (1s aggregated)`);
logger.info(`   AB Variant:   http://localhost:${server.port}/api/ab/variant`);
logger.info(
	`   AB Snapshot:  http://localhost:${server.port}/api/ab/snapshot?format=zstd`,
);
logger.info(`   AB Restore:   http://localhost:${server.port}/api/ab/restore`);
logger.info(`   AB Tenant:    http://localhost:${server.port}/api/ab/tenant`);
logger.info(`   AB Persist:   http://localhost:${server.port}/api/ab/persist`);
logger.info(
	`   AB Load:      http://localhost:${server.port}/api/ab/persist/:sessionId`,
);
