/**
 * @fileoverview High-Performance Tick Processor
 * @description Processes raw ticks with line movement, velocity, and latency tracking
 * @module ticks/processor
 */

import type {
	LatencyStats,
	LineMovement,
	MovementAlert,
	ProcessedTick,
	RawTick,
	TickBuffer,
	TickProcessorCallbacks,
	TickProcessorConfig,
	TickStats,
	VelocityWindow,
} from "./types";

const DEFAULT_CONFIG: TickProcessorConfig = {
	velocityWindowMs: 1000,
	movementThresholdBps: 1,
	historySize: 10000,
	latencyWindowMs: 60000,
	enableProfiling: false,
	profilingIntervalMs: 1000,
};

/**
 * High-performance ring buffer for tick storage
 */
class TickRingBuffer {
	private buffer: ProcessedTick[];
	private head = 0;
	private tail = 0;
	private _count = 0;
	private capacity: number;

	constructor(capacity: number) {
		this.capacity = capacity;
		this.buffer = new Array(capacity);
	}

	push(tick: ProcessedTick): void {
		this.buffer[this.head] = tick;
		this.head = (this.head + 1) % this.capacity;
		if (this._count < this.capacity) {
			this._count++;
		} else {
			this.tail = (this.tail + 1) % this.capacity;
		}
	}

	get(index: number): ProcessedTick | undefined {
		if (index < 0 || index >= this._count) return undefined;
		return this.buffer[(this.tail + index) % this.capacity];
	}

	getLast(n: number): ProcessedTick[] {
		const result: ProcessedTick[] = [];
		const start = Math.max(0, this._count - n);
		for (let i = start; i < this._count; i++) {
			const tick = this.get(i);
			if (tick) result.push(tick);
		}
		return result;
	}

	getRange(startTime: number, endTime: number): ProcessedTick[] {
		const result: ProcessedTick[] = [];
		for (let i = 0; i < this._count; i++) {
			const tick = this.get(i);
			if (tick && tick.timestamp >= startTime && tick.timestamp <= endTime) {
				result.push(tick);
			}
		}
		return result;
	}

	get count(): number {
		return this._count;
	}

	get last(): ProcessedTick | undefined {
		if (this._count === 0) return undefined;
		return this.buffer[(this.head - 1 + this.capacity) % this.capacity];
	}

	clear(): void {
		this.head = 0;
		this.tail = 0;
		this._count = 0;
	}
}

/**
 * TickProcessor - High-performance tick processing engine
 *
 * Features:
 * - Sub-microsecond tick processing using Bun.nanoseconds()
 * - Ring buffer for memory-efficient history
 * - Real-time line movement detection
 * - Velocity and acceleration calculation
 * - Latency percentile tracking
 * - Movement alerts
 */
export class TickProcessor {
	private config: TickProcessorConfig;
	private callbacks: TickProcessorCallbacks;
	private buffers: Map<string, TickRingBuffer> = new Map();
	private latencies: Map<string, number[]> = new Map();
	private velocities: Map<string, VelocityWindow> = new Map();
	private lastMovements: Map<string, LineMovement> = new Map();
	private seqNum = 0;
	private startTime: number;
	private tickCount = 0;
	private processingTimeNs = 0n;

	constructor(
		config?: Partial<TickProcessorConfig>,
		callbacks?: TickProcessorCallbacks,
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.callbacks = callbacks ?? {};
		this.startTime = Date.now();
	}

	/**
	 * Process a raw tick - main entry point
	 */
	processTick(raw: RawTick): ProcessedTick {
		const startNs = Bun.nanoseconds();

		// Calculate derived metrics
		const mid = (raw.bid + raw.ask) / 2;
		const spread = raw.ask - raw.bid;
		const spreadBps = mid > 0 ? (spread / mid) * 10000 : 0;
		const latencyMs = (startNs - raw.receivedAt) / 1e6;

		const processed: ProcessedTick = {
			...raw,
			mid,
			spread,
			spreadBps,
			latencyMs,
			seqNum: this.seqNum++,
		};

		// Get or create buffer for this instrument
		const key = `${raw.venue}:${raw.instrumentId}`;
		let buffer = this.buffers.get(key);
		if (!buffer) {
			buffer = new TickRingBuffer(this.config.historySize);
			this.buffers.set(key, buffer);
		}

		// Store tick
		buffer.push(processed);

		// Track latency
		this.trackLatency(key, latencyMs);

		// Detect line movement
		const movement = this.detectMovement(key, processed, buffer);
		if (movement) {
			this.lastMovements.set(key, movement);
			this.callbacks.onMovement?.(movement);

			// Check for alerts
			const alert = this.checkAlerts(movement);
			if (alert) {
				this.callbacks.onAlert?.(alert);
			}
		}

		// Update velocity window
		this.updateVelocity(key, processed, buffer);

		// Emit tick callback
		this.callbacks.onTick?.(processed);

		// Track processing time
		const endNs = Bun.nanoseconds();
		this.processingTimeNs += BigInt(endNs - startNs);
		this.tickCount++;

		return processed;
	}

