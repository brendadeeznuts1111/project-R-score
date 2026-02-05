#!/usr/bin/env bun
/**
 * JSC (JavaScriptCore) Performance Monitor
 *
 * Uses Bun's JSC API for low-level performance profiling and memory monitoring.
 * https://bun.com/reference/bun/jsc
 */

import { formatBytes } from "./bytes.ts";

export interface MemorySnapshot {
	timestamp: string;
	heapSize: number;
	externalMemory: number;
	objects: Record<string, number>;
}

export interface ProfileResult {
	duration: number;
	tierBreakdown: {
		llint: number;
		baseline: number;
		dfg: number;
		ftl: number;
		jsBuiltin: number;
		wasm: number;
		host: number;
		regexp: number;
		cpp: number;
		unknown: number;
	};
	hottestFunctions: Array<{
		samples: number;
		name: string;
		sourceId: string;
	}>;
	bytecodes: string;
}

/**
 * Get current memory usage of the process
 */
export function getMemoryUsage(): {
	heapUsed: number;
	heapTotal: number;
	external: number;
	arrayBuffers: number;
} {
	// @ts-expect-error - Bun.jsc is available at runtime
	if (typeof Bun !== "undefined" && Bun.jsc) {
		// @ts-expect-error
		const usage = Bun.jsc.getMemoryUsage?.() || process.memoryUsage();
		return {
			heapUsed: usage.heapUsed || 0,
			heapTotal: usage.heapTotal || 0,
			external: usage.external || 0,
			arrayBuffers: usage.arrayBuffers || 0,
		};
	}

	// Fallback to process.memoryUsage()
	const usage = process.memoryUsage();
	return {
		heapUsed: usage.heapUsed,
		heapTotal: usage.heapTotal,
		external: usage.external,
		arrayBuffers: usage.arrayBuffers || 0,
	};
}

/**
 * Estimate memory usage of a specific object
 */
export function estimateObjectSize(obj: unknown): number {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.getMemoryUsage) {
		try {
			// @ts-expect-error
			return Bun.jsc.getMemoryUsage(obj);
		} catch {
			// Fall through to estimation
		}
	}

	// Rough estimation
	const str = JSON.stringify(obj);
	return str ? str.length * 2 : 0; // UTF-16 = 2 bytes per char
}

/**
 * Force garbage collection (if available)
 */
export function forceGC(): void {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.gcAndSweep) {
		// @ts-expect-error
		Bun.jsc.gcAndSweep();
	} else if (global.gc) {
		global.gc();
	}
}

/**
 * Profile a function using JSC sampling profiler
 */
export function profileFunction<T extends (...args: any[]) => any>(
	fn: T,
	sampleInterval = 100, // microseconds
	...args: Parameters<T>
): { result: ReturnType<T>; profile: ProfileResult | null } {
	// @ts-expect-error
	if (typeof Bun === "undefined" || !Bun.jsc?.profile) {
		console.warn("JSC profiler not available, running without profiling");
		const start = performance.now();
		const result = fn(...args);
		const duration = performance.now() - start;
		return {
			result,
			profile: {
				duration,
				tierBreakdown: {
					llint: 0,
					baseline: 0,
					dfg: 0,
					ftl: 0,
					jsBuiltin: 0,
					wasm: 0,
					host: 0,
					regexp: 0,
					cpp: 0,
					unknown: 0,
				},
				hottestFunctions: [],
				bytecodes: "Profiler not available",
			},
		};
	}

	const startTime = performance.now();
	let profileResult: any = null;

	// @ts-expect-error
	const result = Bun.jsc.profile(() => {
		const r = fn(...args);
		// @ts-expect-error
		profileResult = Bun.jsc.getSamplingProfile?.();
		return r;
	}, sampleInterval);

	const duration = performance.now() - startTime;

	return {
		result,
		profile: parseProfileResult(profileResult, duration),
	};
}

/**
 * Parse JSC profile output into structured format
 */
function parseProfileResult(rawProfile: any, duration: number): ProfileResult {
	if (!rawProfile) {
		return {
			duration,
			tierBreakdown: {
				llint: 0,
				baseline: 0,
				dfg: 0,
				ftl: 0,
				jsBuiltin: 0,
				wasm: 0,
				host: 0,
				regexp: 0,
				cpp: 0,
				unknown: 0,
			},
			hottestFunctions: [],
			bytecodes: "No profile data",
		};
	}

	// Parse the bytecodes string for tier breakdown
	const bytecodes = rawProfile.bytecodes || "";
	const tierBreakdown = parseTierBreakdown(bytecodes);

	// Parse functions
	const functions = rawProfile.functions || "";
	const hottestFunctions = parseHottestFunctions(functions);

	return {
		duration,
		tierBreakdown,
		hottestFunctions,
		bytecodes,
	};
}

