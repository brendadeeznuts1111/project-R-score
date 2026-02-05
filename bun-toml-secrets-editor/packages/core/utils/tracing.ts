// utils/tracing.ts
// Simple distributed tracing for operation flows

export interface Span {
	traceId: string;
	spanId: string;
	parentSpanId?: string;
	operation: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	tags: Record<string, string>;
	logs: Array<{ timestamp: number; fields: Record<string, any> }>;
}

class Tracer {
	private spans: Map<string, Span> = new Map();
	private activeSpans: Map<string, string> = new Map(); // traceId -> spanId

	startSpan(
		operation: string,
		traceId?: string,
		parentSpanId?: string,
		tags?: Record<string, string>,
	): Span {
		const spanTraceId = traceId || this.generateId();
		const spanId = this.generateId();
		const startTime = performance.now();

		const span: Span = {
			traceId: spanTraceId,
			spanId,
			parentSpanId,
			operation,
			startTime,
			tags: tags || {},
			logs: [],
		};

		this.spans.set(spanId, span);
		this.activeSpans.set(spanTraceId, spanId);

		return span;
	}

	finishSpan(spanId: string, tags?: Record<string, string>): Span | undefined {
		const span = this.spans.get(spanId);
		if (!span) return undefined;

		span.endTime = performance.now();
		span.duration = span.endTime - span.startTime;
		if (tags) {
			Object.assign(span.tags, tags);
		}

		this.activeSpans.delete(span.traceId);
		return span;
	}

	logToSpan(spanId: string, fields: Record<string, any>): void {
		const span = this.spans.get(spanId);
		if (!span) return;

		span.logs.push({
			timestamp: performance.now(),
			fields,
		});
	}

	getTrace(traceId: string): Span[] {
		return Array.from(this.spans.values()).filter(
			(span) => span.traceId === traceId,
		);
	}

	getActiveSpan(traceId: string): Span | undefined {
		const spanId = this.activeSpans.get(traceId);
		if (!spanId) return undefined;
		return this.spans.get(spanId);
	}

	// Helper to run an operation with tracing
	async trace<T>(
		operation: string,
		fn: (span: Span) => Promise<T>,
		traceId?: string,
		parentSpanId?: string,
		tags?: Record<string, string>,
	): Promise<T> {
		const span = this.startSpan(operation, traceId, parentSpanId, tags);

		try {
			const result = await fn(span);
			this.finishSpan(span.spanId, { success: "true" });
			return result;
		} catch (error) {
			this.finishSpan(span.spanId, {
				success: "false",
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	// Export spans in a simple format
	exportSpans(traceId?: string): Span[] {
		if (traceId) {
			return this.getTrace(traceId);
		}
		return Array.from(this.spans.values());
	}

	// Clear spans (for testing or memory management)
	clear(): void {
		this.spans.clear();
		this.activeSpans.clear();
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}

// Singleton instance
export const tracer = new Tracer();

// Generate trace ID for request correlation
export function generateTraceId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
