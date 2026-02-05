/**
 * @fileoverview CPU Profiler for Tick Processing
 * @description Real-time CPU and memory profiling using Bun's native APIs
 * @module ticks/profiler
 */

import type { ProfileSample, ProfilingReport } from "./types";

/**
 * Profiler configuration
 */
interface ProfilerConfig {
	sampleIntervalMs: number; // How often to sample (default: 100ms)
	maxSamples: number; // Max samples to keep (default: 10000)
	enableGcTracking: boolean; // Track GC pauses
	heapSnapshotPath?: string; // Path for heap snapshots
}

const DEFAULT_CONFIG: ProfilerConfig = {
	sampleIntervalMs: 100,
	maxSamples: 10000,
	enableGcTracking: true,
};

/**
 * TickProfiler - Real-time performance profiling
 *
 * Features:
 * - CPU usage tracking
 * - Memory usage tracking with heap stats
 * - GC pause detection
 * - Tick processing throughput
 * - Heap snapshot generation
 */
export class TickProfiler {
	private config: ProfilerConfig;
	private samples: ProfileSample[] = [];
	private isRunning = false;
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private startTime = 0;
	private lastSampleTime = 0;
	private lastCpuUsage: NodeJS.CpuUsage | null = null;
	private ticksProcessed = 0;
	private processingTimeNs = 0;
	private gcPauses = 0;

