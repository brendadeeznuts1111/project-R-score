/**
 * @fileoverview Custom Telemetry System
 * @description Native metrics collection with zero overhead
 * @module observability/metrics
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-METRICS@0.1.0;instance-id=METRICS-001;version=0.1.0}]
 * [PROPERTIES:{metrics={value:"custom-telemetry";@root:"ROOT-OBSERVABILITY";@chain:["BP-METRICS","BP-TELEMETRY"];@version:"0.1.0"}}]
 * [CLASS:MetricsCollector][#REF:v-0.1.0.BP.METRICS.1.0.A.1.1.OBSERVABILITY.1.1]]
 */

/**
 * Counter metric
 */
export interface Counter {
	name: string;
	labels: Record<string, string>;
	value: number;
	inc(labels?: Record<string, string>, value?: number): void;
	get(labels?: Record<string, string>): number;
}

/**
 * Histogram metric
 */
export interface Histogram {
	name: string;
	labels: Record<string, string>;
	buckets: number[];
	values: Map<string, number[]>;
	observe(labels: Record<string, string>, value: number): void;
	get(labels?: Record<string, string>): { buckets: number[]; values: number[] };
}

/**
 * Metrics registry
 */
class MetricsRegistry {
	private counters = new Map<string, Counter>();
	private histograms = new Map<string, Histogram>();

	/**
	 * Create or get a counter
	 */
	counter(config: {
		name: string;
		help: string;
		labelNames: string[];
	}): Counter {
		if (this.counters.has(config.name)) {
			return this.counters.get(config.name)!;
		}

		const counter: Counter = {
			name: config.name,
			labels: {},
			value: 0,
			inc(labels = {}, value = 1) {
				this.value += value;
				Object.assign(this.labels, labels);
			},
			get(labels = {}) {
				return this.value;
			},
		};

		this.counters.set(config.name, counter);
		return counter;
	}

	/**
	 * Create or get a histogram
	 */
	histogram(config: {
		name: string;
		help: string;
		buckets: number[];
	}): Histogram {
		if (this.histograms.has(config.name)) {
			return this.histograms.get(config.name)!;
		}

		const histogram: Histogram = {
			name: config.name,
			labels: {},
			buckets: config.buckets,
			values: new Map(),
			observe(labels, value) {
				const key = JSON.stringify(labels);
				if (!this.values.has(key)) {
					this.values.set(key, []);
				}
				this.values.get(key)!.push(value);
			},
			get(labels = {}) {
				const key = JSON.stringify(labels);
				const values = this.values.get(key) || [];
				return { buckets: this.buckets, values };
			},
		};

		this.histograms.set(config.name, histogram);
		return histogram;
	}

	/**
	 * Get Prometheus-formatted metrics
	 */
	async metrics(): Promise<string> {
		const lines: string[] = [];

		// Counters
		for (const counter of this.counters.values()) {
			lines.push(`# HELP ${counter.name} Counter metric`);
			lines.push(`# TYPE ${counter.name} counter`);
			lines.push(`${counter.name} ${counter.value}`);
		}

		// Histograms
		for (const histogram of this.histograms.values()) {
			lines.push(`# HELP ${histogram.name} Histogram metric`);
			lines.push(`# TYPE ${histogram.name} histogram`);
			for (const [key, values] of histogram.values.entries()) {
				const labels = JSON.parse(key);
				const labelStr = Object.entries(labels)
					.map(([k, v]) => `${k}="${v}"`)
					.join(",");
				const sum = values.reduce((a, b) => a + b, 0);
				const count = values.length;
				lines.push(`${histogram.name}_sum{${labelStr}} ${sum}`);
				lines.push(`${histogram.name}_count{${labelStr}} ${count}`);
				for (const bucket of histogram.buckets) {
					const bucketCount = values.filter((v) => v <= bucket).length;
					lines.push(
						`${histogram.name}_bucket{${labelStr},le="${bucket}"} ${bucketCount}`,
					);
				}
			}
		}

		return lines.join("\n");
	}
}

// Singleton registry
const registry = new MetricsRegistry();

/**
 * Create a counter metric
 */
export function counter(config: {
	name: string;
	help: string;
	labelNames: string[];
}): Counter {
	return registry.counter(config);
}

/**
 * Create a histogram metric
 */
export function histogram(config: {
	name: string;
	help: string;
	buckets: number[];
}): Histogram {
	return registry.histogram(config);
}

