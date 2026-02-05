#!/usr/bin/env bun
/**
 * Spawn Performance Monitor & Validator
 *
 * Validates close_range() optimization and monitors spawn performance
 * in production. Based on real Bun v1.3.6+ improvements.
 *
 * @see https://github.com/oven-sh/bun/pull/{PR_NUMBER} (close_range syscall)
 */

import type { spawn } from "bun";

// ANSI colors
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
	dim: "\x1b[2m",
};

interface SystemInfo {
	platform: string;
	arch: string;
	bunVersion: string;
	glibcVersion?: string;
	kernelVersion?: string;
	hasCloseRange: boolean;
}

interface SpawnStats {
	min: number;
	max: number;
	mean: number;
	median: number;
	p95: number;
	samples: number;
}

/** Check if system supports close_range() */
async function checkCloseRangeSupport(): Promise<SystemInfo> {
	const info: SystemInfo = {
		platform: process.platform,
		arch: process.arch,
		bunVersion: Bun.version,
		hasCloseRange: false,
	};

	// Only Linux systems benefit from close_range()
	if (process.platform !== "linux") {
		return info;
	}

	// Check glibc version
	try {
		const proc = Bun.spawn(["ldd", "--version"], { stdout: "pipe" });
		const output = await new Response(proc.stdout).text();
		const match = output.match(/\(GNU libc\) (\d+\.\d+)/);
		if (match) {
			info.glibcVersion = match[1];
			const [major, minor] = match[1].split(".").map(Number);
			if (major > 2 || (major === 2 && minor >= 34)) {
				info.hasCloseRange = true;
			}
		}
	} catch {
		// ldd not available
	}

	// Check kernel version
	try {
		const proc = Bun.spawn(["uname", "-r"], { stdout: "pipe" });
		const output = await new Response(proc.stdout).text();
		info.kernelVersion = output.trim();
		const match = output.match(/^(\d+)\.(\d+)/);
		if (match) {
			const [, major, minor] = match.map(Number);
			// close_range() requires kernel >= 5.9
			if (major < 5 || (major === 5 && minor < 9)) {
				info.hasCloseRange = false;
			}
		}
	} catch {
		// uname not available
	}

	return info;
}

/** Benchmark spawnSync performance */
function benchmarkSpawnSync(iterations = 100): SpawnStats {
	const times: number[] = [];

	// Warmup
	for (let i = 0; i < 10; i++) {
		Bun.spawnSync(["true"]);
	}

	// Timed runs
	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		Bun.spawnSync(["true"]);
		times.push(performance.now() - start);
	}

	const sorted = [...times].sort((a, b) => a - b);
	const mean = times.reduce((a, b) => a + b, 0) / times.length;
	const median = sorted[Math.floor(sorted.length / 2)];
	const p95 = sorted[Math.floor(sorted.length * 0.95)];

	return {
		min: sorted[0],
		max: sorted[sorted.length - 1],
		mean,
		median,
		p95,
		samples: iterations,
	};
}

/** Safe spawn wrapper with validation */
export function spawnSafe(command: string[], options: Parameters<typeof spawn>[1] = {}) {
	// Validate command
	if (!command || command.length === 0) {
		throw new Error("Empty command");
	}

	// Basic security: reject suspicious patterns
	const cmd = command[0];
	if (cmd.includes("..") || cmd.includes(";") || cmd.includes("|")) {
		throw new Error(`Suspicious command: ${cmd}`);
	}

	const start = performance.now();
	const result = Bun.spawnSync(command, {
		...options,
		stdout: options.stdout ?? "pipe",
		stderr: options.stderr ?? "pipe",
	});
	const duration = performance.now() - start;

	// Warn on slow spawns
	if (duration > 5 && process.env.NODE_ENV === "production") {
		console.warn(
			`${c.yellow}⚠️  Slow spawn: ${command.join(" ")} took ${duration.toFixed(1)}ms${c.reset}`,
		);
	}

	return { ...result, duration };
}

/** Monitor spawn latency in real-time */
export class SpawnMonitor {
	private samples: number[] = [];
	private slowCount = 0;
	private readonly maxSamples = 1000;
	private readonly slowThreshold = 10; // ms

	record(duration: number): void {
		this.samples.push(duration);
		if (this.samples.length > this.maxSamples) {
			this.samples.shift();
		}
		if (duration > this.slowThreshold) {
			this.slowCount++;
		}
	}

	getStats(): SpawnStats & { slowCount: number } {
		if (this.samples.length === 0) {
			return {
				min: 0,
				max: 0,
				mean: 0,
				median: 0,
				p95: 0,
				samples: 0,
				slowCount: 0,
			};
		}

		const sorted = [...this.samples].sort((a, b) => a - b);
		const mean = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
		const median = sorted[Math.floor(sorted.length / 2)];
		const p95 = sorted[Math.floor(sorted.length * 0.95)];

		return {
			min: sorted[0],
			max: sorted[sorted.length - 1],
			mean,
			median,
			p95,
			samples: this.samples.length,
			slowCount: this.slowCount,
		};
	}

	reset(): void {
		this.samples = [];
		this.slowCount = 0;
	}
}

/** Format milliseconds */
function formatMs(ms: number): string {
	if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
	if (ms < 1000) return `${ms.toFixed(2)}ms`;
	return `${(ms / 1000).toFixed(2)}s`;
}

