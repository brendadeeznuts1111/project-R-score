#!/usr/bin/env bun
// scripts/memory-guardian.js - Memory monitoring and automatic profiling
import { spawn } from "bun";

class MemoryGuardian {
	constructor(thresholds = {}, checkInterval = 5000) {
		this.thresholds = {
			warning: thresholds.warning || 512, // 512 MB
			critical: thresholds.critical || 1024, // 1 GB
			profiling: thresholds.profiling || 2048, // 2 GB
			...thresholds,
		};
		this.checkInterval = checkInterval;
		this.profilingEnabled = true;
		this.profileCount = 0;
	}

	getMemoryUsage() {
		return process.memoryUsage();
	}

	formatBytes(bytes) {
		const mb = bytes / 1024 / 1024;
		return `${mb.toFixed(1)}MB`;
	}

	async triggerAutoProfile(reason) {
		if (!this.profilingEnabled) return;

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const profileName = `auto-profile-${reason}-${timestamp}`;
		const profileDir = "./profiles/auto-memory";

		console.log(
			`🚨 Memory threshold exceeded! Triggering auto-profile: ${profileName}`,
		);

		try {
			// Create profile directory
			await Bun.spawn(["mkdir", "-p", profileDir]).exited;

			// Trigger CPU profiling
			const cpuProc = spawn(
				[
					"bun",
					"--cpu-prof-md",
					"--cpu-prof-name",
					profileName,
					"--cpu-prof-dir",
					profileDir,
					"src/main.ts",
				],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);

			// Trigger heap profiling
			const heapProc = spawn(
				[
					"bun",
					"--heap-prof-md",
					"--heap-prof-name",
					`${profileName}-heap`,
					"--heap-prof-dir",
					profileDir,
					"src/main.ts",
				],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);

			await Promise.all([cpuProc.exited, heapProc.exited]);

			this.profileCount++;
			console.log(
				`✅ Auto-profile #${this.profileCount} completed: ${profileDir}/${profileName}.md`,
			);
		} catch (error) {
			console.error(`❌ Auto-profiling failed: ${error}`);
		}
	}

	async checkMemory() {
		const usage = this.getMemoryUsage();
		const heapUsed = usage.heapUsed / 1024 / 1024; // Convert to MB

		// Status indicator
		let status = "🟢";
		if (heapUsed >= this.thresholds.profiling) status = "🔴";
		else if (heapUsed >= this.thresholds.critical) status = "🟠";
		else if (heapUsed >= this.thresholds.warning) status = "🟡";

		console.log(
			`${status} Memory: ${this.formatBytes(usage.heapUsed)} | RSS: ${this.formatBytes(usage.rss)} | External: ${this.formatBytes(usage.external)}`,
		);

		// Check thresholds
		if (heapUsed >= this.thresholds.profiling) {
			await this.triggerAutoProfile("memory-profiling-threshold");
		} else if (heapUsed >= this.thresholds.critical) {
			console.log(
				`⚠️  Critical memory usage: ${this.formatBytes(usage.heapUsed)} (threshold: ${this.thresholds.critical}MB)`,
			);
			// Force garbage collection if available
			if (global.gc) {
				global.gc();
				console.log("🧹 Forced garbage collection");
			}
		} else if (heapUsed >= this.thresholds.warning) {
			console.log(
				`⚠️  High memory usage: ${this.formatBytes(usage.heapUsed)} (threshold: ${this.thresholds.warning}MB)`,
			);
		}
	}

	start() {
		console.log(`🛡️  Memory Guardian started`);
		console.log(`   Warning threshold: ${this.thresholds.warning}MB`);
		console.log(`   Critical threshold: ${this.thresholds.critical}MB`);
		console.log(`   Profiling threshold: ${this.thresholds.profiling}MB`);
		console.log(`   Check interval: ${this.checkInterval}ms`);
		console.log("---");

		// Initial check
		this.checkMemory();

		// Start monitoring
		setInterval(() => {
			this.checkMemory();
		}, this.checkInterval);
	}

	enableProfiling() {
		this.profilingEnabled = true;
		console.log("✅ Auto-profiling enabled");
	}

	disableProfiling() {
		this.profilingEnabled = false;
		console.log("❌ Auto-profiling disabled");
	}

	setThresholds(thresholds) {
		this.thresholds = { ...this.thresholds, ...thresholds };
		console.log("📊 Memory thresholds updated:", this.thresholds);
	}

	getStats() {
		return {
			profileCount: this.profileCount,
			thresholds: this.thresholds,
		};
	}
}

// CLI Interface
async function main() {
	const args = process.argv.slice(2);
	const guardian = new MemoryGuardian();

	// Parse command line arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--warning") {
			guardian.setThresholds({ warning: parseInt(args[i + 1], 10) });
			i++;
		} else if (arg === "--critical") {
			guardian.setThresholds({ critical: parseInt(args[i + 1], 10) });
			i++;
		} else if (arg === "--profiling") {
			guardian.setThresholds({ profiling: parseInt(args[i + 1], 10) });
			i++;
		} else if (arg === "--interval") {
			// Note: This would require recreating the guardian with new interval
			console.log(`Interval setting not yet implemented`);
			i++;
		} else if (arg === "--no-profiling") {
			guardian.disableProfiling();
		} else if (arg === "--help") {
			console.log(`
🛡️  Memory Guardian - Automatic Memory Monitoring & Profiling

USAGE:
  bun memory-guardian.js [options]

OPTIONS:
  --warning <MB>        Set warning threshold (default: 512)
  --critical <MB>       Set critical threshold (default: 1024)
  --profiling <MB>      Set auto-profiling threshold (default: 2048)
  --interval <MS>       Set check interval (default: 5000)
  --no-profiling        Disable automatic profiling
  --help                Show this help

EXAMPLES:
  bun memory-guardian.js --warning 256 --critical 512 --profiling 1024
  bun memory-guardian.js --no-profiling
  bun memory-guardian.js | bun --cpu-prof-md src/main.ts

THRESHOLDS:
  🟡 Warning:  Memory usage is high, monitor closely
  🟠 Critical: Memory usage is critical, consider cleanup
  🔴 Profiling: Memory usage triggers automatic profiling

FEATURES:
  ✅ Real-time memory monitoring
  ✅ Automatic profiling when thresholds exceeded
  ✅ Configurable memory thresholds
  ✅ Garbage collection hints
  ✅ Profile management and statistics
`);
			process.exit(0);
		}
	}

	// Start monitoring
	guardian.start();

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n👋 Memory Guardian shutting down...");
		const stats = guardian.getStats();
		console.log(
			`📊 Final stats: ${stats.profileCount} auto-profiles generated`,
		);
		process.exit(0);
	});

	// Keep process alive
	process.stdin.resume();
}

if (import.meta.main) {
	main().catch(console.error);
}

export { MemoryGuardian };
