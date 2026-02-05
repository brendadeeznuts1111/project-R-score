/**
 * @fileoverview DoD Health Check Endpoint
 * @description Health check endpoint for load balancer and monitoring
 * @module api/dod-health
 */

import { Database } from "bun:sqlite";
import { DoDMultiLayerCorrelationGraph } from "../arbitrage/shadow-graph/dod-multi-layer-engine";
import type { HealthStatus } from "../arbitrage/shadow-graph/dod-multi-layer-engine";

let engineInstance: DoDMultiLayerCorrelationGraph | null = null;
let wsClients = new Set<any>();

/**
 * Initialize health check system
 */
export function initializeHealthCheck(db: Database): void {
	engineInstance = new DoDMultiLayerCorrelationGraph(db);
}

/**
 * Health check endpoint for load balancer
 */
export function healthCheck(): HealthStatus {
	if (!engineInstance) {
		return {
			status: "CRITICAL",
			timestamp: Date.now(),
			metrics: {
				dbLatency: 9999,
				openCircuits: 999,
				recentFailures: 999,
				circuitBreakers: {},
			},
			failover: true,
		};
	}

	return engineInstance.getHealthStatus();
}

/**
 * Get last successful build timestamp
 */
function getLastBuildTimestamp(): number {
	// Would query from audit log
	return Date.now() - 60000; // Placeholder
}

/**
 * Measure database latency
 */
function measureDbLatency(): number {
	if (!engineInstance) return 9999;
	const status = engineInstance.getHealthStatus();
	return status.metrics.dbLatency;
}

/**
 * Check layer failures in time window
 */
function checkLayerFailures(windowMs: number): number {
	// Would query audit log for failures in window
	return 0; // Placeholder
}

/**
 * Register WebSocket client for health monitoring
 */
export function registerHealthClient(ws: any): void {
	wsClients.add(ws);
}

/**
 * Unregister WebSocket client
 */
export function unregisterHealthClient(ws: any): void {
	wsClients.delete(ws);
}

/**
 * Broadcast health status to all connected clients
 */
export function broadcastHealthStatus(status: HealthStatus): void {
	const message = JSON.stringify({
		type: "health_status",
		data: status,
	});

	for (const client of wsClients) {
		try {
			client.send(message);
		} catch (e) {
			// Client disconnected, remove it
			wsClients.delete(client);
		}
	}
}
