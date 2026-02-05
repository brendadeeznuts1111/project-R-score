#!/usr/bin/env bun
/**
 * Tier-1380 SSE Live Alert Server v2.0
 * Real-time width violation streaming with multi-region broadcast
 *
 * API Cross-References:
 * - Bun.serve: https://bun.sh/docs/api/http#bun-serve
 * - ReadableStream: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
 * - EventSource: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
 * - CSRF Protection: https://owasp.org/www-community/attacks/csrf
 */

import { Database } from "bun:sqlite";
import { existsSync } from "fs";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Alert severity levels
 * @see https://en.wikipedia.org/wiki/Syslog#Severity_level
 */
type AlertSeverity = "warning" | "critical" | "info";

/**
 * Violation alert payload structure
 * @crossref registry/audit - Matches audit log schema
 */
interface ViolationAlert {
	/** Unique alert ID (UUIDv7) */
	id: string;
	/** ISO 8601 timestamp */
	timestamp: string;
	/** Tenant identifier */
	tenant: string;
	/** File path where violation occurred */
	file: string;
	/** Line number in file */
	line: number;
	/** Column width that exceeded limit */
	width: number;
	/** Preview of violating line */
	preview: string;
	/** Alert severity based on width */
	severity: AlertSeverity;
	/** Optional metadata */
	meta?: {
		commit?: string;
		author?: string;
		/** Cross-reference to tier1380:registry:validate */
		toolCall?: string;
	};
}

/**
 * SSE Client connection state
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
interface SSEClient {
	/** Client connection ID (UUIDv7) */
	id: string;
	/** Response writer for streaming */
	writer: WritableStreamDefaultWriter<Uint8Array>;
	/** Tenant filter ("*" for all) */
	tenant: string;
	/** Connection timestamp */
	connectedAt: number;
	/** Client filters */
	filters?: AlertFilters;
	/** CSRF session ID */
	sessionId?: string;
}

/** Alert filtering options */
interface AlertFilters {
	/** Minimum column width to trigger alert */
	minWidth?: number;
	/** Severity filter */
	severity?: AlertSeverity;
	/** File pattern (glob) */
	filePattern?: string;
}

/** Server configuration with port mapping */
interface SSEServerConfig {
	/** HTTP port (default: 3333) */
	port: number;
	/** TCP socket options */
	socket?: {
		/** Reuse address (default: true) */
		reusePort?: boolean;
		/** SO_KEEPALIVE (default: true) */
		keepAlive?: boolean;
	};
	/** Development mode (default: false) */
	development?: boolean;
	/**
	 * Error handler
	 * @crossref Bun.serve error handling
	 */
	error?: (error: Error) => void;
}

