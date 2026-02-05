/**
 * @fileoverview 9.1.5.21.0.0.0: WebSocket Audit Server
 * @description Real-time audit monitoring via Bun WebSockets
 * @module audit/websocket-audit-server
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.11.0.0.0 → RealTimeProcessManager
 * - @see 9.1.5.13.0.0.0 → Enhanced Audit CLI
 * - @see 7.4.6.0.0.0.0 → Bun WebSocket API Documentation
 */

import { RealTimeProcessManager } from "./real-time-process-manager";
import { MainAuditOrchestrator } from "./main-audit-orchestrator";
import { OrphanDetector } from "./orphan-detector";

/**
 * WebSocket data type for audit connections
 *
 * Bun 1.3+ uses generic type pattern for type safety
 * @see docs/BUN-LATEST-BREAKING-CHANGES.md
 */
interface AuditWebSocketData {
	clientId: string;
	connectedAt: number;
	lastActivity: number;
	// Note: ws.subscriptions is now a native getter in Bun 1.3+
	// We don't need to manually track subscriptions anymore
}

/**
 * 9.1.5.21.0.0.0: WebSocket Audit Server
 *
 * Provides real-time audit monitoring via Bun WebSockets with pub/sub support.
 * Clients can subscribe to audit topics and receive real-time updates.
 *
 * Features:
 * - Real-time audit progress updates
 * - Pattern match notifications
 * - Orphan detection alerts
 * - Cross-reference validation results
 * - Pub/Sub topic-based broadcasting
 * - Client connection management
 */
export class WebSocketAuditServer {
	private server: ReturnType<typeof Bun.serve> | null = null;
	private processManager = new RealTimeProcessManager();
	private orchestrator = new MainAuditOrchestrator();
	private orphanDetector = new OrphanDetector();
	private clients = new Map<string, any>(); // ServerWebSocket instances
	private activeAudits = new Map<string, any>(); // Active audit processes