/**
 * Get Bun server metrics
 * @see {@link https://bun.sh/docs/api/http-server#metrics|Bun Server Metrics Documentation}
 *
 * @description
 * Retrieves Bun's built-in server metrics:
 * - `pendingRequests` - Active HTTP requests
 * - `pendingWebSockets` - Active WebSocket connections
 * - `subscriberCount(topic)` - WebSocket subscribers per topic
 *
 * @param {ReturnType<typeof Bun.serve>} server - The Bun server instance
 * @returns {Object} Server metrics object
 *
 * @example
 * ```typescript
 * import { getServer } from "../index";
 * import { getBunServerMetrics } from "./metrics";
 *
 * const server = getServer();
 * const metrics = getBunServerMetrics(server);
 * // { pendingRequests: 5, pendingWebSockets: 2, subscribers: {} }
 * ```
 */
export function getBunServerMetrics(server: ReturnType<typeof Bun.serve>): {
	pendingRequests: number;
	pendingWebSockets: number;
	subscribers: Record<string, number>;
} {
	const subscribers: Record<string, number> = {};

	// Get subscriber counts for known topics (if any)
	// Note: We can't enumerate all topics, so this is a best-effort approach
	// Common topics could be tracked separately if needed
	const knownTopics: string[] = ["chat", "telegram", "ws", "updates"];
	for (const topic of knownTopics) {
		try {
			const count = server.subscriberCount(topic);
			if (count > 0) {
				subscribers[topic] = count;
			}
		} catch {
			// Topic may not exist, ignore
		}
	}

	return {
		pendingRequests: server.pendingRequests,
		pendingWebSockets: server.pendingWebSockets,
		subscribers,
	};
}

/**
 * Get Prometheus-formatted metrics including Bun server metrics
 * @see {@link https://bun.sh/docs/api/http-server#metrics|Bun Server Metrics Documentation}
 */
export async function getMetrics(
	server?: ReturnType<typeof Bun.serve>,
): Promise<string> {
	const lines: string[] = [];

	// Get custom metrics from registry
	const customMetrics = await registry.metrics();
	if (customMetrics) {
		lines.push(customMetrics);
	}

	// Add Bun server metrics if server instance is provided
	if (server) {
		const bunMetrics = getBunServerMetrics(server);

		lines.push("");
		lines.push("# HELP bun_server_pending_requests Active HTTP requests");
		lines.push("# TYPE bun_server_pending_requests gauge");
		lines.push(`bun_server_pending_requests ${bunMetrics.pendingRequests}`);

		lines.push("");
		lines.push(
			"# HELP bun_server_pending_websockets Active WebSocket connections",
		);
		lines.push("# TYPE bun_server_pending_websockets gauge");
		lines.push(`bun_server_pending_websockets ${bunMetrics.pendingWebSockets}`);

		// Add subscriber counts per topic
		for (const [topic, count] of Object.entries(bunMetrics.subscribers)) {
			lines.push("");
			lines.push(
				`# HELP bun_server_subscribers WebSocket subscribers per topic`,
			);
			lines.push(`# TYPE bun_server_subscribers gauge`);
			lines.push(`bun_server_subscribers{topic="${topic}"} ${count}`);
		}
	}

	// Add circuit breaker metrics (15.1.2.2.2.0.0.0)
	try {
		const { getCircuitBreakerStatus } = await import("../utils/circuit-breaker-instance");
		const breakerStatuses = getCircuitBreakerStatus();

		if (breakerStatuses.length > 0) {
			lines.push("");
			lines.push("# HELP circuit_breaker_tripped Circuit breaker trip status (1 = tripped, 0 = closed)");
			lines.push("# TYPE circuit_breaker_tripped gauge");
			for (const status of breakerStatuses) {
				lines.push(`circuit_breaker_tripped{bookmaker="${status.bookmaker}"} ${status.tripped ? 1 : 0}`);
			}

			lines.push("");
			lines.push("# HELP circuit_breaker_failures_1m Current failure count for circuit breaker");
			lines.push("# TYPE circuit_breaker_failures_1m gauge");
			for (const status of breakerStatuses) {
				lines.push(`circuit_breaker_failures_1m{bookmaker="${status.bookmaker}"} ${status.failures}`);
			}

			lines.push("");
			lines.push("# HELP circuit_breaker_trip_count Total number of trips for circuit breaker");
			lines.push("# TYPE circuit_breaker_trip_count gauge");
			for (const status of breakerStatuses) {
				lines.push(`circuit_breaker_trip_count{bookmaker="${status.bookmaker}"} ${status.tripCount}`);
			}

			lines.push("");
			lines.push("# HELP circuit_breaker_latency_ms Average latency for successful API calls");
			lines.push("# TYPE circuit_breaker_latency_ms gauge");
			for (const status of breakerStatuses) {
				if (status.avgLatency !== null) {
					lines.push(`circuit_breaker_latency_ms{bookmaker="${status.bookmaker}"} ${status.avgLatency}`);
				}
			}

			// Export stored metrics from circuit breaker instance
			const storedMetrics = (globalThis as any).__circuitBreakerGauges;
			if (storedMetrics instanceof Map) {
				// Export circuit_breaker_rejected counter
				const rejectedMetrics: Array<{ key: string; value: number }> = [];
				const loadShedMetrics: Array<{ key: string; value: number }> = [];
				
				for (const [key, value] of storedMetrics.entries()) {
					if (key.startsWith("circuit_breaker_rejected")) {
						rejectedMetrics.push({ key, value });
					} else if (key.startsWith("load_shed_rejected_total")) {
						loadShedMetrics.push({ key, value });
					}
				}
				
				if (rejectedMetrics.length > 0) {
					lines.push("");
					lines.push("# HELP circuit_breaker_rejected Requests rejected due to tripped state");
					lines.push("# TYPE circuit_breaker_rejected counter");
					for (const { key, value } of rejectedMetrics) {
						lines.push(`${key} ${value}`);
					}
				}
				
				if (loadShedMetrics.length > 0) {
					lines.push("");
					lines.push("# HELP load_shed_rejected_total Requests rejected due to load shedding");
					lines.push("# TYPE load_shed_rejected_total counter");
					for (const { key, value } of loadShedMetrics) {
						lines.push(`${key} ${value}`);
					}
				}
			}
		}
	} catch (error) {
		// Circuit breaker not initialized yet - ignore
	}

	// Add logging metrics (16.7.1.0.0.0.0)
	try {
		const { getPrometheusMetrics: getLoggingMetrics } = await import("../logging/metrics");
		const loggingMetrics = getLoggingMetrics();
		if (loggingMetrics.trim()) {
			lines.push("");
			lines.push(loggingMetrics);
		}
	} catch (error) {
		// Logging metrics not available - ignore
	}

	return lines.join("\n");
}

