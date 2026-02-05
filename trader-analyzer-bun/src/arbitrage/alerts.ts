/**
 * @fileoverview Arbitrage Alert WebSocket Server
 * @description Real-time WebSocket broadcasting for arbitrage opportunities
 * @module arbitrage/alerts
 */

import type { ArbitrageOpportunity, MarketCategory, ScanResult } from "./types";

/**
 * Alert types for WebSocket messages
 */
export type AlertType =
	| "opportunity_new" // New opportunity detected
	| "opportunity_update" // Existing opportunity updated
	| "opportunity_expired" // Opportunity no longer valid
	| "scan_complete" // Scan finished
	| "scanner_status" // Scanner started/stopped
	| "heartbeat"; // Keep-alive

/**
 * WebSocket message format
 */
export interface AlertMessage {
	type: AlertType;
	timestamp: number;
	data: unknown;
}

/**
 * Client subscription preferences
 */
export interface AlertSubscription {
	minSpread?: number;
	categories?: MarketCategory[];
	arbitrageOnly?: boolean;
}

/**
 * WebSocket client data
 */
interface ClientData {
	id: string;
	subscription: AlertSubscription;
	connectedAt: number;
}

/**
 * Extended ServerWebSocket type
 */
type AlertWebSocket = {
	data: ClientData;
	send(data: string): void;
	close(code?: number, reason?: string): void;
	subscribe(topic: string): void;
	unsubscribe(topic: string): void;
};

/**
 * ArbitrageAlertServer - Bun-native WebSocket for real-time alerts
 *
 * Features:
 * - Topic-based pub/sub (global, category-specific)
 * - Client filtering by subscription preferences
 * - Heartbeat for connection health
 */
export class ArbitrageAlertServer {
	private port: number;
	private server: ReturnType<typeof Bun.serve> | null = null;
	private clients: Map<string, AlertWebSocket> = new Map();
	private messageSeq = 0;
	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	constructor(port = 3003) {
		this.port = port;
	}

