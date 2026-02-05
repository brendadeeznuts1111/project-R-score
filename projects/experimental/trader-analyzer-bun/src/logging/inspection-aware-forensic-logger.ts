/**
 * @fileoverview 9.1.5.28.0.0.0: Inspection-Aware Forensic Logger
 * @description Forensic logger with advanced Bun.inspect integration for debugging
 * @module logging/inspection-aware-forensic-logger
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.24.0.0.0 → Forensic Binary Data
 * - @see src/logging/forensic-movement-logger.ts → Base Forensic Logger
 * - @see src/logging/corrected-forensic-logger.ts → Corrected Forensic Logger
 */

import { CorrectedForensicLogger } from "./corrected-forensic-logger";
import type { ForensicLoggerConfig } from "./forensic-movement-logger";
import { ForensicBinaryData } from "../forensics/inspectable-forensic-data";
import type { RuntimeSecurityMonitor } from "../security/runtime-monitor";

/**
 * 9.1.5.28.0.0.0: Inspection-Aware Forensic Logger
 *
 * Extends CorrectedForensicLogger with advanced Bun.inspect integration
 * for immediate debugging and forensic data inspection.
 */
export class InspectionAwareForensicLogger extends CorrectedForensicLogger {
	private readonly forensicCache = new Map<number, ForensicBinaryData>();

	constructor(
		config: ForensicLoggerConfig,
		options?: {
			maliciousDetector?: {
				validateBookmakerRequest: (
					url: string,
					bookmaker: string,
				) => Promise<{ allowed: boolean; reason?: string }>;
			};
			securityMonitor?: RuntimeSecurityMonitor;
		},
	) {
		super(config, options);
	}

	/**
	 * 9.1.5.28.1.0.0: Log movement with inspectable wrapper
	 *
	 * Creates inspectable binary data wrapper for immediate debugging.
	 */
	async logMovement(movement: any): Promise<void> {
		// Serialize movement data
		const serialized = await this.serializeMovement(movement);

		// Create inspectable wrapper for immediate debugging
		const binaryData = new ForensicBinaryData(serialized, {
			auditId: movement.auditId || Date.now(),
			bookmaker: movement.bookmaker || "unknown",
			eventId: movement.eventId || "unknown",
			captureTimestamp: movement.move_timestamp || Date.now(),
			urlSignature: Bun.hash(movement.raw_url || "").toString(36),
			threatLevel:
				(movement.threat_level as "none" | "suspicious" | "malicious") ||
				"none",
		});

		// Log to console in development for immediate inspection
		if (process.env.NODE_ENV === "development") {
			console.log(
				"🔍 Forensic Data:",
				Bun.inspect(binaryData, { colors: true, depth: 2 }),
			);
		}

		// Store in cache for quick access
		if (movement.auditId) {
			this.forensicCache.set(movement.auditId, binaryData);
		}

		// Continue with normal logging via logApiCall
		if (movement.bookmaker && movement.eventId && movement.url) {
			this.logApiCall({
				bookmaker: movement.bookmaker,
				eventId: movement.eventId,
				url: movement.url,
				status: movement.status,
				size: movement.size,
			});
		}
		return Promise.resolve();
	}

	/**
	 * 9.1.5.28.2.0.0: Quick inspection method for debugging
	 *
	 * Returns formatted inspection string for a specific audit ID.
	 */
	inspectLastMovement(auditId: number): string {
		const binary = this.forensicCache.get(auditId);
		return binary
			? Bun.inspect(binary, { colors: true, depth: 2 })
			: "Not found";
	}

	/**
	 * Serialize movement data to Uint8Array
	 */
	private async serializeMovement(movement: any): Promise<Uint8Array> {
		const json = JSON.stringify(movement);
		return new TextEncoder().encode(json);
	}

	/**
	 * Clear forensic cache
	 */
	clearCache(): void {
		this.forensicCache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; auditIds: number[] } {
		return {
			size: this.forensicCache.size,
			auditIds: Array.from(this.forensicCache.keys()),
		};
	}
}