/** API endpoint metadata for cross-referencing */
interface APIEndpoint {
	method: "GET" | "POST" | "OPTIONS";
	path: string;
	description: string;
	/** Related tools/commands */
	crossRef?: string[];
	/** Required headers */
	headers?: string[];
	/** Query parameters */
	queryParams?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Default server configuration */
const DEFAULT_CONFIG: SSEServerConfig = {
	port: 3333,
	socket: { reusePort: true, keepAlive: true },
	development: false,
};

/** API endpoint registry for cross-referencing */
const API_REGISTRY: Record<string, APIEndpoint> = {
	csrfToken: {
		method: "GET",
		path: "/csrf-token",
		description: "Get CSRF token for SSE connection",
		crossRef: ["tier1380:registry:password:hash"],
		headers: ["X-Session-ID"],
	},
	stream: {
		method: "GET",
		path: "/mcp/alerts/stream",
		description: "SSE stream endpoint (EventSource)",
		crossRef: ["tier1380:registry:health:monitor", "tier1380:sse:test"],
		headers: ["X-CSRF-Token", "X-Session-ID"],
		queryParams: {
			tenant: "Tenant filter (* for all)",
			minWidth: "Minimum column width threshold",
			severity: "Alert severity filter",
		},
	},
	test: {
		method: "POST",
		path: "/mcp/alerts/test",
		description: "Trigger test alert",
		crossRef: ["tier1380:registry:compliance"],
	},
	health: {
		method: "GET",
		path: "/health",
		description: "Health check with connection stats",
		crossRef: ["tier1380:registry:check"],
	},
	dashboard: {
		method: "GET",
		path: "/dashboard",
		description: "Live alert dashboard UI",
		crossRef: ["tier1380:registry:info"],
	},
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLYPHS & UTILS
// ═══════════════════════════════════════════════════════════════════════════════

const GLYPHS = {
	STREAM: "📡",
	ALERT: "🚨",
	CONNECT: "🔌",
	DISCONNECT: "⛓",
	BROADCAST: "📻",
	DRIFT: "▵⟂⥂",
	CONFIG: "⚙️",
	TYPE: "📐",
	API: "🔗",
	PORT: "🔢",
};

const COLORS = {
	success: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#00ff00", "ansi") + s + "\x1b[0m"
			: s,
	error: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#ff0000", "ansi") + s + "\x1b[0m"
			: s,
	warning: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#ffff00", "ansi") + s + "\x1b[0m"
			: s,
	info: (s: string) =>
		typeof Bun !== "undefined" && Bun.color
			? Bun.color("#00ffff", "ansi") + s + "\x1b[0m"
			: s,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSRF TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const csrfTokens = new Map<string, { token: string; expiry: number }>();

function generateCSRFToken(sessionId: string): string {
	const token = Bun.randomUUIDv7();
	csrfTokens.set(sessionId, { token, expiry: Date.now() + 3600000 });
	return token;
}

function verifyCSRFToken(sessionId: string, token: string): boolean {
	const stored = csrfTokens.get(sessionId);
	if (!stored) return false;
	if (stored.expiry < Date.now()) {
		csrfTokens.delete(sessionId);
		return false;
	}
	return stored.token === token;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT STREAM MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class AlertStreamManager {
	private clients = new Map<string, SSEClient>();
	private violationQueue: ViolationAlert[] = [];
	private db: Database | null = null;
	private lastCheck = Date.now();
	private config: SSEServerConfig;

	constructor(config: Partial<SSEServerConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		if (existsSync("./data/tier1380.db")) {
			this.db = new Database("./data/tier1380.db");
		}
	}

	getConfig(): SSEServerConfig {
		return this.config;
	}

	addClient(client: SSEClient) {
		this.clients.set(client.id, client);
		console.log(
			`${GLYPHS.CONNECT} Client ${client.id.slice(0, 8)} connected on port ${this.config.port} (${this.clients.size} total)`,
		);
		this.sendToClient(client.id, {
			type: "connected",
			clientId: client.id,
			timestamp: new Date().toISOString(),
			port: this.config.port,
		});
	}

	removeClient(id: string) {
		if (this.clients.has(id)) {
			this.clients.delete(id);
			console.log(
				`${GLYPHS.DISCONNECT} Client ${id.slice(0, 8)} disconnected (${this.clients.size} remaining)`,
			);
		}
	}

	async sendToClient(clientId: string, data: any) {
		const client = this.clients.get(clientId);
		if (!client) return;

		try {
			const message = `data: ${JSON.stringify(data)}\n\n`;
			await client.writer.write(new TextEncoder().encode(message));
		} catch (error) {
			console.error(`Error sending to ${clientId}:`, error);
			this.removeClient(clientId);
		}
	}

	async broadcast(alert: ViolationAlert) {
		this.violationQueue.push(alert);
		const message = `data: ${JSON.stringify({ type: "violation", ...alert })}\n\n`;
		const encoder = new TextEncoder();

		for (const [id, client] of this.clients) {
			if (client.tenant !== "*" && client.tenant !== alert.tenant) continue;
			if (client.filters?.severity && client.filters.severity !== alert.severity)
				continue;
			if (client.filters?.minWidth && alert.width < client.filters.minWidth) continue;

			try {
				await client.writer.write(encoder.encode(message));
			} catch {
				this.removeClient(id);
			}
		}

		// Simulate Redis multi-region broadcast
		await this.redisBroadcast(alert);
	}

	private async redisBroadcast(alert: ViolationAlert) {
		console.log(
			`${GLYPHS.BROADCAST} Redis: tier1380:violations:live (${alert.tenant}, port ${this.config.port})`,
		);
	}

	async pollForNewViolations() {
		if (!this.db) return;

		const now = Date.now();
		const newViolations = this.db
			.query(`
      SELECT id, file, line, width, preview, datetime(timestamp, 'unixepoch') as time
      FROM violations
      WHERE timestamp > ?
      ORDER BY timestamp DESC
      LIMIT 10
    `)
			.all(Math.floor(this.lastCheck / 1000)) as any[];

		this.lastCheck = now;

		for (const v of newViolations) {
			const alert: ViolationAlert = {
				id: v.id?.toString() || Bun.randomUUIDv7(),
				timestamp: v.time,
				tenant: v.file?.split("/")[1] || "default",
				file: v.file,
				line: v.line,
				width: v.width,
				preview: v.preview?.slice(0, 50),
				severity: v.width > 120 ? "critical" : v.width > 100 ? "warning" : "info",
			};
			await this.broadcast(alert);
		}
	}

	async sendHeartbeat() {
		const encoder = new TextEncoder();
		for (const [id, client] of this.clients) {
			try {
				await client.writer.write(encoder.encode(`:heartbeat\n\n`));
			} catch {
				this.removeClient(id);
			}
		}
	}

	getStats() {
		return {
			connectedClients: this.clients.size,
			queueSize: this.violationQueue.length,
			lastPoll: new Date(this.lastCheck).toISOString(),
			port: this.config.port,
			uptime: process.uptime(),
		};
	}
}

// ═══════════════════════════════════════════════════════════════════════════════
// SSE SERVER
// ═══════════════════════════════════════════════════════════════════════════════

async function startSSEServer(config: Partial<SSEServerConfig> = {}) {
	const mergedConfig: SSEServerConfig = { ...DEFAULT_CONFIG, ...config };
	const { port } = mergedConfig;

	console.log(`${GLYPHS.STREAM} Tier-1380 SSE Alert Server v2.0\n`);
	console.log("-".repeat(70));

	// Type Properties Display
	console.log(`${GLYPHS.TYPE} Type Properties:\n`);
	console.log(
		`  ViolationAlert:   { id, timestamp, tenant, file, line, width, preview, severity, meta? }`,
	);
	console.log(
		`  SSEClient:        { id, writer, tenant, connectedAt, filters?, sessionId? }`,
	);
	console.log(`  AlertFilters:     { minWidth?, severity?, filePattern? }`);
	console.log(`  SSEServerConfig:  { port, socket?, development?, error? }`);
	console.log();

	// Port Configuration Display
	console.log(`${GLYPHS.PORT} Port Configuration:\n`);
	console.log(`  Primary Port:     ${port} (HTTP/SSE)`);
	console.log(
		`  Socket Options:   reusePort=${mergedConfig.socket?.reusePort}, keepAlive=${mergedConfig.socket?.keepAlive}`,
	);
	console.log(`  Development:      ${mergedConfig.development}`);
	console.log();

	const alertManager = new AlertStreamManager(mergedConfig);

	const server = Bun.serve({
		port,
		hostname: "127.0.0.1",
		development: mergedConfig.development,

		async fetch(req) {
			const url = new URL(req.url);
			const pathname = url.pathname;

			const corsHeaders = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token, X-Session-ID",
			};

			if (req.method === "OPTIONS") {
				return new Response(null, { headers: corsHeaders });
			}

			// Health check with full config
			if (pathname === "/health") {
				return new Response(
					JSON.stringify({
						status: "ok",
						...alertManager.getStats(),
						config: { port: mergedConfig.port, development: mergedConfig.development },
						timestamp: new Date().toISOString(),
					}),
					{
						headers: { "Content-Type": "application/json", ...corsHeaders },
					},
				);
			}

			// API Cross-Reference endpoint
			if (pathname === "/api/registry") {
				return new Response(
					JSON.stringify(
						{
							endpoints: API_REGISTRY,
							types: {
								ViolationAlert: {
									properties: {
										id: { type: "string", format: "uuid" },
										timestamp: { type: "string", format: "iso8601" },
										tenant: { type: "string" },
										file: { type: "string" },
										line: { type: "number", minimum: 1 },
										width: { type: "number", minimum: 0 },
										preview: { type: "string", maxLength: 100 },
										severity: { type: "string", enum: ["info", "warning", "critical"] },
										meta: { type: "object", optional: true },
									},
								},
								SSEClient: {
									properties: {
										id: { type: "string", format: "uuid" },
										tenant: { type: "string" },
										connectedAt: { type: "number", description: "Unix timestamp" },
										filters: { type: "AlertFilters", optional: true },
									},
								},
							},
							crossRefs: {
								"tier1380:registry:check": "/health",
								"tier1380:registry:compliance": "/mcp/alerts/test",
								"tier1380:sse:test": "/mcp/alerts/test",
							},
						},
						null,
						2,
					),
					{
						headers: { "Content-Type": "application/json", ...corsHeaders },
					},
				);
			}

			// CSRF token endpoint
			if (pathname === "/csrf-token") {
				const sessionId = req.headers.get("X-Session-ID") || Bun.randomUUIDv7();
				const token = generateCSRFToken(sessionId);
				return new Response(JSON.stringify({ token, sessionId }), {
					headers: { "Content-Type": "application/json", ...corsHeaders },
				});
			}

			// SSE Stream
			if (pathname === "/mcp/alerts/stream") {
				const tenant = url.searchParams.get("tenant") || "*";
				const minWidth = parseInt(url.searchParams.get("minWidth") || "0");
				const severity = url.searchParams.get("severity") as AlertSeverity | undefined;

				const csrfToken = req.headers.get("X-CSRF-Token");
				const sessionId = req.headers.get("X-Session-ID");

				if (!csrfToken || !sessionId || !verifyCSRFToken(sessionId, csrfToken)) {
					return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
						status: 403,
						headers: { "Content-Type": "application/json", ...corsHeaders },
					});
				}

				const clientId = Bun.randomUUIDv7();

				const stream = new ReadableStream({
					start(controller) {
						const writer = new WritableStream({
							write(chunk) {
								controller.enqueue(chunk);
							},
						}).getWriter();

						alertManager.addClient({
							id: clientId,
							writer,
							tenant,
							connectedAt: Date.now(),
							filters: { minWidth, severity },
							sessionId,
						});

						alertManager.sendToClient(clientId, {
							type: "stats",
							...alertManager.getStats(),
						});
					},
					cancel() {
						alertManager.removeClient(clientId);
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						...corsHeaders,
					},
				});
			}

			// Test alert endpoint
			if (pathname === "/mcp/alerts/test" && req.method === "POST") {
				const body = await req.json();
				const alert: ViolationAlert = {
					id: Bun.randomUUIDv7(),
					timestamp: new Date().toISOString(),
					tenant: body.tenant || "test",
					file: body.file || "test.ts",
					line: body.line || 1,
					width: body.width || 95,
					preview: body.preview || "Test violation...",
					severity:
						body.width > 120 ? "critical" : body.width > 100 ? "warning" : "info",
					meta: {
						toolCall: "tier1380:sse:test",
						port: mergedConfig.port,
					},
				};

				await alertManager.broadcast(alert);

				return new Response(JSON.stringify({ sent: true, alert }), {
					headers: { "Content-Type": "application/json", ...corsHeaders },
				});
			}

			// Dashboard
			if (pathname === "/" || pathname === "/dashboard") {
				const html = generateDashboardHTML(port);
				return new Response(html, {
					headers: { "Content-Type": "text/html", ...corsHeaders },
				});
			}

			return new Response("Not found", { status: 404 });
		},

		error(error) {
			console.error("Server error:", error);
			if (mergedConfig.error) mergedConfig.error(error);
		},
	});

	// Display endpoints with cross-references
	console.log(`${GLYPHS.API} API Endpoints with Cross-References:\n`);
	Object.entries(API_REGISTRY).forEach(([key, endpoint]) => {
		console.log(`  ${endpoint.method} ${endpoint.path}`);
		console.log(`    ${endpoint.description}`);
		if (endpoint.crossRef) {
			console.log(`    ↳ Cross-ref: ${endpoint.crossRef.join(", ")}`);
		}
		console.log();
	});

	console.log(`${GLYPHS.CONNECT} Server running on port ${port}:\n`);
	console.log(`  http://127.0.0.1:${port}/dashboard    → Live dashboard`);
	console.log(`  http://127.0.0.1:${port}/api/registry  → API documentation`);
	console.log(`  http://127.0.0.1:${port}/health       → Health + stats`);

	// Background tasks
	setInterval(() => alertManager.pollForNewViolations(), 5000);
	setInterval(() => alertManager.sendHeartbeat(), 30000);

	process.on("SIGINT", () => {
		console.log(`\n${GLYPHS.DISCONNECT} Stopping server on port ${port}...`);
		server.stop();
		process.exit(0);
	});

	await new Promise(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generateDashboardHTML(port: number): string {
	return `<!DOCTYPE html>
<html>
<head>
  <title>Tier-1380 SSE Alerts (Port ${port})</title>
  <style>
    body { font-family: monospace; background: #1a1a1a; color: #0f0; padding: 20px; }
    .alert { border: 1px solid #0f0; padding: 10px; margin: 10px 0; border-radius: 4px; }
    .critical { border-color: #f00; color: #f00; }
    .warning { border-color: #ff0; color: #ff0; }
    .info { border-color: #0ff; color: #0ff; }
    #stats { position: fixed; top: 10px; right: 10px; background: #333; padding: 15px; border-radius: 8px; }
    .meta { font-size: 0.8em; color: #888; }
  </style>
</head>
<body>
  <h1>${GLYPHS.STREAM} Tier-1380 Live Alerts (Port ${port})</h1>
  <div id="stats">Connecting...</div>
  <div id="alerts"></div>
  
  <script>
    async function connect() {
      const sessionId = localStorage.getItem('sessionId') || '';
      const csrfRes = await fetch('/csrf-token', { headers: { 'X-Session-ID': sessionId }});
      const { token, sessionId: newSessionId } = await csrfRes.json();
      localStorage.setItem('sessionId', newSessionId);
      
      const es = new EventSource('/mcp/alerts/stream?tenant=*', {
        headers: { 'X-CSRF-Token': token, 'X-Session-ID': newSessionId }
      });
      
      es.onopen = () => { document.getElementById('stats').textContent = 'Connected (Port ${port})'; };
      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'stats') {
          document.getElementById('stats').textContent = \`Clients: \${data.connectedClients} | Port: \${data.port}\`;
        } else if (data.type === 'violation') {
          const div = document.createElement('div');
          div.className = \`alert \${data.severity}\`;
          div.innerHTML = \`
            <strong>\${data.severity.toUpperCase()}</strong> 
            \${data.tenant} | \${data.file}:\${data.line} | Width: \${data.width}
            <pre>\${data.preview}</pre>
            <div class="meta">Port: ${port} | ID: \${data.id.slice(0, 8)}</div>
          \`;
          document.getElementById('alerts').prepend(div);
        }
      };
      es.onerror = () => { document.getElementById('stats').textContent = 'Disconnected'; };
    }
    connect();
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
	const args = process.argv.slice(2);
	const cmd = args[0] || "start";

	switch (cmd) {
		case "start": {
			const port = parseInt(args[1]) || DEFAULT_CONFIG.port;
			const config: SSEServerConfig = { ...DEFAULT_CONFIG, port };
			await startSSEServer(config);
			break;
		}

		case "test": {
			const port = parseInt(args[5]) || DEFAULT_CONFIG.port;
			const testAlert = {
				tenant: args[1] || "test",
				file: args[2] || "test.ts",
				line: parseInt(args[3]) || 1,
				width: parseInt(args[4]) || 95,
				preview: "Test violation preview...",
			};

			const res = await fetch(`http://127.0.0.1:${port}/mcp/alerts/test`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(testAlert),
			});

			console.log(await res.json());
			break;
		}

		case "help":
		default:
			console.log(`
${GLYPHS.STREAM} Tier-1380 SSE Alert Server v2.0

Usage:
  bun run tier1380:sse:start [port]              Start server (default: 3333)
  bun run tier1380:sse:test [tenant] [file] [line] [width] [port]  Send test

Type Properties:
  ViolationAlert  → { id, timestamp, tenant, file, line, width, preview, severity, meta? }
  SSEClient       → { id, writer, tenant, connectedAt, filters?, sessionId? }
  SSEServerConfig → { port, socket?, development?, error? }

API Cross-References:
  /health              → tier1380:registry:check
  /mcp/alerts/test     → tier1380:registry:compliance, tier1380:sse:test
  /mcp/alerts/stream   → tier1380:registry:health:monitor
  /dashboard           → tier1380:registry:info
  /api/registry        → API documentation
`);
	}
}

if (import.meta.main) {
	main();
}

export { AlertStreamManager, startSSEServer, type SSEServerConfig, type ViolationAlert };