	/**
	 * Batch process multiple ticks
	 */
	processBatch(ticks: RawTick[]): ProcessedTick[] {
		return ticks.map((t) => this.processTick(t));
	}

	/**
	 * Track latency for percentile calculation
	 */
	private trackLatency(key: string, latencyMs: number): void {
		let latencies = this.latencies.get(key);
		if (!latencies) {
			latencies = [];
			this.latencies.set(key, latencies);
		}

		latencies.push(latencyMs);

		// Trim old latencies based on window
		const cutoff = Date.now() - this.config.latencyWindowMs;
		// Simple approach: keep last N entries
		if (latencies.length > 10000) {
			latencies.splice(0, latencies.length - 10000);
		}
	}

	/**
	 * Detect line movement from previous tick
	 */
	private detectMovement(
		key: string,
		current: ProcessedTick,
		buffer: TickRingBuffer,
	): LineMovement | null {
		if (buffer.count < 2) return null;

		const previous = buffer.get(buffer.count - 2);
		if (!previous) return null;

		const delta = current.mid - previous.mid;
		const deltaBps = previous.mid > 0 ? (delta / previous.mid) * 10000 : 0;

		// Check if movement exceeds threshold
		if (Math.abs(deltaBps) < this.config.movementThresholdBps) {
			return null;
		}

		const timeDelta = current.timestamp - previous.timestamp;
		const velocity = timeDelta > 0 ? (deltaBps / timeDelta) * 1000 : 0; // bps/s

		// Get last movement for acceleration
		const lastMove = this.lastMovements.get(key);
		const acceleration = lastMove ? velocity - lastMove.velocity : 0;

		// Count ticks since last movement
		let ticksSinceMove = 1;
		let timeSinceMove = timeDelta;
		if (lastMove) {
			const lastMoveTime = lastMove.timestamp;
			for (let i = buffer.count - 2; i >= 0; i--) {
				const tick = buffer.get(i);
				if (!tick || tick.timestamp <= lastMoveTime) break;
				ticksSinceMove++;
			}
			timeSinceMove = current.timestamp - lastMoveTime;
		}

		return {
			instrumentId: current.instrumentId,
			venue: current.venue,
			timestamp: current.timestamp,
			previousMid: previous.mid,
			currentMid: current.mid,
			delta,
			deltaBps,
			direction: delta > 0 ? "up" : delta < 0 ? "down" : "unchanged",
			velocity,
			acceleration,
			ticksSinceMove,
			timeSinceMove,
		};
	}

	/**
	 * Update velocity window
	 */
	private updateVelocity(
		key: string,
		current: ProcessedTick,
		buffer: TickRingBuffer,
	): void {
		const windowStart = current.timestamp - this.config.velocityWindowMs;
		const windowTicks = buffer.getRange(windowStart, current.timestamp);

		if (windowTicks.length < 2) return;

		const first = windowTicks[0];
		const last = windowTicks[windowTicks.length - 1];

		// Calculate OHLC for the window
		let high = first.mid;
		let low = first.mid;
		const mids: number[] = [];
		const deltas: number[] = [];

		for (let i = 0; i < windowTicks.length; i++) {
			const tick = windowTicks[i];
			high = Math.max(high, tick.mid);
			low = Math.min(low, tick.mid);
			mids.push(tick.mid);

			if (i > 0) {
				const prev = windowTicks[i - 1];
				const d = prev.mid > 0 ? ((tick.mid - prev.mid) / prev.mid) * 10000 : 0;
				deltas.push(d);
			}
		}

		// Calculate velocity (bps/s)
		const timeDelta = last.timestamp - first.timestamp;
		const priceDelta =
			first.mid > 0 ? ((last.mid - first.mid) / first.mid) * 10000 : 0;
		const velocity = timeDelta > 0 ? (priceDelta / timeDelta) * 1000 : 0;

		// Calculate acceleration
		const prevVelocity = this.velocities.get(key);
		const acceleration = prevVelocity ? velocity - prevVelocity.velocity : 0;

		// Calculate volatility (std dev of changes)
		const volatility = deltas.length > 0 ? this.stdDev(deltas) : 0;

		const velocityWindow: VelocityWindow = {
			instrumentId: current.instrumentId,
			venue: current.venue,
			windowStart: first.timestamp,
			windowEnd: last.timestamp,
			ticks: windowTicks.length,
			openMid: first.mid,
			closeMid: last.mid,
			highMid: high,
			lowMid: low,
			velocity,
			acceleration,
			volatility,
			direction:
				velocity > 5 ? "bullish" : velocity < -5 ? "bearish" : "neutral",
		};

		this.velocities.set(key, velocityWindow);
		this.callbacks.onVelocityUpdate?.(velocityWindow);
	}

