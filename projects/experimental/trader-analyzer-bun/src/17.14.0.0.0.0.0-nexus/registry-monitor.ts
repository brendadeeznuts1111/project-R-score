/**
 * @fileoverview Registry Monitor
 * @description 17.14.0.0.0.0.0 - Real-time registry health monitoring loop
 * @module 17.14.0.0.0.0.0-nexus/registry-monitor
 *
 * **The Registry Breathes. Every 8 seconds, it checks its pulse.**
 */

import type { RegistryStatus } from "../../api/registry";
import {
    NEXUS_REGISTRY_OF_REGISTRIES
} from "./registry-of-registries";
import {
    emitFailure,
    emitHealthChange,
    emitRecovery,
    setRadianceServer,
} from "./registry-radiance-emitter";

/**
 * Health check cache entry
 */
interface HealthCacheEntry {
	healthy: boolean;
	checkedAt: number;
	status: RegistryStatus;
	consecutiveFailures: number;
	lastError?: Error;
}

/**
 * Registry health cache
 */
const registryHealthCache = new Map<string, HealthCacheEntry>();

/**
 * Monitoring interval (8 seconds as specified)
 */
const MONITORING_INTERVAL_MS = 8000;

/**
 * Failure threshold (3 consecutive failures = degraded)
 */
const FAILURE_THRESHOLD = 3;

/**
 * Monitor instance
 */
let monitorInterval: Timer | null = null;
let isMonitoring = false;

/**
 * Initialize registry monitoring
 */
export function startRegistryMonitoring(
	radianceServer: ReturnType<typeof Bun.serve>,
): void {
	if (isMonitoring) {
		console.warn("[17.14.0] Registry monitoring already started");
		return;
	}

	setRadianceServer(radianceServer);
	isMonitoring = true;

	console.log("[17.14.0] Starting NEXUS Registry System monitoring...");
	console.log(
		`[17.14.0] Monitoring ${Object.keys(NEXUS_REGISTRY_OF_REGISTRIES).length} registries every ${MONITORING_INTERVAL_MS}ms`,
	);

	// Initial health check
	performHealthCheck();

	// Start monitoring loop
	monitorInterval = setInterval(() => {
		performHealthCheck();
	}, MONITORING_INTERVAL_MS);
}

/**
 * Stop registry monitoring
 */
export function stopRegistryMonitoring(): void {
	if (monitorInterval) {
		clearInterval(monitorInterval);
		monitorInterval = null;
	}
	isMonitoring = false;
	console.log("[17.14.0] Registry monitoring stopped");
}

/**
 * Perform health check on all real-time registries
 */
async function performHealthCheck(): Promise<void> {
	const realtimeRegistries = Object.values(NEXUS_REGISTRY_OF_REGISTRIES).filter(
		(reg) => reg.realtime,
	);

	// Check all registries in parallel
	const checks = realtimeRegistries.map(async (registry) => {
		try {
			const startTime = Date.now();
			const healthy = await registry.healthCheck();
			const duration = Date.now() - startTime;

			const previous = registryHealthCache.get(registry.id);
			const consecutiveFailures = healthy
				? 0
				: (previous?.consecutiveFailures || 0) + 1;

			const status: RegistryStatus = healthy
				? "healthy"
				: consecutiveFailures >= FAILURE_THRESHOLD
					? "degraded"
					: "healthy"; // Still healthy if < threshold

			// Update cache
			registryHealthCache.set(registry.id, {
				healthy,
				checkedAt: Date.now(),
				status,
				consecutiveFailures,
			});

			// Emit event if status changed
			if (previous?.status !== status) {
				if (previous?.status === "degraded" && status === "healthy") {
					emitRecovery(registry);
				} else {
					emitHealthChange(registry, healthy, previous?.status);
				}
			}

			// Update registry metadata
			registry.lastStatus = status;
			registry.lastChecked = Date.now();

			if (duration > 1000) {
				console.warn(
					`[17.14.0] Registry ${registry.id} health check took ${duration}ms (slow)`,
				);
			}
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			const previous = registryHealthCache.get(registry.id);
			const consecutiveFailures = (previous?.consecutiveFailures || 0) + 1;

			registryHealthCache.set(registry.id, {
				healthy: false,
				checkedAt: Date.now(),
				status: consecutiveFailures >= FAILURE_THRESHOLD ? "degraded" : "healthy",
				consecutiveFailures,
				lastError: err,
			});

			emitFailure(registry, err, "HEALTH_CHECK_FAILED");
		}
	});

	await Promise.all(checks);
}

/**
 * Get registry health status
 */
export function getRegistryHealth(id: string): HealthCacheEntry | undefined {
	return registryHealthCache.get(id);
}

/**
 * Get all registry health statuses
 */
export function getAllRegistryHealth(): Map<string, HealthCacheEntry> {
	return new Map(registryHealthCache);
}

/**
 * Get monitoring status
 */
export function isMonitoringActive(): boolean {
	return isMonitoring;
}