	constructor(config?: Partial<ProfilerConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Start profiling
	 */
	start(): void {
		if (this.isRunning) return;

		this.isRunning = true;
		this.startTime = Date.now();
		this.lastSampleTime = this.startTime;
		this.samples = [];
		this.ticksProcessed = 0;
		this.processingTimeNs = 0;
		this.gcPauses = 0;

		// Get initial CPU usage
		this.lastCpuUsage = process.cpuUsage();

		// Start sampling
		this.intervalId = setInterval(() => {
			this.takeSample();
		}, this.config.sampleIntervalMs);

		console.log(
			`TickProfiler: Started (sampling every ${this.config.sampleIntervalMs}ms)`,
		);
	}

	/**
	 * Stop profiling
	 */
	stop(): ProfilingReport {
		if (!this.isRunning) {
			return this.generateReport();
		}

		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		this.isRunning = false;
		console.log("TickProfiler: Stopped");

		return this.generateReport();
	}

	/**
	 * Record tick processing
	 */
	recordTick(processingNs: number): void {
		this.ticksProcessed++;
		this.processingTimeNs += processingNs;
	}

	/**
	 * Record GC pause
	 */
	recordGcPause(): void {
		this.gcPauses++;
	}

	/**
	 * Take a sample
	 */
	private takeSample(): void {
		const now = Date.now();
		const memUsage = process.memoryUsage();

		// Calculate CPU usage since last sample
		const cpuUsage = process.cpuUsage(this.lastCpuUsage ?? undefined);
		this.lastCpuUsage = process.cpuUsage();

		// CPU percentage calculation
		const elapsedMs = now - this.lastSampleTime;
		const totalCpuTime = (cpuUsage.user + cpuUsage.system) / 1000; // Convert to ms
		const cpuPercent = elapsedMs > 0 ? (totalCpuTime / elapsedMs) * 100 : 0;

		// Calculate processing metrics since last sample
		const ticksDelta = this.ticksProcessed;
		const processingDelta = this.processingTimeNs;

		const sample: ProfileSample = {
			timestamp: now,
			cpuUsage: Math.min(100, cpuPercent), // Cap at 100%
			heapUsed: memUsage.heapUsed,
			heapTotal: memUsage.heapTotal,
			ticksProcessed: ticksDelta,
			processingTimeNs: processingDelta,
			gcPauses: this.gcPauses,
		};

		this.samples.push(sample);

		// Trim samples if exceeding max
		if (this.samples.length > this.config.maxSamples) {
			this.samples.splice(0, this.samples.length - this.config.maxSamples);
		}

		// Reset counters for next sample
		this.ticksProcessed = 0;
		this.processingTimeNs = 0;
		this.gcPauses = 0;
		this.lastSampleTime = now;
	}

	/**
	 * Generate profiling report
	 */
	generateReport(): ProfilingReport {
		const endTime = Date.now();
		const duration = endTime - this.startTime;

		if (this.samples.length === 0) {
			return {
				startTime: this.startTime,
				endTime,
				duration,
				samples: [],
				avgCpuUsage: 0,
				peakCpuUsage: 0,
				avgHeapUsed: 0,
				peakHeapUsed: 0,
				totalTicksProcessed: 0,
				avgTickProcessingNs: 0,
				throughput: 0,
			};
		}

		// Calculate aggregates
		let totalCpu = 0;
		let peakCpu = 0;
		let totalHeap = 0;
		let peakHeap = 0;
		let totalTicks = 0;
		let totalProcessingNs = 0;

		for (const sample of this.samples) {
			totalCpu += sample.cpuUsage;
			peakCpu = Math.max(peakCpu, sample.cpuUsage);
			totalHeap += sample.heapUsed;
			peakHeap = Math.max(peakHeap, sample.heapUsed);
			totalTicks += sample.ticksProcessed;
			totalProcessingNs += sample.processingTimeNs;
		}

		const n = this.samples.length;

		return {
			startTime: this.startTime,
			endTime,
			duration,
			samples: this.samples,
			avgCpuUsage: totalCpu / n,
			peakCpuUsage: peakCpu,
			avgHeapUsed: totalHeap / n,
			peakHeapUsed: peakHeap,
			totalTicksProcessed: totalTicks,
			avgTickProcessingNs: totalTicks > 0 ? totalProcessingNs / totalTicks : 0,
			throughput: duration > 0 ? (totalTicks / duration) * 1000 : 0,
		};
	}

	/**
	 * Get current stats
	 */
	getCurrentStats(): {
		isRunning: boolean;
		uptime: number;
		sampleCount: number;
		lastSample: ProfileSample | null;
		memoryUsage: NodeJS.MemoryUsage;
	} {
		return {
			isRunning: this.isRunning,
			uptime: Date.now() - this.startTime,
			sampleCount: this.samples.length,
			lastSample:
				this.samples.length > 0 ? this.samples[this.samples.length - 1] : null,
			memoryUsage: process.memoryUsage(),
		};
	}

	/**
	 * Get recent samples
	 */
	getRecentSamples(count = 100): ProfileSample[] {
		return this.samples.slice(-count);
	}

	/**
	 * Take a heap snapshot
	 */
	async takeHeapSnapshot(path?: string): Promise<string> {
		const snapshotPath =
			path ??
			this.config.heapSnapshotPath ??
			`./data/heap-${Date.now()}.heapsnapshot`;

		// Use Bun's heap snapshot API
		const snapshot = Bun.generateHeapSnapshot();
		await Bun.write(snapshotPath, JSON.stringify(snapshot));

		console.log(`TickProfiler: Heap snapshot saved to ${snapshotPath}`);
		return snapshotPath;
	}

	/**
	 * Force garbage collection (if available)
	 */
	forceGc(): void {
		if (typeof Bun.gc === "function") {
			Bun.gc(true);
			console.log("TickProfiler: Forced garbage collection");
		}
	}

	/**
	 * Get CPU profile CLI command
	 */
	getCpuProfileCommand(duration = 5000): string {
		return `bun --cpu-prof --cpu-prof-dir=./data --cpu-prof-name=profile-{ts}.cpuprofile src/index.ts`;
	}

	/**
	 * Format bytes for display
	 */
	static formatBytes(bytes: number): string {
		if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
		if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
		if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
		return `${bytes} B`;
	}

	/**
	 * Format nanoseconds for display
	 */
	static formatNs(ns: number): string {
		if (ns >= 1e9) return `${(ns / 1e9).toFixed(2)}s`;
		if (ns >= 1e6) return `${(ns / 1e6).toFixed(2)}ms`;
		if (ns >= 1e3) return `${(ns / 1e3).toFixed(2)}µs`;
		return `${ns}ns`;
	}
}

/**
 * Create a profiler instance
 */
export function createProfiler(config?: Partial<ProfilerConfig>): TickProfiler {
	return new TickProfiler(config);
}

/**
 * Global profiler instance
 */
export const globalProfiler = new TickProfiler();

/**
 * Benchmark helper for measuring function performance
 */
export async function benchmark<T>(
	name: string,
	fn: () => T | Promise<T>,
	iterations = 1000,
): Promise<{
	name: string;
	iterations: number;
	totalNs: number;
	avgNs: number;
	minNs: number;
	maxNs: number;
	opsPerSec: number;
}> {
	const times: number[] = [];

	// Warmup
	for (let i = 0; i < Math.min(100, iterations / 10); i++) {
		await fn();
	}

	// Actual benchmark
	for (let i = 0; i < iterations; i++) {
		const start = Bun.nanoseconds();
		await fn();
		const end = Bun.nanoseconds();
		times.push(end - start);
	}

	times.sort((a, b) => a - b);
	const totalNs = times.reduce((a, b) => a + b, 0);

	return {
		name,
		iterations,
		totalNs,
		avgNs: totalNs / iterations,
		minNs: times[0],
		maxNs: times[times.length - 1],
		opsPerSec: (iterations / totalNs) * 1e9,
	};
}