/**
 * Register bookmaker movement metrics
 */
export const bookMoves = counter({
	name: "bookmaker_moves_total",
	help: "Total moves per bookmaker",
	labelNames: ["bookmaker", "trigger_type"],
});

/**
 * Register steam detection latency histogram
 */
export const steamDetected = histogram({
	name: "steam_move_latency_ms",
	help: "Time to detect steam moves",
	buckets: [10, 50, 100, 500, 1000],
});

/**
 * Log bookmaker movement
 */
export function logMovement(move: {
	bookmaker: string;
	suspected_trigger: string;
}): void {
	bookMoves.inc({
		bookmaker: move.bookmaker,
		trigger_type: move.suspected_trigger,
	});
}

// ============ Secrets Management Metrics ============

/**
 * Secret access counter
 */
export const secretAccessCounter = counter({
	name: "hyperbun_secret_access_total",
	help: "Total secret access attempts",
	labelNames: ["service", "operation", "status"],
});

/**
 * Secret rotation timestamp gauge
 */
export const secretRotationGauge = counter({
	name: "hyperbun_secret_rotation_timestamp",
	help: "Last rotation timestamp by secret",
	labelNames: ["service", "name"],
});

/**
 * Emergency rotation counter
 */
export const emergencyRotationCounter = counter({
	name: "hyperbun_emergency_rotation_total",
	help: "Total emergency secret rotations performed",
	labelNames: ["severity"],
});

/**
 * Secret validation errors counter
 */
export const secretValidationErrors = counter({
	name: "hyperbun_secret_validation_errors_total",
	help: "Total secret validation errors",
	labelNames: ["type", "reason"],
});

/**
 * Record secret access for monitoring
 */
export function recordSecretAccess(service: string, operation: 'read' | 'write' | 'delete', status: 'success' | 'denied' | 'error'): void {
	secretAccessCounter.inc({
		service,
		operation,
		status,
	});
}

/**
 * Record secret rotation
 */
export function recordSecretRotation(service: string, name: string): void {
	secretRotationGauge.inc({
		service,
		name,
	}, Date.now());
}

/**
 * Record emergency rotation
 */
export function recordEmergencyRotation(severity: 'critical' | 'high' | 'medium'): void {
	emergencyRotationCounter.inc({
		severity,
	});
}

/**
 * Record secret validation error
 */
export function recordSecretValidationError(type: string, reason: string): void {
	secretValidationErrors.inc({
		type,
		reason,
	});
}

/**
 * Metrics handler for HTTP endpoint
 * @deprecated Use getMetrics() directly with server instance for Bun metrics
 * @see {@link getMetrics}
 */
export const metricsHandler = {
	async fetch(
		req: Request,
		server?: ReturnType<typeof Bun.serve>,
	): Promise<Response> {
		if (req.url.endsWith("/metrics")) {
			const metrics = await getMetrics(server);
			return new Response(metrics, {
				headers: { "Content-Type": "text/plain" },
			});
		}
		return new Response(null, { status: 404 });
	},
};