	/**
	 * Check for movement alerts
	 */
	private checkAlerts(movement: LineMovement): MovementAlert | null {
		const thresholds = {
			sharp_move: 50, // 50 bps
			velocity_spike: 100, // 100 bps/s
		};

		if (Math.abs(movement.deltaBps) >= thresholds.sharp_move) {
			return {
				type: "sharp_move",
				instrumentId: movement.instrumentId,
				venue: movement.venue,
				timestamp: movement.timestamp,
				severity: Math.abs(movement.deltaBps) >= 100 ? "critical" : "warning",
				message: `Sharp ${movement.direction} move: ${movement.deltaBps.toFixed(1)} bps`,
				data: {
					current: movement.currentMid,
					previous: movement.previousMid,
					threshold: thresholds.sharp_move,
					delta: movement.deltaBps,
				},
			};
		}

		if (Math.abs(movement.velocity) >= thresholds.velocity_spike) {
			return {
				type: "velocity_spike",
				instrumentId: movement.instrumentId,
				venue: movement.venue,
				timestamp: movement.timestamp,
				severity: Math.abs(movement.velocity) >= 200 ? "critical" : "warning",
				message: `Velocity spike: ${movement.velocity.toFixed(1)} bps/s`,
				data: {
					current: movement.velocity,
					previous: 0,
					threshold: thresholds.velocity_spike,
					delta: movement.velocity,
				},
			};
		}

		return null;
	}

	/**
	 * Get latency statistics for a key
	 */
	getLatencyStats(venue: string, instrumentId?: string): LatencyStats | null {
		const key = instrumentId ? `${venue}:${instrumentId}` : venue;
		const latencies = this.latencies.get(key);

		if (!latencies || latencies.length === 0) {
			// Try to aggregate all instruments for venue
			if (!instrumentId) {
				const allLatencies: number[] = [];
				for (const [k, v] of this.latencies) {
					if (k.startsWith(`${venue}:`)) {
						allLatencies.push(...v);
					}
				}
				if (allLatencies.length === 0) return null;
				return this.calculateLatencyStats(venue, undefined, allLatencies);
			}
			return null;
		}

		return this.calculateLatencyStats(venue, instrumentId, latencies);
	}

	private calculateLatencyStats(
		venue: string,
		instrumentId: string | undefined,
		latencies: number[],
	): LatencyStats {
		const sorted = [...latencies].sort((a, b) => a - b);
		const n = sorted.length;

		const sum = sorted.reduce((a, b) => a + b, 0);
		const mean = sum / n;
		const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
		const stdDev = Math.sqrt(variance);

		// Calculate jitter (variation in consecutive samples)
		let jitter = 0;
		for (let i = 1; i < sorted.length; i++) {
			jitter += Math.abs(sorted[i] - sorted[i - 1]);
		}
		jitter = sorted.length > 1 ? jitter / (sorted.length - 1) : 0;

		return {
			venue,
			instrumentId,
			windowMs: this.config.latencyWindowMs,
			sampleCount: n,
			min: sorted[0],
			max: sorted[n - 1],
			mean,
			median: sorted[Math.floor(n / 2)],
			p50: sorted[Math.floor(n * 0.5)],
			p90: sorted[Math.floor(n * 0.9)],
			p95: sorted[Math.floor(n * 0.95)],
			p99: sorted[Math.floor(n * 0.99)],
			stdDev,
			jitter,
		};
	}

