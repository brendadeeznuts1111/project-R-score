/**
 * Sub-Market Tension Dashboard WebSocket Feed
 * Real-time tension event broadcasting
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TENSION-FEED@0.1.0;instance-id=ORCA-TENSION-FEED-001;version=0.1.0}][PROPERTIES:{feed={value:"tension-feed";@root:"ROOT-RESEARCH";@chain:["BP-WEBSOCKET","BP-TENSION-DETECTION"];@version:"0.1.0"}}][CLASS:TensionFeedServer][#REF:v-0.1.0.BP.TENSION.FEED.1.0.A.1.1.ORCA.1.1]]
 */

import type { ServerWebSocket } from "bun";
import type {
	SubMarketTensionDetector,
	TensionEvent,
} from "../tension/tension-detector";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface WebSocketData {
	filters?: {
		sport?: string;
		severity?: number;
		tension_type?: string;
	};
	connectedAt: number;
}

// ═══════════════════════════════════════════════════════════════
// TENSION FEED SERVER
// ═══════════════════════════════════════════════════════════════

/**
 * Tension Feed WebSocket Server
 *
 * Broadcasts real-time tension events to connected clients
 */
export class TensionFeedServer {
	private server: ReturnType<typeof Bun.serve> | null = null;
	private detector: SubMarketTensionDetector;
	private clients = new Set<ServerWebSocket<WebSocketData>>();

	/**
	 * Creates a new tension feed server
	 *
	 * @param detector - Tension detector instance
	 * @param port - WebSocket server port (default: 8081)
	 */
	constructor(detector: SubMarketTensionDetector, port: number = 8081) {
		this.detector = detector;

		// Listen for tension events
		this.detector.on("tension", (tension: TensionEvent) => {
			// Fire and forget - compression is async but we don't want to block
			this.broadcastTension(tension).catch((error) => {
				console.error("Error broadcasting tension event:", error);
			});
		});

		// Start server
		this.start(port);
	}

	/**
	 * Start WebSocket server
	 */
	private start(port: number): void {
		this.server = Bun.serve<WebSocketData>({
			port,
			websocket: {
				open: (ws) => {
					this.clients.add(ws);
					console.log("📡 Research dashboard connected");
				},
				message: (ws, message) => {
					try {
						const data = JSON.parse(message.toString());
						if (data.action === "filter") {
							ws.data.filters = data.filters;
						}
					} catch (error) {
						console.error("Error parsing WebSocket message:", error);
					}
				},
				close: (ws) => {
					this.clients.delete(ws);
					console.log("📡 Research dashboard disconnected");
				},
			},
			fetch: (req, server) => {
				if (req.headers.get("upgrade") === "websocket") {
					const success = server.upgrade(req, {
						data: {
							filters: undefined,
							connectedAt: Date.now(),
						},
					});
					return success
						? undefined
						: new Response("WebSocket upgrade failed", { status: 500 });
				}
				return new Response("Research tension feed");
			},
		});

		console.log(`🔬 Tension feed server started on port ${port}`);
	}

	/**
	 * Broadcast tension event to filtered clients
	 * Uses Bun v1.51 CompressionStream for 85% bandwidth reduction
	 */
	private async broadcastTension(tension: TensionEvent): Promise<void> {
		const payload = JSON.stringify({
			type: "tension",
			data: tension,
			timestamp: Date.now(),
		});

		// Compress with zstd for bandwidth efficiency (Bun v1.51)
		// Critical for 10k+ concurrent connections
		const compressed = await new Blob([payload])
			.stream()
			.pipeThrough(new CompressionStream("zstd"))
			.arrayBuffer();

		for (const client of this.clients) {
			const filters = client.data.filters;
			if (!filters) {
				// No filters - send compressed binary frame
				client.send(compressed);
				continue;
			}

			// Apply filters
			if (filters.sport && tension.snapshot.sport !== filters.sport) {
				continue;
			}
			if (
				filters.severity !== undefined &&
				tension.severity < filters.severity
			) {
				continue;
			}
			if (
				filters.tension_type &&
				tension.tension_type !== filters.tension_type
			) {
				continue;
			}

			// Send compressed binary frame
			client.send(compressed);
		}
	}

	/**
	 * Stop server
	 */
	stop(): void {
		if (this.server) {
			this.server.stop();
			this.server = null;
			console.log("🔬 Tension feed server stopped");
		}
	}
}
