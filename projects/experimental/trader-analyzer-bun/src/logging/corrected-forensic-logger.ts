/**
 * @fileoverview Corrected Forensic Logger
 * @module logging/corrected-forensic-logger
 *
 * Enhanced forensic logger that detects and corrects URL entity parsing anomalies.
 * Handles HTML entity encoding edge cases that can cause parameter splitting.
 *
 * Extends {@link ForensicMovementLogger} to add:
 * - URL entity detection before API calls
 * - Custom parameter parsing that preserves HTML entities
 * - Anomaly logging to forensic audit database
 * - Integration with RuntimeSecurityMonitor for threat detection
 *
 * @extends ForensicMovementLogger
 */

import {
	ForensicMovementLogger,
	type BookmakerConfig,
	type ForensicLoggerConfig,
} from "./forensic-movement-logger";
import type {
	AuditResult,
	BookmakerEndpointConfig,
	ForensicDatabase,
} from "./types";
import type { RuntimeSecurityMonitor } from "../security/runtime-monitor";
import {
	getEndpointConfigForLogger,
	type BookmakerProfile,
} from "./bookmaker-profile";

/**
 * Corrected Forensic Logger that handles URL entity parsing correctly
 *
 * **Base Class**: Extends {@link ForensicMovementLogger} which provides:
 * - Basic bookmaker API call logging
 * - Forensic database schema (`line_movement_audit_v2`)
 * - Standard `fetchCompressedOdds()` implementation
 *
 * **This Class Adds**:
 * - Detection of HTML entity encoding (e.g., `&#x26;`, `&amp;`, `&#38;`)
 * - Custom URL parsing that preserves entities as literal text
 * - Anomaly detection and logging (`url_anomaly_audit` table)
 * - Security monitoring integration
 *
 * @example
 * ```typescript
 * const logger = new CorrectedForensicLogger(
 *   { bookmakers: bookmakerConfig },
 *   { securityMonitor: new RuntimeSecurityMonitor() }
 * );
 *
 * // Automatically detects and corrects entity encoding
 * const odds = await logger.fetchCompressedOdds('bookmaker', 'event-123');
 * ```
 */