	/**
	 * 9.1.5.21.1.0.0: Start WebSocket audit server
	 *
	 * Starts a Bun WebSocket server for real-time audit monitoring.
	 *
	 * @param port - Server port (default: 3002)
	 * @param hostname - Server hostname (default: "localhost")
	 * @returns Server instance
	 */
	start(
		port: number = 3002,
		hostname: string = "localhost",
	): ReturnType<typeof Bun.serve<AuditWebSocketData>> {
		// Bun 1.3+ uses generic type pattern for type safety
		// @see docs/BUN-LATEST-BREAKING-CHANGES.md
		this.server = Bun.serve<AuditWebSocketData>({
			port,
			hostname,
			fetch: async (req, server) => {
				// Bun automatically uses SIMD-optimized URL parsing and decodeURIComponent
				// @see docs/BUN-SIMD-URI-DECODING.md
				// @see https://github.com/oven-sh/bun/blob/5eb2145b3104f48eadd601518904e56aaa9937bf/src/bun.js/bindings/decodeURIComponentSIMD.cpp#L21-L271
				const url = new URL(req.url);

				// WebSocket upgrade endpoint
				if (url.pathname === "/audit/ws") {
					const clientId = this.generateClientId();
					const success = server.upgrade(req, {
						data: {
							clientId,
							connectedAt: Date.now(),
							lastActivity: Date.now(),
						} as AuditWebSocketData,
					});

					return success
						? undefined
						: new Response("WebSocket upgrade failed", { status: 400 });
				}

				// Health check endpoint
				if (url.pathname === "/audit/health") {
					return new Response(
						JSON.stringify({
							status: "ok",
							clients: this.clients.size,
							activeAudits: this.activeAudits.size,
							timestamp: new Date().toISOString(),
						}),
						{
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// API endpoint for triggering audits
				if (url.pathname === "/audit/start" && req.method === "POST") {
					return await this.handleStartAudit(req);
				}

				// API endpoint for stopping audits
				if (url.pathname === "/audit/stop" && req.method === "POST") {
					return await this.handleStopAudit(req);
				}

				return new Response("Not Found", { status: 404 });
			},
			websocket: {
				// Bun 1.3+ TypeScript pattern: data property for type inference
				data: {} as AuditWebSocketData,
				open: (ws) => {
					this.handleWebSocketOpen(ws);
				},
				message: (ws, message) => {
					this.handleWebSocketMessage(ws, message);
				},
				close: (ws, code, reason) => {
					this.handleWebSocketClose(ws, code, reason);
				},
				// Optional: per-message compression (Bun 1.3+)
				perMessageDeflate: true,
				// Optional: idle timeout (default: 120 seconds)
				idleTimeout: 300, // 5 minutes for audit sessions
				// Optional: max payload length (default: 16 MB)
				maxPayloadLength: 16 * 1024 * 1024,
			},
		});

		console.log(`🚀 WebSocket Audit Server listening on ${hostname}:${port}`);
		console.log(`📡 WebSocket endpoint: ws://${hostname}:${port}/audit/ws`);
		console.log(`🏥 Health check: http://${hostname}:${port}/audit/health`);

		return this.server;
	}

	/**
	 * 9.1.5.21.2.0.0: Handle WebSocket open
	 */
	private handleWebSocketOpen(ws: any): void {
		const clientId = ws.data.clientId;
		this.clients.set(clientId, ws);

		// Subscribe to default topics
		ws.subscribe("audit:progress");
		ws.subscribe("audit:matches");
		ws.subscribe("audit:orphans");

		// Bun 1.3+ improvement: Use native ws.subscriptions getter
		// Automatically de-duplicated and always accurate
		// @see docs/BUN-1.3.2-FEATURES.md
		const subscriptions = Array.from(ws.subscriptions);

		// Send welcome message
		ws.send(
			JSON.stringify({
				type: "connected",
				clientId,
				timestamp: new Date().toISOString(),
				topics: subscriptions, // Use native getter
			}),
		);

		// Broadcast new client connection
		this.broadcast("audit:system", {
			type: "client_connected",
			clientId,
			totalClients: this.clients.size,
		});

		console.log(
			`✅ Client connected: ${clientId} (Total: ${this.clients.size})`,
		);
	}

	/**
	 * 9.1.5.21.3.0.0: Handle WebSocket message
	 */
	private handleWebSocketMessage(
		ws: any,
		message: string | ArrayBuffer | Uint8Array,
	): void {
		ws.data.lastActivity = Date.now();

		try {
			const data =
				typeof message === "string"
					? JSON.parse(message)
					: JSON.parse(new TextDecoder().decode(message));
			const { type, payload } = data;

			switch (type) {
				case "subscribe":
					this.handleSubscribe(ws, payload.topic);
					break;

				case "unsubscribe":
					this.handleUnsubscribe(ws, payload.topic);
					break;

				case "start_audit":
					this.handleStartAuditRequest(ws, payload);
					break;

				case "stop_audit":
					this.handleStopAuditRequest(ws, payload.auditId);
					break;

				case "ping":
					ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
					break;

				default:
					ws.send(
						JSON.stringify({
							type: "error",
							message: `Unknown message type: ${type}`,
						}),
					);
			}
		} catch (error) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: `Invalid message format: ${error instanceof Error ? error.message : String(error)}`,
				}),
			);
		}
	}

	/**
	 * 9.1.5.21.4.0.0: Handle WebSocket close
	 */
	private handleWebSocketClose(ws: any, code: number, reason: string): void {
		const clientId = ws.data.clientId;
		this.clients.delete(clientId);

		// Unsubscribe from all topics using native subscriptions getter (Bun 1.3+)
		for (const topic of ws.subscriptions) {
			ws.unsubscribe(topic);
		}

		// Broadcast client disconnection
		this.broadcast("audit:system", {
			type: "client_disconnected",
			clientId,
			totalClients: this.clients.size,
		});

		console.log(
			`👋 Client disconnected: ${clientId} (Code: ${code}, Reason: ${reason})`,
		);
	}

	/**
	 * 9.1.5.21.6.0.0: Handle subscribe request
	 *
	 * Bun 1.3+ improvement: Uses native ws.subscriptions getter
	 * Automatically handles de-duplication
	 */
	private handleSubscribe(ws: any, topic: string): void {
		// Check if already subscribed using native getter
		if (!ws.isSubscribed(topic)) {
			ws.subscribe(topic);
			// Use native subscriptions getter (Bun 1.3+)
			ws.send(
				JSON.stringify({
					type: "subscribed",
					topic,
					subscriptions: Array.from(ws.subscriptions), // Native getter
				}),
			);
		}
	}

	/**
	 * 9.1.5.21.7.0.0: Handle unsubscribe request
	 *
	 * Bun 1.3+ improvement: Uses native ws.subscriptions getter
	 */
	private handleUnsubscribe(ws: any, topic: string): void {
		// Check if subscribed using native method
		if (ws.isSubscribed(topic)) {
			ws.unsubscribe(topic);
			// Use native subscriptions getter (Bun 1.3+)
			ws.send(
				JSON.stringify({
					type: "unsubscribed",
					topic,
					subscriptions: Array.from(ws.subscriptions), // Native getter
				}),
			);
		}
	}

	/**
	 * 9.1.5.21.8.0.0: Handle start audit request
	 */
	private async handleStartAuditRequest(ws: any, payload: any): Promise<void> {
		const auditId = this.generateAuditId();
		const { patterns, directory, useWorkers } = payload;

		ws.send(
			JSON.stringify({
				type: "audit_started",
				auditId,
				timestamp: new Date().toISOString(),
			}),
		);

		// Start audit process
		this.startAuditProcess(auditId, {
			patterns: patterns || ["\\d+\\.\\d+\\.\\d+\\.\\d+\\.\\d+"],
			directory: directory || ".",
			useWorkers: useWorkers || false,
		});
	}

	/**
	 * 9.1.5.21.9.0.0: Start audit process
	 */
	private async startAuditProcess(
		auditId: string,
		options: any,
	): Promise<void> {
		this.activeAudits.set(auditId, {
			startedAt: Date.now(),
			options,
			status: "running",
		});

		// Broadcast audit started
		this.broadcast("audit:system", {
			type: "audit_started",
			auditId,
			options,
		});

		try {
			// Use orchestrator for hybrid audit
			const result = await this.orchestrator.hybridAudit({
				directory: options.directory,
				patterns: options.patterns,
				useWorkers: options.useWorkers,
			});

			// Broadcast results
			this.broadcast("audit:results", {
				type: "audit_completed",
				auditId,
				result: {
					duration: result.duration,
					totalMatches: result.totalMatches,
					totalOrphans: result.totalOrphans,
					totalUndocumented: result.totalUndocumented,
					mode: result.mode,
				},
			});

			// Send progress updates
			this.broadcast("audit:progress", {
				type: "progress",
				auditId,
				progress: 100,
				status: "completed",
			});

			this.activeAudits.delete(auditId);
		} catch (error) {
			this.broadcast("audit:errors", {
				type: "audit_error",
				auditId,
				error: error instanceof Error ? error.message : String(error),
			});

			this.activeAudits.delete(auditId);
		}
	}

	/**
	 * 9.1.5.21.10.0.0: Handle stop audit request
	 */
	private handleStopAuditRequest(ws: any, auditId: string): void {
		if (this.activeAudits.has(auditId)) {
			// Stop audit process (implementation depends on process manager)
			this.activeAudits.delete(auditId);

			this.broadcast("audit:system", {
				type: "audit_stopped",
				auditId,
			});

			ws.send(
				JSON.stringify({
					type: "audit_stopped",
					auditId,
				}),
			);
		}
	}

	/**
	 * 9.1.5.21.11.0.0: Handle HTTP start audit request
	 */
	private async handleStartAudit(req: Request): Promise<Response> {
		try {
			const body = await req.json();
			const auditId = this.generateAuditId();

			this.startAuditProcess(auditId, body);

			return new Response(
				JSON.stringify({
					auditId,
					status: "started",
					timestamp: new Date().toISOString(),
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : String(error),
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	/**
	 * 9.1.5.21.12.0.0: Handle HTTP stop audit request
	 */
	private async handleStopAudit(req: Request): Promise<Response> {
		try {
			const body = await req.json();
			const { auditId } = body as any;

			if (this.activeAudits.has(auditId)) {
				this.activeAudits.delete(auditId);
				return new Response(
					JSON.stringify({
						auditId,
						status: "stopped",
					}),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return new Response(
				JSON.stringify({
					error: "Audit not found",
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				},
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : String(error),
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}
	}

	/**
	 * 9.1.5.21.13.0.0: Broadcast message to topic
	 */
	private broadcast(topic: string, data: any): void {
		if (this.server) {
			const message = JSON.stringify({
				...data,
				timestamp: new Date().toISOString(),
			});
			this.server.publish(topic, message);
		}
	}

	/**
	 * Generate unique client ID
	 */
	private generateClientId(): string {
		return `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}

	/**
	 * Generate unique audit ID
	 */
	private generateAuditId(): string {
		return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}

	/**
	 * 9.1.5.21.14.0.0: Shutdown server
	 */
	async shutdown(): Promise<void> {
		if (this.server) {
			// Close all active audits
			for (const auditId of this.activeAudits.keys()) {
				this.activeAudits.delete(auditId);
			}

			// Close all WebSocket connections
			for (const [clientId, ws] of this.clients) {
				try {
					ws.close(1000, "Server shutting down");
				} catch {
					// Connection may already be closed
				}
			}

			this.clients.clear();
			this.activeAudits.clear();

			// Shutdown orchestrator
			await this.orchestrator.shutdown();

			// Server will be stopped automatically when process exits
			this.server = null;

			console.log("👋 WebSocket Audit Server shut down");
		}
	}
}

/**
 * 9.1.5.21.15.0.0: Start standalone WebSocket audit server
 */
export function startWebSocketAuditServer(
	port: number = 3002,
	hostname: string = "localhost",
): WebSocketAuditServer {
	const server = new WebSocketAuditServer();
	server.start(port, hostname);
	return server;
}

// Standalone execution
if (import.meta.main) {
	const port = parseInt(process.env.AUDIT_WS_PORT || "3002");
	const hostname = process.env.AUDIT_WS_HOSTNAME || "localhost";

	const wsServer = new WebSocketAuditServer();
	const server = wsServer.start(port, hostname);

	// Graceful shutdown
	process.on("SIGINT", async () => {
		console.log("\n👋 Shutting down WebSocket Audit Server...");
		await wsServer.shutdown();
		process.exit(0);
	});

	process.on("SIGTERM", async () => {
		console.log("\n👋 Shutting down WebSocket Audit Server...");
		await wsServer.shutdown();
		process.exit(0);
	});
}