	/**
	 * Start the WebSocket server
	 */
	async start(): Promise<void> {
		this.server = Bun.serve({
			port: this.port,
			fetch: (req, server) => this.handleFetch(req, server),
			websocket: {
				open: (ws) => this.handleOpen(ws as unknown as AlertWebSocket),
				message: (ws, msg) =>
					this.handleMessage(ws as unknown as AlertWebSocket, msg),
				close: (ws) => this.handleClose(ws as unknown as AlertWebSocket),
				drain: () => {
					// Backpressure handling
				},
			},
		});

		// Start heartbeat
		this.heartbeatInterval = setInterval(() => {
			this.broadcast({
				type: "heartbeat",
				timestamp: Date.now(),
				data: { clients: this.clients.size },
			});
		}, 30000);

		console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🎯 NEXUS Arbitrage Alert Server                          ║
║  WebSocket: ws://localhost:${this.port}                            ║
╚═══════════════════════════════════════════════════════════╝
    `);
	}

	/**
	 * Stop the WebSocket server
	 */
	async stop(): Promise<void> {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}

		if (this.server) {
			this.server.stop();
			this.server = null;
		}

		this.clients.clear();
		console.log("Arbitrage Alert Server: Stopped");
	}

	/**
	 * Handle HTTP upgrade
	 */
	private handleFetch(req: Request, server: any): Response | undefined {
		const url = new URL(req.url);

		// Health check
		if (url.pathname === "/health") {
			return new Response(
				JSON.stringify({
					status: "ok",
					clients: this.clients.size,
					timestamp: Date.now(),
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// WebSocket upgrade
		if (url.pathname === "/alerts" || url.pathname === "/") {
			const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;

			const upgraded = server.upgrade(req, {
				data: {
					id: clientId,
					subscription: {},
					connectedAt: Date.now(),
				} as ClientData,
			});

			if (upgraded) {
				return undefined;
			}

			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		return new Response("Not found", { status: 404 });
	}

	/**
	 * Handle WebSocket connection open
	 */
	private handleOpen(ws: AlertWebSocket): void {
		const { id } = ws.data;

		this.clients.set(id, ws);
		ws.subscribe("global");

		// Send welcome message
		this.sendToClient(ws, {
			type: "scanner_status",
			timestamp: Date.now(),
			data: {
				connected: true,
				clientId: id,
				message: "Connected to NEXUS Arbitrage Alerts",
			},
		});

		console.log(`Alert Server: Client connected (${id})`);
	}

	/**
	 * Handle WebSocket message
	 */
	private handleMessage(ws: AlertWebSocket, msg: string | Buffer): void {
		try {
			const message = JSON.parse(msg.toString());

			if (message.type === "subscribe") {
				// Update subscription preferences
				ws.data.subscription = {
					minSpread: message.minSpread,
					categories: message.categories,
					arbitrageOnly: message.arbitrageOnly,
				};

				// Subscribe to category topics
				if (message.categories) {
					for (const category of message.categories) {
						ws.subscribe(`category:${category}`);
					}
				}

				this.sendToClient(ws, {
					type: "scanner_status",
					timestamp: Date.now(),
					data: {
						subscribed: true,
						preferences: ws.data.subscription,
					},
				});
			}
		} catch {
			// Ignore invalid messages
		}
	}

	/**
	 * Handle WebSocket close
	 */
	private handleClose(ws: AlertWebSocket): void {
		const { id } = ws.data;

		// Debug logging using native ws.subscriptions getter (Bun 1.3.2+)
		if (process.env.NODE_ENV === "development") {
			const nativeSubscriptions = (
				ws as unknown as { subscriptions: Set<string> }
			).subscriptions;
			console.log(
				`[Arbitrage Alerts] Client ${id} closing. Active subscriptions:`,
				Array.from(nativeSubscriptions || []),
			);
		}

		this.clients.delete(id);
		console.log(`Alert Server: Client disconnected (${id})`);
	}

	/**
	 * Broadcast new opportunity
	 */
	broadcastOpportunity(opportunity: ArbitrageOpportunity, isNew = true): void {
		const message: AlertMessage = {
			type: isNew ? "opportunity_new" : "opportunity_update",
			timestamp: Date.now(),
			data: opportunity,
		};

		// Broadcast to global topic
		this.broadcast(message);

		// Broadcast to category topic
		if (this.server) {
			this.server.publish(
				`category:${opportunity.event.category}`,
				JSON.stringify(message),
			);
		}
	}

	/**
	 * Broadcast expired opportunity
	 */
	broadcastExpired(opportunityId: string, reason: string): void {
		this.broadcast({
			type: "opportunity_expired",
			timestamp: Date.now(),
			data: { id: opportunityId, reason },
		});
	}

	/**
	 * Broadcast scan completion
	 */
	broadcastScanComplete(result: ScanResult): void {
		this.broadcast({
			type: "scan_complete",
			timestamp: Date.now(),
			data: {
				eventsMatched: result.meta.eventsMatched,
				opportunitiesFound: result.meta.opportunitiesFound,
				scanTime: result.meta.scanTime,
				newOpportunities: result.opportunities.length,
			},
		});
	}

	/**
	 * Broadcast scanner status change
	 */
	broadcastStatus(running: boolean, message?: string): void {
		this.broadcast({
			type: "scanner_status",
			timestamp: Date.now(),
			data: { running, message },
		});
	}

	/**
	 * Broadcast to all clients
	 */
	private broadcast(message: AlertMessage): void {
		if (!this.server) return;

		const payload = JSON.stringify({
			...message,
			seq: this.messageSeq++,
		});

		this.server.publish("global", payload);
	}

	/**
	 * Send to specific client
	 */
	private sendToClient(ws: AlertWebSocket, message: AlertMessage): void {
		ws.send(
			JSON.stringify({
				...message,
				seq: this.messageSeq++,
			}),
		);
	}

	/**
	 * Check if opportunity matches client subscription
	 * @internal Reserved for future use
	 */
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future subscription filtering
	private _matchesSubscription(
		opportunity: ArbitrageOpportunity,
		subscription: AlertSubscription,
	): boolean {
		if (
			subscription.minSpread !== undefined &&
			opportunity.spreadPercent < subscription.minSpread
		) {
			return false;
		}

		if (
			subscription.categories?.length &&
			!subscription.categories.includes(opportunity.event.category)
		) {
			return false;
		}

		if (subscription.arbitrageOnly && !opportunity.isArbitrage) {
			return false;
		}

		return true;
	}

	/**
	 * Get server status
	 */
	getStatus(): { running: boolean; port: number; clients: number } {
		return {
			running: this.server !== null,
			port: this.port,
			clients: this.clients.size,
		};
	}
}

/**
 * Create and start an alert server
 */
export async function createAlertServer(
	port?: number,
): Promise<ArbitrageAlertServer> {
	const server = new ArbitrageAlertServer(port);
	await server.start();
	return server;
}

/**
 * Global alert server instance
 */
let globalAlertServer: ArbitrageAlertServer | null = null;

export function getAlertServer(): ArbitrageAlertServer | null {
	return globalAlertServer;
}

export function setAlertServer(server: ArbitrageAlertServer | null): void {
	globalAlertServer = server;
}