export class CorrectedForensicLogger extends ForensicMovementLogger {
	private maliciousDetector?: {
		validateBookmakerRequest: (
			url: string,
			bookmaker: string,
		) => Promise<{ allowed: boolean; reason?: string }>;
	};
	private securityMonitor?: RuntimeSecurityMonitor;
	private endpointConfig?: BookmakerEndpointConfig;

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
			endpointConfig?: BookmakerEndpointConfig;
			/**
			 * Load endpoint config from bookmaker profile registry
			 * If true, will attempt to load from database for each bookmaker
			 */
			loadFromRegistry?: boolean;
		},
	) {
		super(config);
		this.maliciousDetector = options?.maliciousDetector;
		this.securityMonitor = options?.securityMonitor;
		this.endpointConfig = options?.endpointConfig;
		this.initializeAnomalyTable();

		// If loadFromRegistry is enabled, we'll load configs dynamically per bookmaker
		// The endpointConfig can still be provided as override
	}

	/**
	 * Initialize URL anomaly audit table
	 */
	private initializeAnomalyTable(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS url_anomaly_audit (
				anomalyId TEXT PRIMARY KEY,
				bookmaker TEXT NOT NULL,
				eventId TEXT NOT NULL,
				original_url TEXT NOT NULL,
				parsed_param_count INTEGER NOT NULL,
				corrected_param_count INTEGER NOT NULL,
				threat_level TEXT NOT NULL,
				detected_at INTEGER NOT NULL
			)
		`);

		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_anomaly_bookmaker ON url_anomaly_audit(bookmaker);
			CREATE INDEX IF NOT EXISTS idx_anomaly_threat ON url_anomaly_audit(threat_level);
			CREATE INDEX IF NOT EXISTS idx_anomaly_detected ON url_anomaly_audit(detected_at);
		`);
	}

	/**
	 * Override to handle URL entity parsing correctly
	 */
	override async fetchCompressedOdds(
		bookmaker: string,
		eventId: string,
	): Promise<any> {
		const bookmakerConfig = this.config.bookmakers.get(bookmaker);
		if (!bookmakerConfig) {
			throw new Error(`Bookmaker not configured: ${bookmaker}`);
		}

		const baseUrl = bookmakerConfig.baseUrl;
		const url = `${baseUrl}/v2/events/${eventId}/odds`;

		// Sanitize before request
		if (this.maliciousDetector) {
			const validation = await this.maliciousDetector.validateBookmakerRequest(
				url,
				bookmaker,
			);
			if (!validation.allowed) {
				throw new Error(`Blocked: ${validation.reason}`);
			}
		}

		// Monitor network egress
		if (this.securityMonitor) {
			this.securityMonitor.monitorNetworkEgress(url, bookmaker);
		}

		// Detect if URL will be parsed unexpectedly
		const previewParsed = new URL(url);
		const expectedParams = this.getExpectedParameterCount(url);
		const actualParams = [...previewParsed.searchParams].length;

		if (actualParams > expectedParams) {
			// URL contains entities that will split parameters
			console.warn(
				`⚠️ URL entity splitting detected: ${actualParams} params vs ${expectedParams} expected`,
			);

			// Use custom parser to capture actual intended parameters
			const correctedParams = this.parseUrlWithEntities(url);

			// Store both versions in audit
			this.logUrlParsingAnomaly({
				bookmaker,
				eventId,
				originalUrl: url,
				parsedParams: [...previewParsed.searchParams],
				correctedParams,
				threatLevel: "suspicious",
			});

			// Trigger security alert
			if (this.securityMonitor) {
				// The security monitor will handle entity_encoding_detected internally
				// but we can also explicitly log it
				console.warn(
					`🚨 Entity encoding detected in URL for ${bookmaker}: ${url}`,
				);
			}
		}

		// Call parent implementation
		return super.fetchCompressedOdds(bookmaker, eventId);
	}

	/**
	 * Custom parser that respects HTML entities as literal text
	 */
	private parseUrlWithEntities(url: string): Map<string, string> {
		// 1. First, escape entities temporarily
		const escaped = url.replace(/&([^;]+);/g, "__ENTITY__$1__");

		// 2. Parse normally
		const parsed = new URL(escaped);

		// 3. Restore entities in parameter values (not names)
		const corrected = new Map<string, string>();

		for (const [key, value] of parsed.searchParams) {
			const restoredKey = key.replace(/__ENTITY__([^_]+)__/g, "&$1;");
			const restoredValue = value.replace(/__ENTITY__([^_]+)__/g, "&$1;");
			corrected.set(restoredKey, restoredValue);
		}

		return corrected;
	}

	/**
	 * Override to detect entity encoding in URLs
	 * Uses endpoint-specific configuration if available
	 * Can load from bookmaker profile registry if configured
	 */
	protected override getExpectedParameterCount(url: string): number {
		try {
			const urlObj = new URL(url);
			const endpoint = urlObj.pathname;
			const bookmaker = this.extractBookmakerFromUrl(url);

			if (!bookmaker) {
				// Can't determine bookmaker, fall through to entity detection
				return this.detectEntityBasedCount(url);
			}

			// Try endpoint config first
			if (this.endpointConfig && this.endpointConfig.bookmaker === bookmaker) {
				const expected = this.endpointConfig.endpoints.get(endpoint);
				if (expected !== undefined) {
					return expected;
				}

				// Use default threshold if endpoint not found
				if (this.endpointConfig.defaultThreshold !== undefined) {
					return this.endpointConfig.defaultThreshold;
				}
			}

			// Try loading from registry (if database available)
			// Note: This would require passing database instance, which we can add if needed
			// For now, endpointConfig should be provided during construction
		} catch {
			// Invalid URL, fall through to entity detection
		}

		return this.detectEntityBasedCount(url);
	}

	/**
	 * Detect parameter count based on entity encoding
	 */
	private detectEntityBasedCount(url: string): number {
		// Count parameters without entity splitting
		// If URL contains entities, count them as single parameters
		const entityPattern = /&#[xX]?[0-9a-fA-F]+;/g;
		const hasEntities = entityPattern.test(url);

		if (hasEntities) {
			// Temporarily escape entities to count correctly
			const escaped = url.replace(/&([^;]+);/g, "__ENTITY__$1__");
			try {
				return [...new URL(escaped).searchParams].length;
			} catch {
				return 0;
			}
		}

		// Normal URL parsing
		try {
			return [...new URL(url).searchParams].length;
		} catch {
			return 0;
		}
	}

	/**
	 * Extract bookmaker name from URL
	 */
	private extractBookmakerFromUrl(url: string): string | null {
		try {
			const urlObj = new URL(url);
			const hostname = urlObj.hostname;
			// Extract bookmaker from hostname (e.g., api.bookmaker.com -> bookmaker)
			const parts = hostname.split(".");
			if (parts.length >= 2) {
				return parts[parts.length - 2]; // Second-to-last part
			}
			return null;
		} catch {
			return null;
		}
	}

	/**
	 * Log URL parsing anomaly
	 */
	private logUrlParsingAnomaly(anomaly: {
		bookmaker: string;
		eventId: string;
		originalUrl: string;
		parsedParams: [string, string][];
		correctedParams: Map<string, string>;
		threatLevel: string;
	}): void {
		const anomalyId = Bun.randomUUIDv7();

		this.db.run(
			`
			INSERT INTO url_anomaly_audit (
				anomalyId, bookmaker, eventId, original_url, parsed_param_count, corrected_param_count,
				threat_level, detected_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`,
			[
				anomalyId,
				anomaly.bookmaker,
				anomaly.eventId,
				anomaly.originalUrl,
				anomaly.parsedParams.length,
				anomaly.correctedParams.size,
				anomaly.threatLevel,
				Date.now(),
			],
		);
	}

	/**
	 * Audit existing forensic logs for URL anomalies
	 * Uses dynamic thresholds based on endpoint configuration
	 */
	auditForensicLogs(): AuditResult[] {
		const suspiciousUrls = this.db
			.query(`
			SELECT auditId, raw_url, bookmaker
			FROM line_movement_audit_v2
			WHERE raw_url LIKE '%amp;%' 
			   OR raw_url LIKE '%&#%'
			   OR raw_url LIKE '%\\&%'
		`)
			.all() as Array<{
			auditId: string;
			raw_url: string;
			bookmaker: string;
		}>;

		const results: AuditResult[] = [];

		for (const { auditId, raw_url, bookmaker } of suspiciousUrls) {
			try {
				const parsed = new URL(raw_url);
				const paramCount = [...parsed.searchParams].length;

				// Get expected parameter count for this endpoint
				const endpoint = parsed.pathname;
				let expectedParamCount: number;
				let threshold: number;

				if (
					this.endpointConfig &&
					this.endpointConfig.bookmaker === bookmaker
				) {
					const expected = this.endpointConfig.endpoints.get(endpoint);
					if (expected !== undefined) {
						expectedParamCount = expected;
						threshold = expected + (this.endpointConfig.defaultThreshold || 2);
					} else {
						// Use default threshold if endpoint not configured
						expectedParamCount = 2; // Default assumption
						threshold = this.endpointConfig.defaultThreshold || 5;
					}
				} else {
					// Fallback to default threshold
					expectedParamCount = 2;
					threshold = 5;
				}

				const isAnomalous = paramCount > threshold;

				if (isAnomalous) {
					const result: AuditResult = {
						auditId,
						bookmaker,
						rawUrl: raw_url,
						paramCount,
						expectedParamCount,
						threshold,
						isAnomalous: true,
						reason: `Parameter count (${paramCount}) exceeds threshold (${threshold}) for endpoint ${endpoint}`,
					};

					results.push(result);
					console.warn(
						`⚠️ Suspicious URL detected in audit log: ${auditId} (${paramCount} params, expected ~${expectedParamCount}, threshold: ${threshold})`,
					);
				}
			} catch {
				// Invalid URL, skip
			}
		}

		return results;
	}
}
