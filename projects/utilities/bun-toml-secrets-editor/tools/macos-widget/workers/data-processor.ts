#!/usr/bin/env bun
// Worker Thread for Heavy Data Processing
// Offloads intensive operations from main thread

import { parentPort, workerData } from "worker_threads";

interface WorkerMessage {
	type: "process" | "benchmark" | "optimize";
	data: any;
	id: string;
}

interface WorkerResponse {
	type: "result" | "error" | "progress";
	data: any;
	id: string;
	timestamp: number;
}

class DataProcessorWorker {
	private widgetId: string;
	private performanceMode: boolean;

	constructor(workerData: any) {
		this.widgetId = workerData.widgetId || "default";
		this.performanceMode = workerData.performanceMode || false;

		console.log(
			`🔧 Data processor worker initialized for widget: ${this.widgetId}`,
		);
	}

	async processLargeDataset(data: number[]): Promise<number[]> {
		const start = performance.now();

		// ARM64-optimized data processing
		const result = new Float64Array(data.length);

		// Process in cache-friendly chunks for ARM64
		const chunkSize = 1024;
		for (let i = 0; i < data.length; i += chunkSize) {
			const end = Math.min(i + chunkSize, data.length);

			// ARM64 optimized loop with predictable operations
			for (let j = i; j < end; j++) {
				// JIT-friendly monomorphic operations
				result[j] = data[j] * 1.1 + Math.sin(j) * 0.1;
			}

			// Yield control periodically to prevent blocking
			if (i % (chunkSize * 10) === 0) {
				await new Promise((resolve) => setTimeout(resolve, 0));
			}
		}

		const duration = performance.now() - start;
		console.log(
			`📊 Worker processed ${data.length} items in ${duration.toFixed(2)}ms`,
		);

		return Array.from(result);
	}

	async runBenchmark(): Promise<
		{ operation: string; duration: number; throughput: number }[]
	> {
		const results: {
			operation: string;
			duration: number;
			throughput: number;
		}[] = [];

		// Buffer operations benchmark
		const bufferStart = performance.now();
		for (let i = 0; i < 10000; i++) {
			const buffer = Buffer.alloc(1024);
			buffer.fill(i % 256);
		}
		const bufferDuration = performance.now() - bufferStart;
		results.push({
			operation: "Buffer Allocation",
			duration: bufferDuration,
			throughput: (10000 / bufferDuration) * 1000,
		});

		// Math operations benchmark
		const mathData = new Float64Array(10000);
		for (let i = 0; i < mathData.length; i++) {
			mathData[i] = Math.random();
		}

		const mathStart = performance.now();
		let result = 0.0;
		for (let i = 0; i < mathData.length; i++) {
			result += Math.sin(mathData[i]) * Math.cos(mathData[i]);
		}
		const mathDuration = performance.now() - mathStart;
		results.push({
			operation: "Math Operations",
			duration: mathDuration,
			throughput: (10000 / mathDuration) * 1000,
		});

		return results;
	}

	async optimizeMemoryUsage(): Promise<{
		before: number;
		after: number;
		saved: number;
	}> {
		const before = process.memoryUsage().heapUsed;

		// Simulate memory optimization
		const arrays: Buffer[] = [];
		for (let i = 0; i < 100; i++) {
			arrays.push(Buffer.alloc(1024 * 1024)); // 1MB each
		}

		// Clear memory
		arrays.length = 0;

		// Force garbage collection if available
		if (global.gc) {
			global.gc();
		}

		const after = process.memoryUsage().heapUsed;
		const saved = before - after;

		return { before, after, saved };
	}
}

// Initialize worker
const processor = new DataProcessorWorker(workerData);

// Handle messages from main thread
parentPort?.on("message", async (message: WorkerMessage) => {
	try {
		let result: any;

		switch (message.type) {
			case "process":
				result = await processor.processLargeDataset(message.data);
				break;
			case "benchmark":
				result = await processor.runBenchmark();
				break;
			case "optimize":
				result = await processor.optimizeMemoryUsage();
				break;
			default:
				throw new Error(`Unknown message type: ${message.type}`);
		}

		parentPort?.postMessage({
			type: "result",
			data: result,
			id: message.id,
			timestamp: Date.now(),
		} as WorkerResponse);
	} catch (error) {
		parentPort?.postMessage({
			type: "error",
			data: error instanceof Error ? error.message : String(error),
			id: message.id,
			timestamp: Date.now(),
		} as WorkerResponse);
	}
});

// Signal that worker is ready
parentPort?.postMessage({
	type: "result",
	data: { status: "ready", widgetId: processor["widgetId"] },
	id: "init",
	timestamp: Date.now(),
} as WorkerResponse);