function parseTierBreakdown(bytecodes: string) {
	const breakdown = {
		llint: 0,
		baseline: 0,
		dfg: 0,
		ftl: 0,
		jsBuiltin: 0,
		wasm: 0,
		host: 0,
		regexp: 0,
		cpp: 0,
		unknown: 0,
	};

	const lines = bytecodes.split("\n");
	for (const line of lines) {
		if (line.includes("LLInt:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.llint = parseInt(match[1]);
		} else if (line.includes("Baseline:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.baseline = parseInt(match[1]);
		} else if (line.includes("DFG:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.dfg = parseInt(match[1]);
		} else if (line.includes("FTL:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.ftl = parseInt(match[1]);
		} else if (line.includes("js builtin:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.jsBuiltin = parseInt(match[1]);
		} else if (line.includes("Wasm:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.wasm = parseInt(match[1]);
		} else if (line.includes("Host:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.host = parseInt(match[1]);
		} else if (line.includes("RegExp:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.regexp = parseInt(match[1]);
		} else if (line.includes("C/C++:")) {
			const match = line.match(/(\d+)\s+\(/);
			if (match) breakdown.cpp = parseInt(match[1]);
		}
	}

	return breakdown;
}

function parseHottestFunctions(
	functions: string,
): Array<{ samples: number; name: string; sourceId: string }> {
	const result: Array<{ samples: number; name: string; sourceId: string }> = [];
	const lines = functions.split("\n");

	for (const line of lines) {
		const match = line.match(/(\d+)\s+'([^']+):([^']+)'/);
		if (match) {
			result.push({
				samples: parseInt(match[1]),
				name: match[2],
				sourceId: match[3],
			});
		}
	}

	return result.slice(0, 10); // Top 10
}

/**
 * Monitor memory during an operation
 */
export async function monitorMemory<T>(
	operation: () => Promise<T> | T,
	label: string,
): Promise<{ result: T; memoryDelta: number; peakMemory: number }> {
	const before = getMemoryUsage();
	let peakMemory = before.heapUsed;

	// Sample memory during operation
	const interval = setInterval(() => {
		const current = getMemoryUsage();
		if (current.heapUsed > peakMemory) {
			peakMemory = current.heapUsed;
		}
	}, 10);

	const result = await operation();
	clearInterval(interval);

	const after = getMemoryUsage();
	const memoryDelta = after.heapUsed - before.heapUsed;

	return { result, memoryDelta, peakMemory };
}

/**
 * Create a performance report for integration scripts
 */
export function createPerformanceReport(): string {
	const memory = getMemoryUsage();

	const report = [
		"╔══════════════════════════════════════════════════════════╗",
		"║           JSC Performance Report                         ║",
		"╚══════════════════════════════════════════════════════════╝",
		"",
		"Memory Usage:",
		`  Heap Used:      ${formatBytes(memory.heapUsed)}`,
		`  Heap Total:     ${formatBytes(memory.heapTotal)}`,
		`  External:       ${formatBytes(memory.external)}`,
		`  ArrayBuffers:   ${formatBytes(memory.arrayBuffers)}`,
		"",
		`Bun Version:      ${Bun.version}`,
		`Platform:         ${process.platform} ${process.arch}`,
		`Node Version:     ${process.version}`,
		"",
	];

	return report.join("\n");
}

/**
 * Serialize data for inter-process communication
 */
export function serializeForIPC(data: unknown): ArrayBuffer | Buffer | null {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.serialize) {
		try {
			// @ts-expect-error
			return Bun.jsc.serialize(data, { binaryType: "arraybuffer" });
		} catch (err) {
			console.error("Serialization failed:", err);
			return null;
		}
	}

	// Fallback to JSON
	try {
		const json = JSON.stringify(data);
		const encoder = new TextEncoder();
		return encoder.encode(json).buffer;
	} catch {
		return null;
	}
}

/**
 * Deserialize data from IPC
 */
export function deserializeFromIPC(buffer: ArrayBuffer | Buffer): unknown {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.deserialize) {
		try {
			// @ts-expect-error
			return Bun.jsc.deserialize(buffer);
		} catch {
			// Fall through to JSON
		}
	}

	// Fallback to JSON
	try {
		const decoder = new TextDecoder();
		const json = decoder.decode(buffer);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

/**
 * Drain all pending microtasks
 * Ensures all Promise callbacks are executed
 */
export function drainMicrotasks(): void {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.drainMicrotasks) {
		// @ts-expect-error
		Bun.jsc.drainMicrotasks();
	}
}

/**
 * Set the timezone for Intl and Date
 * Returns the normalized timezone string
 */
export function setTimeZone(timeZone: string): string {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.setTimeZone) {
		// @ts-expect-error
		return Bun.jsc.setTimeZone(timeZone);
	}

	// Fallback to process.env.TZ
	process.env.TZ = timeZone;
	return timeZone;
}

/**
 * Get current timezone
 */
export function getTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Describe a value (for debugging)
 * Returns internal JSC representation as string
 */
export function describeValue(value: unknown): string {
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc?.describe) {
		try {
			// @ts-expect-error
			return Bun.jsc.describe(value);
		} catch {
			return String(value);
		}
	}

	// Fallback
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	if (typeof value === "object") {
		return `[object ${value?.constructor?.name || "Object"}]`;
	}
	return `${typeof value}: ${String(value)}`;
}

/**
 * Get detailed JSC VM stats
 */
export function getVMStats(): Record<string, any> {
	const stats: Record<string, any> = {
		bunVersion: Bun.version,
		platform: process.platform,
		arch: process.arch,
		nodeVersion: process.version,
		timezone: getTimeZone(),
	};

	// Add memory info
	const mem = getMemoryUsage();
	stats.memory = mem;

	// Add JSC-specific info if available
	// @ts-expect-error
	if (typeof Bun !== "undefined" && Bun.jsc) {
		stats.jscAvailable = true;
		// @ts-expect-error
		stats.jscKeys = Object.keys(Bun.jsc);
	} else {
		stats.jscAvailable = false;
	}

	return stats;
}

/**
 * Full performance snapshot with all metrics
 */
export interface PerformanceSnapshot {
	timestamp: string;
	memory: ReturnType<typeof getMemoryUsage>;
	vm: Record<string, any>;
	timezone: string;
	uptime: number;
}

export function createPerformanceSnapshot(): PerformanceSnapshot {
	return {
		timestamp: new Date().toISOString(),
		memory: getMemoryUsage(),
		vm: getVMStats(),
		timezone: getTimeZone(),
		uptime: process.uptime(),
	};
}

// CLI
if (import.meta.main) {
	const [, , command, ...args] = process.argv;

	switch (command) {
		case "memory":
			console.log(createPerformanceReport());
			break;

		case "gc":
			console.log("Forcing garbage collection...");
			forceGC();
			console.log("GC complete");
			console.log(createPerformanceReport());
			break;

		case "profile": {
			// Profile a simple operation
			const testData = Array.from({ length: 10000 }, (_, i) => ({
				id: i,
				data: "x".repeat(100),
			}));

			const { result, profile } = profileFunction(() => {
				return testData.filter((item) => item.id % 2 === 0).map((item) => item.id);
			}, 100);

			console.log("Profile Result:");
			console.log(`  Duration: ${profile?.duration.toFixed(2)}ms`);
			console.log(`  Filtered items: ${result.length}`);

			if (profile) {
				console.log("\nTier Breakdown:");
				const total = Object.values(profile.tierBreakdown).reduce((a, b) => a + b, 0);
				if (total > 0) {
					for (const [tier, count] of Object.entries(profile.tierBreakdown)) {
						const pct = ((count / total) * 100).toFixed(1);
						console.log(`  ${tier}: ${count} (${pct}%)`);
					}
				} else {
					console.log("  (Profiler data not available)");
				}
			}
			break;
		}

		case "monitor": {
			// Monitor memory during file read
			const filePath =
				args[0] ||
				"/Users/nolarose/.kimi/skills/tier1380-openclaw/config/telegram-topics.yaml";

			console.log(`Monitoring memory during file read: ${filePath}`);

			const { result, memoryDelta, peakMemory } = await monitorMemory(async () => {
				const file = Bun.file(filePath);
				return await file.text();
			}, "file-read");

			console.log(`\nFile size: ${formatBytes(result.length)}`);
			console.log(`Memory delta: ${formatBytes(memoryDelta)}`);
			console.log(`Peak memory: ${formatBytes(peakMemory)}`);
			break;
		}

		case "timezone": {
			if (args[0]) {
				const newTz = setTimeZone(args[0]);
				console.log(`Timezone set to: ${newTz}`);
			} else {
				console.log(`Current timezone: ${getTimeZone()}`);
				console.log("Usage: jsc-monitor timezone <timezone>");
				console.log("Example: jsc-monitor timezone America/New_York");
			}
			break;
		}

		case "describe": {
			const value = args[0] || "test";
			console.log(`Value: ${value}`);
			console.log(`Description: ${describeValue(value)}`);

			// Also describe some test values
			console.log("\nTest descriptions:");
			console.log(`  null: ${describeValue(null)}`);
			console.log(`  undefined: ${describeValue(undefined)}`);
			console.log(`  42: ${describeValue(42)}`);
			console.log(`  {}: ${describeValue({})}`);
			console.log(`  []: ${describeValue([])}`);
			break;
		}

		case "snapshot": {
			const snapshot = createPerformanceSnapshot();
			console.log(JSON.stringify(snapshot, null, 2));
			break;
		}

		case "drain": {
			console.log("Draining microtasks...");
			drainMicrotasks();
			console.log("Microtasks drained");
			break;
		}

		default:
			console.log(`
JSC Performance Monitor

Usage:
  jsc-monitor memory              Show memory usage
  jsc-monitor gc                  Force garbage collection
  jsc-monitor profile             Run profiler test
  jsc-monitor monitor [file]      Monitor file read memory
  jsc-monitor timezone [tz]       Get/set timezone
  jsc-monitor describe [value]    Describe a value
  jsc-monitor snapshot            Full performance snapshot
  jsc-monitor drain               Drain pending microtasks

Uses Bun's JavaScriptCore API for low-level performance monitoring.
`);
	}
}
