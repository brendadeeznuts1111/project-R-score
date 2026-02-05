/**
 * @fileoverview DoD-Compliant API Middleware for Hyper-Bun MLGS
 * @description Unified middleware for logging, metrics, security, and audit trails
 * @module api/middleware/dod-middleware
 * @version 1.1.0.0.0.0.0
 *
 * 1.1.0.0.0.0.0: Unified middleware for logging, metrics, security, and audit trails.
 * [DoD][CLASS:DODAPIMiddleware][SCOPE:RequestLifecycle]
 * This middleware intercepts all incoming API requests and outgoing responses to enforce
 * Hyper-Bun's observability, security, and compliance policies.
 *
 * @see {@link docs/1.0.0.0.0.0.0-API-DASHBOARD-PORTAL-INTEGRATION.md|API-Dashboard-Portal Integration Documentation}
 * @see {@link docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md|Debugging & Observability}
 * @see {@link docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md|Cookie Management}
 *
 * Ripgrep Pattern: 1\.1\.0\.0\.0\.0\.0|DODAPIMiddleware|dod-middleware
 */

import type { Context } from 'bun'; // Bun's HTTP context type
import { Database } from 'bun:sqlite'; // Cross-reference: Bun-native SQLite for audit logs
import { consoleEnhanced } from '../../logging/console-enhanced'; // Cross-reference: Enhanced console logger
import { LOG_CODES } from '../../logging/registry'; // Cross-reference: Hyper-Bun's logging codes

/**
 * 1.1.0.0.0.0.0: DoD-Compliant API Middleware Class
 * [DoD][CLASS:DODAPIMiddleware][SCOPE:RequestLifecycle]
 *
 * Provides unified request lifecycle management including:
 * - Request/response logging with full metadata
 * - SQLite-based audit trails for regulatory compliance
 * - Security headers injection (DoD requirement)
 * - Performance metrics collection via Bun.system.metrics
 * - Standardized error handling with audit completion
 */
export class DODAPIMiddleware {
	private readonly startTime = performance.now(); // Bun-native performance API
	private readonly requestId = crypto.randomUUID(); // Bun-native crypto for unique request ID

	/**
	 * 1.1.1.0.0.0.0: Pre-Handler: Executes before the main route handler processes the request.
	 * [DoD][METHOD:preHandler][SCOPE:RequestLifecycle]
	 * Performs initial logging, injects security headers, and marks performance start.
	 *
	 * @param context - The Bun HTTP context object.
	 * @returns A Promise that resolves once pre-processing is complete.
	 *
	 * Cross-reference: 7.0.0.0.0.0.0 Debugging & Observability
	 * Cross-reference: 10.1.0.0.0.0.0 Cookie Management
	 * Cross-reference: 11.1.2.2.0.0.0 HTTP Headers
	 */
	async preHandler(context: Context): Promise<void> {
		const { request } = context;

		// 1.1.1.1.0.0.0: Request logging with full metadata (Cross-reference: 7.0.0.0.0.0.0 Debugging & Observability)
		consoleEnhanced.info('API Request', {
			method: request.method,
			url: request.url,
			requestId: this.requestId,
			ip: this.getClientIP(request),
			userAgent: request.headers.get('user-agent'),
			timestamp: new Date().toISOString() // Bun-native Date object
		});

		// 1.1.1.2.0.0.0: Audit trail entry (Cross-reference: 1.1.5.0.0.0.0 Audit Trail Database)
		this.auditLogRequest(context);

		// 1.1.1.3.0.0.0: Security headers injection (DoD requirement: 11.1.2.2.0.0.0 HTTP Headers)
		context.responseHeaders = new Headers({
			// Bun-native Headers
			'X-Request-ID': this.requestId,
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
			'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline';",
			...context.responseHeaders // Merge with any existing headers
		});

		// 1.1.1.4.0.0.0: Performance mark (Cross-reference: Bun.performance API)
		performance.mark(`api-start-${this.requestId}`);
	}

	/**
	 * 1.1.2.0.0.0.0: Post-Handler: Executes after the main route handler has generated a response.
	 * [DoD][METHOD:postHandler][SCOPE:RequestLifecycle]
	 * Measures performance, logs response details, collects metrics, and completes audit trail.
	 *
	 * @param context - The Bun HTTP context object.
	 * @param response - The generated Response object.
	 * @returns A Promise that resolves with the modified Response object.
	 *
	 * Cross-reference: 1.10.0.0.0.0.0 Bun System Metrics
	 * Cross-reference: 7.0.0.0.0.0.0 Debugging & Observability
	 */
	async postHandler(context: Context, response: Response): Promise<Response> {
		const duration = performance.now() - this.startTime; // Bun-native performance API

		// 1.1.2.1.0.0.0: Performance measurement (Cross-reference: Bun.performance API)
		performance.mark(`api-end-${this.requestId}`);
		performance.measure(`api-${this.requestId}`, `api-start-${this.requestId}`, `api-end-${this.requestId}`);

		// 1.1.2.2.0.0.0: Response logging (Cross-reference: 7.0.0.0.0.0.0 Debugging & Observability)
		consoleEnhanced.info('API Response', {
			requestId: this.requestId,
			status: response.status,
			duration_ms: duration.toFixed(3),
			contentLength: response.headers.get('content-length'),
			endpoint: new URL(context.request.url).pathname // Bun-native URL object
		});

		// 1.1.2.3.0.0.0: Metrics collection (Cross-reference: 1.10.0.0.0.0.0 Bun System Metrics)
		this.recordMetrics({
			status: response.status,
			duration,
			endpoint: context.request.url
		});

		// 1.1.2.4.0.0.0: Slow request warning
		if (duration > 1000) {
			// Configurable threshold for slow requests
			consoleEnhanced.warning('Slow API response detected', {
				requestId: this.requestId,
				duration_ms: duration,
				threshold: 1000
			});
		}

		// 1.1.2.5.0.0.0: Audit trail completion (Cross-reference: 1.1.6.0.0.0.0 Audit Trail Database)
		this.auditLogResponse(response);

		return response;
	}

