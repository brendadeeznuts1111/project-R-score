/**
 * @fileoverview Tick Processing Types
 * @description Types for tick processing, line movement, velocity, and latency tracking
 * @module ticks/types
 */

/**
 * Raw tick from a venue
 */
export interface RawTick {
	venue: string;
	instrumentId: string;
	timestamp: number; // Venue timestamp (ms since epoch)
	receivedAt: number; // Local receive time (Bun.nanoseconds())
	bid: number;
	ask: number;
	bidSize?: number;
	askSize?: number;
	lastPrice?: number;
	lastSize?: number;
	volume24h?: number;
}

/**
 * Processed tick with derived metrics
 */
export interface ProcessedTick extends RawTick {
	mid: number; // Mid price
	spread: number; // Ask - Bid
	spreadBps: number; // Spread in basis points
	latencyMs: number; // Processing latency
	seqNum: number; // Sequence number
}

/**
 * Line movement event
 */
export interface LineMovement {
	instrumentId: string;
	venue: string;
	timestamp: number;
	previousMid: number;
	currentMid: number;
	delta: number; // Absolute change
	deltaBps: number; // Change in basis points
	direction: "up" | "down" | "unchanged";
	velocity: number; // Change per second (bps/s)
	acceleration: number; // Change in velocity
	ticksSinceMove: number;
	timeSinceMove: number; // ms since last move
}

/**
 * Velocity calculation window
 */
export interface VelocityWindow {
	instrumentId: string;
	venue: string;
	windowStart: number;
	windowEnd: number;
	ticks: number;
	openMid: number;
	closeMid: number;
	highMid: number;
	lowMid: number;
	velocity: number; // bps/s
	acceleration: number;
	volatility: number; // Standard deviation of changes
	direction: "bullish" | "bearish" | "neutral";
}

/**
 * Latency statistics
 */
export interface LatencyStats {
	venue: string;
	instrumentId?: string;
	windowMs: number;
	sampleCount: number;
	min: number;
	max: number;
	mean: number;
	median: number;
	p50: number;
	p90: number;
	p95: number;
	p99: number;
	stdDev: number;
	jitter: number; // Variation in latency
}

/**
 * Tick processor configuration
 */
export interface TickProcessorConfig {
	velocityWindowMs: number; // Window for velocity calculation (default: 1000)
	movementThresholdBps: number; // Min bps change to register as movement (default: 1)
	historySize: number; // Number of ticks to keep in history (default: 1000)
	latencyWindowMs: number; // Window for latency stats (default: 60000)
	enableProfiling: boolean; // Enable CPU profiling
	profilingIntervalMs: number; // Profiling sample interval
}

/**
 * Tick buffer for high-performance processing
 */
export interface TickBuffer {
	capacity: number;
	head: number;
	tail: number;
	count: number;
	ticks: ProcessedTick[];
}

/**
 * Aggregated tick statistics
 */
export interface TickStats {
	venue: string;
	instrumentId: string;
	windowStart: number;
	windowEnd: number;
	tickCount: number;
	tickRate: number; // Ticks per second
	avgSpreadBps: number;
	minSpreadBps: number;
	maxSpreadBps: number;
	avgLatencyMs: number;
	movements: number;
	upMoves: number;
	downMoves: number;
	netMovement: number; // Net bps change
	totalVolatility: number;
}

/**
 * CPU profiling sample
 */
export interface ProfileSample {
	timestamp: number;
	cpuUsage: number; // 0-100%
	heapUsed: number; // bytes
	heapTotal: number;
	ticksProcessed: number;
	processingTimeNs: number;
	gcPauses: number;
}

/**
 * Profiling report
 */
export interface ProfilingReport {
	startTime: number;
	endTime: number;
	duration: number;
	samples: ProfileSample[];
	avgCpuUsage: number;
	peakCpuUsage: number;
	avgHeapUsed: number;
	peakHeapUsed: number;
	totalTicksProcessed: number;
	avgTickProcessingNs: number;
	throughput: number; // Ticks per second
}

/**
 * Line movement alert
 */
export interface MovementAlert {
	type: "sharp_move" | "velocity_spike" | "spread_widen" | "spread_narrow";
	instrumentId: string;
	venue: string;
	timestamp: number;
	severity: "info" | "warning" | "critical";
	message: string;
	data: {
		current: number;
		previous: number;
		threshold: number;
		delta: number;
	};
}

/**
 * Tick processor callbacks
 */
export interface TickProcessorCallbacks {
	onTick?: (tick: ProcessedTick) => void;
	onMovement?: (movement: LineMovement) => void;
	onAlert?: (alert: MovementAlert) => void;
	onVelocityUpdate?: (velocity: VelocityWindow) => void;
	onStats?: (stats: TickStats) => void;
}