	/**
	 * Get velocity for an instrument
	 */
	getVelocity(venue: string, instrumentId: string): VelocityWindow | null {
		return this.velocities.get(`${venue}:${instrumentId}`) ?? null;
	}

	/**
	 * Get all velocities
	 */
	getAllVelocities(): VelocityWindow[] {
		return Array.from(this.velocities.values());
	}

	/**
	 * Get tick statistics for an instrument
	 */
	getTickStats(
		venue: string,
		instrumentId: string,
		windowMs = 60000,
	): TickStats | null {
		const key = `${venue}:${instrumentId}`;
		const buffer = this.buffers.get(key);
		if (!buffer || buffer.count === 0) return null;

		const now = Date.now();
		const windowStart = now - windowMs;
		const ticks = buffer.getRange(windowStart, now);

		if (ticks.length === 0) return null;

		let totalSpread = 0;
		let minSpread = Infinity;
		let maxSpread = 0;
		let totalLatency = 0;
		let movements = 0;
		let upMoves = 0;
		let downMoves = 0;

		for (let i = 0; i < ticks.length; i++) {
			const tick = ticks[i];
			totalSpread += tick.spreadBps;
			minSpread = Math.min(minSpread, tick.spreadBps);
			maxSpread = Math.max(maxSpread, tick.spreadBps);
			totalLatency += tick.latencyMs;

			if (i > 0) {
				const prev = ticks[i - 1];
				const delta =
					prev.mid > 0 ? ((tick.mid - prev.mid) / prev.mid) * 10000 : 0;
				if (Math.abs(delta) >= this.config.movementThresholdBps) {
					movements++;
					if (delta > 0) upMoves++;
					else if (delta < 0) downMoves++;
				}
			}
		}

		const first = ticks[0];
		const last = ticks[ticks.length - 1];
		const netMovement =
			first.mid > 0 ? ((last.mid - first.mid) / first.mid) * 10000 : 0;
		const velocity = this.velocities.get(key);

		return {
			venue,
			instrumentId,
			windowStart,
			windowEnd: now,
			tickCount: ticks.length,
			tickRate: ticks.length / (windowMs / 1000),
			avgSpreadBps: totalSpread / ticks.length,
			minSpreadBps: minSpread === Infinity ? 0 : minSpread,
			maxSpreadBps: maxSpread,
			avgLatencyMs: totalLatency / ticks.length,
			movements,
			upMoves,
			downMoves,
			netMovement,
			totalVolatility: velocity?.volatility ?? 0,
		};
	}

	/**
	 * Get processing performance metrics
	 */
	getPerformanceMetrics(): {
		tickCount: number;
		uptime: number;
		avgProcessingNs: number;
		throughput: number;
	} {
		const uptime = Date.now() - this.startTime;
		return {
			tickCount: this.tickCount,
			uptime,
			avgProcessingNs:
				this.tickCount > 0
					? Number(this.processingTimeNs / BigInt(this.tickCount))
					: 0,
			throughput: uptime > 0 ? (this.tickCount / uptime) * 1000 : 0,
		};
	}

	/**
	 * Get recent ticks for an instrument
	 */
	getRecentTicks(
		venue: string,
		instrumentId: string,
		count = 100,
	): ProcessedTick[] {
		const buffer = this.buffers.get(`${venue}:${instrumentId}`);
		return buffer ? buffer.getLast(count) : [];
	}

	/**
	 * Get last movement for an instrument
	 */
	getLastMovement(venue: string, instrumentId: string): LineMovement | null {
		return this.lastMovements.get(`${venue}:${instrumentId}`) ?? null;
	}

	/**
	 * Clear all data
	 */
	clear(): void {
		this.buffers.clear();
		this.latencies.clear();
		this.velocities.clear();
		this.lastMovements.clear();
		this.seqNum = 0;
		this.tickCount = 0;
		this.processingTimeNs = 0n;
		this.startTime = Date.now();
	}

	/**
	 * Calculate standard deviation
	 */
	private stdDev(values: number[]): number {
		if (values.length === 0) return 0;
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const variance =
			values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
		return Math.sqrt(variance);
	}
}

/**
 * Create a tick processor instance
 */
export function createTickProcessor(
	config?: Partial<TickProcessorConfig>,
	callbacks?: TickProcessorCallbacks,
): TickProcessor {
	return new TickProcessor(config, callbacks);
}

/**
 * Global tick processor instance
 */
export const globalTickProcessor = new TickProcessor();
