#!/usr/bin/env bun
/**
 * @fileoverview 8.2.5.6.0.0.0: UI Policy Metrics WebSocket Handler
 * @description WebSocket handler for real-time UI policy metrics updates
 * @module src/api/ui-policy-ws
 *
 * Version: 8.0.0.0.0.0.0
 * Ripgrep Pattern: 8\.0\.0\.0\.0\.0\.0|UI-POLICY-WS|ui-policy-ws
 *
 * @see {@link ../docs/BUN-LATEST-BREAKING-CHANGES.md|Bun Latest Breaking Changes}
 */

import type { ServerWebSocket } from "bun";
import { policyMetrics } from "../services/ui-policy-metrics";
import type { MetricEvent } from "../services/ui-policy-metrics";

/**
 * UI Policy Metrics WebSocket data type
 */
interface UIPolicyMetricsWebSocketData {
	connectedAt: number;
	path: string;
	unsubscribe?: () => void;
	subscribedTypes?: string[];
}

/**
 * 8.2.5.6.0.0.0: Handle UI Policy Metrics WebSocket connection
 *
 * @param request - WebSocket upgrade request
 * @param server - Bun server instance (typed with generic)
 * @returns WebSocket upgrade response or null
 *
 * @see {@link ../docs/BUN-LATEST-BREAKING-CHANGES.md|Bun.serve() TypeScript Types}
 */
export function handleUIPolicyMetricsWebSocket<
	T extends { path?: string; connectedAt?: number },
>(request: Request, server: Bun.Server<T>): Response | null {
	const url = new URL(request.url);

	// Only handle UI policy metrics WebSocket path
	if (url.pathname !== "/ws/ui-policy-metrics") {
		return null;
	}

	// Upgrade to WebSocket
	const upgrade = server.upgrade(request, {
		data: {
			connectedAt: Date.now(),
			path: url.pathname, // Store path for routing
		},
	});

	if (!upgrade) {
		return new Response("WebSocket upgrade failed", { status: 500 });
	}

	return undefined; // Let Bun handle the upgrade
}

/**
 * 8.2.5.6.0.0.0: Handle WebSocket open event
 *
 * @param ws - WebSocket instance with typed data
 */
export function handleUIPolicyMetricsWebSocketOpen(
	ws: ServerWebSocket<UIPolicyMetricsWebSocketData>,
): void {
	console.log("[UI Policy Metrics WS] Client connected");

	// Subscribe to metrics updates
	const unsubscribe = policyMetrics.subscribe((event: MetricEvent) => {
		if (ws.readyState === WebSocket.OPEN) {
			try {
				ws.send(
					JSON.stringify({
						type: "metric",
						data: event,
					}),
				);
			} catch (error) {
				console.error("[UI Policy Metrics WS] Send error:", error);
			}
		}
	});

	// Store unsubscribe function in WebSocket data
	ws.data.unsubscribe = unsubscribe;

	// Send initial summary
	try {
		ws.send(
			JSON.stringify({
				type: "summary",
				data: policyMetrics.getSummary("hour"),
			}),
		);
	} catch (error) {
		console.error("[UI Policy Metrics WS] Initial summary error:", error);
	}
}

/**
 * 8.2.5.6.0.0.0: Handle WebSocket message event
 *
 * @param ws - WebSocket instance with typed data
 * @param message - WebSocket message (string or Buffer)
 */
export function handleUIPolicyMetricsWebSocketMessage(
	ws: ServerWebSocket<UIPolicyMetricsWebSocketData>,
	message: string | Buffer,
): void {
	try {
		const data =
			typeof message === "string"
				? JSON.parse(message)
				: JSON.parse(message.toString());

		if (data.type === "subscribe") {
			// Client wants to subscribe to specific event types
			ws.data.subscribedTypes = data.eventTypes || ["all"];
		} else if (data.type === "get_summary") {
			// Client requests summary
			const window = data.window || "hour";
			ws.send(
				JSON.stringify({
					type: "summary",
					data: policyMetrics.getSummary(window),
				}),
			);
		}
	} catch (error) {
		console.error("[UI Policy Metrics WS] Message handling error:", error);
	}
}

/**
 * 8.2.5.6.0.0.0: Handle WebSocket close event
 *
 * @param ws - WebSocket instance with typed data
 */
export function handleUIPolicyMetricsWebSocketClose(
	ws: ServerWebSocket<UIPolicyMetricsWebSocketData>,
): void {
	console.log("[UI Policy Metrics WS] Client disconnected");

	// Unsubscribe from metrics updates
	if (ws.data?.unsubscribe) {
		ws.data.unsubscribe();
	}
}