	/**
	 * 1.1.3.0.0.0.0: Error Handler: Executes if any error occurs during request processing.
	 * [DoD][METHOD:errorHandler][SCOPE:RequestLifecycle]
	 * Logs critical errors, completes audit trail with error details, and returns a standardized error response.
	 *
	 * @param context - The Bun HTTP context object.
	 * @param error - The Error object caught.
	 * @returns A Promise that resolves with an appropriate error Response object.
	 *
	 * Cross-reference: LOG_CODES for categorization
	 */
	async errorHandler(context: Context, error: Error): Promise<Response> {
		const duration = performance.now() - this.startTime;

		// Defensive error handling: Bun pattern (event.error || event.message)
		// Handle cases where error might not have message/stack
		const { normalizeError } = await import("../../utils/error-wrapper");
		const normalized = normalizeError(error);

		consoleEnhanced.critical('API Error', {
			requestId: this.requestId,
			error: normalized.message,
			stack: normalized.stack,
			type: normalized.type,
			url: context.request.url,
			duration_ms: duration,
			timestamp: normalized.timestamp
		});

		// 1.1.3.1.0.0.0: Audit log error (Cross-reference: LOG_CODES for categorization)
		consoleEnhanced.error(LOG_CODES['HBAPI-005'] || 'HBAPI-005', {
			// Use consoleEnhanced.error for logging system errors
			requestId: this.requestId,
			error: normalized.message,
			stack: normalized.stack,
			type: normalized.type,
			url: context.request.url,
			timestamp: normalized.timestamp
		});

		return new Response(
			JSON.stringify({
				error: 'Internal Server Error',
				requestId: this.requestId
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' } // Standard JSON error response
			}
		);
	}

	/**
	 * 1.1.4.0.0.0.0: Helper: Retrieves the client's IP address from request headers.
	 * Handles `x-forwarded-for` proxy headers for accurate client IP detection.
	 *
	 * @param request - The incoming Request object.
	 * @returns The client IP address as a string, or 'unknown'.
	 */
	private getClientIP(request: Request): string {
		const forwarded = request.headers.get('x-forwarded-for');
		return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
	}

	/**
	 * 1.1.5.0.0.0.0: Helper: Records an entry in the API request audit log.
	 * This is part of Hyper-Bun's regulatory compliance and observability framework.
	 *
	 * @param context - The Bun HTTP context object.
	 *
	 * Cross-reference: 1.1.5.1.0.0.0 SQLite Integration for Regulatory Compliance
	 * @test: test/middleware/audit.test.ts::request_audit_entry_creation
	 */
	private auditLogRequest(context: Context): void {
		// 1.1.5.1.0.0.0: SQLite Integration for Regulatory Compliance
		const db = new Database('/var/lib/hyperbun/audit.db'); // Bun-native SQLite
		db.prepare(`
			INSERT INTO audit_api_requests
			(request_id, timestamp, method, url, ip_address, user_agent)
			VALUES (?, ?, ?, ?, ?, ?)
		`).run(
			this.requestId,
			Date.now(),
			context.request.method,
			context.request.url,
			this.getClientIP(context.request),
			context.request.headers.get('user-agent')
		);
	}

	/**
	 * 1.1.6.0.0.0.0: Helper: Updates the API response audit log with final details.
	 *
	 * @param response - The generated Response object.
	 *
	 * @test: test/middleware/audit.test.ts::response_audit_entry_completion
	 */
	private auditLogResponse(response: Response): void {
		const db = new Database('/var/lib/hyperbun/audit.db'); // Bun-native SQLite
		db.prepare(`
			UPDATE audit_api_requests
			SET response_status = ?, response_size = ?, duration_ms = ?
			WHERE request_id = ?
		`).run(
			response.status,
			response.headers.get('content-length') || 0,
			Date.now() - this.startTime,
			this.requestId
		);
	}

	/**
	 * 1.1.7.0.0.0.0: Helper: Records performance and request metrics.
	 * Integrates with Bun's system metrics for comprehensive monitoring.
	 *
	 * @param metrics - An object containing status, duration, and endpoint of the request.
	 *
	 * Cross-reference: 1.1.7.1.0.0.0 Bun.system.metrics integration
	 * Cross-reference: 1.10.0.0.0.0.0 Bun System Metrics
	 * @test: test/middleware/metrics.test.ts::metrics_collection_integrity
	 */
	private recordMetrics(metrics: { status: number; duration: number; endpoint: string }): void {
		// 1.1.7.1.0.0.0: Bun.system.metrics integration (Cross-reference: 1.10.0.0.0.0.0 Bun System Metrics)
		if (Bun.system?.metrics) {
			// Ensure metrics are enabled
			Bun.system.metrics.increment(`api_requests_${metrics.status}`);
			Bun.system.metrics.histogram('api_duration', metrics.duration, {
				endpoint: metrics.endpoint
			});
		}
	}
}

/**
 * 1.1.8.0.0.0.0: Singleton instance of DODAPIMiddleware.
 * Ensures that all API requests share the same middleware instance for consistent state.
 */
export const dodMiddleware = new DODAPIMiddleware();
