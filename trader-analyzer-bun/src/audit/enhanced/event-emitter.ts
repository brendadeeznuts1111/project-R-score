/**
 * @fileoverview Enhanced Event Emitter
 * @description Event system with metrics and WebSocket streaming
 * @module audit/enhanced/event-emitter
 */

import { EventEmitter } from "events";
import type { WebSocket } from "ws";

/**
 * Pattern match event
 */
export interface PatternMatch {
	pattern: string;
	file: string;
	line: number;
	column: number;
}

/**
 * Orphaned number event
 */
export interface OrphanedNumber {
	number: string;
	type: string;
	location?: string;
}

/**
 * Audit results event
 */
export interface AuditResults {
	matches: PatternMatch[];
	orphans: OrphanedNumber[];
	executionTime: number;
}

/**
 * Real-time update event
 */
export interface RealTimeUpdate {
	type: string;
	data: any;
	timestamp: number;
}

/**
 * Scan progress event
 */
export interface ScanProgress {
	scanned: number;
	total: number;
	currentFile: string;
	percentage: number;
}

/**
 * Scan error event
 */
export interface ScanError {
	file: string;
	error: string;
	timestamp: number;
}

/**
 * Validation result event
 */
export interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

/**
 * Reference link event
 */
export interface ReferenceLink {
	from: string;
	to: string;
	type: string;
}

/**
 * Broken reference event
 */
export interface BrokenReference {
	from: string;
	to: string;
	location: string;
}

/**
 * Event metrics
 */
export interface EventMetrics {
	totalEvents: number;
	eventsByType: Map<string, number>;
	lastEmitted: Map<string, number>;
	subscriptions: Map<string, Set<Function>>;
}

/**
 * Event filter
 */
export interface EventFilter {
	types?: string[];
	includeMetadata?: boolean;
	minPriority?: number;
}

/**
 * Event bus
 */
export class EventBus extends EventEmitter {
	constructor(
		private source: EnhancedEventEmitter,
		private filter?: EventFilter,
	) {
		super();
		this.setupFilteredSubscriptions();
	}

	private setupFilteredSubscriptions(): void {
		// Subscribe to filtered events from source
		this.source.on("*", (event: string, data: any) => {
			if (this.shouldInclude(event, data)) {
				this.emit("event", { event, data });
			}
		});
	}

	private shouldInclude(event: string, data: any): boolean {
		if (!this.filter) return true;
		if (this.filter.types && !this.filter.types.includes(event)) return false;
		return true;
	}
}

/**
 * Timeout error
 */
export interface TimeoutError {
	type: "timeout";
	operationId: string;
	timeoutMs: number;
	timestamp: number;
}

/**
 * Enhanced Event Emitter Interface
 */
export interface AuditEventEmitter {
	// Core events
	on(event: "pattern-match", listener: (match: PatternMatch) => void): this;
	on(
		event: "orphan-detected",
		listener: (orphan: OrphanedNumber) => void,
	): this;
	on(event: "audit-complete", listener: (results: AuditResults) => void): this;
	on(
		event: "real-time-update",
		listener: (update: RealTimeUpdate) => void,
	): this;

	// System events
	on(event: "scan-started", listener: (scanId: string) => void): this;
	on(event: "scan-progress", listener: (progress: ScanProgress) => void): this;
	on(event: "scan-error", listener: (error: ScanError) => void): this;

	// Validation events
	on(
		event: "validation-passed",
		listener: (validation: ValidationResult) => void,
	): this;
	on(
		event: "validation-failed",
		listener: (validation: ValidationResult) => void,
	): this;

	// Cross-reference events
	on(
		event: "reference-created",
		listener: (reference: ReferenceLink) => void,
	): this;
	on(
		event: "reference-broken",
		listener: (broken: BrokenReference) => void,
	): this;
}

/**
 * Enhanced Event Emitter
 */
export class EnhancedEventEmitter
	extends EventEmitter
	implements AuditEventEmitter
{
	private metrics: EventMetrics = {
		totalEvents: 0,
		eventsByType: new Map(),
		lastEmitted: new Map(),
		subscriptions: new Map(),
	};

	/**
	 * Emit with metrics
	 */
	emit(event: string | symbol, ...args: any[]): boolean {
		this.updateMetrics(event);

		// Add metadata to event
		const enhancedArgs = args.map((arg) => ({
			...arg,
			_metadata: {
				timestamp: Date.now(),
				eventId: this.generateEventId(event),
				source: "audit-system",
			},
		}));

		// Emit with enhanced tracing
		const result = super.emit(event, ...enhancedArgs);

		// Cross-emit for system monitoring
		if (this.shouldCrossEmit(event)) {
			this.crossEmit(event, enhancedArgs);
		}

		return result;
	}

	/**
	 * Update metrics
	 */
	private updateMetrics(event: string | symbol): void {
		const eventName = String(event);
		this.metrics.totalEvents++;
		this.metrics.eventsByType.set(
			eventName,
			(this.metrics.eventsByType.get(eventName) || 0) + 1,
		);
		this.metrics.lastEmitted.set(eventName, Date.now());
	}

	/**
	 * Generate event ID
	 */
	private generateEventId(event: string | symbol): string {
		return `${String(event)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Check if should cross-emit
	 */
	private shouldCrossEmit(event: string | symbol): boolean {
		const criticalEvents = [
			"scan-error",
			"validation-failed",
			"reference-broken",
		];
		return criticalEvents.includes(String(event));
	}

	/**
	 * Cross-emit for monitoring
	 */
	private crossEmit(event: string | symbol, args: any[]): void {
		this.emit("system-monitor", {
			event: String(event),
			args,
			timestamp: Date.now(),
		});
	}

	/**
	 * Create event bus
	 */
	createEventBus(filter?: EventFilter): EventBus {
		return new EventBus(this, filter);
	}

	/**
	 * Stream to WebSocket
	 */
	async streamToWebSocket(socket: WebSocket): Promise<void> {
		const streamHandler = (event: string, data: any) => {
			if (socket.readyState === 1) {
				// WebSocket.OPEN
				socket.send(
					JSON.stringify({
						type: "audit-event",
						event,
						data,
						timestamp: Date.now(),
					}),
				);
			}
		};

		// Subscribe to all events
		this.eventNames().forEach((event) => {
			this.on(event as string, (data) => {
				streamHandler(event as string, data);
			});
		});

		// Handle socket close
		socket.on("close", () => {
			// Cleanup subscriptions if needed
		});
	}

	/**
	 * Get metrics
	 */
	getMetrics(): EventMetrics {
		return { ...this.metrics };
	}
}
