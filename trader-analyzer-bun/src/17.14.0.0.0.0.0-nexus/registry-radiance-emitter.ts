/**
 * @fileoverview Registry Radiance Emitter
 * @description 17.14.0.0.0.0.0 - Publishes all registry events to Radiance channels
 * @module 17.14.0.0.0.0.0-nexus/registry-radiance-emitter
 *
 * **Every registry change, drift, discovery, or failure pulses through Radiance.**
 */

import type { Bun } from "bun";
import type { RegistryStatus } from "../../api/registry";
import type { RegistryMetadata } from "./registry-of-registries";

/**
 * Registry event types
 */
export type RegistryEventType =
	| "REGISTRY_HEALTH_CHANGE"
	| "REGISTRY_SCHEMA_DRIFT"
	| "REGISTRY_ITEM_ADDED"
	| "REGISTRY_ITEM_REMOVED"
	| "REGISTRY_ITEM_UPDATED"
	| "REGISTRY_VERSION_CHANGE"
	| "REGISTRY_DISCOVERY"
	| "REGISTRY_FAILURE"
	| "REGISTRY_RECOVERED";

/**
 * Registry event payload
 */
export interface RegistryEvent {
	type: RegistryEventType;
	registry: string;
	timestamp: number;
	severity: "critical" | "high" | "warn" | "info";
	channel: string;
	data: {
		healthy?: boolean;
		previous?: RegistryStatus;
		current?: RegistryStatus;
		itemId?: string;
		itemName?: string;
		version?: string;
		previousVersion?: string;
		discovery?: {
			type: string;
			details: Record<string, unknown>;
		};
		error?: {
			message: string;
			code?: string;
			stack?: string;
		};
		metadata?: Record<string, unknown>;
	};
}

/**
 * Radiance server reference
 * Set by the main server during initialization
 */
let radianceServer: ReturnType<typeof Bun.serve> | null = null;

/**
 * Set the Radiance WebSocket server instance
 */
export function setRadianceServer(server: ReturnType<typeof Bun.serve>): void {
	radianceServer = server;
}

/**
 * Get the Radiance WebSocket server instance
 */
export function getRadianceServer(): ReturnType<typeof Bun.serve> | null {
	return radianceServer;
}

/**
 * Map severity to radiance channel
 */
function getRadianceChannel(severity: RegistryEvent["severity"]): string {
	switch (severity) {
		case "critical":
			return "radiance-critical";
		case "high":
			return "radiance-high";
		case "warn":
			return "radiance-warn";
		case "info":
			return "radiance-info";
		default:
			return "radiance-info";
	}
}

/**
 * Emit registry event to Radiance
 */
export function emitRegistryEvent(event: RegistryEvent): void {
	if (!radianceServer) {
		console.warn(
			"[17.14.0] Radiance server not initialized, cannot emit registry event:",
			event.type,
		);
		return;
	}

	const channel = getRadianceChannel(event.severity);
	const registryChannel = event.channel || `radiance-registry`;

	const payload = JSON.stringify({
		type: "RADIANCE_PUBLISH",
		event: "REGISTRY_EVENT",
		payload: event,
		timestamp: Date.now(),
	});

	// Publish to severity channel
	const severityResult = radianceServer.publish(channel, payload, false);
	
	// Also publish to registry-specific channel
	const registryResult = radianceServer.publish(registryChannel, payload, false);

	// Publish to all channel for full firehose
	radianceServer.publish("radiance-all", payload, false);

	if (severityResult === 0 && registryResult === 0) {
		console.warn(
			`[17.14.0] Registry event dropped (no subscribers): ${event.type} for ${event.registry}`,
		);
	}
}

/**
 * Emit registry health change event
 */
export function emitHealthChange(
	registry: RegistryMetadata,
	healthy: boolean,
	previous?: RegistryStatus,
): void {
	emitRegistryEvent({
		type: "REGISTRY_HEALTH_CHANGE",
		registry: registry.id,
		timestamp: Date.now(),
		severity: registry.radianceSeverity,
		channel: registry.radianceChannel,
		data: {
			healthy,
			previous,
			current: healthy ? "healthy" : "degraded",
		},
	});
}

/**
 * Emit registry schema drift event
 */
export function emitSchemaDrift(
	registry: RegistryMetadata,
	driftDetails: {
		property: string;
		expected: unknown;
		actual: unknown;
	},
): void {
	emitRegistryEvent({
		type: "REGISTRY_SCHEMA_DRIFT",
		registry: registry.id,
		timestamp: Date.now(),
		severity: "critical",
		channel: registry.radianceChannel,
		data: {
			discovery: {
				type: "schema_drift",
				details: driftDetails,
			},
		},
	});
}

/**
 * Emit registry item added event
 */
export function emitItemAdded(
	registry: RegistryMetadata,
	itemId: string,
	itemName: string,
): void {
	emitRegistryEvent({
		type: "REGISTRY_ITEM_ADDED",
		registry: registry.id,
		timestamp: Date.now(),
		severity: registry.radianceSeverity,
		channel: registry.radianceChannel,
		data: {
			itemId,
			itemName,
		},
	});
}

/**
 * Emit registry discovery event
 */
export function emitDiscovery(
	registry: RegistryMetadata,
	discoveryType: string,
	details: Record<string, unknown>,
): void {
	emitRegistryEvent({
		type: "REGISTRY_DISCOVERY",
		registry: registry.id,
		timestamp: Date.now(),
		severity: registry.radianceSeverity,
		channel: registry.radianceChannel,
		data: {
			discovery: {
				type: discoveryType,
				details,
			},
		},
	});
}

/**
 * Emit registry failure event
 */
export function emitFailure(
	registry: RegistryMetadata,
	error: Error,
	code?: string,
): void {
	emitRegistryEvent({
		type: "REGISTRY_FAILURE",
		registry: registry.id,
		timestamp: Date.now(),
		severity: "critical",
		channel: registry.radianceChannel,
		data: {
			error: {
				message: error.message,
				code,
				stack: error.stack,
			},
		},
	});
}

/**
 * Emit registry recovery event
 */
export function emitRecovery(registry: RegistryMetadata): void {
	emitRegistryEvent({
		type: "REGISTRY_RECOVERED",
		registry: registry.id,
		timestamp: Date.now(),
		severity: registry.radianceSeverity,
		channel: registry.radianceChannel,
		data: {
			healthy: true,
		},
	});
}