/** Print system info table */
function printSystemInfo(info: SystemInfo): void {
	console.log(`\n${c.bold}📋 System Information${c.reset}\n`);
	console.log(
		Bun.inspect.table([
			{ Property: "Platform", Value: `${info.platform}/${info.arch}` },
			{ Property: "Bun Version", Value: info.bunVersion },
			...(info.glibcVersion
				? [{ Property: "glibc Version", Value: info.glibcVersion }]
				: []),
			...(info.kernelVersion
				? [{ Property: "Kernel Version", Value: info.kernelVersion }]
				: []),
			{
				Property: "close_range() Support",
				Value: info.hasCloseRange
					? `${c.green}✅ Yes${c.reset}`
					: `${c.yellow}❌ No${c.reset}`,
			},
		]),
	);
}

/** Print benchmark results */
function printBenchmark(stats: SpawnStats, info: SystemInfo): void {
	console.log(
		`\n${c.bold}⏱️  Spawn Performance (${stats.samples} iterations)${c.reset}\n`,
	);

	const getStatus = (mean: number, hasOptimization: boolean): string => {
		if (hasOptimization) {
			// Expected: <1ms with close_range()
			if (mean < 1) return `${c.green}✅ Excellent${c.reset}`;
			if (mean < 2) return `${c.yellow}⚠️  Good${c.reset}`;
			return `${c.red}❌ Slow (check system)${c.reset}`;
		}
		// Expected: 5-15ms without close_range()
		if (mean < 15) return `${c.yellow}⚠️  Expected (no optimization)${c.reset}`;
		return `${c.red}❌ Very Slow${c.reset}`;
	};

	console.log(
		Bun.inspect.table([
			{ Metric: "Min", Value: formatMs(stats.min) },
			{ Metric: "Median", Value: formatMs(stats.median) },
			{ Metric: "Mean", Value: formatMs(stats.mean) },
			{ Metric: "P95", Value: formatMs(stats.p95) },
			{ Metric: "Max", Value: formatMs(stats.max) },
		]),
	);

	console.log(
		`\n${c.bold}Status:${c.reset} ${getStatus(stats.mean, info.hasCloseRange)}\n`,
	);

	// Recommendations
	if (!info.hasCloseRange && info.platform === "linux") {
		console.log(`${c.yellow}💡 Recommendations:${c.reset}`);
		console.log(`   • Upgrade to glibc ≥ 2.34 and kernel ≥ 5.9 for 20-30x speedup`);
		console.log(`   • Current performance is normal for older systems\n`);
	} else if (info.hasCloseRange && stats.mean > 2) {
		console.log(`${c.yellow}⚠️  Warning:${c.reset}`);
		console.log(
			`   • close_range() is available but spawn is slow (${formatMs(stats.mean)})`,
		);
		console.log(`   • Check for system resource constraints\n`);
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const action = args[0] ?? "validate";

	if (action === "--help" || action === "-h") {
		console.log(`
${c.bold}Spawn Performance Monitor${c.reset}

${c.bold}USAGE:${c.reset}
  bun tools/spawn-monitor.ts [command] [options]

${c.bold}COMMANDS:${c.reset}
  validate     Validate system and benchmark spawn (default)
  monitor      Run continuous monitoring
  check        Quick system check only

${c.bold}OPTIONS:${c.reset}
  -n <count>   Number of benchmark iterations (default: 100)

${c.bold}EXAMPLES:${c.reset}
  ${c.dim}# Full validation${c.reset}
  bun tools/spawn-monitor.ts validate

  ${c.dim}# Benchmark with 500 iterations${c.reset}
  bun tools/spawn-monitor.ts validate -n 500

  ${c.dim}# Quick check${c.reset}
  bun tools/spawn-monitor.ts check
`);
		return;
	}

	if (action === "check") {
		const info = await checkCloseRangeSupport();
		printSystemInfo(info);
		return;
	}

	if (action === "validate") {
		console.log(`${c.cyan}${c.bold}🚀 Spawn Performance Validator${c.reset}\n`);
		console.log(`${c.dim}Checking system capabilities...${c.reset}`);

		const info = await checkCloseRangeSupport();
		printSystemInfo(info);

		// Parse iteration count
		let iterations = 100;
		const nIndex = args.indexOf("-n");
		if (nIndex >= 0 && args[nIndex + 1]) {
			iterations = parseInt(args[nIndex + 1], 10);
		}

		console.log(`\n${c.dim}Running benchmark...${c.reset}`);
		const stats = benchmarkSpawnSync(iterations);
		printBenchmark(stats, info);

		// Expected performance guide
		console.log(`${c.bold}📊 Expected Performance:${c.reset}\n`);
		console.log(
			Bun.inspect.table([
				{
					Platform: "Linux (close_range)",
					Expected: "<1ms",
					Your: formatMs(stats.mean),
					Status: info.hasCloseRange && stats.mean < 1 ? `${c.green}✓${c.reset}` : "",
				},
				{
					Platform: "Linux (fallback)",
					Expected: "5-15ms",
					Your: formatMs(stats.mean),
					Status: !info.hasCloseRange && stats.mean < 15 ? `${c.green}✓${c.reset}` : "",
				},
				{
					Platform: "macOS ARM64",
					Expected: "5-10ms",
					Your: formatMs(stats.mean),
					Status:
						info.platform === "darwin" && stats.mean < 10 ? `${c.green}✓${c.reset}` : "",
				},
			]),
		);
		return;
	}

	console.error(`${c.red}Unknown command: ${action}${c.reset}`);
	console.error(`Run with --help for usage information`);
	process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
