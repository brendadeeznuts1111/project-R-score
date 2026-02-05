/**
 * @fileoverview 9.1.5.29.0.0.0: Inspection-Aware Security Monitor
 * @description Security monitor with advanced Bun.inspect integration for threat analysis
 * @module security/inspection-aware-security-monitor
 *
 * Cross-Reference Hub:
 * - @see 9.1.5.25.0.0.0 → Inspectable Security Threat
 * - @see src/security/runtime-monitor.ts → Runtime Security Monitor
 */

import { RuntimeSecurityMonitor } from "./runtime-monitor";
import { InspectableSecurityThreat } from "./inspectable-security-event";

/**
 * 9.1.5.29.0.0.0: Inspection-Aware Security Monitor
 *
 * Extends RuntimeSecurityMonitor with advanced Bun.inspect integration
 * for immediate threat analysis and debugging.
 */
export class InspectionAwareSecurityMonitor extends RuntimeSecurityMonitor {
	constructor(dbPath?: string) {
		super(dbPath);
	}

	/**
	 * 9.1.5.29.1.0.0: Handle threat detection with inspection
	 *
	 * Creates inspectable threat wrapper for immediate analysis.
	 */
	onThreatDetected(threat: any): void {
		// Create inspectable threat for immediate analysis
		const inspectable = new InspectableSecurityThreat(
			new TextEncoder().encode(
				JSON.stringify(threat.context || {}).slice(0, 2048),
			),
			{
				threatId: threat.id || `threat-${Date.now()}`,
				threatType: threat.type || "unknown",
				severity: threat.severity || 0,
				context: threat.context || {},
				detectedAt: threat.detectedAt || Date.now(),
				bookmaker: threat.bookmaker,
				url: threat.url,
			},
		);

		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.log(
				"🚨 Security Threat:",
				Bun.inspect(inspectable, { colors: true, depth: 2 }),
			);
		}

		// Record threat via triggerThreatAlert (private method, so we'll use a workaround)
		// In production, this would be called through the parent class's public API
		// For now, we'll just log it since triggerThreatAlert is private
		const threatId = threat.id || `threat-${Date.now()}`;
		const threatType = threat.type || "unknown";
		const severity = threat.severity || 0;

		// Log threat (parent class will handle database storage via its own methods)
		console.error(
			`🚨 Security Threat Detected: ${threatType} (Severity: ${severity})`,
		);
	}
}
