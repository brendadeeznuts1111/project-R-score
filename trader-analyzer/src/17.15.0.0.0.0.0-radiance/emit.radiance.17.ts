/**
 * @fileoverview Radiance Event Emitter v17
 * @description 17.15.0.0.0.0.0 - Versioned radiance event emission functions
 * @module 17.15.0.0.0.0.0-radiance/emit.radiance.17
 *
 * **All radiance events now use the 17.15 naming convention.**
 */

import { getRadianceServer } from "../17.14.0.0.0.0.0-nexus/registry-radiance-emitter";
import type { RadianceCategory } from "./types.radiance.17";

/**
 * Radiance Event Types v17
 */
export type RadianceEventType17 =
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
 * Radiance Event Payload v17
 */
export interface RadianceEvent17 {
	type: RadianceEventType17;
	registry: string;
	timestamp: number;
	severity: "critical" | "high" | "warn" | "info";
	channel: `radiance-${RadianceCategory}`;
	data: {
		healthy?: boolean;
		previous?: string;
		current?: string;
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
 * Map severity to radiance channel v17
 */
function getRadianceChannelFromSeverity17(severity: RadianceEvent17["severity"]): string {
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
 * Emit Radiance Event v17
 */
export function emitRadianceEvent17(event: RadianceEvent17): void {
	const server = getRadianceServer();
	if (!server) {
		console.warn(
			"[17.15.0] Radiance server not initialized, cannot emit event:",
			event.type,
		);
		return;
	}

	const severityChannel = getRadianceChannelFromSeverity17(event.severity);
	const registryChannel = event.channel || `radiance-registry`;

	const payload = JSON.stringify({
		type: "RADIANCE_PUBLISH",
		event: "REGISTRY_EVENT_17",
		payload: {
			...event,
			version: "17.15.0",
		},
		timestamp: Date.now(),
	});

	// Publish to severity channel
	const severityResult = server.publish(severityChannel, payload, false);
	
	// Also publish to registry-specific channel
	const registryResult = server.publish(registryChannel, payload, false);

	// Publish to all channel for full firehose
	server.publish("radiance-all", payload, false);

	if (severityResult === 0 && registryResult === 0) {
		console.warn(
			`[17.15.0] Radiance event dropped (no subscribers): ${event.type} for ${event.registry}`,
		);
	}
}

/**
 * Emit Radiance Schema Drift v17
 */
export function emitRadianceSchemaDrift17(
	registry: string,
	channel: `radiance-${RadianceCategory}`,
	driftDetails: {
		property: string;
		expected: unknown;
		actual: unknown;
	},
): void {
	emitRadianceEvent17({
		type: "REGISTRY_SCHEMA_DRIFT",
		registry,
		timestamp: Date.now(),
		severity: "critical",
		channel,
		data: {
			discovery: {
				type: "schema_drift",
				details: driftDetails,
			},
		},
	});
}

/**
 * Emit Radiance Discovery v17
 */
export function emitRadianceDiscovery17(
	registry: string,
	channel: `radiance-${RadianceCategory}`,
	discoveryType: string,
	details: Record<string, unknown>,
	severity: RadianceEvent17["severity"] = "info",
): void {
	emitRadianceEvent17({
		type: "REGISTRY_DISCOVERY",
		registry,
		timestamp: Date.now(),
		severity,
		channel,
		data: {
			discovery: {
				type: discoveryType,
				details,
			},
		},
	});
}

/**
 * Emit Radiance Failure v17
 */
export function emitRadianceFailure17(
	registry: string,
	channel: `radiance-${RadianceCategory}`,
	error: Error,
	code?: string,
): void {
	emitRadianceEvent17({
		type: "REGISTRY_FAILURE",
		registry,
		timestamp: Date.now(),
		severity: "critical",
		channel,
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
 * Emit Radiance Recovery v17
 */
export function emitRadianceRecovery17(
	registry: string,
	channel: `radiance-${RadianceCategory}`,
): void {
	emitRadianceEvent17({
		type: "REGISTRY_RECOVERED",
		registry,
		timestamp: Date.now(),
		severity: "info",
		channel,
		data: {
			healthy: true,
		},
	});
}

/**
 * Emit Radiance Health Change v17
 */
export function emitRadianceHealthChange17(
	registry: string,
	channel: `radiance-${RadianceCategory}`,
	healthy: boolean,
	previous?: string,
): void {
	emitRadianceEvent17({
		type: "REGISTRY_HEALTH_CHANGE",
		registry,
		timestamp: Date.now(),
		severity: healthy ? "info" : "high",
		channel,
		data: {
			healthy,
			previous,
			current: healthy ? "healthy" : "degraded",
		},
	});
}
