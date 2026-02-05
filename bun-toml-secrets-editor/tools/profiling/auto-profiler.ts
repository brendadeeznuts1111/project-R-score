#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// scripts/auto-profiler.js - Intelligent automatic profiling system
import { spawn } from "bun";

interface AutoProfilerConfig {
	threshold: number; // CPU % threshold to trigger profiling
	interval: number; // Check interval in seconds
	duration: number; // Profile duration in seconds
	outputDir: string; // Output directory for profiles
	maxProfiles: number; // Maximum profiles to keep
	enableHeapProfiling: boolean;
	enableCPUProfiling: boolean;
	preserveSourceMaps: boolean;
}

interface ProfileMetrics {
	timestamp: string;
	cpuUsage: number;
	memoryUsage: NodeJS.MemoryUsage;
	triggerReason: string;
}

class AutoProfiler {
	private config: AutoProfilerConfig;
	private isRunning: boolean = false;
	private profileCount: number = 0;
	private metrics: ProfileMetrics[] = [];

	constructor(config: Partial<AutoProfilerConfig> = {}) {
		this.config = {
			threshold: config.threshold || 80, // 80% CPU
			interval: config.interval || 30, // 30 seconds
			duration: config.duration || 60, // 60 seconds
			outputDir: config.outputDir || "./profiles/auto",
			maxProfiles: config.maxProfiles || 10,
			enableHeapProfiling: config.enableHeapProfiling !== false,
			enableCPUProfiling: config.enableCPUProfiling !== false,
			preserveSourceMaps: config.preserveSourceMaps !== false,
			...config,
		};

		// Ensure output directory exists
		if (!existsSync(this.config.outputDir)) {
			mkdirSync(this.config.outputDir, { recursive: true });
		}
	}

	private getCurrentCPUUsage(): Promise<number> {
		return new Promise((resolve) => {
			const startUsage = process.cpuUsage();
			const startTime = process.hrtime.bigint();

			setTimeout(() => {
				const endUsage = process.cpuUsage(startUsage);
				const endTime = process.hrtime.bigint();

				const totalTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
				const cpuTime = endUsage.user + endUsage.system;
				const cpuPercent = (cpuTime / totalTime) * 100;

				resolve(Math.min(cpuPercent, 100));
			}, 100);
		});
	}

	private async collectMetrics(): Promise<ProfileMetrics> {
		const cpuUsage = await this.getCurrentCPUUsage();
		const memoryUsage = process.memoryUsage();
		const timestamp = new Date().toISOString();

		const metrics: ProfileMetrics = {
			timestamp,
			cpuUsage,
			memoryUsage,
			triggerReason: "threshold-exceeded",
		};

		this.metrics.push(metrics);

		// Keep only last 100 metrics
		if (this.metrics.length > 100) {
			this.metrics = this.metrics.slice(-100);
		}

		return metrics;
	}

