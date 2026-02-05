/**
 * @fileoverview Observability for Multi-Layer Correlation Graph
 * @description Metrics, tracing, and structured logging
 * @module arbitrage/shadow-graph/multi-layer-observability
 */

import { EventEmitter } from "events";

/**
 * Metric type
 */
export type MetricType = "counter" | "histogram" | "gauge";

/**
 * Metric
 */
export interface Metric {
	name: string;
	type: MetricType;
	value: number;
	tags?: Record<string, string>;
	timestamp?: number;
}

/**
 * Span context
 */
export interface SpanContext {
	spanId: string;
	traceId: string;
	parentSpanId?: string;
}

/**
 * Span
 */
export interface Span {
	name: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	tags?: Record<string, string>;
	context: SpanContext;
}

/**
 * Logger interface
 */
export interface Logger {
	info(message: string, meta?: Record<string, any>): void;
	warn(message: string, meta?: Record<string, any>): void;
	error(message: string, error?: Error, meta?: Record<string, any>): void;
	debug(message: string, meta?: Record<string, any>): void;
}

/**
 * Observability service
 */
export class ObservabilityService extends EventEmitter {
	private metrics: Metric[] = [];
	private spans: Map<string, Span> = new Map();
	private logger: Logger;

	constructor(logger?: Logger) {
		super();
		this.logger = logger || this.createDefaultLogger();
	}

	/**
	 * Record a metric
	 */
	recordMetric(
		name: string,
		value: number,
		type: MetricType = "histogram",
		tags?: Record<string, string>,
	): void {
		const metric: Metric = {
			name,
			type,
			value,
			tags,
			timestamp: Date.now(),
		};

		this.metrics.push(metric);
		this.emit("metric", metric);

		// Log histogram metrics
		if (type === "histogram") {
			this.logger.debug(`Metric: ${name} = ${value}`, { tags });
		}
	}

	/**
	 * Start a span
	 */
	startSpan(
		name: string,
		tags?: Record<string, string>,
		parentSpanId?: string,
	): string {
		const spanId = this.generateSpanId();
		const traceId = parentSpanId
			? this.getTraceId(parentSpanId)
			: this.generateTraceId();

		const span: Span = {
			name,
			startTime: Date.now(),
			tags,
			context: {
				spanId,
				traceId,
				parentSpanId,
			},
		};

		this.spans.set(spanId, span);
		this.emit("span-start", span);

		return spanId;
	}

	/**
	 * End a span
	 */
	endSpan(spanId: string): void {
		const span = this.spans.get(spanId);
		if (!span) return;

		span.endTime = Date.now();
		span.duration = span.endTime - span.startTime;

		this.emit("span-end", span);
		this.logger.debug(`Span: ${span.name} took ${span.duration}ms`, {
			tags: span.tags,
		});

		this.spans.delete(spanId);
	}

	/**
	 * Get metrics
	 */
	getMetrics(): Metric[] {
		return [...this.metrics];
	}

	/**
	 * Clear metrics
	 */
	clearMetrics(): void {
		this.metrics = [];
	}

	/**
	 * Create default logger
	 */
	private createDefaultLogger(): Logger {
		return {
			info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ""),
			warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ""),
			error: (msg, error, meta) =>
				console.error(`[ERROR] ${msg}`, error, meta || ""),
			debug: (msg, meta) => console.debug(`[DEBUG] ${msg}`, meta || ""),
		};
	}

	/**
	 * Generate span ID
	 */
	private generateSpanId(): string {
		return `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Generate trace ID
	 */
	private generateTraceId(): string {
		return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Get trace ID from parent span
	 */
	private getTraceId(parentSpanId: string): string {
		const parentSpan = this.spans.get(parentSpanId);
		return parentSpan?.context.traceId || this.generateTraceId();
	}
}
