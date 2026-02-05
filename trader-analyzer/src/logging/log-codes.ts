/**
 * @fileoverview Log Code Registry (16.3.2.0.0.0.0)
 * @description Centralized log code definitions with metadata
 * @version 16.3.2.0.0.0.0
 * @module logging/log-codes
 * @see docs/logging/log-codes.md
 *
 * Central registry of all log codes used throughout Hyper-Bun.
 * Each code includes expected level, summary, and resolution guidance.
 */

import { StandardizedLogLevel } from "./levels";

/**
 * Log code definition
 */
export interface LogCodeDefinition {
	code: string;
	expectedLevel: StandardizedLogLevel;
	summary: string;
	context?: string;
	commonCauses?: string[];
	resolutionSteps?: string[];
	crossReference?: string;
}

/**
 * Log code registry
 * 
 * Maps log codes to their definitions for validation and documentation
 * 
 * @version 16.3.2.0.0.0.0
 */
export const LOG_CODES: Record<string, LogCodeDefinition> = {
	// Circuit Breaker Subsystem (HBCB)
	"HBCB-001": {
		code: "HBCB-001",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Circuit breaker successfully recovered from tripped state",
		context: "Emitted when recordSuccess() is called after a circuit breaker was previously tripped",
		commonCauses: ["Bookmaker API recovered", "Manual reset followed by successful call"],
		resolutionSteps: [
			"Verify bookmaker API is responding normally",
			"Check circuit_breaker_tripped metric returns to 0",
			"Monitor for recurring trips",
		],
		crossReference: "12.2.4.0.0.0.0",
	},
	"HBCB-002": {
		code: "HBCB-002",
		expectedLevel: StandardizedLogLevel.ERROR,
		summary: "Circuit breaker tripped after threshold exceeded",
		context: "Emitted when failureCount >= failureThreshold in recordFailure()",
		commonCauses: [
			"Bookmaker API experiencing outages",
			"Network connectivity issues",
			"Rate limiting from bookmaker",
		],
		resolutionSteps: [
			"Check bookmaker status page/API health",
			"Verify network connectivity",
			"Review recent failures: breaker.status('bookmaker')",
			"Consider manual reset if issue resolved",
		],
		crossReference: "12.2.2.0.0.0.0",
	},
	"HBCB-003": {
		code: "HBCB-003",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Request rejected due to tripped circuit breaker",
		context: "Emitted in callApi() when circuit breaker is tripped",
		commonCauses: ["Circuit breaker is in tripped state"],
		resolutionSteps: [
			"Check circuit breaker status: breaker.status('bookmaker')",
			"Wait for reset timeout or manually reset if appropriate",
			"Investigate root cause of original trip",
		],
		crossReference: "12.1.2.1.0.0.0.0",
	},
	"HBCB-004": {
		code: "HBCB-004",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Request rejected due to load shedding",
		context: "Emitted in callApi() when system load exceeds threshold",
		commonCauses: [
			"System under extreme load",
			"High concurrent request volume",
			"Resource exhaustion",
		],
		resolutionSteps: [
			"Check system metrics",
			"Review active requests",
			"Scale horizontally if load is legitimate",
		],
		crossReference: "12.1.2.2.0.0.0.0",
	},
	"HBCB-005": {
		code: "HBCB-005",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Circuit breaker manually reset",
		context: "Emitted in reset() method after successful reset",
		commonCauses: ["Manual operator intervention"],
		resolutionSteps: ["Monitor for recurring trips after reset"],
		crossReference: "12.4.1.0.0.0.0",
	},
	"HBCB-006": {
		code: "HBCB-006",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Circuit breaker manually tripped",
		context: "Emitted in trip() method for scheduled maintenance",
		commonCauses: ["Scheduled maintenance", "Emergency bookmaker API shutdown"],
		resolutionSteps: [
			"Verify maintenance window completion",
			"Reset when ready: breaker.reset('bookmaker')",
		],
		crossReference: "12.4.2.0.0.0.0",
	},
	"HBCB-007": {
		code: "HBCB-007",
		expectedLevel: StandardizedLogLevel.ERROR,
		summary: "Failed to send circuit breaker alert",
		context: "Emitted when alert callback fails",
		commonCauses: ["Alert service unavailable", "Network issues"],
		resolutionSteps: ["Check alert service connectivity", "Review alert callback configuration"],
		crossReference: "12.2.2.0.0.0.0",
	},

	// Performance & Anomaly Trend Analysis (HBPD)
	"HBPD-001": {
		code: "HBPD-001",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "SPC Alert detected - performance metric exceeds control limits",
		context: "Emitted when Statistical Process Control rules detect anomaly (severity >= 2)",
		commonCauses: [
			"Performance degradation",
			"System resource exhaustion",
			"External API slowdowns",
		],
		resolutionSteps: [
			"Check metric baseline: perf.spc('metric_name')",
			"Review recent samples: perf.trends('metric_name', 24)",
			"Investigate root cause",
		],
		crossReference: "12.1.2.0.0.0.0",
	},
	"HBPD-002": {
		code: "HBPD-002",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Performance data cleanup completed",
		context: "Emitted when old performance samples are cleaned up",
		commonCauses: ["Scheduled maintenance", "Retention policy"],
		resolutionSteps: ["Normal operation, no action needed"],
		crossReference: "12.1.1.0.0.0.0",
	},

	// Anomaly Prediction (HBAP)
	"HBAP-001": {
		code: "HBAP-001",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Anomaly prediction evaluated with actual results",
		context: "Emitted when prediction accuracy is evaluated",
		commonCauses: ["Prediction evaluation cycle"],
		resolutionSteps: ["Review prediction error to improve model accuracy"],
		crossReference: "12.2.1.0.0.0.0",
	},

	// Performance Monitoring (HBPERF)
	"HBPERF-001": {
		code: "HBPERF-001",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Slow response detected from bookmaker API",
		context: "Emitted when API response time exceeds threshold",
		commonCauses: [
			"Bookmaker API experiencing high load",
			"Network latency issues",
			"Large data payload",
			"Rate limiting delays",
		],
		resolutionSteps: [
			"Check bookmaker API status page",
			"Review network connectivity",
			"Consider implementing request batching",
			"Monitor for recurring slow responses",
		],
		crossReference: "12.0.0.0.0.0.0",
	},

	// Market Offerings (HBMO)
	"HBMO-001": {
		code: "HBMO-001",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Processing market offerings for bookmaker",
		context: "Emitted when starting to process market offerings for a specific bookmaker",
		commonCauses: ["Normal operation", "Scheduled market data refresh"],
		resolutionSteps: ["Normal operation, no action needed"],
		crossReference: "1.3.3.1.0.0.0",
	},
	"HBMO-002": {
		code: "HBMO-002",
		expectedLevel: StandardizedLogLevel.ERROR,
		summary: "Failed to process market offerings from bookmaker",
		context: "Emitted when market offering processing fails",
		commonCauses: [
			"Bookmaker API unavailable",
			"Network connectivity issues",
			"Invalid bookmaker configuration",
			"Rate limiting from bookmaker",
		],
		resolutionSteps: [
			"Check bookmaker API status",
			"Verify network connectivity",
			"Review bookmaker configuration",
			"Check rate limit status",
			"Review circuit breaker status",
		],
		crossReference: "1.3.3.1.0.0.0",
	},
	"HBMO-003": {
		code: "HBMO-003",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Successfully retrieved market data from bookmaker",
		context: "Emitted when market data fetch completes successfully",
		commonCauses: ["Successful API call"],
		resolutionSteps: ["Normal operation, no action needed"],
		crossReference: "1.3.3.1.0.0.0",
	},
	"HBMO-004": {
		code: "HBMO-004",
		expectedLevel: StandardizedLogLevel.DEBUG,
		summary: "API call promise was already resolved when checked",
		context: "Emitted when Bun.peek() detects promise is already fulfilled",
		commonCauses: ["Promise resolved before peek check", "Cached response"],
		resolutionSteps: ["Normal operation, indicates performance optimization"],
		crossReference: "1.3.3.1.0.0.0",
	},
	"HBMO-005": {
		code: "HBMO-005",
		expectedLevel: StandardizedLogLevel.DEBUG,
		summary: "API call completed with high-precision timing",
		context: "Emitted when API call finishes, includes nanosecond-precision timing",
		commonCauses: ["Normal API call completion"],
		resolutionSteps: ["Normal operation, used for performance monitoring"],
		crossReference: "1.3.3.1.0.0.0",
	},

	// Logger System (HBLOG)
	"HBLOG-001": {
		code: "HBLOG-001",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Timer was never started",
		context: "Emitted when endTimer() is called without corresponding startTimer()",
		commonCauses: ["Timer label mismatch", "Timer not initialized"],
		resolutionSteps: ["Ensure startTimer() is called before endTimer()"],
		crossReference: "16.1.1.1.0.0.0",
	},

	// Timezone Subsystem (HBTS)
	"HBTS-001": {
		code: "HBTS-001",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Timezone transition detected, adjusting offset",
		context: "When DST transition occurs or event spans timezone boundaries",
		commonCauses: [
			"DST start/end",
			"Event timezone change",
			"System tz reconfiguration",
		],
		resolutionSteps: [
			"Verify transition table: SELECT * FROM timezone_transitions WHERE transition_timestamp > datetime('now', '-1 day')",
			"Check event correlation consistency: SELECT COUNT(*) FROM multi_layer_correlations WHERE ABS(latency_ms) > 3600000",
		],
		crossReference: "core/timezone.ts",
		// Additional metadata matching specification format
		subsystem: "HBTS",
		tags: ["timezone", "dst", "transition", "offset"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBTS-002": {
		code: "HBTS-002",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Event timezone mismatch detected",
		context: "EventId timezone != detected venue timezone",
		commonCauses: [
			"Incorrect eventId format",
			"Venue change without update",
			"Timezone config drift",
		],
		resolutionSteps: [
			"Validate eventId format: should end with -PST, -EST, -GMT, etc.",
			"Update venue mapping in timezone service if needed",
		],
		crossReference: "core/timezone.ts",
		// Additional metadata matching specification format
		subsystem: "HBTS",
		tags: ["timezone", "event", "validation", "mismatch"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBTS-003": {
		code: "HBTS-003",
		expectedLevel: StandardizedLogLevel.ERROR,
		summary: "Timestamp anomaly - events out of chronological order",
		context: "Cross-event correlation shows negative temporal_distance",
		commonCauses: [
			"Clock drift on source system",
			"Timezone misconfiguration",
			"Data corruption",
		],
		resolutionSteps: [
			"IMMEDIATE: Halt detection engine to prevent invalid correlations",
			"CHECK: Run hb-time-sync --verify against NTP pool",
			"AUDIT: Review audit_log for timestamp jumps in last 5 minutes",
		],
		crossReference: "core/timezone.ts",
		// Additional metadata matching specification format
		subsystem: "HBTS",
		tags: ["timezone", "critical", "timestamp", "chronology"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },

	// Secrets Subsystem (HBSE)
	"HBSE-001": {
		code: "HBSE-001",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Secret successfully deleted",
		context: "API call to delete MCP secret completes",
		commonCauses: ["Operator action", "Automated rotation"],
		resolutionSteps: ["Verify deletion in keychain"],
		crossReference: "secrets/registry.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "deletion", "audit"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBSE-002": {
		code: "HBSE-002",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Attempt to delete non-existent secret",
		context: "Delete API called on missing secret",
		commonCauses: ["Double deletion", "Wrong service/name"],
		resolutionSteps: ["Verify secret exists before deletion"],
		crossReference: "secrets/registry.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "warning", "audit"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBSE-003": {
		code: "HBSE-003",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Required secret missing during startup",
		context: "Service initialization cannot find API key",
		commonCauses: ["Incomplete deployment", "Secret not provisioned"],
		resolutionSteps: [
			"Run: bun run secrets:provision --service=nexus",
			"Verify in system keychain: security find-generic-password -s \"bun.secrets.nexus\"",
		],
		crossReference: "secrets/registry.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "startup", "warning"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBSE-004": {
		code: "HBSE-004",
		expectedLevel: StandardizedLogLevel.ERROR,
		summary: "Secret access failed - decryption error",
		context: "Bun.secrets.get() throws exception",
		commonCauses: ["Keychain corruption", "Invalid permissions", "Tampering detected"],
		resolutionSteps: [
			"IMMEDIATE: Check system keychain integrity",
			"VERIFY: File permissions on keychain DB",
			"ESCALATE: If tampering suspected, rotate all secrets",
		],
		crossReference: "secrets/registry.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "error", "security", "critical"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBSE-005": {
		code: "HBSE-005",
		expectedLevel: StandardizedLogLevel.INFO,
		summary: "Secret rotated successfully",
		context: "Automated or manual secret rotation",
		commonCauses: ["Scheduled rotation", "Key compromise", "Compliance requirement"],
		resolutionSteps: ["Update downstream services with new secret"],
		crossReference: "secrets/registry.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "rotation", "audit", "compliance"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBSE-006": {
		code: "HBSE-006",
		expectedLevel: StandardizedLogLevel.ERROR,
		summary: "Unauthorized secret access attempt",
		context: "Operator attempted to access secret without required permissions",
		commonCauses: [
			"Insufficient role permissions",
			"Missing operator session",
			"Access control policy violation",
		],
		resolutionSteps: [
			"IMMEDIATE: Review operator role and permissions",
			"VERIFY: Check RBAC configuration for service/operation",
			"ESCALATE: If suspicious activity, revoke operator access",
			"AUDIT: Review access logs for pattern of unauthorized attempts",
		],
		crossReference: "auth/secret-guard.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "authorization", "security", "critical", "audit"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
	"HBSE-007": {
		code: "HBSE-007",
		expectedLevel: StandardizedLogLevel.WARN,
		summary: "Invalid secret format rejected",
		context: "Secret value failed format validation",
		commonCauses: [
			"API key too short or too long",
			"Invalid characters in secret",
			"Malformed JWT or session token",
			"Wrong secret type for validation",
		],
		resolutionSteps: [
			"Verify secret format matches expected type",
			"Check secret length requirements (API keys: 32-128 chars)",
			"Ensure secret contains only allowed characters",
			"For cookies, verify JWT format (3 parts separated by dots)",
		],
		crossReference: "validation/secret-validator.ts",
		// Additional metadata matching specification format
		subsystem: "HBSE",
		tags: ["secrets", "validation", "input", "security"],
	} as LogCodeDefinition & { subsystem: string; tags: string[] },
};

/**
 * Get log code definition
 * 
 * @param code - Log code to look up
 * @returns Log code definition or undefined
 */
export function getLogCode(code: string): LogCodeDefinition | undefined {
	return LOG_CODES[code];
}

/**
 * Register a new log code (for dynamic registration in development)
 * 
 * @param definition - Log code definition
 */
export function registerLogCode(definition: LogCodeDefinition): void {
	LOG_CODES[definition.code] = definition;
}