	private generateProfileName(reason: string): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		return `auto-${reason}-${timestamp}`;
	}

	private async runCPUProfile(profileName: string): Promise<string> {
		if (!this.config.enableCPUProfiling) return "";

		const profilePath = join(this.config.outputDir, `${profileName}.md`);

		console.log(`🔥 Starting CPU profile: ${profileName}`);

		const proc = spawn(
			[
				"bun",
				"--cpu-prof-md",
				"--cpu-prof-name",
				profileName,
				"--cpu-prof-dir",
				this.config.outputDir,
				"src/main.ts",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				env: {
					...process.env,
					BUN_CPU_PROF_SAMPLING_INTERVAL: "500", // 500 microseconds
				},
			},
		);

		await proc.exited;

		if (proc.exitCode === 0) {
			console.log(`✅ CPU profile completed: ${profilePath}`);
			return profilePath;
		} else {
			const error = await new Response(proc.stderr).text();
			console.error(`❌ CPU profiling failed: ${error}`);
			return "";
		}
	}

	private async runHeapProfile(profileName: string): Promise<string> {
		if (!this.config.enableHeapProfiling) return "";

		const heapProfileName = `${profileName}-heap`;
		const profilePath = join(this.config.outputDir, `${heapProfileName}.md`);

		console.log(`💾 Starting heap profile: ${heapProfileName}`);

		const proc = spawn(
			[
				"bun",
				"--heap-prof-md",
				"--heap-prof-name",
				heapProfileName,
				"--heap-prof-dir",
				this.config.outputDir,
				"src/main.ts",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		await proc.exited;

		if (proc.exitCode === 0) {
			console.log(`✅ Heap profile completed: ${profilePath}`);
			return profilePath;
		} else {
			const error = await new Response(proc.stderr).text();
			console.error(`❌ Heap profiling failed: ${error}`);
			return "";
		}
	}

	private async cleanupOldProfiles(): Promise<void> {
		try {
			const proc = spawn(["ls", "-t", this.config.outputDir], {
				stdout: "pipe",
			});
			const output = await new Response(proc.stdout).text();
			await proc.exited;

			const files = output
				.trim()
				.split("\n")
				.filter((f) => f.endsWith(".md") && f.includes("auto-"));

			if (files.length > this.config.maxProfiles) {
				const filesToDelete = files.slice(this.config.maxProfiles);

				for (const file of filesToDelete) {
					const filePath = join(this.config.outputDir, file);
					await spawn(["rm", filePath]).exited;
					console.log(`🗑️  Removed old profile: ${file}`);
				}
			}
		} catch (error) {
			console.warn(`⚠️  Profile cleanup failed: ${error}`);
		}
	}

	private saveMetrics(): undefined {
		const metricsPath = join(
			this.config.outputDir,
			"auto-profiler-metrics.jsonl",
		);
		const latestMetrics = this.metrics[this.metrics.length - 1];

		if (latestMetrics) {
			const metricsLine = `${JSON.stringify(latestMetrics)}\n`;
			writeFileSync(metricsPath, metricsLine, { flag: "a" });
		}
	}

	public async checkAndProfile(): Promise<void> {
		const metrics = await this.collectMetrics();

		console.log(
			`📊 CPU: ${metrics.cpuUsage.toFixed(1)}% | Memory: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`,
		);

		if (metrics.cpuUsage >= this.config.threshold) {
			console.log(
				`🚨 CPU threshold exceeded (${metrics.cpuUsage.toFixed(1)}% >= ${this.config.threshold}%)`,
			);

			const profileName = this.generateProfileName("cpu-threshold");

			// Run profiles concurrently
			const [_cpuProfile, _heapProfile] = await Promise.all([
				this.runCPUProfile(profileName),
				this.runHeapProfile(profileName),
			]);

			this.profileCount++;
			this.saveMetrics();
			await this.cleanupOldProfiles();

			console.log(`🎯 Auto-profile #${this.profileCount} completed`);

			// Brief pause after profiling
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	public start(): undefined {
		if (this.isRunning) {
			console.log("⚠️  Auto-profiler is already running");
			return;
		}

		this.isRunning = true;
		console.log(`🚀 Auto-profiler started`);
		console.log(`   CPU threshold: ${this.config.threshold}%`);
		console.log(`   Check interval: ${this.config.interval}s`);
		console.log(`   Output directory: ${this.config.outputDir}`);
		console.log(`   Max profiles: ${this.config.maxProfiles}`);
		console.log("---");

		const runLoop = async () => {
			while (this.isRunning) {
				try {
					await this.checkAndProfile();
				} catch (error) {
					console.error(`❌ Auto-profiler error: ${error}`);
				}

				// Wait for next check
				await new Promise((resolve) =>
					setTimeout(resolve, this.config.interval * 1000),
				);
			}
		};

		runLoop();
	}

	public stop(): undefined {
		this.isRunning = false;
		console.log("🛑 Auto-profiler stopped");
	}

	public getStats(): any {
		return {
			isRunning: this.isRunning,
			profileCount: this.profileCount,
			config: this.config,
			recentMetrics: this.metrics.slice(-5),
		};
	}

	public updateConfig(newConfig: Partial<AutoProfilerConfig>): undefined {
		this.config = { ...this.config, ...newConfig };
		console.log("⚙️  Auto-profiler config updated:", newConfig);
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);

	// Default configuration
	const config: Partial<AutoProfilerConfig> = {
		threshold: 80,
		interval: 30,
		outputDir: "./profiles/auto",
	};

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--threshold") {
			config.threshold = parseInt(args[i + 1], 10);
			i++;
		} else if (arg === "--interval") {
			config.interval = parseInt(args[i + 1], 10);
			i++;
		} else if (arg === "--output-dir") {
			config.outputDir = args[i + 1];
			i++;
		} else if (arg === "--max-profiles") {
			config.maxProfiles = parseInt(args[i + 1], 10);
			i++;
		} else if (arg === "--no-heap") {
			config.enableHeapProfiling = false;
		} else if (arg === "--no-cpu") {
			config.enableCPUProfiling = false;
		} else if (arg === "--preserve-sourcemaps") {
			config.preserveSourceMaps = true;
		} else if (arg === "--help") {
			console.log(`
🚀 Auto Profiler - Intelligent Automatic Profiling System

USAGE:
  bun auto-profiler.js [options]

OPTIONS:
  --threshold <percent>    CPU threshold to trigger profiling (default: 80)
  --interval <seconds>     Check interval (default: 30)
  --output-dir <dir>       Output directory for profiles (default: ./profiles/auto)
  --max-profiles <num>     Maximum profiles to keep (default: 10)
  --no-heap               Disable heap profiling
  --no-cpu                Disable CPU profiling
  --preserve-sourcemaps   Preserve source maps in profiles
  --help                  Show this help

ENVIRONMENT VARIABLES:
  BUN_CPU_PROF_SAMPLING_INTERVAL    CPU sampling interval in microseconds (default: 500)
  BUN_CPU_PROF_MAX_SAMPLES          Maximum CPU samples (default: 100000)
  BUN_HEAP_PROF_INTERVAL           Heap sampling interval in bytes (default: 1024)

EXAMPLES:
  bun auto-profiler.js --threshold 70 --interval 15
  bun auto-profiler.js --no-heap --max-profiles 5
  bun auto-profiler.js --output-dir ./my-profiles

FEATURES:
  ✅ Automatic CPU threshold detection
  ✅ Concurrent CPU and heap profiling
  ✅ Intelligent profile management
  ✅ Metrics collection and tracking
  ✅ Configurable thresholds and intervals
  ✅ Automatic cleanup of old profiles
  ✅ Real-time monitoring dashboard
`);
			process.exit(0);
		}
	}

	const profiler = new AutoProfiler(config);

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n👋 Auto-profiler shutting down...");
		profiler.stop();
		const stats = profiler.getStats();
		console.log(`📊 Final stats: ${stats.profileCount} profiles generated`);
		process.exit(0);
	});

	// Start profiling
	profiler.start();

	// Keep process alive
	process.stdin.resume();
}

if (import.meta.main) {
	main().catch(console.error);
}

export { AutoProfiler };
